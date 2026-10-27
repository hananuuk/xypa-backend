// data.jsx — budget model + palette + activity ledger + YNAB-style targets.
// Category fields:
//   assigned       current month's budget
//   prevAssigned   last month's assigned (reference, read-only)
//   target         null | { type:'monthly', amount } | { type:'date', amount, by }
//   note           free text
//   txns           chronological (oldest-first) activity:
//                    { kind:'assign', date, amount }
//                    { kind:'spend',  date, payee, amount, gmailId? }
//                    { kind:'move',   date, amount, dir:'in'|'out', other }
// spentOf(cat) = sum of spend amounts. available = assigned - spentOf(cat).

const PALETTE = {
  // Bills — greens
  g1: { fill: '#3FB970', track: '#0e2c1c' },
  g2: { fill: '#8FD94A', track: '#21330f' },
  g3: { fill: '#2FC6A0', track: '#0d2f29' },
  g4: { fill: '#B7E24A', track: '#283612' },
  // Everyday — reds / pinks
  r1: { fill: '#EF5A5A', track: '#3a1414' },
  r2: { fill: '#F0436B', track: '#3a1422' },
  r3: { fill: '#F77F9E', track: '#3a1a26' },
  r4: { fill: '#F9A8C6', track: '#391a2c' },
  // Quality of Life — blues
  b1: { fill: '#4FA8F2', track: '#0f2840' },
  b2: { fill: '#7C86F2', track: '#1c1e3c' },
  b3: { fill: '#46C7E0', track: '#0d2f37' },
  b4: { fill: '#9DBBF7', track: '#1a2438' },
  // Savings — golds
  y1: { fill: '#F4C84A', track: '#36300f' },
  y2: { fill: '#F2A33F', track: '#38260f' },
  y3: { fill: '#E8B84F', track: '#332b10' },
  y4: { fill: '#F7D98A', track: '#332c12' },
};

const OVERSPENT = { fill: '#F2453D', text: '#2a0606' };

const GROUP_FAMILY = { bills: 'g', everyday: 'r', lifestyle: 'b', goals: 'y' };
function familyKeys(prefix) {
  return Object.keys(PALETTE).filter((k) => k.startsWith(prefix));
}

const FAMILIES = [
  { key: 'g', name: 'Green', fill: '#3FB970' },
  { key: 'r', name: 'Red', fill: '#EF5A5A' },
  { key: 'b', name: 'Blue', fill: '#4FA8F2' },
  { key: 'y', name: 'Gold', fill: '#F4C84A' },
];
function groupFamily(group) {
  if (group && group.family) return group.family;
  if (group && GROUP_FAMILY[group.id]) return GROUP_FAMILY[group.id];
  return 'g';
}
function familyFill(key) {
  const f = FAMILIES.find((x) => x.key === key);
  return f ? f.fill : '#3FB970';
}

const A = (date, amount) => ({ kind: 'assign', date, amount });
const S = (date, payee, amount) => ({ kind: 'spend', date, payee, amount });
const M = (amount) => ({ type: 'monthly', amount });
const B = (amount, by) => ({ type: 'date', amount, by });

