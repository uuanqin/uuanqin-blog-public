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
  if (summaryText) {
    // 关键步骤：在打字前，先设置一个不可见但占位的副本
    // 或者直接给容器设置高度
    const tempSpan = document.createElement('span');
    tempSpan.style.visibility = 'hidden';
    tempSpan.textContent = summaryText;
    summaryEl.appendChild(tempSpan);

    // 获取计算后的高度并固定
    const finalHeight = tempSpan.offsetHeight+20;
    summaryEl.style.height = finalHeight + 'px';

    // 移除临时占位并开始打字
    summaryEl.removeChild(tempSpan);
    summaryEl.textContent = "";

    typeTextMachineStyle(summaryText, ".ai-summary .ai-explanation", {
      onComplete: (el) => {
        el.style.height = 'auto'; // 打字结束后恢复自动高度，避免响应式缩放时出问题
      }
    });
  }
}

document.addEventListener('pjax:complete', renderAISummary);
document.addEventListener('DOMContentLoaded', renderAISummary);
