// Pixelate only the opening layer; the real homepage stays still underneath.
(() => {
  window.createEntryDissolve = ({entry, duration = 1960}) => {
    const surface = entry.querySelector('.entry-surface');
    const bounds = entry.getBoundingClientRect();
    const width = Math.ceil(bounds.width), height = Math.ceil(bounds.height);
    if (!width || !height) return null;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    const canvas = document.createElement('canvas');
    const snapshot = document.createElement('canvas');
    canvas.className = 'entry-pixels';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.width = snapshot.width = Math.ceil(width * ratio);
    canvas.height = snapshot.height = Math.ceil(height * ratio);
    const ctx = canvas.getContext('2d');
    const ink = snapshot.getContext('2d');
    if (!ctx || !ink) return null;
    ctx.scale(ratio, ratio);
    ink.scale(ratio, ratio);
    ctx.imageSmoothingEnabled = false;
    ink.fillStyle = getComputedStyle(surface).backgroundColor;
    ink.fillRect(0, 0, width, height);

    // Read the real font and positions, so the handover keeps the greeting in place.
    const paintText = (element, text = element.textContent.trim()) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      ink.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      ink.fillStyle = style.color;
      ink.textBaseline = 'alphabetic';
      if ('letterSpacing' in ink) ink.letterSpacing = style.letterSpacing;
      const metrics = ink.measureText(text);
      const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
      const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent;
      const baseline = rect.top - bounds.top + (rect.height - ascent - descent) / 2 + ascent;
      ink.fillText(text, rect.left - bounds.left, baseline);
    };
    const label = entry.querySelector('.entry-name .entry-label');
    const labelRect = label.getBoundingClientRect();
    paintText(label);
    const dot = entry.querySelector('.entry-name .entry-dot');
    const dotRect = dot.getBoundingClientRect();
    ink.fillStyle = getComputedStyle(dot).backgroundColor;
    ink.beginPath();
    ink.arc(dotRect.left - bounds.left + dotRect.width / 2,
      dotRect.top - bounds.top + dotRect.height / 2, dotRect.width / 2, 0, Math.PI * 2);
    ink.fill();
    entry.querySelectorAll('.entry-skip span').forEach(element => paintText(element));

    // Bound the work across phone, laptop and large desktop viewports.
    const cell = Math.max(12, Math.ceil(Math.sqrt(width * height / 2400)));
    const originX = labelRect.left - bounds.left + labelRect.width / 2;
    const originY = labelRect.top - bounds.top + labelRect.height / 2;
    const radius = Math.max(...[[0,0],[width,0],[0,height],[width,height]]
      .map(([x,y]) => Math.hypot(x - originX, y - originY)));
    const noise = (x, y) => {
      const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      return value - Math.floor(value);
    };
    const cells = [];
    for (let y = 0; y < height; y += cell) {
      for (let x = 0; x < width; x += cell) {
        const random = noise(x, y);
        const distance = Math.min(1, Math.hypot(x + cell / 2 - originX, y + cell / 2 - originY) / radius);
        // A coherent outward wave, with only a tiny offset between neighbours.
        cells.push({x, y, w:Math.min(cell, width-x), h:Math.min(cell, height-y),
          start:duration * (.02 + .66 * distance + .015 * random),
          life:duration * .30});
      }
    }
    const draw = elapsed => {
      ctx.clearRect(0, 0, width, height);
      for (const tile of cells) {
        const progress = Math.max(0, (elapsed - tile.start) / tile.life);
        if (progress >= 1) continue;
        // Fade in place: shrinking or highlights create distracting bright gaps.
        const eased = progress * progress * (3 - 2 * progress);
        ctx.globalAlpha = 1 - eased;
        ctx.drawImage(snapshot, tile.x * ratio, tile.y * ratio, tile.w * ratio, tile.h * ratio,
          tile.x, tile.y, tile.w, tile.h);
      }
      ctx.globalAlpha = 1;
    };
    draw(0);
    entry.append(canvas);
    surface.style.opacity = '0';
    let frame, started, settled = false;
    const cleanup = () => {
      settled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', complete);
      canvas.remove();
      surface.style.removeProperty('opacity');
      // Release backing stores when the opening has finished.
      canvas.width = canvas.height = snapshot.width = snapshot.height = 0;
    };
    const controller = {
      onfinish:null, oncancel:null,
      cancel() { if (settled) return; cleanup(); controller.oncancel?.(); }
    };
    function complete() {
      if (settled) return;
      cleanup();
      controller.onfinish?.();
    }
    const tick = now => {
      if (settled) return;
      started ??= now;
      const elapsed = now - started;
      if (elapsed >= duration) { complete(); return; }
      draw(elapsed);
      frame = requestAnimationFrame(tick);
    };
    window.addEventListener('resize', complete);
    frame = requestAnimationFrame(tick);
    return controller;
  };
})();
