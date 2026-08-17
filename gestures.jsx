// gestures.jsx — small reusable edge-swipe-to-go-back gesture for full-screen
// ".detail" views (category detail, category settings). Swiping right,
// starting from near the left edge, dismisses the screen — mirrors iOS.

function useSwipeBack(onClose) {
  const [dx, setDx] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const start = React.useRef(null);

  const onPointerDown = (e) => {
    if (e.clientX > 36) return; // only recognize edge-originated swipes
    start.current = { x: e.clientX, y: e.clientY, axis: null };
  };
  const onPointerMove = (e) => {
    const s = start.current;
    if (!s) return;
    const ddx = e.clientX - s.x, ddy = e.clientY - s.y;
    if (!s.axis) {
      if (Math.abs(ddx) < 6 && Math.abs(ddy) < 6) return;
      s.axis = Math.abs(ddx) > Math.abs(ddy) * 1.2 ? 'x' : 'y';
      if (s.axis === 'x') setDragging(true);
    }
    if (s.axis === 'x' && ddx > 0) setDx(ddx);
  };
  const onPointerUp = () => {
    const s = start.current;
    const wasX = s && s.axis === 'x';
    start.current = null;
    if (wasX && dx > 90) {
      onClose();
      return;
    }
    setDragging(false);
    setDx(0);
  };

  const style = dragging
    ? { transform: `translateX(${dx}px)`, transition: 'none' }
    : { transform: 'translateX(0)', transition: 'transform .22s ease' };

  return {
    style,
    handlers: {
      onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp,
    },
  };
}

Object.assign(window, { useSwipeBack });
