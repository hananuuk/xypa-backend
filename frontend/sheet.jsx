// sheet.jsx — full-screen category detail + activity ledger + add-transaction modal.

function Stat({ label, value, tone }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={tone ? { color: tone } : null}>{value}</div>
    </div>);

}

// signed effect of a txn on the category's available balance
function txnDelta(x) {
  if (x.kind === 'spend') return -x.amount;
  if (x.kind === 'move') return x.dir === 'in' ? x.amount : -x.amount;
  return x.amount; // assign
}

// builds the activity rows with a running "available" after each event
function buildActivity(cat) {
  let run = 0;
  const rows = cat.txns.map((x) => {
    run += txnDelta(x);
    return { ...x, after: run };
  });
  return rows.reverse(); // newest first
}

function ActRow({ x, pal }) {
  let icon, iconBg, iconColor, title, amtClass, sign;
  if (x.kind === 'assign') {
    icon = '\u2191'; iconBg = 'rgba(155,227,111,0.16)'; iconColor = '#9be36f';
    title = 'Assigned'; amtClass = ' act-amt--pos'; sign = '+';
  } else if (x.kind === 'move') {
    const isIn = x.dir === 'in';
    icon = '\u21c4'; iconBg = 'rgba(124,134,242,0.18)'; iconColor = '#9aa2f5';
    title = isIn ? 'Moved from ' + x.other : 'Moved to ' + x.other;
    amtClass = isIn ? ' act-amt--pos' : ''; sign = isIn ? '+' : '\u2212';
  } else {
    icon = '\u2193'; iconBg = 'rgba(255,255,255,0.06)'; iconColor = pal.fill;
    title = x.payee; amtClass = ''; sign = '\u2212';
  }
  return (
    <div className="act">
      <span className="act-icon" style={{ background: iconBg, color: iconColor }}>{icon}</span>
      <div className="act-main">
        <div className="act-title">{title}</div>
        <div className="act-sub">{x.date} {'\u00b7'} Available {fmtMoney(x.after)}</div>
      </div>
      <div className={'act-amt' + amtClass}>{sign}{fmtMoney(x.amount)}</div>
    </div>
  );
}

function DetailScreen({ cat, t, onAddOpen, onMove, onEdit, onClose }) {
  const swipe = useSwipeBack(onClose || (() => {}));
  if (!cat) return null;
  const pal = PALETTE[cat.color] || PALETTE.g1;
  const spent = spentOf(cat);
  const available = cat.assigned - spent;
  const overspent = available < 0;
  const lowTone = overspent ? OVERSPENT.fill : (available <= cat.assigned * t.lowThreshold ? pal.fill : '#fff');
  const activity = buildActivity(cat);

  // YNAB-style target progress
  let tgt = null;
  if (cat.target) {
    const target = cat.target;
    if (target.type === 'monthly') {
      const pct = target.amount > 0 ? Math.max(0, Math.min(1, cat.assigned / target.amount)) : 0;
      const remaining = target.amount - cat.assigned;
      tgt = { label: 'Needs ' + fmtMoney(target.amount) + ' this month', pct,
        status: remaining <= 0 ? 'Fully assigned' : 'Assign ' + fmtMoney(remaining) + ' more', done: remaining <= 0 };
    } else {
      const pct = target.amount > 0 ? Math.max(0, Math.min(1, available / target.amount)) : 0;
      const remaining = target.amount - available;
      tgt = { label: 'Reach ' + fmtMoney(target.amount) + ' by ' + target.by, pct,
        status: remaining <= 0 ? 'Goal reached' : fmtMoney(remaining) + ' to go', done: remaining <= 0 };
    }
  }

  return (
    <div className="detail" data-screen-label="Category detail" style={swipe.style} {...swipe.handlers}>
      <header className="detail-top">
        <button className="detail-back" onClick={onClose} aria-label="Back">&lsaquo;</button>
        <span className="detail-swatch" style={{ background: overspent ? OVERSPENT.fill : pal.fill }} />
        <h2>{cat.name}</h2>
        <button className="detail-icon-btn" onClick={() => onEdit(cat.id)} aria-label="Edit category">{'\u2699'}</button>
        <button className="detail-icon-btn" onClick={() => onAddOpen(cat.id)} aria-label="Add transaction">+</button>
      </header>

      <div className="detail-scroll">
        <div className="detail-hero">
          <div className="hero-label">Available</div>
          <div className="hero-amount" style={{ color: lowTone }}>{fmtMoney(available)}</div>
          <div className="sheet-preview">
            <Pill cat={cat} t={t} onTap={() => {}} />
          </div>
        </div>

        <div className="detail-actions">
          {overspent ? (
            <button className="act-btn act-btn--cover" onClick={() => onMove(cat.id, 'in')}>
              <span className="act-btn-ico">{'\u21c4'}</span> Cover overspending
            </button>
          ) : (
            <button className="act-btn" onClick={() => onMove(cat.id, 'out')}>
              <span className="act-btn-ico">{'\u21c4'}</span> Move money
            </button>
          )}
        </div>

        {tgt && (
          <div className="target-card">
            <div className="target-head">
              <span className="target-label">{tgt.label}</span>
              <span className={'target-status' + (tgt.done ? ' target-status--done' : '')}>
                {tgt.done && <span className="target-check">{'\u2713'}</span>}{tgt.status}
              </span>
            </div>
            <div className="target-bar">
              <div className="target-fill" style={{ width: (tgt.pct * 100) + '%', background: pal.fill }} />
            </div>
          </div>
        )}

        <div className="stat-grid">
          <Stat label="Assigned" value={fmtMoney(cat.assigned)} />
          <Stat label="Activity" value={'\u2212' + fmtMoney(spent)} />
          <Stat label="Available" value={fmtMoney(available)} tone={lowTone} />
        </div>

        {cat.note ? <div className="detail-note">{cat.note}</div> : null}

        <div className="activity">
          <div className="activity-head">
            <span>Activity</span>
            <button className="activity-add" onClick={() => onAddOpen(cat.id)}>+ Add</button>
          </div>
          {activity.length === 0 && <div className="activity-empty">No activity yet this month.</div>}
          <div className="activity-list">
            {activity.map((x, i) => <ActRow key={i} x={x} pal={pal} />)}
          </div>
        </div>
      </div>
    </div>);

}

