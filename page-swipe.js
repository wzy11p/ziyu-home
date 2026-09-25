// Native wheel/touch navigation. Reading inside a long page always takes priority.
window.enablePageSwipe = function ({element, isEnabled, isMoving, canMove, move}) {
  const editable = target => target.closest('input,textarea,select,[contenteditable="true"],[data-native-scroll]');
  const canScroll = direction => direction > 0
    ? element.scrollTop + element.clientHeight < element.scrollHeight - 3
    : element.scrollTop > 3;
  const nestedCanScroll = (target, direction) => {
    for (let node = target; node && node !== element; node = node.parentElement) {
      if (node.scrollHeight <= node.clientHeight + 3 || !/(auto|scroll)/.test(getComputedStyle(node).overflowY)) continue;
      if (direction > 0 ? node.scrollTop + node.clientHeight < node.scrollHeight - 3 : node.scrollTop > 3) return true;
    }
    return false;
  };
  let lastWheel = -Infinity, distance = 0, wheelDirection = 0;
  let consumed = false, usedForContent = false;
  element.addEventListener('wheel', event => {
    if (!isEnabled() || event.ctrlKey || editable(event.target) || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1);
    if (Math.abs(delta) < .5) return;
    const now = performance.now(), direction = Math.sign(delta);
    if (now - lastWheel > 220) {
      distance = 0; consumed = false; usedForContent = false; wheelDirection = direction;
    }
    lastWheel = now;
    if (isMoving() || consumed) { event.preventDefault(); return; }
    if (nestedCanScroll(event.target, direction)) { usedForContent = true; return; }
    if (canScroll(direction)) { distance = 0; usedForContent = true; return; }
    if (!canMove(direction)) return;
    event.preventDefault();
    // A gesture that scrolled the text must end before it may turn the page.
    if (usedForContent) return;
    if (wheelDirection !== direction) { distance = 0; wheelDirection = direction; }
    distance += Math.abs(delta);
    if (distance >= 85) {
      consumed = true; distance = 0;
      move(direction);
    }
  }, {passive:false});

  let touch = null;
  element.addEventListener('touchstart', event => {
    touch = null;
    if (!isEnabled() || isMoving() || event.touches.length !== 1 || editable(event.target)) return;
    const point = event.touches[0];
    touch = {x:point.clientX, y:point.clientY, dx:0, dy:0, reading:false, started:performance.now()};
  }, {passive:true});
  element.addEventListener('touchmove', event => {
    if (!touch) return;
    if (event.touches.length !== 1 || !isEnabled()) { touch = null; return; }
    const point = event.touches[0];
    touch.dx = touch.x - point.clientX;
    touch.dy = touch.y - point.clientY;
    if (Math.abs(touch.dy) < 8 || Math.abs(touch.dy) < Math.abs(touch.dx) * 1.2) return;
    const direction = Math.sign(touch.dy);
    if (canScroll(direction) || nestedCanScroll(event.target, direction)) touch.reading = true;
    if (!touch.reading && canMove(direction)) event.preventDefault();
  }, {passive:false});
  element.addEventListener('touchend', () => {
    const gesture = touch; touch = null;
    if (!gesture || gesture.reading || !isEnabled() || isMoving()) return;
    if (performance.now() - gesture.started > 1200 || Math.abs(gesture.dy) < 64 || Math.abs(gesture.dy) < Math.abs(gesture.dx) * 1.2) return;
    const direction = Math.sign(gesture.dy);
    if (!canScroll(direction) && canMove(direction)) move(direction);
  }, {passive:true});
  element.addEventListener('touchcancel', () => { touch = null; }, {passive:true});
  element.addEventListener('keydown', event => {
    if (!isEnabled() || editable(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
    const direction = event.key === 'PageDown' ? 1 : event.key === 'PageUp' ? -1 : 0;
    if (!direction || canScroll(direction) || !canMove(direction)) return;
    event.preventDefault();
    if (!event.repeat && !isMoving()) move(direction);
  });
};
