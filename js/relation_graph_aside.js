/**
 * Butterfly 侧边栏局部关系图 - 性能优化与链路增强版
 */
(function() {
  let asideGraphInstance = null;
  let themeObserver = null;

  async function initAsideGraph() {
    const cardWidget = document.querySelector('.card-knowledge-graph');
    const container = document.getElementById('aside-graph-container');

    if (!container || !cardWidget) return;

    if (asideGraphInstance) {
      asideGraphInstance.pauseAnimation();
      asideGraphInstance = null;
    }
    if (themeObserver) {
      themeObserver.disconnect();
      themeObserver = null;
    }
    container.innerHTML = '';

    const normalizePath = (p) => {
      if (!p) return '';
      return p.replace(/index\.html$/, '').replace(/^\/|\/$/g, '').toLowerCase();
    };

    const currentPath = normalizePath(window.location.pathname);

    if (!document.getElementById('post') && !document.getElementById('page')) {
      cardWidget.style.display = 'none';
      return;
    }

    try {
      const response = await fetch('/api/backlinks.json');
      const fullData = await response.json();
      const allEntries = Object.values(fullData);
      const centerNodeData = allEntries.find(d => normalizePath(d.path) === currentPath);

      if (!centerNodeData || (centerNodeData.bi_links.inbounds.length === 0 && centerNodeData.bi_links.outbounds.length === 0)) {
        cardWidget.style.display = 'none';
        return;
      }

      cardWidget.style.display = 'block';

      const neighborIds = new Set([centerNodeData.id]);
      centerNodeData.bi_links.outbounds.forEach(l => neighborIds.add(l.id));
      centerNodeData.bi_links.inbounds.forEach(l => neighborIds.add(l.id));

      const canvasWidth = container.offsetWidth;
      const canvasHeight = 300;

      const filteredNodes = allEntries
        .filter(d => neighborIds.has(d.id))
        .map(d => {
          const isCenter = d.id === centerNodeData.id;
          return {
            id: d.id,
            name: d.title,
            path: d.path,
            isCenter: isCenter,
            val: isCenter ? 30 : 15,
          };
        });

      const filteredLinks = [];
      allEntries.forEach(node => {
        if (neighborIds.has(node.id)) {
          node.bi_links.outbounds.forEach(out => {
            if (neighborIds.has(out.id)) {
              filteredLinks.push({
                source: node.id,
                target: out.id,
                isOut: node.id === centerNodeData.id
              });
            }
          });
        }
      });

      asideGraphInstance = ForceGraph()(container)
        .graphData({ nodes: filteredNodes, links: filteredLinks })
        .width(canvasWidth)
        .height(canvasHeight)
        .backgroundColor('rgba(0,0,0,0)')
        .nodeCanvasObject((node, ctx, globalScale) => {
          const r = Math.sqrt(node.val) * 1.6;
          const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

          // 1. 绘制节点球体
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
          ctx.fillStyle = node.isCenter ? '#3399ff' : (isDarkMode ? '#888' : '#aaa');
          ctx.fill();

          // 2. 绘制标题（智能换行版）
          const label = node.name;
          const fontSize = 11 / globalScale;
          ctx.font = `${node.isCenter ? 'bold' : 'normal'} ${fontSize}px Sans-Serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = isDarkMode ? '#ccc' : '#333';

          if (node.isCenter || globalScale > 1.2) {
            const maxWidth = 160 / globalScale;
            // 使用正则将文本拆分为：英文单词 或 单个中文字符
            // 这能保证英文单词作为一个整体，而中文可以随时断开
            const tokens = label.match(/[\u4e00-\u9fa5]|[a-zA-Z0-9'-]+|\s+|[^\s\w]/g) || [];

            let lines = [];
            let currentLine = '';

            tokens.forEach(token => {
              // 如果是纯空格且当前行是空的，跳过，避免行首空格
              if (token.trim() === '' && currentLine === '') return;

              let testLine = currentLine + token;
              let metrics = ctx.measureText(testLine);

              if (metrics.width > maxWidth && currentLine !== '') {
                lines.push(currentLine.trim());
                currentLine = token;
              } else {
                currentLine = testLine;
              }
            });
            lines.push(currentLine.trim());

            // 限制最多显示 3 行，避免遮挡其他节点
            const displayLines = lines.slice(0, 3);
            const lineHeight = fontSize + 2;

            displayLines.forEach((l, i) => {
              ctx.fillText(l, node.x, node.y + r + 4 + (i * lineHeight));
            });
          }
        })
        .linkColor(d => {
          const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
          // 出链使用稍亮的蓝色区分
          if (d.isOut) return isDark ? 'rgba(51, 153, 255, 0.4)' : 'rgba(51, 153, 255, 0.2)';
          return isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
        })
        .linkCurvature(0.05) // 添加这一行，数值越大弯曲度越高，0.2 是比较优雅的弧度
        .linkDirectionalArrowLength(4)
        .linkDirectionalArrowRelPos(1)
        .cooldownTicks(100) // 降低冷却刻度以提升性能
        .onNodeClick(node => {
          if (!node.isCenter) window.location.href = `/${node.path}`;
        });

      asideGraphInstance.d3Force('charge').strength(-150);
      asideGraphInstance.d3Force('link').distance(70);

      themeObserver = new MutationObserver(() => {
        if (asideGraphInstance) asideGraphInstance.refresh();
      });
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    } catch (err) {
      console.error('Aside Graph Error:', err);
      if (cardWidget) cardWidget.style.display = 'none';
    }
  }

  document.addEventListener('pjax:complete', () => setTimeout(initAsideGraph, 100));
  document.addEventListener('DOMContentLoaded', initAsideGraph);
})();