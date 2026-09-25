// Three restrained presentation styles, shared by every content page.
window.createPageMotion = function ({main, reduced}) {
  let observer = null;
  let interaction = null;
  const effects = new Map();
  function cancel() {
    observer?.disconnect(); observer = null;
    interaction?.abort(); interaction = null;
    effects.forEach(item => item.cancel()); effects.clear();
  }
  function play(page, {delay = 0} = {}) {
    cancel();
    if (reduced.matches || !Element.prototype.animate) return;
    const style = page.dataset.motion || 'rise';
    const selector = style === 'stagger'
      ? '.page-heading,.project-card,.article-row,.platform-row'
      : style === 'focus'
        ? '.page-heading,.about-profile>img,.about-profile>div,.prose>*,.text-link'
        : '.page-heading,.document-meta,.content-note,.prose>*,.text-link';
    const targets = [...page.querySelectorAll(selector)];
    const viewport = main.getBoundingClientRect();
    const start = element => {
      const item = effects.get(element);
      if (item?.playState === 'paused') { observer?.unobserve(element); item.play(); }
    };
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) start(entry.target); });
      }, {root:main, threshold:.08});
    }
    let visibleIndex = 0;
    targets.forEach(element => {
      const rect = element.getBoundingClientRect();
      const visible = rect.bottom > viewport.top && rect.top < viewport.bottom;
      let from = {opacity:0, transform:'translateY(12px)'};
      if (style === 'stagger' && !element.matches('.page-heading')) from = {opacity:0, transform:'translateX(16px)'};
      if (style === 'focus') from = element.matches('img')
        ? {opacity:0, transform:'scale(.96)'} : {opacity:0, transform:'translateY(8px)'};
      const item = element.animate([from, {opacity:1, transform:'none'}], {
        duration:style === 'focus' ? 800 : 680,
        delay:visible ? delay + Math.min(visibleIndex++ * 90, 540) : 40,
        easing:'cubic-bezier(.2,.75,.2,1)', fill:'backwards'
      });
      effects.set(element, item);
      const release = () => { if (effects.get(element) === item) effects.delete(element); };
      item.onfinish = item.oncancel = release;
      if (!visible && observer) { item.pause(); observer.observe(element); }
    });
    interaction = new AbortController();
    // Let the reader interact immediately, while retaining reveals further down.
    for (const type of ['pointerdown','keydown','focusin']) {
      main.addEventListener(type, () => {
        effects.forEach((item, element) => {
          if (item.playState !== 'paused' || element.contains(document.activeElement)) {
            observer?.unobserve(element); item.cancel(); effects.delete(element);
          }
        });
      }, {capture:true,passive:true,signal:interaction.signal});
    }
  }
  return {play, cancel};
};
