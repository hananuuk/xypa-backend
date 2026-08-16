// transfer.jsx — move money between categories with a live "flow" view.
// Giver battery drains and receiver battery fills in real time as you set the
// amount via the slider; a coin visibly travels from giver (top) to receiver
// (bottom). mode 'out' = thisCat sends; mode 'in' = thisCat is covered.

function MiniBattery({ cat, avail, role }) {
  const pal = PALETTE[cat.color] || PALETTE.g1;
  const overspent = avail < 0;
  const ratio = cat.assigned > 0 ? Math.max(0, Math.min(1, avail / cat.assigned)) : 0;
  return (
    <div className="mini">
      <div className="mini-top">
        <span className="mini-dot" style={{ background: overspent ? OVERSPENT.fill : pal.fill }} />
        <span className="mini-name">{cat.name}</span>
        <span className="mini-amt" style={{ color: overspent ? OVERSPENT.fill : '#fff' }}>{fmtMoney(avail)}</span>
      </div>
      <div className="mini-bar">
        <div className="mini-fill" style={{ width: (ratio * 100) + '%',
          background: overspent ? OVERSPENT.fill : pal.fill }} />
      </div>
    </div>
  );
}

function TransferSheet({ thisCat, mode, allCats, onApply, onClose }) {
  if (!thisCat) return null;
  const availOf = (c) => c.assigned - spentOf(c);

  const others = allCats.filter((c) => c.id !== thisCat.id);
  // who can give money: positive available
  const pickList = mode === 'in' ? others.filter((c) => availOf(c) > 0) : others;

  const [otherId, setOtherId] = React.useState(() => {
    if (mode === 'in') {
      let best = null, bv = -1;
      pickList.forEach((c) => { const v = availOf(c); if (v > bv) { bv = v; best = c; } });
      return best ? best.id : null;
    }
    return others[0] ? others[0].id : null;
  });
  const [amount, setAmount] = React.useState('');

  const other = allCats.find((c) => c.id === otherId) || null;
  const giver = mode === 'out' ? thisCat : other;
  const receiver = mode === 'out' ? other : thisCat;

  const maxAmt = giver ? Math.max(0, availOf(giver)) : 0;
  const step = maxAmt > 200000 ? 5000 : 1000;
  const entered = parseInt(amount, 10) || 0;
  const amt = Math.min(entered, maxAmt);
  const valid = !!other && amt > 0;

  const giverAvail = giver ? availOf(giver) - amt : 0;
  const receiverAvail = receiver ? availOf(receiver) + amt : 0;
  const deficit = mode === 'in' ? Math.max(0, -availOf(thisCat)) : 0;

  const recColor = receiver ? (PALETTE[receiver.color] || PALETTE.g1).fill : '#888';

  const apply = () => {
    if (!valid) return;
    onApply(giver.id, receiver.id, amt);
    onClose();
  };

  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div className="sheet transfer-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2>{mode === 'in' ? 'Cover overspending' : 'Move money'}</h2>
          <button className="sheet-x" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <div className="flow">
          <div className="flow-tag">From</div>
          {giver
            ? <MiniBattery cat={giver} avail={giverAvail} role="giver" />
            : <div className="mini mini--empty">Pick a category below</div>}

          <div className="flow-pipe">
            <span className={'flow-coin' + (amt > 0 ? ' flow-coin--go' : '')} style={{ background: recColor }} />
            <span className="flow-amt" style={{ opacity: amt > 0 ? 1 : 0.45 }}>{fmtMoney(amt)}</span>
          </div>

          <div className="flow-tag">To</div>
          {receiver
            ? <MiniBattery cat={receiver} avail={receiverAvail} role="receiver" />
            : <div className="mini mini--empty">Pick a category below</div>}
        </div>

        <div className="picker">
          <div className="picker-label">{mode === 'in' ? 'Take from' : 'Send to'}</div>
          <div className="picker-row">
            {pickList.length === 0 && <div className="picker-empty">No categories with money to move.</div>}
            {pickList.map((c) => {
              const p = PALETTE[c.color] || PALETTE.g1;
              return (
                <button key={c.id} className={'pick' + (c.id === otherId ? ' pick--on' : '')}
                  onClick={() => { setOtherId(c.id); setAmount(''); }}>
                  <span className="pick-dot" style={{ background: p.fill }} />
                  <span className="pick-name">{c.name}</span>
                  <span className="pick-amt">{fmtMoney(availOf(c))}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={'amount-display' + (amt > 0 ? '' : ' zero')}>
          <span className="amt">{amt > 0 ? amt.toLocaleString('en-US') : '0'}</span>
          <span className="cur">{'\u20ae'}</span>
        </div>

        <input className="amt-slider" type="range" min="0" max={maxAmt} step={step}
          value={amt} disabled={maxAmt <= 0}
          style={{ accentColor: recColor }}
          onChange={(e) => setAmount(String(e.target.value))} />

        <div className="quick-row">
          <button className="qbtn" disabled={maxAmt <= 0} onClick={() => setAmount(String(Math.round(maxAmt / 2 / step) * step))}>Half</button>
          <button className="qbtn" disabled={maxAmt <= 0} onClick={() => setAmount(String(maxAmt))}>Max</button>
          {mode === 'in' && deficit > 0 && (
            <button className="qbtn qbtn--accent" disabled={maxAmt <= 0}
              onClick={() => setAmount(String(Math.min(maxAmt, deficit)))}>
              Cover all ({fmtMoney(Math.min(maxAmt, deficit))})
            </button>
          )}
        </div>

        <button className="save-btn" disabled={!valid}
          style={{ background: valid ? recColor : 'rgba(255,255,255,0.08)', color: valid ? '#15130a' : '#666' }}
          onClick={apply}>
          {mode === 'in'
            ? (other ? 'Cover from ' + other.name : 'Pick a category')
            : (other ? 'Move to ' + other.name : 'Pick a category')}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { TransferSheet, MiniBattery });
