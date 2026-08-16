// reorder.jsx — long-press drag-to-reorder.
// beginReorder(grabEl, startPoint, opts) lifts grabEl and lets the user drag it
// up/down among its siblings. While dragging, siblings slide to make room and
// the list auto-scrolls near its edges. On drop it calls opts.onCommit(from, to).
//
//   opts.itemSelector  CSS selector that identifies the reorderable siblings
//                      (they must be direct children of grabEl's parent)
//   opts.gap           px gap between siblings (margin not in getBoundingClientRect)
//   opts.scrollSelector closest scroll container (default '.plan-list')
//   opts.lift          scale applied to the lifted item (default 1.03)
//   opts.onCommit(from, to)  called once if the index changed

(function () {
  let busy = false;

  function beginReorder(grabEl, startPoint, opts) {
    if (busy || !grabEl) return;
    const container = grabEl.parentElement;
    if (!container) return;
    const items = Array.from(container.children).filter((c) => c.matches(opts.itemSelector));
    const fromIndex = items.indexOf(grabEl);
    if (fromIndex < 0) return;

    busy = true;
    const scroller = grabEl.closest(opts.scrollSelector || '.plan-list');
    const gap = opts.gap || 0;
    const lift = opts.lift || 1.03;
    const startY = startPoint.clientY;
    const startScroll = scroller ? scroller.scrollTop : 0;
    let pointerY = startY;
    let target = fromIndex;

    const rects = items.map((el) => el.getBoundingClientRect());
    const slot = rects[fromIndex].height + gap;

    document.body.classList.add('reorder-active');
    grabEl.classList.add('reordering');
    grabEl.style.position = 'relative';
    grabEl.style.zIndex = '60';
    grabEl.style.willChange = 'transform';
    items.forEach((el, i) => {
      if (i !== fromIndex) el.style.transition = 'transform .18s cubic-bezier(.2,.8,.2,1)';
    });

    let raf = 0;
    function apply() {
      const scrolled = (scroller ? scroller.scrollTop : 0) - startScroll;
      const moved = pointerY - startY;
      grabEl.style.transition = 'none';
      grabEl.style.transform = `translateY(${moved + scrolled}px) scale(${lift})`;

      const floatCenter = rects[fromIndex].top + rects[fromIndex].height / 2 + moved;
      let t = fromIndex;
      for (let i = 0; i < items.length; i++) {
        if (i === fromIndex) continue;
        const mid = rects[i].top + rects[i].height / 2 - scrolled;
        if (i < fromIndex && floatCenter < mid) t = Math.min(t, i);
        if (i > fromIndex && floatCenter > mid) t = Math.max(t, i);
      }
      target = t;
      for (let i = 0; i < items.length; i++) {
        if (i === fromIndex) continue;
        let sh = 0;
        if (target < fromIndex && i >= target && i < fromIndex) sh = slot;
        else if (target > fromIndex && i > fromIndex && i <= target) sh = -slot;
        items[i].style.transform = sh ? `translateY(${sh}px)` : '';
      }
    }
    function frame() {
      // edge auto-scroll (continuous even when the finger is still)
      if (scroller) {
        const sr = scroller.getBoundingClientRect();
        const edge = 60;
        if (pointerY < sr.top + edge) {
          scroller.scrollTop -= Math.min(16, (sr.top + edge - pointerY) / 2.5);
        } else if (pointerY > sr.bottom - edge) {
          scroller.scrollTop += Math.min(16, (pointerY - (sr.bottom - edge)) / 2.5);
        }
      }
      apply();
      raf = requestAnimationFrame(frame);
    }
    apply();
    raf = requestAnimationFrame(frame);

    function move(ev) {
      pointerY = ev.clientY;
      if (ev.cancelable) ev.preventDefault();
      apply();
    }
    function end() {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      const committed = target !== fromIndex;
      // clear inline styles before React reorders the DOM
      items.forEach((el) => {
        el.style.transition = '';
        el.style.transform = '';
        el.style.zIndex = '';
        el.style.position = '';
        el.style.willChange = '';
      });
      grabEl.classList.remove('reordering');
      document.body.classList.remove('reorder-active');
      busy = false;
      if (committed && opts.onCommit) opts.onCommit(fromIndex, target);
    }
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }

  // makeLongPress: returns React pointer handlers that fire onTrigger(point) after
  // `delay` ms of a near-stationary press. Movement past `threshold` cancels.
  // `fired` is tracked on the returned object so callers can suppress a click.
  function makeLongPress(opts) {
    const state = { timer: null, sx: 0, sy: 0, fired: false };
    const clear = () => { if (state.timer) { clearTimeout(state.timer); state.timer = null; } };
    return {
      handlers: {
        onPointerDown(e) {
          state.fired = false;
          state.sx = e.clientX; state.sy = e.clientY;
          const point = { clientX: e.clientX, clientY: e.clientY, target: e.currentTarget };
          clear();
          state.timer = setTimeout(() => {
            state.fired = true;
            opts.onTrigger(point);
          }, opts.delay || 360);
        },
        onPointerMove(e) {
          if (state.timer && (Math.abs(e.clientX - state.sx) > (opts.threshold || 10) ||
            Math.abs(e.clientY - state.sy) > (opts.threshold || 10))) clear();
        },
        onPointerUp() { clear(); },
        onPointerCancel() { clear(); },
        onPointerLeave() { clear(); },
      },
      didFire: () => state.fired,
      cancel: clear,
    };
  }

  window.beginReorder = beginReorder;
  window.makeLongPress = makeLongPress;
})();
