(() => {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.querySelectorAll('.welcome-links .quick-link').forEach(link => {
    link.addEventListener('pointermove', event => {
      const bounds = link.getBoundingClientRect();
      link.style.setProperty('--pointer-x', `${event.clientX - bounds.left}px`);
      link.style.setProperty('--pointer-y', `${event.clientY - bounds.top}px`);
    }, { passive: true });
    link.addEventListener('pointerleave', () => {
      link.style.removeProperty('--pointer-x');
      link.style.removeProperty('--pointer-y');
    });
  });
})();
