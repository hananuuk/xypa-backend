// pill.jsx — a category row rendered as a draining "battery" pill.
// Bright fill leads from the LEFT and drains off to the right as available
// money runs down. Two clipped text layers keep the name + amount legible
// across the drain boundary. Swiping a row left-from-right reveals an
// "Add transaction" action (only when an onAdd handler is supplied).

const { useState, useRef } = React;

function fmtMoney(n) {
  const neg = n < 0;
  const abs = Math.abs(Math.round(n));
  return (neg ? '\u2212' : '') + abs.toLocaleString('en-US') + '\u20ae';
}

// compact form for the pills: 38000 -> {num:'38', mult:'K', sign:'\u20ae'}
function fmtK(n) {
  const neg = n < 0;
  let abs = Math.abs(n);
  let mult = '';
  if (abs >= 1000000) { abs = abs / 1000000; mult = 'M'; }
  else if (abs >= 1000) { abs = abs / 1000; mult = 'K'; }
  const str = (Math.round(abs * 10) / 10).toString();
  return { num: (neg ? '\u2212' : '') + str, mult, sign: '\u20ae' };
}

function Pill({ cat, t, onTap, onAdd, onEdit, onReorderStart }) {
  const [dx, setDx] = useState(0);
  const [snap, setSnap] = useState(true);
  const wrapRef = useRef(null);
  const drag = useRef({ x: 0, y: 0, axis: null, active: false, swiped: false, reordering: false, lp: null });

  const pal = PALETTE[cat.color] || PALETTE.g1;
  const spent = spentOf(cat);
  const available = cat.assigned - spent;
  const overspent = available < 0;
  const ratio = cat.assigned > 0 ? Math.max(0, Math.min(1, available / cat.assigned)) : 0;
  const low = !overspent && ratio <= t.lowThreshold;

  const radius = t.radius === 'pill' ? 999 : 18;
  const fillPct = (ratio * 100).toFixed(2) + '%';
  const emptyPct = (100 - ratio * 100).toFixed(2) + '%';

  // right-hand value: currency (compact K/M) or "% left"
  const multStyle = { fontWeight: 500 };
  const signStyle = { marginLeft: 4 };
  let valueText;
  if (t.valueMode === 'percent') {
    valueText = <>{Math.round(ratio * 100)}<span style={multStyle}>%</span></>;
  } else {
    const v = fmtK(available);
    valueText = <>{v.num}<span style={multStyle}>{v.mult}</span><span style={signStyle}>{v.sign}</span></>;
  }

  const rowStyle = {
    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', padding: '0 26px',
    fontFamily: "'Archivo', sans-serif", pointerEvents: 'none',
  };
  const nameStyle = { fontWeight: 800, fontSize: 21, letterSpacing: '-0.01em',
    whiteSpace: 'nowrap', flexShrink: 0 };
  const valStyle = { fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em',
    fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flexShrink: 0, paddingLeft: 12 };

  const TextLayer = ({ color, clip }) => (
    <div style={{ ...rowStyle, color, clipPath: clip || 'none' }}>
      <span style={nameStyle}>{cat.name}</span>
      <span style={valStyle}>{valueText}</span>
    </div>
  );

  // build the button background + content
  let bgStyle = {};
  let content;
  if (overspent) {
    bgStyle = { background: OVERSPENT.fill };
    content = (
      <div style={{ ...rowStyle, color: OVERSPENT.text }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={nameStyle}>{cat.name}</span>
          <span className="overspent-badge">OVERSPENT</span>
        </span>
        <span style={valStyle}>{valueText}</span>
      </div>
    );
  } else if (t.drainStyle === 'bar') {
    content = (
      <>
        <div style={{ position: 'absolute', inset: 0, background: pal.fill }} />
        <TextLayer color="#15130a" />
        <div className="bar-track" style={{ background: 'rgba(0,0,0,0.16)' }}>
          <div style={{ height: '100%', width: fillPct, marginLeft: 'auto',
            background: 'rgba(0,0,0,0.42)', borderRadius: 999 }} />
        </div>
      </>
    );
  } else if (t.drainStyle === 'fade') {
    content = (
      <>
        <div style={{ position: 'absolute', inset: 0, background: pal.fill }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0,
          width: emptyPct, background: pal.track, opacity: 0.8 }} />
        <TextLayer color="#15130a" clip={`inset(0 ${emptyPct} 0 0)`} />
        <TextLayer color={pal.fill} clip={`inset(0 0 0 ${fillPct})`} />
      </>
    );
  } else {
    content = (
      <>
        <div style={{ position: 'absolute', inset: 0, background: pal.track }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0,
          width: fillPct, background: pal.fill }} />
        <TextLayer color={pal.fill} />
        <TextLayer color="#15130a" clip={`inset(0 ${emptyPct} 0 0)`} />
      </>
    );
  }

  const swipeable = !!(onAdd || onEdit);

  function clearLP() {
    if (drag.current.lp) { clearTimeout(drag.current.lp); drag.current.lp = null; }
  }
  function onDown(e) {
    const target = e.currentTarget;
    const pid = e.pointerId;
    drag.current = { x: e.clientX, y: e.clientY, axis: null, active: true, swiped: false, reordering: false, lp: null };
    setSnap(false);
    if (swipeable) { try { target.setPointerCapture(pid); } catch (_) {} }
    if (onReorderStart) {
      drag.current.lp = setTimeout(() => {
        const d = drag.current;
        if (!d.active || d.axis) return; // moved already → swipe/scroll, not a hold
        d.reordering = true;
        d.swiped = true; // suppress the click that follows
        setDx(0); setSnap(true);
        try { target.releasePointerCapture(pid); } catch (_) {}
        onReorderStart(wrapRef.current, { clientX: d.x, clientY: d.y });
      }, 360);
    }
  }
  function onMove(e) {
    const d = drag.current;
    if (!d.active || d.reordering) return;
    const ddx = e.clientX - d.x, ddy = e.clientY - d.y;
    if (!d.axis && (Math.abs(ddx) > 8 || Math.abs(ddy) > 8)) {
      d.axis = Math.abs(ddx) > Math.abs(ddy) ? 'x' : 'y';
      clearLP();
    }
    if (!swipeable) return;
    if (d.axis === 'x') {
      let nx = Math.max(-128, Math.min(128, ddx));
      if (nx < 0 && !onAdd) nx = 0;   // no left action
      if (nx > 0 && !onEdit) nx = 0;  // no right action
      setDx(nx);
    }
  }
  function onUp() {
    const d = drag.current;
    clearLP();
    if (!d.active) return;
    d.active = false;
    if (d.reordering) { setSnap(true); return; }
    setSnap(true);
    if (d.axis === 'x') {
      if (Math.abs(dx) > 6) d.swiped = true;
      if (dx < -72 && onAdd) onAdd();
      else if (dx > 72 && onEdit) onEdit();
      setDx(0);
    }
  }
  function onClick() {
    if (drag.current.swiped) { drag.current.swiped = false; return; }
    if (onTap) onTap();
  }

  return (
    <div className="pill-wrap" ref={wrapRef} style={{ borderRadius: radius }}>
      {swipeable && (
        <div className="pill-actions" aria-hidden="true">
          {onEdit && (
            <span className="pa pa--edit">
              <span className="pa-ico">{'\u2699'}</span>
              <span className="pa-label">Edit</span>
            </span>
          )}
          {onAdd && (
            <span className="pa pa--txn">
              <span className="pa-ico">+</span>
              <span className="pa-label">Transaction</span>
            </span>
          )}
        </div>
      )}
      <button
        className={'pill' + (low ? ' pill--low' : '')}
        style={{ borderRadius: radius,
          transform: `translateX(${dx}px)`,
          transition: snap ? 'transform .26s cubic-bezier(.2,.8,.2,1)' : 'none',
          ...bgStyle }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClick={onClick}
      >
        {content}
        {low && <span className="low-dot" style={{ background: pal.fill }} />}
      </button>
    </div>
  );
}

Object.assign(window, { Pill, fmtMoney, fmtK });
