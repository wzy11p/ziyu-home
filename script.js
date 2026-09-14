const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const toggle = document.querySelector('.motion-toggle');
const video = document.querySelector('.portrait-card video');
let paused = reduce.matches;
let videoVisible = false;
function syncMotion() {
  document.body.classList.toggle('motion-paused', paused);
  document.body.classList.toggle('page-hidden', document.hidden);
  if (toggle) {
    toggle.textContent = paused ? '播放柔光' : '暂停柔光';
    toggle.setAttribute('aria-pressed', String(paused));
  }
  if (video) {
    if (videoVisible && !paused && !document.hidden) video.play().catch(() => {});
    else video.pause();
  }
}
toggle?.addEventListener('click', () => { paused = !paused; syncMotion(); });
reduce.addEventListener('change', () => { paused = reduce.matches; syncMotion(); });
if (video) new IntersectionObserver(([entry]) => {
  videoVisible = entry.isIntersecting;
  syncMotion();
}, { threshold: .15 }).observe(video);
document.addEventListener('visibilitychange', syncMotion);
syncMotion();
// This entry is for the local editor only, never a public admin login.
const adminEntry = document.querySelector('#local-article-admin');
const articleFeed = document.querySelector('.article-feed');
const profileSidebar = document.querySelector('.profile-sidebar');
if (articleFeed && profileSidebar) {
  const sizeFeed = () => {
    if (window.innerWidth <= 600) {
      articleFeed.style.removeProperty('--feed-limit');
      return;
    }
    const bottom = profileSidebar.getBoundingClientRect().bottom;
    const top = articleFeed.getBoundingClientRect().top;
    articleFeed.style.setProperty('--feed-limit', Math.max(240, bottom - top + 20) + 'px');
  };
  new ResizeObserver(sizeFeed).observe(profileSidebar);
  window.addEventListener('resize', sizeFeed);
  document.fonts.ready.then(sizeFeed);
  sizeFeed();
}
if (adminEntry && location.hostname === '127.0.0.1') {
  fetch('/api/articles', {cache:'no-store'})
    .then(response => response.ok ? response.json() : null)
    .then(data => { if (Array.isArray(data?.articles)) adminEntry.hidden = false; })
    .catch(() => {});
}
