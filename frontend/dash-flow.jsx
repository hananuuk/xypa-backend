// dash-flow.jsx — "Flow": a Sankey of income → where it went.
// Income bar (left) fans into each spending group + what was saved.
// Ribbons grow from their centerlines on mount; a dashed shimmer travels
// along each ribbon to feel alive.

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function Flow({ noHead, groups, income, monthHistory }) {
  const B = useBudget(groups, income, monthHistory);
  const m = useMount01(1100, 150);

  const W = 364, H = 372, xL = 22, wbar = 28, xR = 250, wbarR = 26;
  const Lx2 = xL + wbar, Rx1 = xR, cx = (Lx2 + Rx1) / 2;
  const gap = 11, label = 284;

  const saved = B.income - B.totalSpent;
  const spendingNodes = B.groups
    .filter((g) => g.spent > 0)
    .map((g) => ({ name: g.name, amount: g.spent, fill: g.fill }));
  const nodes = saved > 0
    ? [...spendingNodes, { name: 'Saved', amount: saved, fill: '#9be36f' }]
    : spendingNodes;

  if (B.income <= 0 || nodes.length === 0) {
    return (
      <main className="flow2">
        {!noHead && <DashHead />}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px', gap: 6 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>Set your income to see this</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>Add your monthly income in Settings, then this fills in once you've spent something.</div>
        </div>
      </main>
    );
  }

  const nGap = Math.max(0, nodes.length - 1);
  const usableH = H - nGap * gap;
  const scale = usableH / B.income;
  const leftTop = (H - usableH) / 2;

  let ly = leftTop, ry = 0;
  const laid = nodes.map((nd, i) => {
    const h = Math.max(0, nd.amount * scale);
    const o = { ...nd, h, lyc: ly + h / 2, ryc: ry + h / 2, ry0: ry, delay: i * 0.06 };
    ly += h; ry += h + gap;
    return o;
  });

  const ribbon = (nd) => {
    const g = Math.max(0, Math.min(1, (m - nd.delay) / 0.6));
    const e = 1 - Math.pow(1 - g, 3);
    const half = (nd.h / 2) * e + 0.4;
    const lt = nd.lyc - half, lb = nd.lyc + half, rt = nd.ryc - half, rb = nd.ryc + half;
    return `M ${Lx2} ${lt} C ${cx} ${lt} ${cx} ${rt} ${Rx1} ${rt} L ${Rx1} ${rb} C ${cx} ${rb} ${cx} ${lb} ${Lx2} ${lb} Z`;
  };
  const center = (nd) => `M ${Lx2} ${nd.lyc} C ${cx} ${nd.lyc} ${cx} ${nd.ryc} ${Rx1} ${nd.ryc}`;

  return (
    <main className="flow2">
      {!noHead && <DashHead />}
      <div className="flow2-cap"><span className="live" />Where it flowed</div>

      <div className="flow2-stage">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {laid.map((nd) => (
            <path key={'r' + nd.name} d={ribbon(nd)} fill={hexA(nd.fill, 0.34)} />
          ))}
          {laid.map((nd, i) => (
            <path key={'c' + nd.name} d={center(nd)} fill="none"
              stroke="rgba(255,255,255,0.5)" strokeWidth={Math.min(2, Math.max(0.8, nd.h / 12))}
              strokeDasharray="2 16" strokeLinecap="round"
              style={{ animation: `flowdash 1.6s linear infinite`, animationDelay: `${i * 0.25}s`, opacity: m > 0.6 ? 0.5 : 0 }} />
          ))}
          {laid.map((nd, i) => {
            let y = leftTop;
            for (let k = 0; k < i; k++) y += laid[k].h;
            return <rect key={'l' + nd.name} x={xL} y={y} width={wbar} height={Math.max(0.5, nd.h)} fill={hexA(nd.fill, 0.85)} />;
          })}
          <rect x={xL} y={leftTop} width={wbar} height={usableH} rx="7" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          <text x={xL + wbar / 2} y={leftTop + usableH / 2} fill="rgba(255,255,255,0.92)"
            fontSize="11" fontWeight="800" letterSpacing="2" textAnchor="middle"
            transform={`rotate(-90 ${xL + wbar / 2} ${leftTop + usableH / 2})`}>INCOME</text>

          {laid.map((nd) => (
            <g key={'n' + nd.name} style={{ opacity: m > 0.4 ? 1 : 0, transition: 'opacity .3s' }}>
              <rect x={xR} y={nd.ry0} width={wbarR} height={Math.max(2, nd.h)} rx="5" fill={nd.fill} />
              <text x={label} y={nd.ryc - 2} fill="#f4f4f5" fontSize="12.5" fontWeight="800">{nd.name}</text>
              <text x={label} y={nd.ryc + 12} fill="#8a8a90" fontSize="10.5" fontWeight="700"
                style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtC(nd.amount)}</text>
            </g>
          ))}
        </svg>
      </div>

      <div className="flow2-foot">
        <div className="flow2-stat"><div className="l">Income</div><div className="v tnum">{fmtC(B.income)}</div></div>
        <div className="flow2-stat"><div className="l">Spent</div><div className="v tnum" style={{ color: '#F77F9E' }}>{fmtC(B.totalSpent)}</div></div>
        <div className="flow2-stat"><div className="l">Saved · {B.income > 0 ? Math.round(saved / B.income * 100) : 0}%</div><div className="v tnum" style={{ color: '#9be36f' }}>{fmtC(saved)}</div></div>
      </div>
    </main>
  );
}

Object.assign(window, { Flow });
