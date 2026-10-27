// dash-shared.jsx — shared compute, hooks, SVG geometry for the Reflect
// dashboard. Reads the live budget model passed in as props (not globals)
// so it reflects real data + Gmail-synced transactions.

const { useState, useEffect, useRef, useMemo } = React;

/* ---------- money ---------- */
function fmtFull(n) {
  const neg = n < 0, a = Math.abs(Math.round(n));
  return (neg ? '\u2212' : '') + a.toLocaleString('en-US') + '\u20ae';
}
function fmtC(n) {
  const neg = n < 0; let a = Math.abs(n), m = '';
  if (a >= 1e6) { a /= 1e6; m = 'M'; } else if (a >= 1e3) { a /= 1e3; m = 'K'; }
  const s = (Math.round(a * 10) / 10).toString();
  return (neg ? '\u2212' : '') + s + m + (m ? '\u2009' : '') + '\u20ae';
}

/* ---------- derive the dashboard model from the live budget ---------- */
function useBudget(src, income, monthHistory) {
  return useMemo(() => {
    const groups = src.map((g) => {
      const cats = g.cats.map((c) => ({
        id: c.id, name: c.name, fill: (PALETTE[c.color] || PALETTE.g1).fill,
        assigned: c.assigned, spent: spentOf(c),
      }));
      const fam = groupFamily(g);
      return {
        id: g.id, name: g.name, family: fam, fill: familyFill(fam),
        assigned: cats.reduce((s, c) => s + c.assigned, 0),
        spent: cats.reduce((s, c) => s + c.spent, 0), cats,
      };
    });
    const inc = income || 0;
    const totalAssigned = groups.reduce((s, g) => s + g.assigned, 0);
    const totalSpent = groups.reduce((s, g) => s + g.spent, 0);
    const saved = inc - totalSpent;
    const usedPct = totalAssigned > 0 ? totalSpent / totalAssigned : 0;
    const cats = groups.flatMap((g) => g.cats).filter((c) => c.spent > 0)
      .sort((a, b) => b.spent - a.spent);
    const daily = {};
    for (const g of src) for (const c of g.cats) for (const x of c.txns) {
      if (x.kind === 'spend') {
        const d = parseInt((x.date || '').replace(/[^0-9]/g, ''), 10) || 0;
        daily[d] = (daily[d] || 0) + x.amount;
      }
    }
    const payees = payeeTotals(src).slice(0, 5);
    const hist = (monthHistory && monthHistory.length) ? monthHistory : [{ m: MONTH_NAMES[NOW_MONTH], income: inc, spent: totalSpent }];
    const months = hist.map((h) => ({ m: h.m, income: h.income == null ? inc : h.income, spent: h.spent == null ? totalSpent : h.spent }));
    return { groups, cats, income: inc, totalAssigned, totalSpent, saved, usedPct, daily, payees, months };
  }, [src, income, monthHistory]);
}

/* ---------- motion hooks ---------- */
function useMount01(duration = 950, delay = 120) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf, start = null;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (ts) => {
      if (start == null) start = ts;
      const t = (ts - start - delay) / duration;
      setV(t <= 0 ? 0 : t >= 1 ? 1 : ease(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return v;
}
function countUp(target, m) { return Math.round(target * m); }

/* ---------- SVG geometry ---------- */
const TAU = Math.PI * 2;
function polar(cx, cy, r, ang) { return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)]; }
function sectorPath(cx, cy, r0, r1, a0, a1) {
  const large = (a1 - a0) % TAU > Math.PI ? 1 : 0;
  const [x0o, y0o] = polar(cx, cy, r1, a0);
  const [x1o, y1o] = polar(cx, cy, r1, a1);
  const [x1i, y1i] = polar(cx, cy, r0, a1);
  const [x0i, y0i] = polar(cx, cy, r0, a0);
  return [
    `M ${x0o} ${y0o}`,
    `A ${r1} ${r1} 0 ${large} 1 ${x1o} ${y1o}`,
    `L ${x1i} ${y1i}`,
    `A ${r0} ${r0} 0 ${large} 0 ${x0i} ${y0i}`,
    'Z',
  ].join(' ');
}

function DashHead({ title = 'Reflect', month = '' }) {
  return (
    <header className="dsh-head">
      <h1>{title}</h1>
      <div className="dsh-month"><span className="chev">&lsaquo;</span><span>{month}</span><span className="chev">&rsaquo;</span></div>
    </header>
  );
}

Object.assign(window, { fmtFull, fmtC, useBudget, useMount01, countUp, polar, sectorPath, TAU, DashHead });
