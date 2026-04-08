/**
 * 随机文章跳转插件 - 终极优化版
 */
const RANDOM_CONFIG = {
  SITEMAP_URL: '/sitemap.txt',
  PATH_FILTER: '/p/',
  CACHE_KEY: 'random_post_data',
  CACHE_TIME: 24 * 60 * 60 * 1000, // 24小时
  FALLBACK_URL: '/',               // 找不到文章时的兜底地址
  REMOVED_PARAMS: [] // 需要过滤的敏感参数，示例：['code', 'state']
};

async function randomPost() {
  // --- 1. 辅助函数：用户友好提示 (Snackbar) ---
  const showNotice = (msg) => {
    let snack = document.getElementById('random-snack');
    if (!snack) {
      snack = document.createElement('div');
      snack.id = 'random-snack';
      // 极简内联样式：深色圆角、居中浮动、淡入淡出
      Object.assign(snack.style, {
        position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
        backgroundColor: '#333', color: '#fff', padding: '10px 20px', borderRadius: '5px',
        zIndex: '9999', fontSize: '14px', transition: 'opacity 0.3s'
      });
      document.body.appendChild(snack);
    }
    snack.innerText = msg;
    snack.style.opacity = '1';
    setTimeout(() => snack.style.opacity = '0', 2000);
  };

  try {
    let urls = [];
    const cached = localStorage.getItem(RANDOM_CONFIG.CACHE_KEY);
    const now = Date.now();

    // --- 2. 获取数据 (缓存优先) ---
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (now - timestamp < RANDOM_CONFIG.CACHE_TIME) urls = data;
    }

    if (urls.length === 0) {
      showNotice('正在同步文章列表...');
      const res = await fetch(RANDOM_CONFIG.SITEMAP_URL);
      if (!res.ok) throw new Error();
      const text = await res.text();

      urls = text.split('\n')
        .map(l => l.trim())
        .filter(l => l !== '')
        .map(u => {
          try {
            let p = new URL(u).pathname;
            return p.endsWith('/') ? p : p + '/';
          } catch(e) { return null; }
        })
        .filter(p => p && p.includes(RANDOM_CONFIG.PATH_FILTER));

      localStorage.setItem(RANDOM_CONFIG.CACHE_KEY, JSON.stringify({ data: urls, timestamp: now }));
    }

    // --- 3. 随机筛选 ---
    const current = window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/';
    const candidates = urls.filter(p => p !== current);

    if (candidates.length === 0) {
      showNotice('没有发现其他文章，正在返回主页...');
      setTimeout(() => location.href = RANDOM_CONFIG.FALLBACK_URL, 1500);
      return;
    }

    const targetPath = candidates[Math.floor(Math.random() * candidates.length)];

    // --- 4. URL 净化与跳转 ---
    const params = new URLSearchParams(window.location.search);
    RANDOM_CONFIG.REMOVED_PARAMS.forEach(p => params.delete(p));

    const search = params.toString() ? '?' + params.toString() : '';
    const finalUrl = targetPath + search + window.location.hash;

    showNotice('正在穿越到随机文章...');
    setTimeout(() => location.href = finalUrl, 800); // 留出一点时间让用户看到提示

  } catch (err) {
    console.error('RandomPost Error:', err);
    showNotice('跳转失败，正在返回主页...');
    setTimeout(() => location.href = RANDOM_CONFIG.FALLBACK_URL, 1500);
  }
}