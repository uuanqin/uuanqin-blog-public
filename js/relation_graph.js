/**
 * Hexo 知识图谱插件逻辑 - 宏观分类增强版 (修复版)
 */
async function initKnowledgeGraph(containerId, jsonPath, isSidebar = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // 1. 加载数据
  const response = await fetch(jsonPath);
  const rawData = await response.json();

  // 2. 基础配置
  const config = {
    repulsion: -150,
    distance: 50,
    collideRadius: 15,
    gravity: 0.1,
    radialStrength: 0.1,
    friction: 0.5,
    particles: isSidebar ? 0 : 2,
    arrowLength: isSidebar ? 0 : 3.5,
    fadeInThreshold: 0.08, // 当 alpha 低于此值时开始浮现分类名
    fadeInSpeed: 0.02      // 渐显速度
  };

  // 3. 数据处理
  const nodes = Object.values(rawData)
    .filter(d => d.isDraft !== true)
    .map(d => {
      const rawAttr = d.attrs['data-cate'] || "";
      const parts = rawAttr.split(' / ');
      return {
        id: d.id,
        name: d.title,
        path: d.path,
        mainCategory: parts[0],
        depth: parts.length,
        val: (d.bi_links.inbounds.length * 1.5) + 8
      };
    });

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const links = [];
  Object.values(rawData).forEach(node => {
    node.bi_links.outbounds.forEach(out => {
      if (nodeMap.has(out.id)) {
        links.push({source: node.id, target: out.id});
      }
    });
  });

  const data = {nodes, links};

  // 4. 颜色与缓存
  const mainCategories = Array.from(new Set(nodes.map(d => d.mainCategory)));
  const mainCategoryScale = d3.scaleOrdinal(d3.schemeTableau10).domain(mainCategories);

  const colorScale = (node) => {
    const baseColor = d3.hsl(mainCategoryScale(node.mainCategory));
    baseColor.s -= (node.depth - 1) * 0.05;
    baseColor.l = Math.min(0.95, 0.45 + (node.depth - 1) * 0.12);
    return baseColor.toString();
  };

  data.links.forEach(link => {
    const a = nodeMap.get(typeof link.source === 'object' ? link.source.id : link.source);
    const b = nodeMap.get(typeof link.target === 'object' ? link.target.id : link.target);
    if (a && b) {
      if (!a.neighbors) a.neighbors = [];
      if (!b.neighbors) b.neighbors = [];
      if (!a.links) a.links = [];
      if (!b.links) b.links = [];
      a.neighbors.push(b);
      b.neighbors.push(a);
      a.links.push(link);
      b.links.push(link);
    }
  });

  const highlightNodes = new Set();
  const highlightLinks = new Set();
  let hoverNode = null;
  let categoryOpacity = 0;
  let isStable = false;
  let stabilityTimer = null;

  const catConfig = {
    minArticles: 3,       // 少于这个数量的分类不显示名称
    baseSize: isSidebar ? 14 : 20, // 基础字号
    sizeMultiplier: 4     // 数量增加时的字号增长权重
  };

  const resetStability = () => {
    isStable = false;
    categoryOpacity = 0;
    if (stabilityTimer) clearTimeout(stabilityTimer);
    stabilityTimer = setTimeout(() => {
      isStable = true;
    }, 2500); //
  };
  resetStability();

  // 5. 初始化图谱
  const width = container.offsetWidth;
  const height = container.offsetHeight || 600;

  const Graph = ForceGraph()(container)
    .graphData(data)
    .width(width)
    .height(height)
    .nodeId('id')
    .nodeVal('val')
    .nodeLabel(null)
    .nodeColor(node => colorScale(node))
    .nodePointerAreaPaint((node, color, ctx) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, Math.sqrt(node.val) * 2 + 2, 0, 2 * Math.PI, false);
      ctx.fill();
    })
    .nodeCanvasObject((node, ctx, globalScale) => {
      const r = Math.sqrt(node.val) * 2;
      const isHighlighted = highlightNodes.has(node);
      const isHovered = (node === hoverNode); // 是否是当前鼠标直接悬停的节点

      // 检测夜间模式 (根据 Hexo 主题常见的实现方式)
      const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark'
        || document.body.classList.contains('dark-mode');

      // 1. 设置透明度：非高亮节点变淡
      ctx.globalAlpha = (hoverNode && !isHighlighted) ? 0.1 : 1;

      // 2. 绘制高亮光晕
      if (isHighlighted) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + (isHovered ? 5 : 2), 0, 2 * Math.PI, false);
        // 悬停节点使用强调色（白或深灰），关联节点使用分类色
        ctx.fillStyle = isHovered
          ? (isDarkMode ? '#fff' : '#222')
          : colorScale(node);
        ctx.fill();
      }

      // 3. 绘制节点主体
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
      ctx.fillStyle = colorScale(node);
      ctx.fill();

      // 4. 绘制标题
      if (isHighlighted) {
        // 动态计算字号：Hover 的节点标题更大
        const baseFontSize = isHovered ? 14 : 11;
        const fontSize = baseFontSize / globalScale;

        ctx.font = `${isHovered ? '900' : 'bold'} ${fontSize}px Sans-Serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 颜色适配夜间模式
        if (isHovered) {
          // 直接悬停的节点：使用鲜明的反色
          ctx.fillStyle = isDarkMode ? '#fff' : '#000';
        } else {
          // 仅是被高亮的关联节点：使用柔和的颜色
          ctx.fillStyle = isDarkMode ? '#bbb' : '#444';
        }

        // 绘制描边以增强可读性（可选）
        ctx.strokeStyle = isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2 / globalScale;
        ctx.strokeText(node.name, node.x, node.y + r + fontSize + 3);

        ctx.fillText(node.name, node.x, node.y + r + fontSize + 3);
      }

      ctx.globalAlpha = 1;
    })
    // --- 修复：正确获取 alpha 并处理分类名 ---
    .onRenderFramePost((ctx, globalScale) => {
      // 1. 稳定性控制
      if (isStable && !hoverNode) {
        categoryOpacity = Math.min(1, categoryOpacity + 0.02);
      } else {
        categoryOpacity = Math.max(0, categoryOpacity - 0.05);
      }

      if (categoryOpacity <= 0) return;

      // 2. 聚合分类坐标及计数
      const catStats = {};
      nodes.forEach(n => {
        if (!catStats[n.mainCategory]) {
          catStats[n.mainCategory] = {x: 0, y: 0, count: 0};
        }
        catStats[n.mainCategory].x += n.x;
        catStats[n.mainCategory].y += n.y;
        catStats[n.mainCategory].count++;
      });

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      Object.keys(catStats).forEach(cat => {
        const stats = catStats[cat];

        // 3. 过滤逻辑：数量太少不显示
        if (stats.count < catConfig.minArticles) return;

        const avgX = stats.x / stats.count;
        const avgY = stats.y / stats.count;

        // 4. 动态字号计算：基础字号 + 开方(数量) * 权重
        // 使用开方是为了防止文章极多时字号变得大得离谱
        const dynamicSize = catConfig.baseSize + Math.sqrt(stats.count) * catConfig.sizeMultiplier;
        const fontSize = dynamicSize / globalScale;

        ctx.font = `900 ${fontSize}px "Inter", "PingFang SC", sans-serif`;

        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        const baseColor = d3.hsl(mainCategoryScale(cat));
        // 这里的 0.3 是文字最大透明度，可以根据审美调高至 0.5
        if (isDarkMode) {
          baseColor.l = Math.max(baseColor.l, 0.7); // 确保文字够亮
        } else {
          baseColor.l = Math.min(baseColor.l, 0.4); // 确保文字够深
        }

        ctx.fillStyle = `rgba(${baseColor.rgb().r}, ${baseColor.rgb().g}, ${baseColor.rgb().b}, ${categoryOpacity * 0.4})`;
        ctx.fillText(cat, avgX, avgY);
      });
      ctx.restore();
    })
    .linkDirectionalArrowLength(config.arrowLength)
    .linkDirectionalArrowRelPos(1)
    .linkCurvature(0.1)
    .linkDirectionalParticles(link => highlightLinks.has(link) ? 4 : 1)
    .linkDirectionalParticleSpeed(link => highlightLinks.has(link) ? 0.01 : 0.005)
    .linkColor(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const sourceNode = nodeMap.get(sourceId);
      if (hoverNode && !highlightLinks.has(link)) return 'rgba(200,200,200,0.05)';
      return sourceNode ? d3.hsl(colorScale(sourceNode)).copy({opacity: 0.2}).toString() : '#ccc';
    })
    .onNodeClick(node => {
      window.location.href = `/${node.path}`;
    })
    .onNodeHover(node => {
      if (node === hoverNode) return;
      highlightNodes.clear();
      highlightLinks.clear();
      if (node) {
        highlightNodes.add(node);
        node.neighbors?.forEach(n => highlightNodes.add(n));
        node.links?.forEach(l => highlightLinks.add(l));
      }
      hoverNode = node;
      container.style.cursor = node ? 'pointer' : null;
    })
    .onNodeDrag(() => {
      isStable = false;
      categoryOpacity = 0;
      if (stabilityTimer) clearTimeout(stabilityTimer);
    })
    .onNodeDragEnd(() => {
      resetStability();
    })
  ;

  // 6. 物理引擎微调 (修正中心坐标为容器中心)
  Graph.d3Force('charge').strength(config.repulsion).distanceMax(500);
  Graph.d3Force('link').distance(config.distance);
  Graph.d3Force('center', d3.forceCenter(width / 2 - 400, height / 2 - 300).strength(config.gravity));
  Graph.d3Force('radial', d3.forceRadial(0, width / 2, height / 2).strength(config.radialStrength));
  Graph.d3Force('collide', d3.forceCollide().radius(n => Math.sqrt(n.val) * 2 + config.collideRadius));
  Graph.d3VelocityDecay(config.friction);

  window.addEventListener('resize', () => {
    const newWidth = container.offsetWidth;
    const newHeight = container.offsetHeight || 600;
    Graph.width(newWidth).height(newHeight);
    Graph.d3Force('center', d3.forceCenter(newWidth / 2, newHeight / 2));
  });
}