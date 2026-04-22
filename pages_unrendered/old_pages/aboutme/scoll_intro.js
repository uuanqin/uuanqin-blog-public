gsap.registerPlugin(ScrollTrigger);

const images = gsap.utils.toArray('img');
const loader = document.querySelector('.loader--text');
const updateProgress = (instance) => {
  var num = Math.round(instance.progressedCount * 100 / images.length)
  loader.textContent = `${num}%`;

  // 进度条为100则展现
  if (num === 100){
    console.log("进度条到达100")
    setTimeout(()=>{
      console.log("展现")
  // Qin: 让网页的其他元素展现
  document.getElementById("accordion").style.visibility="visible";
  document.getElementById("timeline").style.visibility="visible";
    }, 2000);
  }
}

const showDemo = () => {
  document.body.style.overflow = 'auto';
  document.scrollingElement.scrollTo(0, 0);
  gsap.to(document.querySelector('.loader'), { autoAlpha: 0 });
  
  gsap.utils.toArray('section').forEach((section, index) => {
    const w = section.querySelector('.wrapper');
    // Qin: 我们主页有很多个section，选不到就跳过
    if (w===null)return;
    
    const [x, xEnd] = (index % 2) ? ['100%', (w.scrollWidth - section.offsetWidth) * -1] : [w.scrollWidth * -1, 0];
    gsap.fromTo(w, {  x  }, {
      x: xEnd,
      scrollTrigger: { 
        trigger: section, 
        scrub: 0.5
      }
    });
  });
}

imagesLoaded(images).on('progress', updateProgress).on('always', showDemo);
