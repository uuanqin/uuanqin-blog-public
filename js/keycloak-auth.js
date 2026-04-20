// ============== Keycloak 配置 ==============
const KEYCLOAK_CONFIG = {
  url: "https://auth.uuanqin.top/",
  realm: "ABA Inc.",
  clientId: "uuanqin_blog",
  publicKey: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA7mhwT/kEx3PZZijlk05QbYeJ5VnfBaJZpUBSc/aMFuS3+8oR0C/sKJlxOdhuqS1e8TMBrbWaMDjQ/s6SlKHXxARlZCOBjYn5NN3bsj0KSGaq+6NvuX5dD55idHNkmX4YUsLC+9F7jKZrbPMPNAijKYdZY3rh7rBDowqfsMuXeP7tZC4pGNu3XkT09k4v/B3lgParMQJ3Gk3Cr09Xqjji92O1G/UoD86E130fPNazUyNcWTq572o9dp9nYB33DalBZBHP/SUnnlWVxEwXWleaF3bm9186tAbJr/B/5r9jfW8+pnzF+qo6dFKCWQU+GNpcqaxaMSh/zeP1SDCe8VH6nQIDAQAB"
};

const CACHE_TIMES = {
  SECONDS_OF_UNAUTH_HINT: 86400, // 24h
  SECONDS_OF_TOKEN_MIN_VALID: 30,
  SECONDS_OF_REFRESH_THRESHOLD: 80,
  MILLISECONDS_OF_REFRESH_INTERVAL: 30000, // 30s
  // MILLISECONDS_OF_LOADING_TIMEOUT: 5000
};

// ============== UI 渲染  ==============

function finish() {
  if (isLoaderEnded) return;
  if (typeof window.endPreloader === 'function') {
    window.endPreloader();
    isLoaderEnded = true;
    logger.info("认证流程结束，Loading 界面已关闭");
  }
}

function updateLoggedInUI(payload) {
  const container = document.getElementById('kcUserContainer');
  const btnText = document.getElementById('kcBtnText');
  const profileBtn = document.getElementById('kc-profile-btn');
  const logoutBtn = document.getElementById('kc-logout-btn');

  if (!container) return;

  // 隐藏登录按钮，显示用户信息
  const rawName = payload.preferred_username || payload.name || 'User';
  if (btnText) btnText.textContent = `欢迎，${truncateString(rawName, 10)}`;
  container.classList.add('logged-in');
  container.classList.remove('logged-out');

  // 绑定个人中心
  if (profileBtn) {
    profileBtn.onclick = () => window.open(KEYCLOAK_ACCOUNT_URL, '_blank');
  }

  // 绑定退出登录
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      window.location.href = getKeycloakLogoutUrl();
    };
  }
}

// ============== 未登录 UI ==============
function updateLoggedOutUI() {
  const container = document.getElementById('kcUserContainer');
  const btnText = document.getElementById('kcBtnText');
  const defaultBtn = document.getElementById('kc-default-btn');

  if (!container) return;

  // 显示登录按钮
  if (btnText) btnText.textContent = "统一认证登录";
  container.classList.add('logged-out');
  container.classList.remove('logged-in');

  // 绑定登录事件
  if (defaultBtn) {
    defaultBtn.onclick = () => {
      localStorage.removeItem(STORAGE_KEYS.GUEST_DATA);
      window.location.href = getKeycloakLoginUrl();
    };
  }
}

// ===============================================================================
// ======================== 下面的代码基本不需要变动 ==================================
// ===============================================================================

let keycloakInstance = null;
let isLoaderEnded = false;
let refreshTimer = null; // 全局定时器句柄

// 一些链接获取的函数
const KEYCLOAK_ACCOUNT_URL = `${KEYCLOAK_CONFIG.url}realms/${encodeURIComponent(KEYCLOAK_CONFIG.realm)}/account/`;

// 获取当前页面的纯净 URL（去掉之前的 query 参数）
function getBaseRedirectUri() {
  return window.location.origin + window.location.pathname;
}

function getKeycloakLoginUrl() {
  const base = `${KEYCLOAK_CONFIG.url}realms/${encodeURIComponent(KEYCLOAK_CONFIG.realm)}`;
  const clientId = encodeURIComponent(KEYCLOAK_CONFIG.clientId);
  // 加上 action=login 标记
  const redirectUri = encodeURIComponent(getBaseRedirectUri() + "?action=login");
  return `${base}/protocol/openid-connect/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid`;
}

