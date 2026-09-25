// Personal website routes inside a fixed application shell. No external services.
(() => {
  const shell = document.querySelector('#site');
  const main = document.querySelector('#main');
  const sidebar = document.querySelector('#sidebar');
  const workspace = document.querySelector('.workspace');
  const openButton = document.querySelector('#sidebar-open');
  const closeButton = document.querySelector('#sidebar-close');
  const scrim = document.querySelector('#sidebar-scrim');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 760px)');
  const pages = new Map([...document.querySelectorAll('[data-page]')].map(page => [page.id, page]));
  const positions = new Map();
  const links = [...document.querySelectorAll('[data-route]')];
  let current = null;
  let animation;
  let ghost = null, outgoingAnimation = null;
  let slideUntil = 0;
  // The visible directory is the single source of truth for swipe order.
  const pageOrder = [...sidebar.querySelectorAll('[data-route]')].map(link => link.dataset.route);
  const pageMotion = window.createPageMotion?.({main, reduced});
  const welcomeAnimations = new Set();
  let desktopCollapsed = false;
  let mobileOpen = false;
  const entry = document.querySelector('#entry-screen');
  let entryActive = false;
  let entryExiting = false;
  let entryTimer;
  let entryFade;
  const entryListeners = new AbortController();

  function finishEntry(immediate = false, reveal = true) {
    if (!entryActive) return;
    if (entryExiting && !immediate) return;
    clearTimeout(entryTimer);
    const canAnimate = !immediate && !reduced.matches && Element.prototype.animate;
    const arrive = () => {
      entryActive = false;
      entryExiting = false;
      entryListeners.abort();
      for (const item of [entryFade]) {
        if (item) { item.onfinish = item.oncancel = null; item.cancel(); }
      }
      entryFade = null;
      entry.hidden = true;
      entry.classList.remove('entry-playing');
      shell.inert = false;
      applySidebar();
      document.documentElement.classList.remove('entry-pending');
      if (reveal) pages.get(current).querySelector('h1')?.focus({preventScroll:true});
    };
    if (!canAnimate) {
      finishWelcome();
      arrive();
      return;
    }
    entryExiting = true;
    // The opening alone dissolves; keep the revealed homepage fully settled.
    finishWelcome();
    entryFade = window.createEntryDissolve?.({entry, duration:1960});
    document.documentElement.classList.remove('entry-pending');
    if (!entryFade) { arrive(); return; }
    entryFade.onfinish = arrive;
    entryFade.oncancel = arrive;
  }

  function startEntry() {
    clearTimeout(window.entryFallback);
    const shouldPlay = entry && current === 'home' && !reduced.matches && Element.prototype.animate;
    if (!shouldPlay) {
      document.documentElement.classList.remove('entry-pending');
      unfoldWorkspace();
      return;
    }
    entryActive = true;
    shell.inert = true;
    entry.hidden = false;
    entry.classList.add('entry-playing');
    document.documentElement.classList.add('entry-pending');
    entry.focus({preventScroll:true});
    const options = {signal:entryListeners.signal};
    const skip = entry.querySelector('.entry-skip');
    skip.addEventListener('click', () => finishEntry(true), options);
    entry.addEventListener('keydown', event => {
      if (event.key === 'Escape' || event.key === 'Enter') {
        event.preventDefault();
        finishEntry(true);
      } else if (event.key === 'Tab') {
        event.preventDefault();
        skip.focus({preventScroll:true});
      }
    }, options);
    entryTimer = setTimeout(() => finishEntry(), 2560);
  }

  function finishWelcome() {
    welcomeAnimations.forEach(item => item.cancel());
    welcomeAnimations.clear();
  }

  function unfoldWorkspace(includeChrome = true) {
    if (reduced.matches || !Element.prototype.animate) return;
    const timingScale = 1;
    const interaction = new AbortController();
    const reveal = (element, delay, duration, distance = 6, opacity = 0) => {
      if (!element) return;
      const item = element.animate([
        {opacity, transform: `translateY(${distance}px)`},
        {opacity: 1, transform: 'translateY(0)'}
      ], {
        delay: delay * timingScale,
        duration: duration * timingScale,
        easing: 'cubic-bezier(.2,.75,.2,1)',
        fill: 'backwards'
      });
      welcomeAnimations.add(item);
      const release = () => {
        welcomeAnimations.delete(item);
        if (!welcomeAnimations.size) interaction.abort();
      };
      item.onfinish = release;
      item.oncancel = release;
    };

    // Animate existing content, never an overlay or a layout dimension.
    // The mobile sidebar keeps its own drawer transform and stays offscreen.
    if (includeChrome) {
      if (!mobile.matches) reveal(sidebar, 0, 280, 0, .5);
      reveal(document.querySelector('.workspace-header'), 0, 280, 0, .5);
    }
    if (current === 'home') {
      reveal(document.querySelector('.welcome-intro .eyebrow'), 80, 300);
      reveal(document.querySelector('#hero-title'), 120, 380);
      reveal(document.querySelector('.welcome-portrait'), 160, 420, 0);
      reveal(document.querySelector('.welcome-role'), 230, 350);
      reveal(document.querySelector('.welcome-description'), 300, 370);
      document.querySelectorAll('.quick-link').forEach((link, index) => {
        reveal(link, 430 + index * 70, 330);
      });
      reveal(document.querySelector('.welcome-platforms'), 590, 280, 4);
      reveal(document.querySelector('.draft-note'), 620, 280, 0);
    } else {
      pageMotion?.play(pages.get(current), {delay:includeChrome ? 120 : 240});
    }
    // Intent to interact settles all elements immediately, including on keyboard.
    if (!welcomeAnimations.size) return;
    const intentEvents = includeChrome ? ['pointerdown', 'keydown', 'wheel', 'focusin'] : ['pointerdown', 'keydown', 'focusin'];
    for (const type of intentEvents) {
      document.addEventListener(type, finishWelcome, {
        capture: true, passive: true, signal: interaction.signal
      });
    }
  }

  function applySidebar(returnFocus = false) {
    const visible = mobile.matches ? mobileOpen : !desktopCollapsed;
    shell.classList.toggle('sidebar-collapsed', !mobile.matches && desktopCollapsed);
    shell.classList.toggle('sidebar-open', mobile.matches && mobileOpen);
    sidebar.inert = !visible;
    workspace.inert = mobile.matches && mobileOpen;
    scrim.hidden = !(mobile.matches && mobileOpen);
    openButton.setAttribute('aria-expanded', String(visible));
    if (mobile.matches && mobileOpen) {
      sidebar.setAttribute('role', 'dialog');
      sidebar.setAttribute('aria-modal', 'true');
    } else {
      sidebar.removeAttribute('role');
      sidebar.removeAttribute('aria-modal');
    }
    if (returnFocus && !shell.inert) openButton.focus({preventScroll:true});
  }
  function closeSidebar(returnFocus = false) {
    if (mobile.matches) mobileOpen = false;
    else desktopCollapsed = true;
    applySidebar(returnFocus);
  }
  openButton.addEventListener('click', () => {
    if (mobile.matches) mobileOpen = true;
    else desktopCollapsed = false;
    applySidebar();
    closeButton.focus({preventScroll:true});
  });
  closeButton.addEventListener('click', () => closeSidebar(true));
  scrim.addEventListener('click', () => closeSidebar(true));
  mobile.addEventListener('change', () => {
    finishWelcome();
    mobileOpen = false;
    applySidebar();
  });
  applySidebar();

  function setGroupOpen(group, open) {
    const button = group.querySelector('.group-toggle');
    group.querySelector('.group-items').hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', `${open ? '收起' : '展开'}${button.dataset.groupLabel}分组`);
  }
  sidebar.querySelectorAll('.group-toggle').forEach(button => {
    button.addEventListener('click', () => setGroupOpen(button.closest('.sidebar-group'), button.getAttribute('aria-expanded') !== 'true'));
  });

  function clearPageTransition() {
    for (const item of [animation, outgoingAnimation]) {
      if (item) { item.onfinish = item.oncancel = null; item.cancel(); }
    }
    animation = outgoingAnimation = null;
    ghost?.remove(); ghost = null;
  }

  function captureOutgoing(page) {
    const snapshot = page.cloneNode(true);
    snapshot.removeAttribute('id');
    snapshot.removeAttribute('data-page');
    snapshot.removeAttribute('aria-labelledby');
    snapshot.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    snapshot.hidden = false;
    snapshot.style.transform = `translateY(${-main.scrollTop}px)`;
    ghost = document.createElement('div');
    ghost.className = 'page-ghost';
    ghost.inert = true;
    ghost.setAttribute('aria-hidden', 'true');
    Object.assign(ghost.style, {
      top: `${main.offsetTop}px`, left: `${main.offsetLeft}px`,
      width: `${main.clientWidth}px`, height: `${main.clientHeight}px`
    });
    const track = document.createElement('div');
    track.className = 'page-ghost-track';
    track.append(snapshot);
    ghost.append(track);
    workspace.append(ghost);
  }

  function enterPage(direction = 0) {
    if (reduced.matches || shell.inert || !Element.prototype.animate || !current) return;
    const duration = direction ? 540 : 220;
    const offset = direction ? direction * main.clientHeight : 10;
    animation = pages.get(current).animate([
      {opacity: direction ? 1 : .35, transform:`translateY(${offset}px)`},
      {opacity: 1, transform:'translateY(0)'}
    ], {duration, easing:'cubic-bezier(.22,.68,.2,1)', fill:'backwards'});
    if (ghost) outgoingAnimation = ghost.firstElementChild.animate([
      {transform:'translateY(0)'},
      {transform:`translateY(${-offset}px)`}
    ], {duration, easing:'cubic-bezier(.22,.68,.2,1)', fill:'forwards'});
    animation.onfinish = clearPageTransition;
    slideUntil = performance.now() + duration + 100;
  }

  function showPage(focus = true, fromSwipe = false) {
    const requested = location.hash.slice(1) || 'home';
    const id = pages.has(requested) ? requested : 'home';
    if (!pages.has(requested)) history.replaceState(null, '', '#home');
    const changed = current !== id;
    const firstRender = current === null;
    if (!firstRender) { finishWelcome(); pageMotion?.cancel(); }
    const direction = firstRender ? 0 : Math.sign(pageOrder.indexOf(id) - pageOrder.indexOf(current));
    clearPageTransition();
    if (changed && !firstRender && !shell.inert && !reduced.matches && Element.prototype.animate) captureOutgoing(pages.get(current));
    if (current && changed) positions.set(current, main.scrollTop);
    pages.forEach((page, key) => { page.hidden = key !== id; });
    current = id;
    const page = pages.get(id);
    document.querySelector('#page-label').textContent = page.dataset.title;
    document.title = id === 'home' ? '王子瑜 · AI 产品经理' : `${page.dataset.title} · 王子瑜`;
    const heading = page.querySelector('h1');
    links.forEach(link => {
      if (link.dataset.route === id) {
        link.setAttribute('aria-current', 'page');
      } else link.removeAttribute('aria-current');
    });
    sidebar.querySelectorAll('.sidebar-group').forEach(group => {
      const active = group.querySelector('[aria-current="page"]');
      group.classList.toggle('has-current', Boolean(active));
      if (active) setGroupOpen(group, true);
    });
    if (!mobile.matches && !desktopCollapsed) {
      const scroller = sidebar.querySelector('.sidebar-scroll');
      const active = sidebar.querySelector('[aria-current="page"]');
      const bounds = scroller.getBoundingClientRect();
      const row = active.getBoundingClientRect();
      if (row.bottom > bounds.bottom - 12) scroller.scrollTop += row.bottom - bounds.bottom + 12;
      else if (row.top < bounds.top + 12) scroller.scrollTop -= bounds.top + 12 - row.top;
    }
    if (mobile.matches) {
      mobileOpen = false;
      applySidebar();
    }
    main.scrollTop = fromSwipe ? (direction > 0 ? 0 : main.scrollHeight) : positions.get(id) || 0;
    if (focus && !shell.inert) heading.focus({preventScroll:true});
    if (changed && !firstRender && !shell.inert) {
      // Measure content visibility before the full-page slide applies a transform.
      unfoldWorkspace(false);
      enterPage(direction);
    }
  }

  function navigate(id, fromSwipe = false) {
    if (current !== id) history.pushState(null, '', '#' + id);
    showPage(true, fromSwipe);
  }
  const canMove = direction => Boolean(pageOrder[pageOrder.indexOf(current) + direction]);
  const move = direction => {
    if (!canMove(direction) || shell.inert || performance.now() < slideUntil) return;
    navigate(pageOrder[pageOrder.indexOf(current) + direction], true);
  };
  document.querySelector('#replay-page').addEventListener('click', () => {
    if (shell.inert) return;
    finishWelcome();
    pageMotion?.cancel();
    clearPageTransition();
    slideUntil = 0;
    unfoldWorkspace(false);
  });
  window.enablePageSwipe?.({
    element:main,
    isEnabled:() => !shell.inert && !workspace.inert && !entryActive,
    isMoving:() => performance.now() < slideUntil,
    canMove, move
  });
  window.addEventListener('hashchange', () => showPage());
  window.addEventListener('hashchange', () => finishEntry(true));
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const id = link.getAttribute('href').slice(1);
    if (id === 'main') {
      event.preventDefault();
      main.focus({preventScroll:true});
      return;
    }
    if (!pages.has(id)) return;
    event.preventDefault();
    navigate(id);
  });
  showPage(false);
  startEntry();

  document.addEventListener('keydown', event => {
    if (!mobile.matches || !mobileOpen || shell.inert) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSidebar(true);
    } else if (event.key === 'Tab') {
      const focusable = [...sidebar.querySelectorAll('a[href],button,summary')].filter(el => el.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      finishEntry(true);
      entryFade?.cancel();
      finishWelcome();
      pageMotion?.cancel();
      clearPageTransition();
    }
  });
  window.addEventListener('pagehide', () => {
    finishEntry(true, false);
    entryFade?.cancel();
    finishWelcome();
    pageMotion?.cancel();
    clearPageTransition();
  });
})();
