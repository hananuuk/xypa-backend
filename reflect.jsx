// reflect.jsx — Reflect dashboard: income vs spending, spending trend across
// months, category breakdown (donut + bars), budgeted vs actual, top payees.

function Donut({ segments, size = 140, stroke = 22 }) {
  const total = segments.reduce((s, x) => s + x.amount, 0) || 1;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let off = 0;
  return (
    <svg width={size} height={size} className="donut">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {segments.map((seg) => {
          const len = c * seg.amount / total;
          const el = (
            <circle key={seg.name} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={seg.fill} strokeWidth={stroke}
              strokeDasharray={`${Math.max(0, len - 2)} ${c - Math.max(0, len - 2)}`}
              strokeDashoffset={-off} />
          );
          off += len;
          return el;
        })}
      </g>
    </svg>
  );
}

function HBar({ label, amount, max, fill, sub }) {
  const pct = max > 0 ? Math.min(100, amount / max * 100) : 0;
  return (
    <div className="hbar">
      <div className="hbar-top">
        <span className="hbar-label">{label}</span>
        <span className="hbar-amt">{fmtMoney(amount)}</span>
      </div>
      <div className="hbar-track"><div className="hbar-fill" style={{ width: pct + '%', background: fill }} /></div>
      {sub && <div className="hbar-sub">{sub}</div>}
    </div>
  );
}

