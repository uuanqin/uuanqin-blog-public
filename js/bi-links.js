// 用于解决遮挡问题

document.addEventListener('DOMContentLoaded', function() {
    // 获取所有 .aclass 元素
    const aclassElements = document.querySelectorAll('.table-wrap');

    aclassElements.forEach(function(tableWrapElement) {
        // 检查 .aclass 元素是否包含 .b 类的 span 元素
        if (tableWrapElement.querySelector('span.bilink-pop-up')) {
            // 如果包含，则设置 overflow: visible;
            tableWrapElement.style.overflow = 'visible';
        }
    });
});

(function() {
  let hoverTimer = null;
  let hideTimer = null;
  let previewCard = null;

  // 创建全局唯一的预览窗
  function createPreviewCard() {
    if (previewCard) return;
    previewCard = document.createElement('div');
    previewCard.id = 'bilink-preview-card';
    previewCard.innerHTML = `
            <img class="preview-cover" src="" alt="cover">
            <div class="preview-content">
                <p class="preview-desc"></p>
            </div>
        `;
    document.body.appendChild(previewCard);

    // 鼠标进入预览窗，取消隐藏逻辑
    previewCard.onmouseenter = () => clearTimeout(hideTimer);
    previewCard.onmouseleave = hideCard;
  }

  let currentActiveSpan = null;
  function showCard(e, el) {
    const cover = el.getAttribute('data-cover');
    const desc = el.getAttribute('data-desc');

    // 校验：只有非草稿、非受限，且具备封面和简介的才显示
    const isDraft = el.href.includes('/draft_post/');
    const isAuth = el.getAttribute('data-auth') === 'true';
    if (isDraft || isAuth || !cover || !desc) return;

    const popupSpan = el.querySelector('.bilink-pop-up');
    if (popupSpan) {
      popupSpan.style.display = 'none'; // 强制关掉 CSS 的 hover 效果
      currentActiveSpan = popupSpan;
    }

    // 填充内容
    previewCard.querySelector('.preview-cover').src = cover;
    previewCard.querySelector('.preview-desc').textContent = desc;

    // 计算位置（显示在链接上方）
    const rect = el.getBoundingClientRect();
    const cardWidth = 280;
    const cardHeight = previewCard.offsetHeight || 220;

    let top = rect.top + window.scrollY - cardHeight + 2;
    let left = rect.left + window.scrollX + (rect.width / 2) - (cardWidth / 2);
    // 边界检查：不要超出屏幕右侧
    if (left + cardWidth > window.innerWidth) left = window.innerWidth - cardWidth - 10;
    if (left < 10) left = 10;

    previewCard.style.top = `${top}px`;
    previewCard.style.left = `${left}px`;
    previewCard.classList.add('show');

    // 点击预览窗跳转
    previewCard.onclick = () => window.location.href = el.href;
  }

  function hideCard() {
    hideTimer = setTimeout(() => {
      if (previewCard) {
        previewCard.classList.remove('show');
        // [核心]：隐藏小窗时，移除链接的标记类
        if (currentActiveSpan) {
          currentActiveSpan.style.display = ''; // 恢复 CSS 控制
          currentActiveSpan = null;
        }
      }
    }, 200);
  }

  function initEvents() {
    createPreviewCard();
    const links = document.querySelectorAll('.uuanqin-bilink');

    links.forEach(el => {
      el.onmouseenter = (e) => {
        clearTimeout(hideTimer);
        // 悬停阈值：500ms
        hoverTimer = setTimeout(() => showCard(e, el), 500);
      };

      el.onmouseleave = () => {
        clearTimeout(hoverTimer);
        hideCard();
      };
    });
  }

  // 兼容 PJAX
  document.addEventListener('pjax:complete', initEvents);
  document.addEventListener('DOMContentLoaded', initEvents);
})();