function getKeycloakLogoutUrl() {
  const base = `${KEYCLOAK_CONFIG.url}realms/${encodeURIComponent(KEYCLOAK_CONFIG.realm)}`;
  const clientId = encodeURIComponent(KEYCLOAK_CONFIG.clientId);
  const redirectUri = encodeURIComponent(getBaseRedirectUri() + "?action=logout");
  return `${base}/protocol/openid-connect/logout?client_id=${clientId}&post_logout_redirect_uri=${redirectUri}`;
}

const STORAGE_KEYS = {
  TOKEN: 'kc_token_data',
  REFRESH_TOKEN: 'kc_refresh_token_data',
  GUEST_DATA: 'kc_guest_cache'
};

const logger = {
  info: (msg, data = '') => console.log(`%c[KC-INFO] ${msg}`, 'color: #007bff; font-weight: bold;', data),
  success: (msg, data = '') => console.log(`%c[KC-SUCCESS] ${msg}`, 'color: #28a745; font-weight: bold;', data),
  warn: (msg, data = '') => console.warn(`%c[KC-WARN] ${msg}`, 'color: #ffc107; font-weight: bold;', data),
  error: (msg, err = '') => console.error(`%c[KC-ERROR] ${msg}`, 'color: #dc3545; font-weight: bold;', err)
};

// ============== 核心工具函数 ==============

function truncateString(str, num = 12) {
  if (!str) return '';
  return str.length > num ? str.slice(0, num) + "..." : str;
}

function pemToArrayBuffer(pem) {
  const b64 = pem.replace(/[\r\n]/g, '').replace(/-----BEGIN PUBLIC KEY-----/, '').replace(/-----END PUBLIC KEY-----/, '');
  const byteString = window.atob(b64);
  const byteArray = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) byteArray[i] = byteString.charCodeAt(i);
  return byteArray.buffer;
}

async function verifySignature(token) {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    const cryptoKey = await window.crypto.subtle.importKey(
      "spki", pemToArrayBuffer(KEYCLOAK_CONFIG.publicKey),
      {name: "RSASSA-PKCS1-v1_5", hash: "SHA-256"}, false, ["verify"]
    );
    const data = new TextEncoder().encode(headerB64 + "." + payloadB64);
    const signature = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const isValid = await window.crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, signature, data);

    if (isValid) {
      logger.success("Token 签名验证通过");
    } else {
      logger.warn("Token 签名验证失败：签名不匹配");
    }
    return isValid;
  } catch (e) {
    logger.error("Token 签名解析过程中出现异常", e);
    return false;
  }
}

// ============== 主逻辑 ==============

