/**
 * 文章权限门禁系统 (Auth Gate)
 * 支持：L1 软遮罩 / L2 物理加密解密
 */

const AUTH_CONFIG = {
  // 你的 Vercel 云函数地址
  keyServer: 'https://article.auth.uuanqin.top/api/get_post_key',
};

const unlockArticle = async () => {
  const contentNode = document.getElementById('auth-real-content');
  const placeholderNode = document.getElementById('auth-lock-placeholder');
  const innerNode = document.getElementById('auth-content-inner');

  if (!contentNode || !placeholderNode) return;

  const mode = contentNode.dataset.mode; // soft 或 strict
  const path = contentNode.dataset.path; // 文章路径
  const localToken = localStorage.getItem('kc_token_data');

  if (!localToken) {
    console.log('%c[Auth-Gate] 未发现登录凭证，请先登录', 'color: #dc3545;');
    return;
  }

  try {
    // 1. 验证 Token 时效性
    const payload = JSON.parse(atob(localToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token Expired');
    }

    // 2. 核心验签
    const isValid = typeof verifySignature === 'function' ? await verifySignature(localToken) : true;
    if (!isValid) throw new Error('Signature Invalid');

    // --- 权限校验通过，开始分模式解锁 ---

    if (mode === 'strict') {
      console.log('[Auth-Gate] 检测到严格加密模式，正在获取解密密钥...');

      // 3. 获取钥匙 (优先缓存)
      let articleKey = sessionStorage.getItem(`key_${path}`);
      if (!articleKey) {
        const response = await fetch(AUTH_CONFIG.keyServer, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ path: path })
        });

        if (!response.ok) throw new Error('Failed to fetch decryption key');
        const data = await response.json();
        articleKey = data.key;
        sessionStorage.setItem(`key_${path}`, articleKey);
      }

      // 4. 执行 AES 解密
      // 此时 innerNode.innerHTML 里的内容是 Hexo 插件生成的密文
      const cipherText = innerNode.innerText.trim();
      const bytes = CryptoJS.AES.decrypt(cipherText, articleKey);
      const originalHtml = bytes.toString(CryptoJS.enc.Utf8);

      if (!originalHtml) throw new Error('Decryption failed (empty result)');

      // 5. 注入明文
      innerNode.innerHTML = originalHtml;
    }

    // --- 统一 UI 解锁 ---
    placeholderNode.remove();
    contentNode.style.display = 'block';
    contentNode.classList.add('show');

    // 6. 激活主题组件（重绘、懒加载、公式等）
    window.dispatchEvent(new Event('resize'));
    if (window.MathJax) MathJax.typeset();
    if (window.prism) Prism.highlightAll();

    console.log(`%c[Auth-Gate] ${mode === 'strict' ? '密文已解密' : '身份验证通过'}，内容解锁成功`, 'color: #28a745; font-weight: bold;');

  } catch (e) {
    console.error('[Auth-Gate] 解锁失败:', e.message);
  }
};

document.addEventListener('DOMContentLoaded', unlockArticle);

// 强制解锁方法适配
window.forceUnlockArticle = unlockArticle;