// shared numeric keypad
function Keypad({ onPress }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'back'];
  return (
    <div className="keypad">
      {keys.map((k) => (
        <button key={k} className={'key' + (k === 'back' ? ' key--back' : '')}
          onClick={() => onPress(k)} aria-label={k === 'back' ? 'Delete' : k}>
          {k === 'back' ? '\u232b' : k}
        </button>
      ))}
    </div>
  );
}

function AddTxnModal({ cat, onSave, onClose }) {
  const [payee, setPayee] = React.useState('');
  const [amount, setAmount] = React.useState('');
  React.useEffect(() => {
    if (cat) { setPayee(''); setAmount(''); }
  }, [cat && cat.id]);
  if (!cat) return null;
  const amt = parseInt(amount, 10) || 0;
  const valid = amt > 0;

  const press = (k) => {
    if (k === 'back') { setAmount((a) => a.slice(0, -1)); return; }
    setAmount((a) => {
      const base = a === '0' ? '' : a;
      const next = base + k;
      return next.length > 9 ? a : next;
    });
  };

  const save = () => {
    if (!valid) return;
    onSave(cat.id, { kind: 'spend', date: 'Today', payee: payee.trim() || 'Transaction', amount: amt });
    onClose();
  };

  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2>New transaction</h2>
          <button className="sheet-x" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="add-cat">in <strong>{cat.name}</strong></div>

        <label className="field">
          <span className="field-label">Payee</span>
          <input className="field-input" type="text" value={payee} placeholder="e.g. Nomin Supermarket"
          onChange={(e) => setPayee(e.target.value)} />
        </label>

        <span className="field-label">Amount</span>
        <div className={'amount-display' + (amt > 0 ? '' : ' zero')}>
          <span className="amt">{amt > 0 ? amt.toLocaleString('en-US') : '0'}</span>
          <span className="cur">{'\u20ae'}</span>
        </div>

        <Keypad onPress={press} />

        <button className="save-btn" disabled={!valid}
        style={{ background: valid ? (PALETTE[cat.color] || PALETTE.g1).fill : 'rgba(255,255,255,0.08)',
          color: valid ? '#15130a' : '#666' }}
        onClick={save}>
          Add transaction
        </button>
      </div>
    </div>);

}

Object.assign(window, { DetailScreen, AddTxnModal, Keypad });