document.addEventListener('DOMContentLoaded', async () => {

  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action'); // 获取我们自定义的 action 标记
  const localToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
  const localRefreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  const localGuestData = JSON.parse(localStorage.getItem(STORAGE_KEYS.GUEST_DATA) || '{}');
  const isGuestMode = localGuestData.mode === 'logged_out' && localGuestData.expire > Date.now();

  try {
    // 登录回调
    if (action === 'login' || urlParams.has('code')) {
      logger.info("检测到【登录回调】，启动完整初始化换取 Token");
      await performFullInit(()=>{
        cleanUrlParams();
        finish();
      });
      return;
    }

    // 登出回调
    if (action === 'logout') {
      logger.info("检测到【登出回调】，强制清理本地缓存");
      handleAuthFailure(); // 这里清空本地数据
      cleanUrlParams();
      finish();
      return;
    }

    if (localToken) {
      logger.info("检测到本地 Token，尝试进入【极速通行通道】...");
      const payload = JSON.parse(atob(localToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      const timeLeft = payload.exp - Math.floor(Date.now() / 1000);

      if (timeLeft > CACHE_TIMES.SECONDS_OF_TOKEN_MIN_VALID) {
        logger.info(`Token 尚未过期 (剩余 ${timeLeft}s)，开始本地验签...`);
        if (await verifySignature(localToken)) {
          logger.success(`极速通行：Token 剩余 ${timeLeft}s`);
          updateLoggedInUI(payload);
          finish();
          // 必须传入 refreshToken 进行静默续期
          startSilentRefresh(localToken, localRefreshToken);
          return;
        }
      }
    }

    if (isGuestMode) {
      logger.info("访客模式：跳过检测");
      updateLoggedOutUI();
      finish();
      return;
    }

    // 兜底初始化通道 (Check-SSO)
    logger.info("无有效本地缓存，进入【服务器同步通道】(Check-SSO)...");
    await performFullInit(finish);

  } catch (err) {
    logger.error("主流程崩溃", err);
    handleAuthFailure();
    finish();
  }
});

async function performFullInit(doneCallback) {
  keycloakInstance = new Keycloak(KEYCLOAK_CONFIG);
  try {
    const auth = await keycloakInstance.init({
      onLoad: 'check-sso',
      checkLoginIframe: false
    });

    if (auth && keycloakInstance.token) {
      logger.success("服务器同步成功：用户已登录");
      handleAuthSuccess(keycloakInstance.token, keycloakInstance.refreshToken, keycloakInstance.tokenParsed);
      setupTokenUpdater();
    } else {
      logger.info("服务器同步完成：用户未登录");
      handleAuthFailure();
    }
  } catch (e) {
    logger.error("SDK 初始化失败");
    handleAuthFailure();
  } finally {
    if (typeof doneCallback === 'function') doneCallback();
  }
}

async function startSilentRefresh(existingToken, existingRefreshToken) {
  const silentInstance = new Keycloak(KEYCLOAK_CONFIG);
  try {
    await silentInstance.init({
      token: existingToken,
      refreshToken: existingRefreshToken,
      checkLoginIframe: false,
      onLoad: undefined
    });
    keycloakInstance = silentInstance;
    logger.info("静默续期实例已挂载");
    setupTokenUpdater();
  } catch (e) {
    logger.warn("静默实例启动失败，回退至完整初始化");
    await performFullInit(() => {
    });
  }
}

function setupTokenUpdater() {
  // 1. 清理之前的旧定时器，防止多个定时器冲突
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  const checkToken = async () => {
    if (!keycloakInstance) return;

    try {
      // 2. updateToken(CACHE_TIMES.SECONDS_OF_REFRESH_THRESHOLD) 这里的阈值应大于刷新间隔，确保在 Token 过期前完成请求
      const expiresIn = keycloakInstance.tokenParsed.exp - Math.floor(Date.now() / 1000);
      const refreshed = await keycloakInstance.updateToken(CACHE_TIMES.SECONDS_OF_REFRESH_THRESHOLD);
      logger.info(`定时器检测是否执行续期。当前Token剩余时间：${expiresIn}s`)
      if (refreshed) {
        logger.success("续期成功：已更新本地令牌");
        localStorage.setItem(STORAGE_KEYS.TOKEN, keycloakInstance.token);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, keycloakInstance.refreshToken);
      }

      // 3. 递归 setTimeout 比 setInterval 更安全，避免请求堆积
      refreshTimer = setTimeout(checkToken, CACHE_TIMES.MILLISECONDS_OF_REFRESH_INTERVAL);
    } catch (e) {
      logger.error("Token 续期过程彻底失败，会话可能已过期", e);
      // 4. 如果续期失败，清空本地无效 Token，避免下次加载继续报错
      handleAuthFailure();
      // 不再递归，停止续期
    }
  };

  refreshTimer = setTimeout(checkToken, CACHE_TIMES.MILLISECONDS_OF_REFRESH_INTERVAL);
}

function handleAuthSuccess(token, refreshToken, payload) {
  localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  localStorage.removeItem(STORAGE_KEYS.GUEST_DATA);
  updateLoggedInUI(payload);
  // 配合文章解锁
  if (typeof window.forceUnlockArticle === 'function') {
    window.forceUnlockArticle();
  }
}

function handleAuthFailure() {
  const cache = {mode: 'logged_out', expire: Date.now() + CACHE_TIMES.SECONDS_OF_UNAUTH_HINT * 1000};
  localStorage.setItem(STORAGE_KEYS.GUEST_DATA, JSON.stringify(cache));
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  sessionStorage.clear();
  updateLoggedOutUI();
}

/**
 * 清理指定的 URL 参数，保持地址栏干净
 * @param {string[]} keys - 需要清理的参数名数组，如 ['code', 'state', 'action']
 */
function cleanUrlParams(keys = ['code', 'state', 'action', 'session_state', 'iss']) {
  const url = new URL(window.location.href);
  let changed = false;

  keys.forEach(key => {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  });

  if (changed) {
    // 使用 replaceState 修改 URL 且不产生历史记录
    const newUrl = url.pathname + url.search + url.hash;
    window.history.replaceState({}, document.title, newUrl);
    logger.info("URL 已净化，移除参数: " + keys.join(', '));
  }
}