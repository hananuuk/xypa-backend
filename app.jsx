// app.jsx — Plan screen: To Be Assigned, month switcher, collapsible groups.
// Real persisted data (localStorage) + automatic Gmail sync, replacing the
// design prototype's in-memory fixture.

const { useState, useMemo, useRef, useEffect } = React;

const BACKEND_URL = 'https://xypa-backend.onrender.com';

// Fixed final values from the design handoff — this was a live-editable
// dev panel in the prototype; the shipped app just uses the chosen settings.
const T = { drainStyle: 'reveal', valueMode: 'currency', radius: 'pill', lowThreshold: 0.2, showNav: true };

function deepCopy(d) {
  return d.map((g) => ({ ...g, cats: g.cats.map((c) => ({ ...c, txns: c.txns.map((x) => ({ ...x })) })) }));
}

function todayLabel(date) {
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return MON[date.getMonth()] + ' ' + date.getDate();
}

function App() {
  const initial = useMemo(() => loadInitialState(), []);
  const t = T;
  const [groups, setGroups] = useState(() => initial.groups);
  const [tba, setTba] = useState(initial.tba);
  const [goals, setGoals] = useState(() => initial.goals);
  const [accounts, setAccounts] = useState(() => initial.accounts);
  const [income, setIncome] = useState(initial.income);
  const [monthHistory] = useState(initial.monthHistory);
  const [importedGmailIds, setImportedGmailIds] = useState(() => new Set(initial.importedGmailIds));

  const [collapsed, setCollapsed] = useState({});
  const [selId, setSelId] = useState(null);
  const [addForId, setAddForId] = useState(null);
  const [transfer, setTransfer] = useState(null);
  const [settingsId, setSettingsId] = useState(null);
  const [addGroupId, setAddGroupId] = useState(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [groupEditId, setGroupEditId] = useState(null);
  const [activeTab, setActiveTab] = useState('plan');
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [hideAmount, setHideAmount] = useState(false);
  const [gmailStatus, setGmailStatus] = useState({ mode: 'checking', text: 'Checking Gmail…' });
  const dragSuppress = useRef(false);

  const monthLabel = MONTH_NAMES[NOW_MONTH] + ' ' + NOW_YEAR;

  // ---- persistence: save on every change to the data that matters ----
  useEffect(() => {
    persistState({
      groups, tba, goals, accounts, income, monthHistory,
      importedGmailIds: Array.from(importedGmailIds),
    });
  }, [groups, tba, goals, accounts, income, monthHistory, importedGmailIds]);

  // ---- goals ----
  const onAddToGoal = (id, amt) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, saved: g.saved + amt } : g)));
    setTba((v) => Math.round((v - amt) * 100) / 100);
  };
  const onCreateGoal = (data) => setGoals((prev) => [...prev, { id: 'gl' + Date.now(), ...data }]);
  const onCompleteGoal = (id) => setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, done: !g.done } : g)));
  const onDeleteGoal = (id) => setGoals((prev) => prev.filter((g) => g.id !== id));
  const onReorderGoal = (from, to) => setGoals((prev) => {
    const n = prev.slice(); const [m] = n.splice(from, 1); n.splice(to, 0, m); return n;
  });

  const onAssign = (catId, delta, log) => {
    setGroups((prev) => {
      let applied = 0;
      const next = prev.map((g) => ({
        ...g,
        cats: g.cats.map((c) => {
          if (c.id !== catId) return c;
          let d = delta;
          if (c.assigned + d < 0) d = -c.assigned;
          applied = d;
          const txns = log && d !== 0
            ? [...c.txns, { kind: 'assign', date: 'Today', amount: d }]
            : c.txns;
          return { ...c, assigned: Math.round((c.assigned + d) * 100) / 100, txns };
        }),
      }));
      setTba((v) => Math.round((v - applied) * 100) / 100);
      return next;
    });
  };

  const onAddTxn = (catId, txn) => {
    setGroups((prev) => prev.map((g) => ({
      ...g,
      cats: g.cats.map((c) => (c.id === catId ? { ...c, txns: [...c.txns, txn] } : c)),
    })));
  };

  const onTransfer = (giverId, receiverId, amt) => {
    setGroups((prev) => {
      const nameOf = (id) => {
        for (const g of prev) for (const c of g.cats) if (c.id === id) return c.name;
        return '';
      };
      const gName = nameOf(giverId), rName = nameOf(receiverId);
      return prev.map((g) => ({
        ...g,
        cats: g.cats.map((c) => {
          if (c.id === giverId) return { ...c, assigned: Math.round((c.assigned - amt) * 100) / 100,
            txns: [...c.txns, { kind: 'move', date: 'Today', amount: amt, dir: 'out', other: rName }] };
          if (c.id === receiverId) return { ...c, assigned: Math.round((c.assigned + amt) * 100) / 100,
            txns: [...c.txns, { kind: 'move', date: 'Today', amount: amt, dir: 'in', other: gName }] };
          return c;
        }),
      }));
    });
  };

  const toggle = (gid) => setCollapsed((c) => ({ ...c, [gid]: !c[gid] }));

  const onReorderCat = (groupId, from, to) => {
    setGroups((prev) => prev.map((g) => {
      if (g.id !== groupId) return g;
      const cats = g.cats.slice();
      const [m] = cats.splice(from, 1);
      cats.splice(to, 0, m);
      return { ...g, cats };
    }));
  };
  const onReorderGroup = (from, to) => {
    setGroups((prev) => {
      const next = prev.slice();
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return next;
    });
  };
  const startCatDrag = (groupId) => (wrapEl, point) =>
    beginReorder(wrapEl, point, { itemSelector: '.pill-wrap', gap: 10, lift: 1.04,
      onCommit: (f, tx) => onReorderCat(groupId, f, tx) });
  const startGroupDrag = (point) => {
    dragSuppress.current = true;
    const el = point.target.closest('.group');
    beginReorder(el, point, { itemSelector: '.group', gap: 18, lift: 1.02,
      onCommit: onReorderGroup });
  };

  const onSaveCategory = (catId, patch) => {
    setGroups((prev) => {
      let delta = 0;
      const next = prev.map((g) => ({
        ...g,
        cats: g.cats.map((c) => {
          if (c.id !== catId) return c;
          const newAssigned = patch.assigned;
          const d = newAssigned - c.assigned;
          delta = d;
          const txns = d !== 0 ? [...c.txns, { kind: 'assign', date: 'Today', amount: d }] : c.txns;
          return { ...c, name: patch.name, color: patch.color, assigned: newAssigned,
            target: patch.target, note: patch.note, txns };
        }),
      }));
      if (delta !== 0) setTba((v) => Math.round((v - delta) * 100) / 100);
      return next;
    });
  };

  const onDeleteCategory = (catId) => {
    setGroups((prev) => {
      let back = 0;
      const next = prev.map((g) => ({
        ...g,
        cats: g.cats.filter((c) => {
          if (c.id !== catId) return true;
          back = c.assigned - spentOf(c);
          return false;
        }),
      }));
      if (back !== 0) setTba((v) => Math.round((v + back) * 100) / 100);
      return next;
    });
    setSettingsId(null);
    setSelId((s) => (s === catId ? null : s));
  };

  const onAddCategory = (groupId, data) => {
    const id = 'c' + Date.now();
    const txns = data.assigned > 0 ? [{ kind: 'assign', date: 'Today', amount: data.assigned }] : [];
    const cat = { id, name: data.name, color: data.color, assigned: data.assigned,
      prevAssigned: 0, target: data.target, note: '', txns };
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, cats: [...g.cats, cat] } : g)));
    if (data.assigned > 0) setTba((v) => Math.round((v - data.assigned) * 100) / 100);
  };

  const onAddAccount = (account) => setAccounts((prev) => [...prev, account]);

  const onAddGroup = (name, family) => {
    setGroups((prev) => [...prev, { id: 'grp' + Date.now(), name, family: family || 'b', cats: [] }]);
  };
  const onSaveGroupName = (groupId, name, family) => {
    setGroups((prev) => prev.map((g) => {
      if (g.id !== groupId) return g;
      const fam = family || groupFamily(g);
      const fk = familyKeys(fam);
      const cats = g.cats.map((c, i) => ({ ...c, color: fk[i % fk.length] }));
      return { ...g, name, family: fam, cats };
    }));
  };
  const onDeleteGroup = (groupId) => {
    setGroups((prev) => {
      let back = 0;
      const next = prev.filter((g) => {
        if (g.id !== groupId) return true;
        back = g.cats.reduce((s, c) => s + (c.assigned - spentOf(c)), 0);
        return false;
      });
      if (back !== 0) setTba((v) => Math.round((v + back) * 100) / 100);
      return next;
    });
    setGroupEditId(null);
  };

  const selCat = useMemo(() => {
    for (const g of groups) for (const c of g.cats) if (c.id === selId) return c;
    return null;
  }, [groups, selId]);

  const addCat = useMemo(() => {
    for (const g of groups) for (const c of g.cats) if (c.id === addForId) return c;
    return null;
  }, [groups, addForId]);

  const allCats = useMemo(() => groups.flatMap((g) => g.cats), [groups]);
  const transferCat = useMemo(() => {
    if (!transfer) return null;
    for (const g of groups) for (const c of g.cats) if (c.id === transfer.id) return c;
    return null;
  }, [groups, transfer]);

  const settingsRef = useMemo(() => {
    for (const g of groups) for (const c of g.cats) if (c.id === settingsId) return { cat: c, group: g };
    return null;
  }, [groups, settingsId]);
  const addGroup = useMemo(() => groups.find((g) => g.id === addGroupId) || null, [groups, addGroupId]);
  const groupEdit = useMemo(() => groups.find((g) => g.id === groupEditId) || null, [groups, groupEditId]);

  // ================= Gmail sync (automatic; new finds are held for review) =================
  const groupsRef = useRef(groups);
  useEffect(() => { groupsRef.current = groups; }, [groups]);
  const importedRef = useRef(importedGmailIds);
  useEffect(() => { importedRef.current = importedGmailIds; }, [importedGmailIds]);
  const [pendingSync, setPendingSync] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const pendingRef = useRef(pendingSync);
  useEffect(() => { pendingRef.current = pendingSync; }, [pendingSync]);

  function timeAgo(date) {
    const mins = Math.round((Date.now() - date.getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins === 1) return '1 minute ago';
    if (mins < 60) return `${mins} minutes ago`;
    const hrs = Math.round(mins / 60);
    return hrs === 1 ? '1 hour ago' : `${hrs} hours ago`;
  }

  const syncGmail = async () => {
    setGmailStatus({ mode: 'syncing', text: 'Syncing…' });
    try {
      const res = await fetch(BACKEND_URL + '/api/sync');
      if (res.status === 401) {
        setGmailStatus({ mode: 'off', text: 'not-connected' });
        return;
      }
      if (!res.ok) throw new Error('sync failed');
      const data = await res.json();
      const already = importedRef.current;
      const pendingIds = new Set(pendingRef.current.map((p) => p.gmailId));
      const fresh = (data.transactions || []).filter((tx) => !already.has(tx.gmailId) && !pendingIds.has(tx.gmailId));

      if (fresh.length > 0) {
        setPendingSync((prev) => [
          ...prev,
          ...fresh.map((tx) => ({
            gmailId: tx.gmailId,
            merchant: tx.merchant,
            amount: tx.amount,
            date: tx.date,
            categoryId: categorizeForSync(tx.merchant, groupsRef.current),
          })),
        ]);
      }

      setGmailStatus({ mode: 'on', text: `synced ${timeAgo(new Date())}` });
    } catch (e) {
      console.error(e);
      setGmailStatus({ mode: 'off', text: 'sync-failed' });
    }
  };

  const checkGmailAndSync = async () => {
    try {
      const statusRes = await fetch(BACKEND_URL + '/auth/status');
      const statusData = await statusRes.json();
      if (!statusData.connected) {
        setGmailStatus({ mode: 'off', text: 'not-connected' });
        return;
      }
      await syncGmail();
    } catch (e) {
      console.error(e);
      setGmailStatus({ mode: 'off', text: 'unreachable' });
    }
  };

  const onConfirmSync = (rows) => {
    setGroups((prev) => {
      let next = prev;
      rows.forEach((r) => {
        next = next.map((g) => ({
          ...g,
          cats: g.cats.map((c) => (c.id === r.categoryId
            ? { ...c, txns: [...c.txns, { kind: 'spend', date: r.date ? todayLabel(new Date(r.date)) : 'Today', payee: r.merchant, amount: r.amount, gmailId: r.gmailId }] }
            : c)),
        }));
      });
      return next;
    });
    setImportedGmailIds((prev) => {
      const next = new Set(prev);
      rows.forEach((r) => next.add(r.gmailId));
      return next;
    });
    setPendingSync((prev) => prev.filter((p) => !rows.some((r) => r.gmailId === p.gmailId)));
    setReviewOpen(false);
  };

  const onSkipSync = (gmailId) => {
    setImportedGmailIds((prev) => new Set(prev).add(gmailId));
    setPendingSync((prev) => prev.filter((p) => p.gmailId !== gmailId));
  };

  useEffect(() => {
    checkGmailAndSync();
    const syncInterval = setInterval(checkGmailAndSync, 3 * 60 * 1000);
    const tickInterval = setInterval(() => {
      setGmailStatus((s) => (s.mode === 'on' && s.text.includes('synced') ? { ...s } : s));
    }, 30 * 1000);
    return () => { clearInterval(syncInterval); clearInterval(tickInterval); };
  }, []);

  // keep bottom sheets clear of the on-screen keyboard
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--kb-inset', kb + 'px');
    };
    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    onResize();
    return () => { vv.removeEventListener('resize', onResize); vv.removeEventListener('scroll', onResize); };
  }, []);

  const statusText = gmailStatus.text === 'not-connected'
    ? <>Gmail not connected · <a href={BACKEND_URL + '/auth/login'} target="_blank" rel="noopener">Connect</a></>
    : gmailStatus.text === 'sync-failed' ? 'Sync failed — will retry shortly'
    : gmailStatus.text === 'unreachable' ? 'Could not reach the sync server'
    : gmailStatus.text === 'Syncing…' ? gmailStatus.text
    : gmailStatus.text === 'Checking Gmail…' ? gmailStatus.text
    : `Connected · ${gmailStatus.text}`;

  return (
    <div className="screen">
      <div className="gmail-pill">
        <span className={'gmail-dot' + (gmailStatus.mode === 'on' ? ' on' : gmailStatus.mode === 'off' ? ' off' : gmailStatus.mode === 'syncing' ? ' syncing' : '')} />
        <span>{statusText}</span>
      </div>
      {pendingSync.length > 0 && (
        <button className="sync-banner" onClick={() => setReviewOpen(true)}>
          {pendingSync.length} new transaction{pendingSync.length !== 1 ? 's' : ''} synced · tap to review
        </button>
      )}

      {activeTab === 'plan' && (
      <header className="plan-head">
        <button className="plan-add" onClick={() => setAddMenuOpen(true)} aria-label="Add">+</button>
        <div className="month-switch">
          <span>{monthLabel}</span>
        </div>

        <div className={'tba' + (tba < 0 ? ' tba--neg' : '')}>
          <div className="tba-amount-row">
            <div className="tba-amount" onClick={() => setIncomeOpen(true)}>{hideAmount ? '••••••' : fmtMoney(tba)}</div>
            <button className="tba-eye" onClick={(e) => { e.stopPropagation(); setHideAmount((v) => !v); }} aria-label={hideAmount ? 'Show amount' : 'Hide amount'}>
              {hideAmount ? '\u25CE' : '\u25C9'}
            </button>
          </div>
          <div className="tba-label" onClick={() => setIncomeOpen(true)}>{tba < 0 ? 'Over-assigned' : 'To Be Assigned'}</div>
        </div>
      </header>
      )}

      {activeTab === 'plan' && (
      <main className="plan-list">
        {groups.map((g) => {
          const avail = g.cats.reduce((s, c) => s + (c.assigned - spentOf(c)), 0);
          const isOpen = !collapsed[g.id];
          const lp = makeLongPress({ onTrigger: startGroupDrag });
          return (
            <section className="group" key={g.id}>
              <div className="group-head" {...lp.handlers}>
                <button className="group-toggle"
                  onClick={() => { if (dragSuppress.current) { dragSuppress.current = false; return; } toggle(g.id); }}>
                  <span className={'chev' + (isOpen ? ' chev--open' : '')}>&rsaquo;</span>
                  <span className="group-dot" style={{ background: familyFill(groupFamily(g)) }} />
                  <span className="group-name">{g.name}</span>
                  <span className="group-avail">{fmtMoney(avail)}</span>
                </button>
                <button className="group-edit" onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setGroupEditId(g.id)} aria-label="Edit group">{'\u22EF'}</button>
              </div>
              {isOpen && (
                <div className="group-pills">
                  {g.cats.map((c) => (
                    <Pill key={c.id} cat={c} t={t}
                      onTap={() => setSelId(c.id)}
                      onAdd={() => setAddForId(c.id)}
                      onEdit={() => setSettingsId(c.id)}
                      onReorderStart={startCatDrag(g.id)} />
                  ))}
                  {g.cats.length === 0 && (
                    <button className="group-empty" onClick={() => setAddGroupId(g.id)}>No categories yet — add one</button>
                  )}
                </div>
              )}
            </section>
          );
        })}
        <div className="list-foot">All money assigned through {monthLabel}</div>
      </main>
      )}

      {activeTab === 'goals' && (
        <GoalsScreen goals={goals} tba={tba}
          onAddToGoal={onAddToGoal} onCreateGoal={onCreateGoal}
          onCompleteGoal={onCompleteGoal} onDeleteGoal={onDeleteGoal} onReorderGoal={onReorderGoal} />
      )}
      {activeTab === 'reflect' && <ReflectScreen groups={groups} income={income} monthHistory={monthHistory} monthLabel={monthLabel} />}
      {activeTab === 'accounts' && <AccountsScreen accounts={accounts} onAddAccount={onAddAccount} />}

      {t.showNav && (
        <nav className="tabbar">
          <button className={'tab' + (activeTab === 'plan' ? ' tab--active' : '')} onClick={() => setActiveTab('plan')}>
            <span className="tab-ico tab-ico--plan" />Plan</button>
          <button className={'tab' + (activeTab === 'goals' ? ' tab--active' : '')} onClick={() => setActiveTab('goals')}>
            <span className="tab-ico tab-ico--goals" />Goals</button>
          <button className={'tab' + (activeTab === 'reflect' ? ' tab--active' : '')} onClick={() => setActiveTab('reflect')}>
            <span className="tab-ico tab-ico--reflect" />Reflect</button>
          <button className={'tab' + (activeTab === 'accounts' ? ' tab--active' : '')} onClick={() => setActiveTab('accounts')}>
            <span className="tab-ico tab-ico--accts" />Accounts</button>
        </nav>
      )}

      <DetailScreen cat={selCat} t={t} onAddOpen={(id) => setAddForId(id)}
        onMove={(id, mode) => setTransfer({ id, mode })}
        onEdit={(id) => setSettingsId(id)} onClose={() => setSelId(null)} />
      <AddTxnModal cat={addCat} onSave={onAddTxn} onClose={() => setAddForId(null)} />
      {transfer && (
        <TransferSheet thisCat={transferCat} mode={transfer.mode} allCats={allCats}
          onApply={onTransfer} onClose={() => setTransfer(null)} />
      )}
      {settingsRef && (
        <CategorySettings cat={settingsRef.cat} group={settingsRef.group}
          onSave={onSaveCategory} onDelete={onDeleteCategory} onClose={() => setSettingsId(null)} />
      )}
      <AddCategoryModal open={addGroupId != null} groups={groups} initialGroupId={addGroupId}
        onAdd={onAddCategory} onClose={() => setAddGroupId(null)} />
      {addMenuOpen && (
        <AddMenu
          onCategory={() => { setAddMenuOpen(false); setAddGroupId(groups[0].id); }}
          onGroup={() => { setAddMenuOpen(false); setNewGroupOpen(true); }}
          onClose={() => setAddMenuOpen(false)} />
      )}
      {newGroupOpen && (
        <GroupModal mode="new" group={null}
          onSave={(id, name, family) => onAddGroup(name, family)} onClose={() => setNewGroupOpen(false)} />
      )}
      {groupEdit && (
        <GroupModal mode="edit" group={groupEdit}
          onSave={(id, name, family) => onSaveGroupName(id, name, family)} onDelete={onDeleteGroup}
          onClose={() => setGroupEditId(null)} />
      )}
      {incomeOpen && (
        <IncomeSheet current={income} onSave={(v) => { setIncome(v); setIncomeOpen(false); }} onClose={() => setIncomeOpen(false)} />
      )}
      {reviewOpen && (
        <SyncReviewSheet items={pendingSync} groups={groups} onConfirm={onConfirmSync} onSkip={onSkipSync} onClose={() => setReviewOpen(false)} />
      )}
    </div>
  );
}

function IncomeSheet({ current, onSave, onClose }) {
  const [val, setVal] = React.useState(current ? String(current) : '');
  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2>Monthly income</h2>
          <button className="sheet-x" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="add-cat" style={{ marginBottom: 14 }}>Used for the Reflect dashboard — how much of your income is spent, saved, or left over.</div>
        <label className="field">
          <span className="field-label">Amount</span>
          <MoneyInput value={val} onChange={setVal} placeholder="3,400,000" className="field-input" autoFocus />
        </label>
        <button className="save-btn" style={{ background: '#f4f4f5', color: '#0b0b0c' }}
          onClick={() => onSave(parseInt(val, 10) || 0)}>Save</button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