// ---- Seed data: only used the very first time the app runs on a device ----
const SEED_PLAN_DATA = [
  {
    id: 'bills', name: 'Bills', family: 'g',
    cats: [
      { id: 'rent', name: 'Rent', assigned: 1200000, prevAssigned: 1200000, color: 'g1',
        target: M(1200000), note: '', txns: [] },
      { id: 'electric', name: 'Electric', assigned: 80000, prevAssigned: 75000, color: 'g2',
        target: M(80000), note: '', txns: [] },
      { id: 'internet', name: 'Internet', assigned: 50000, prevAssigned: 50000, color: 'g3',
        target: M(50000), note: '', txns: [] },
      { id: 'phone', name: 'Phone', assigned: 40000, prevAssigned: 40000, color: 'g4',
        target: M(40000), note: '', txns: [] },
    ],
  },
  {
    id: 'everyday', name: 'Everyday', family: 'r',
    cats: [
      { id: 'groceries', name: 'Groceries', assigned: 700000, prevAssigned: 650000, color: 'r1',
        target: M(700000), note: '', txns: [] },
      { id: 'dining', name: 'Dining Out', assigned: 250000, prevAssigned: 250000, color: 'r2',
        target: M(250000), note: '', txns: [] },
      { id: 'transport', name: 'Transport', assigned: 120000, prevAssigned: 100000, color: 'r3',
        target: M(120000), note: '', txns: [] },
      { id: 'coffee', name: 'Coffee', assigned: 60000, prevAssigned: 55000, color: 'r4',
        target: M(60000), note: '', txns: [] },
      { id: 'other', name: 'Uncategorized', assigned: 0, prevAssigned: 0, color: 'r4',
        target: null, note: 'Catch-all for synced transactions we could not match to a category.', txns: [] },
    ],
  },
  {
    id: 'lifestyle', name: 'Quality of Life', family: 'b',
    cats: [
      { id: 'gym', name: 'Gym', assigned: 90000, prevAssigned: 90000, color: 'b1',
        target: M(90000), note: '', txns: [] },
      { id: 'subs', name: 'Subscriptions', assigned: 45000, prevAssigned: 45000, color: 'b2',
        target: M(45000), note: '', txns: [] },
      { id: 'shop', name: 'Shopping', assigned: 200000, prevAssigned: 150000, color: 'b3',
        target: null, note: '', txns: [] },
    ],
  },
  {
    id: 'goals', name: 'Savings Goals', family: 'y',
    cats: [
      { id: 'efund', name: 'Emergency Fund', assigned: 500000, prevAssigned: 500000, color: 'y1',
        target: B(5000000, 'Dec 2026'), note: 'Aim for 3 months of expenses.', txns: [] },
      { id: 'vacation', name: 'Vacation', assigned: 300000, prevAssigned: 250000, color: 'y2',
        target: B(3000000, 'Sep 2026'), note: '', txns: [] },
    ],
  },
];

function spentOf(cat) {
  return cat.txns.reduce((s, x) => (x.kind === 'spend' ? s + x.amount : s), 0);
}

const SEED_TBA = 0;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const now = new Date();
const NOW_MONTH = now.getMonth();
const NOW_YEAR = now.getFullYear();
function monthLabelAhead(n) {
  const base = NOW_MONTH + n;
  const y = NOW_YEAR + Math.floor(base / 12);
  return MONTH_NAMES[((base % 12) + 12) % 12] + ' ' + y;
}
function monthlyNeeded(goal) {
  if (goal.done || goal.saved >= goal.target) return 0;
  const m = Math.max(1, goal.monthsLeft);
  return Math.ceil((goal.target - goal.saved) / m / 1000) * 1000;
}

const SEED_GOALS_DATA = [];
const GOAL_COLORS = ['#F4C84A', '#4FA8F2', '#EF5A5A', '#3FB970', '#7C86F2', '#F2A33F', '#46C7E0', '#F0436B'];

// ---- Income: editable, persisted. Falls back to 0 until the person sets it. ----
const SEED_INCOME = 0;

function totalSpent(groups) {
  return groups.reduce((s, g) => s + g.cats.reduce((a, c) => a + spentOf(c), 0), 0);
}
function totalAssigned(groups) {
  return groups.reduce((s, g) => s + g.cats.reduce((a, c) => a + c.assigned, 0), 0);
}
function payeeTotals(groups) {
  const map = {};
  for (const g of groups) for (const c of g.cats) for (const x of c.txns) {
    if (x.kind === 'spend') map[x.payee] = (map[x.payee] || 0) + x.amount;
  }
  return Object.entries(map).map(([payee, amount]) => ({ payee, amount }))
    .sort((a, b) => b.amount - a.amount);
}

