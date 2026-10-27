// dash-bloom.jsx — "Bloom": Nightingale-rose petal chart.
// Top-8 categories as rounded petals (radius ∝ √spend), colored by category.
// Center hole shows % of budget used. Petals bloom outward on mount.

function Bloom({ noHead, groups, income, monthHistory }) {
  const B = useBudget(groups, income, monthHistory);
  const m = useMount01(1050, 150);

  const SIZE = 292, C = SIZE / 2, R0 = 58, MAXLEN = 86, GAP = 0.12;
  const seg = TAU / 8;
  const top = B.cats.slice(0, 8);
  const maxSpent = top.length ? top[0].spent : 1;

  const petals = top.map((c, i) => {
    const stag = Math.max(0, Math.min(1, (m - i * 0.045) / 0.62));
    const ease = 1 - Math.pow(1 - stag, 3);
    const full = R0 + MAXLEN * Math.sqrt(c.spent / maxSpent);
    const a0 = -Math.PI / 2 + i * seg + GAP / 2;
    const a1 = -Math.PI / 2 + (i + 1) * seg - GAP / 2;
    return {
      ...c,
      track: sectorPath(C, C, R0, R0 + MAXLEN, a0, a1),
      fillPath: sectorPath(C, C, R0, R0 + (full - R0) * ease, a0, a1),
    };
  });

  const pctNow = Math.round(B.usedPct * 100 * m);

  if (top.length === 0) {
    return (
      <main className="bloom">
        {!noHead && <DashHead />}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px', gap: 6 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>No spending yet</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>Once you log or sync some transactions, this fills in automatically.</div>
        </div>
      </main>
    );
  }

  return (
    <main className="bloom">
      {!noHead && <DashHead />}
      <div className="bloom-stage">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {petals.map((p) => (
            <path key={'t' + p.id} d={p.track} fill="rgba(255,255,255,0.045)"
              stroke="rgba(255,255,255,0.045)" strokeWidth="7" strokeLinejoin="round" />
          ))}
          {petals.map((p) => (
            <path key={'f' + p.id} d={p.fillPath} fill={p.fill}
              stroke={p.fill} strokeWidth="7" strokeLinejoin="round" />
          ))}
          <circle cx={C} cy={C} r={R0 - 2} fill="var(--bg,#0b0b0c)" />
        </svg>
        <div className="bloom-center">
          <div className="bloom-pct tnum">{pctNow}<i>%</i></div>
          <div className="bloom-cap">of budget used</div>
        </div>
      </div>

      <div className="bloom-sums">
        <div className="bloom-sum">
          <div className="l">Spent</div>
          <div className="v pink tnum">{fmtC(B.totalSpent)}</div>
        </div>
        <div className="bloom-sum" style={{ textAlign: 'right' }}>
          <div className="l">Left to spend</div>
          <div className="v lime tnum">{fmtC(B.totalAssigned - B.totalSpent)}</div>
        </div>
      </div>

      <div className="bloom-legend">
        {petals.map((p) => (
          <div className="bloom-li" key={p.id}>
            <i style={{ background: p.fill }} />
            <span className="nm">{p.name}</span>
            <span className="am tnum">{fmtC(p.spent)}</span>
          </div>
        ))}
      </div>
    </main>
  );
}

Object.assign(window, { Bloom });
