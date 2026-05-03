// https://blog.liushen.fun/posts/40702a0d/
// 打字机效果
function typeTextMachineStyle(text, targetSelector, options = {}) {
    const {
        delay = 5,
        startDelay = 400,
        onComplete = null,
        clearBefore = true,
        eraseBefore = true, // 新增：是否以打字机方式清除原文本
        eraseDelay = 30,    // 新增：删除每个字符的间隔
    } = options;

    const el = document.querySelector(targetSelector);
    if (!el || typeof text !== "string") return;

    setTimeout(() => {
        const startTyping = () => {
            let index = 0;
            function renderChar() {
                if (index <= text.length) {
                    el.textContent = text.slice(0, index++);
                    setTimeout(renderChar, delay);
                } else {
                    onComplete && onComplete(el);
                }
            }
            renderChar();
        };

        if (clearBefore) {
            if (eraseBefore && el.textContent.length > 0) {
                let currentText = el.textContent;
                let eraseIndex = currentText.length;

                function eraseChar() {
                    if (eraseIndex > 0) {
                        el.textContent = currentText.slice(0, --eraseIndex);
                        setTimeout(eraseChar, eraseDelay);
                    } else {
                        startTyping(); // 删除完毕后开始打字
                    }
                }

                eraseChar();
            } else {
                el.textContent = "";
                startTyping();
            }
        } else {
            startTyping();
        }
    }, startDelay);
}

function renderAISummary() {
  const summaryEl = document.querySelector('.ai-summary .ai-explanation');
  if (!summaryEl) return;

  const summaryText = summaryEl.getAttribute('data-summary');
  if (!summaryText) return;

  // --- 新逻辑：动态等待与精确捕获 ---

  // 1. 先把文字直接塞进去，但不显示（visibility: hidden）
  // 这样它会在后台撑开应有的高度，无论是否加密
  summaryEl.style.visibility = 'hidden';
  summaryEl.style.height = 'auto';
  summaryEl.textContent = summaryText;

  // 2. 定义一个检查高度的函数（处理加密文章的异步显示）
  const tryLockHeight = () => {
    // 使用 scrollHeight 获取内容真实高度，getBoundingClientRect 获取渲染高度
    // 这是最精确的高度获取方式
    const rect = summaryEl.getBoundingClientRect();
    const contentHeight = summaryEl.scrollHeight;

    // 如果高度太小（说明文章还没解密，或者容器还被隐藏着）
    if (contentHeight < 10 || rect.width === 0) {
      setTimeout(tryLockHeight, 100); // 100ms 后重试，直到解密完成容器可见
      return;
    }

    // 3. 此时已经拿到了真实的、解密后的最终高度
    // 固定它！为了保险，可以多加 1-2px 的缓冲
    summaryEl.style.height = (contentHeight + 2) + 'px';
    summaryEl.style.visibility = 'visible'; // 恢复显示
    summaryEl.textContent = ""; // 清空，准备打字机开始

    // 4. 开始打字
    typeTextMachineStyle(summaryText, ".ai-summary .ai-explanation", {
      onComplete: (el) => {
        // 打字结束，释放高度限制
        el.style.height = 'auto';
      }
    });
  };

  tryLockHeight();
}

document.addEventListener('pjax:complete', renderAISummary);
document.addEventListener('DOMContentLoaded', renderAISummary);