const SEED_ACCOUNTS_DATA = [];

// ======================= Persistence =======================
const STORE_KEY = 'xypa-budget-v1';

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load saved budget', e);
    return null;
  }
}

function saveStore(store) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Failed to save budget', e);
  }
}

function deepCopyGroups(d) {
  return d.map((g) => ({ ...g, cats: g.cats.map((c) => ({ ...c, txns: c.txns.map((x) => ({ ...x })) })) }));
}

function loadInitialState() {
  const saved = loadStore();
  if (saved) {
    return {
      groups: saved.groups || deepCopyGroups(SEED_PLAN_DATA),
      tba: typeof saved.tba === 'number' ? saved.tba : SEED_TBA,
      goals: saved.goals || SEED_GOALS_DATA.map((g) => ({ ...g })),
      accounts: saved.accounts || SEED_ACCOUNTS_DATA.map((a) => ({ ...a })),
      income: typeof saved.income === 'number' ? saved.income : SEED_INCOME,
      monthHistory: saved.monthHistory || [],
      importedGmailIds: saved.importedGmailIds || [],
    };
  }
  return {
    groups: deepCopyGroups(SEED_PLAN_DATA),
    tba: SEED_TBA,
    goals: SEED_GOALS_DATA.map((g) => ({ ...g })),
    accounts: SEED_ACCOUNTS_DATA.map((a) => ({ ...a })),
    income: SEED_INCOME,
    monthHistory: [],
    importedGmailIds: [],
  };
}

function persistState(state) {
  saveStore({
    groups: state.groups,
    tba: state.tba,
    goals: state.goals,
    accounts: state.accounts,
    income: state.income,
    monthHistory: state.monthHistory,
    importedGmailIds: state.importedGmailIds,
  });
}

// Match a synced merchant name to an existing category by keyword.
// Falls back to the 'other' catch-all category in Everyday if nothing matches.
const CATEGORY_KEYWORDS = {
  groceries: ['nomin', 'emart', 'grocery', 'market', 'supermarket', 'сансар', 'номин', 'materhouse'],
  dining: ['restaurant', 'hotpot', 'pizza', 'kfc', 'cafe', 'nomads', 'зоогийн', 'ресторан'],
  coffee: ['coffee', 'кофе', 'toms', 'caffe'],
  transport: ['taxi', 'petrol', 'shunkhlai', 'ubcab', 'bus', 'газ', 'shell'],
  gym: ['gym', 'fitness', 'спорт'],
  subs: ['netflix', 'spotify', 'subscription', 'apple', 'google'],
  shop: ['department store', 'shop', 'дэлгүүр'],
  rent: ['landlord', 'rent', 'түрээс'],
  electric: ['tsakhilgaan', 'electric', 'цахилгаан'],
  phone: ['mobicom', 'unitel', 'skytel', 'phone'],
  internet: ['internet', 'интернэт'],
};

function categorizeForSync(merchant, groups) {
  const text = (merchant || '').toLowerCase();
  const allCats = groups.flatMap((g) => g.cats.map((c) => ({ ...c, groupId: g.id })));

  for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => text.includes(k))) {
      const match = allCats.find((c) => c.id === catId);
      if (match) return match.id;
    }
  }
  const fallback = allCats.find((c) => c.id === 'other');
  return fallback ? fallback.id : (allCats[0] ? allCats[0].id : null);
}

Object.assign(window, {
  PALETTE, OVERSPENT, spentOf, GROUP_FAMILY, familyKeys,
  FAMILIES, groupFamily, familyFill,
  GOAL_COLORS, monthLabelAhead, monthlyNeeded, MONTH_NAMES,
  totalSpent, totalAssigned, payeeTotals,
  loadInitialState, persistState, deepCopyGroups, categorizeForSync,
  NOW_MONTH, NOW_YEAR,
});
