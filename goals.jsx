// goals.jsx — standalone Goals tab: savings goals with progress rings,
// add-money (drawn from To Be Assigned), monthly pace, create + complete,
// and long-press drag-to-reorder.

function Ring({ pct, color, size = 64, stroke = 7, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${c * p} ${c}`} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      {children != null && <div className="ring-label">{children}</div>}
    </div>
  );
}

function GoalCard({ goal, onAdd, onMenu, handlers }) {
  const pct = goal.target > 0 ? goal.saved / goal.target : 0;
  const reached = goal.done || goal.saved >= goal.target;
  const need = monthlyNeeded(goal);
  const onPace = reached || goal.monthly >= need;

  let status, statusClass;
  if (reached) { status = 'Goal reached'; statusClass = 'goal-status--done'; }
  else if (onPace) { status = 'On track · ' + fmtMoney(need) + '/mo'; statusClass = 'goal-status--ok'; }
  else { status = 'Save ' + fmtMoney(need) + '/mo to catch up'; statusClass = 'goal-status--behind'; }

  return (
    <div className={'goal-card' + (reached ? ' goal-card--done' : '')} {...handlers}>
      <div className="goal-main">
        <Ring pct={reached ? 1 : pct} color={goal.color} size={66} stroke={7}>
          {reached ? <span className="ring-check" style={{ color: goal.color }}>{'\u2713'}</span>
                   : <span className="ring-pct">{Math.round(pct * 100)}<i>%</i></span>}
        </Ring>
        <div className="goal-info">
          <div className="goal-row1">
            <span className="goal-name">{goal.name}</span>
            <button className="goal-menu" onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onMenu(goal)} aria-label="Goal options">{'\u22EF'}</button>
          </div>
          <div className="goal-amounts">
            <span className="goal-saved" style={{ color: goal.color }}>{fmtMoney(goal.saved)}</span>
            <span className="goal-target">of {fmtMoney(goal.target)}</span>
          </div>
          <div className="goal-meta">
            <span className={'goal-status ' + statusClass}>{status}</span>
          </div>
        </div>
      </div>
      <div className="goal-foot">
        <span className="goal-deadline">{reached ? 'Complete' : goal.monthsLeft + ' mo left · by ' + goal.by}</span>
        {!reached && (
          <button className="goal-add-btn" style={{ background: goal.color }}
            onPointerDown={(e) => e.stopPropagation()} onClick={() => onAdd(goal)}>+ Add money</button>
        )}
      </div>
    </div>
  );
}

function AddToGoalSheet({ goal, tba, onApply, onClose }) {
  if (!goal) return null;
  const [amt, setAmt] = React.useState('');
  const n = parseInt(amt, 10) || 0;
  const remaining = Math.max(0, goal.target - goal.saved);
  const quick = [100000, 300000, monthlyNeeded(goal)].filter((v, i, a) => v > 0 && a.indexOf(v) === i);

  const apply = () => { if (n > 0) { onApply(goal.id, n); onClose(); } };

  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <span className="sheet-swatch" style={{ background: goal.color }} />
          <h2>Add to {goal.name}</h2>
          <button className="sheet-x" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <section className="form-sec">
          <span className="field-label">Amount</span>
          <div className="amount-input">
            <input className="field-input" type="number" inputMode="numeric" value={amt} placeholder="0" autoFocus
              onChange={(e) => setAmt(e.target.value)} />
            <span className="amount-cur">{'\u20ae'}</span>
          </div>
          <div className="chip-row" style={{ marginTop: 12 }}>
            {quick.map((v) => (
              <button key={v} className="chip" onClick={() => setAmt(String(v))}>+{fmtK(v).num}{fmtK(v).mult}</button>
            ))}
            {remaining > 0 && <button className="chip" onClick={() => setAmt(String(remaining))}>Finish · {fmtMoney(remaining)}</button>}
          </div>
          <div className="field-hint">
            From To Be Assigned · {fmtMoney(tba)} available
            {n > tba && <span className="goal-warn"> — this puts you {fmtMoney(n - tba)} over.</span>}
          </div>
        </section>

        <button className="save-btn" disabled={n <= 0}
          style={{ background: n > 0 ? goal.color : 'rgba(255,255,255,0.08)', color: n > 0 ? '#15130a' : '#666' }}
          onClick={apply}>
          {n > 0 ? 'Add ' + fmtMoney(n) : 'Add money'}
        </button>
      </div>
    </div>
  );
}

const HORIZONS = [
  { label: '3 mo', n: 3 }, { label: '6 mo', n: 6 }, { label: '1 yr', n: 12 }, { label: '2 yr', n: 24 },
];

function NewGoalSheet({ onCreate, onClose }) {
  const [name, setName] = React.useState('');
  const [target, setTarget] = React.useState('');
  const [months, setMonths] = React.useState(6);
  const [color, setColor] = React.useState(GOAL_COLORS[0]);
  const tgt = parseInt(target, 10) || 0;
  const valid = name.trim().length > 0 && tgt > 0;

  const create = () => {
    if (!valid) return;
    onCreate({
      name: name.trim(), target: tgt, saved: 0, color,
      monthsLeft: months, by: monthLabelAhead(months),
      monthly: Math.ceil(tgt / months / 1000) * 1000, done: false,
    });
    onClose();
  };

  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2>New goal</h2>
          <button className="sheet-x" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <section className="form-sec">
          <span className="field-label">Name</span>
          <input className="field-input" type="text" value={name} placeholder="e.g. New Phone" autoFocus
            onChange={(e) => setName(e.target.value)} />
        </section>

        <section className="form-sec">
          <span className="field-label">Target amount</span>
          <div className="amount-input">
            <input className="field-input" type="number" inputMode="numeric" value={target} placeholder="0"
              onChange={(e) => setTarget(e.target.value)} />
            <span className="amount-cur">{'\u20ae'}</span>
          </div>
        </section>

        <section className="form-sec">
          <span className="field-label">Target date</span>
          <div className="seg">
            {HORIZONS.map((h) => (
              <button key={h.n} className={'seg-btn' + (h.n === months ? ' seg-btn--on' : '')}
                onClick={() => setMonths(h.n)}>{h.label}</button>
            ))}
          </div>
          <div className="field-hint">By {monthLabelAhead(months)}{tgt > 0 ? ' · save ' + fmtMoney(Math.ceil(tgt / months / 1000) * 1000) + '/mo' : ''}</div>
        </section>

        <section className="form-sec">
          <span className="field-label">Color</span>
          <div className="swatch-row">
            {GOAL_COLORS.map((c) => (
              <button key={c} className={'swatch' + (c === color ? ' swatch--on' : '')}
                style={{ background: c }} onClick={() => setColor(c)} aria-label={'color'} />
            ))}
          </div>
        </section>

        <button className="save-btn" disabled={!valid}
          style={{ background: valid ? color : 'rgba(255,255,255,0.08)', color: valid ? '#15130a' : '#666' }}
          onClick={create}>Create goal</button>
      </div>
    </div>
  );
}

function GoalActionSheet({ goal, onComplete, onDelete, onClose }) {
  if (!goal) return null;
  const [confirmDel, setConfirmDel] = React.useState(false);
  const reached = goal.done || goal.saved >= goal.target;
  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <span className="sheet-swatch" style={{ background: goal.color }} />
          <h2>{goal.name}</h2>
          <button className="sheet-x" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <button className="row-action" onClick={() => { onComplete(goal.id); onClose(); }}>
          <span className="row-action-ico" style={{ color: goal.color }}>{goal.done ? '\u21BA' : '\u2713'}</span>
          {goal.done ? 'Reopen goal' : 'Mark complete'}
        </button>
        <button className={'danger-btn' + (confirmDel ? ' danger-btn--armed' : '')} style={{ marginTop: 12 }}
          onClick={() => { if (confirmDel) { onDelete(goal.id); onClose(); } else setConfirmDel(true); }}>
          {confirmDel ? 'Tap again to delete' : 'Delete goal'}
        </button>
      </div>
    </div>
  );
}

function GoalsScreen({ goals, tba, onAddToGoal, onCreateGoal, onCompleteGoal, onDeleteGoal, onReorderGoal }) {
  const [addId, setAddId] = React.useState(null);
  const [newOpen, setNewOpen] = React.useState(false);
  const [menuGoal, setMenuGoal] = React.useState(null);

  const totalSaved = goals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target, 0);
  const addGoal = goals.find((g) => g.id === addId) || null;

  const startDrag = (point) => {
    const el = point.target.closest('.goal-card');
    if (el) beginReorder(el, point, { itemSelector: '.goal-card', gap: 14, lift: 1.03, onCommit: onReorderGoal });
  };

  return (
    <main className="goals-screen">
      <header className="screen-head">
        <div className="screen-head-row">
          <h1>Goals</h1>
          <button className="head-add" onClick={() => setNewOpen(true)} aria-label="New goal">+</button>
        </div>
        <div className="goals-summary">
          <div className="goals-sum-amt">{fmtMoney(totalSaved)}</div>
          <div className="goals-sum-sub">saved of {fmtMoney(totalTarget)} across {goals.length} goal{goals.length === 1 ? '' : 's'}</div>
          <div className="goals-sum-track">
            <div className="goals-sum-fill" style={{ width: Math.min(100, totalTarget > 0 ? totalSaved / totalTarget * 100 : 0) + '%' }} />
          </div>
        </div>
      </header>

      <div className="goals-list">
        {goals.map((g) => {
          const lp = makeLongPress({ onTrigger: startDrag });
          return (
            <GoalCard key={g.id} goal={g} handlers={lp.handlers}
              onAdd={(gl) => setAddId(gl.id)} onMenu={(gl) => setMenuGoal(gl)} />
          );
        })}
        {goals.length === 0 && <div className="goals-empty">No goals yet — tap + to add one.</div>}
        <div className="list-foot">Long-press a goal to reorder</div>
      </div>

      <AddToGoalSheet goal={addGoal} tba={tba} onApply={onAddToGoal} onClose={() => setAddId(null)} />
      {newOpen && <NewGoalSheet onCreate={onCreateGoal} onClose={() => setNewOpen(false)} />}
      <GoalActionSheet goal={menuGoal} onComplete={onCompleteGoal} onDelete={onDeleteGoal} onClose={() => setMenuGoal(null)} />
    </main>
  );
}

Object.assign(window, { GoalsScreen });