function ReflectScreen({ groups, income, monthHistory, monthLabel }) {
  const [view, setView] = React.useState('breakdown');
  const [rekey, setRekey] = React.useState(0);
  const pickView = (v) => { setView(v); setRekey((x) => x + 1); };
  const liveSpent = totalSpent(groups);
  const net = income - liveSpent;
  const savedPct = income > 0 ? Math.max(0, net) / income * 100 : 0;

  const hist = (monthHistory && monthHistory.length) ? monthHistory : [{ m: monthLabel, income, spent: liveSpent }];
  const months = hist.map((h) => ({ m: h.m, income: h.income == null ? income : h.income, spent: h.spent == null ? liveSpent : h.spent }));
  const trendMax = Math.max(1, ...months.map((x) => Math.max(x.income, x.spent)));

  const groupSpend = groups
    .map((g) => ({ name: g.name, fill: familyFill(groupFamily(g)), amount: g.cats.reduce((a, c) => a + spentOf(c), 0) }))
    .filter((x) => x.amount > 0).sort((a, b) => b.amount - a.amount);

  const catSpend = groups.flatMap((g) => g.cats.map((c) => ({ name: c.name, fill: (PALETTE[c.color] || PALETTE.g1).fill, amount: spentOf(c) })))
    .filter((x) => x.amount > 0).sort((a, b) => b.amount - a.amount);
  const catMax = catSpend.length ? catSpend[0].amount : 1;

  const budgetRows = groups.map((g) => ({
    name: g.name, fill: familyFill(groupFamily(g)),
    assigned: g.cats.reduce((a, c) => a + c.assigned, 0),
    spent: g.cats.reduce((a, c) => a + spentOf(c), 0),
  })).filter((r) => r.assigned > 0 || r.spent > 0);
  const budgetMax = Math.max(1, ...budgetRows.map((r) => Math.max(r.assigned, r.spent)));

  const payees = payeeTotals(groups).slice(0, 6);
  const payeeMax = payees.length ? payees[0].amount : 1;

  return (
    <main className="reflect-screen">
      <header className="screen-head">
        <div className="screen-head-row"><h1>Reflect</h1><span className="screen-head-sub">{monthLabel}</span></div>
      </header>

      <div className="rt-seg" role="tablist">
        <span className="rt-seg-thumb rt-seg-thumb--3"
          style={{ transform: `translateX(${view === 'breakdown' ? 0 : view === 'flow' ? 100 : 200}%)` }} />
        {[['breakdown', 'Breakdown'], ['flow', 'Flow'], ['report', 'Report']].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={view === k}
            className={'rt-seg-b' + (view === k ? ' on' : '')} onClick={() => pickView(k)}>{l}</button>
        ))}
      </div>

      {view === 'breakdown' && <div className="rt-view" key={'b' + rekey}><Bloom noHead groups={groups} income={income} monthHistory={monthHistory} /></div>}
      {view === 'flow' && <div className="rt-view" key={'f' + rekey}><Flow noHead groups={groups} income={income} monthHistory={monthHistory} /></div>}

      {view === 'report' && (
      <div className="reflect-scroll">
        <section className="card">
          <div className="card-title">Income vs spending</div>
          <div className="iv-row">
            <div className="iv-col">
              <div className="iv-label">Income</div>
              <div className="iv-amt" style={{ color: '#8FD94A' }}>{fmtMoney(income)}</div>
            </div>
            <div className="iv-col">
              <div className="iv-label">Spent</div>
              <div className="iv-amt" style={{ color: '#F77F9E' }}>{fmtMoney(liveSpent)}</div>
            </div>
          </div>
          <div className="iv-bars">
            <div className="iv-bar"><div className="iv-bar-fill" style={{ width: '100%', background: '#8FD94A' }} /></div>
            <div className="iv-bar"><div className="iv-bar-fill" style={{ width: (income > 0 ? Math.min(100, liveSpent / income * 100) : 0) + '%', background: '#F77F9E' }} /></div>
          </div>
          <div className={'iv-net' + (net < 0 ? ' iv-net--neg' : '')}>
            {net >= 0 ? 'Saved ' : 'Overspent '}<b>{fmtMoney(Math.abs(net))}</b> this month{net >= 0 && income > 0 ? ' · ' + Math.round(savedPct) + '% of income' : ''}
          </div>
        </section>

        <section className="card">
          <div className="card-title">Spending trend</div>
          <div className="trend">
            {months.map((mo) => (
              <div className="trend-col" key={mo.m}>
                <div className="trend-bars">
                  <div className="trend-bar trend-bar--inc" style={{ height: (mo.income / trendMax * 100) + '%' }} />
                  <div className="trend-bar trend-bar--spent" style={{ height: (mo.spent / trendMax * 100) + '%' }} />
                </div>
                <div className="trend-m">{mo.m}</div>
              </div>
            ))}
          </div>
          <div className="legend">
            <span className="legend-item"><i style={{ background: '#8FD94A' }} />Income</span>
            <span className="legend-item"><i style={{ background: '#F77F9E' }} />Spent</span>
          </div>
        </section>

        <section className="card">
          <div className="card-title">Where it went</div>
          {groupSpend.length > 0 ? (
            <>
              <div className="donut-wrap">
                <Donut segments={groupSpend} />
                <div className="donut-center">
                  <div className="donut-total">{fmtMoney(liveSpent)}</div>
                  <div className="donut-sub">spent</div>
                </div>
              </div>
              <div className="legend legend--col">
                {groupSpend.map((s) => (
                  <span className="legend-item" key={s.name}>
                    <i style={{ background: s.fill }} />{s.name}
                    <b>{fmtMoney(s.amount)}</b>
                  </span>
                ))}
              </div>
              <div className="card-sub-title">Top categories</div>
              {catSpend.slice(0, 6).map((c) => (
                <HBar key={c.name} label={c.name} amount={c.amount} max={catMax} fill={c.fill} />
              ))}
            </>
          ) : (
            <div className="hbar-sub" style={{ padding: '8px 0' }}>Nothing logged yet this month.</div>
          )}
        </section>

        <section className="card">
          <div className="card-title">Budgeted vs spent</div>
          {budgetRows.map((r) => {
            const over = r.spent > r.assigned;
            return (
              <div className="bvs" key={r.name}>
                <div className="bvs-top">
                  <span className="bvs-name">{r.name}</span>
                  <span className={'bvs-nums' + (over ? ' bvs-nums--over' : '')}>{fmtMoney(r.spent)} / {fmtMoney(r.assigned)}</span>
                </div>
                <div className="bvs-track">
                  <div className="bvs-assigned" style={{ width: (r.assigned / budgetMax * 100) + '%' }} />
                  <div className="bvs-spent" style={{ width: (r.spent / budgetMax * 100) + '%', background: over ? OVERSPENT.fill : r.fill }} />
                </div>
              </div>
            );
          })}
          {budgetRows.length === 0 && <div className="hbar-sub" style={{ padding: '8px 0' }}>Assign some money to categories to see this.</div>}
          <div className="legend">
            <span className="legend-item"><i style={{ background: 'rgba(255,255,255,0.16)' }} />Assigned</span>
            <span className="legend-item"><i style={{ background: '#8FD94A' }} />Spent</span>
          </div>
        </section>

        <section className="card">
          <div className="card-title">Top payees</div>
          {payees.map((p, i) => (
            <div className="payee" key={p.payee}>
              <span className="payee-rank">{i + 1}</span>
              <div className="payee-main">
                <div className="payee-top"><span className="payee-name">{p.payee}</span><span className="payee-amt">{fmtMoney(p.amount)}</span></div>
                <div className="payee-track"><div className="payee-fill" style={{ width: (p.amount / payeeMax * 100) + '%' }} /></div>
              </div>
            </div>
          ))}
          {payees.length === 0 && <div className="hbar-sub" style={{ padding: '8px 0' }}>No transactions yet.</div>}
        </section>

        <div className="list-foot">Reflecting on {monthLabel}</div>
      </div>
      )}
    </main>
  );
}

Object.assign(window, { ReflectScreen });
