// accounts.jsx — light Accounts tab: net worth + list of accounts with balances.

const ACCOUNT_KINDS = ['Checking', 'Savings', 'Cash', 'Credit'];

function AddAccountModal({ open, onAdd, onClose }) {
  const [name, setName] = React.useState('');
  const [kind, setKind] = React.useState('Checking');
  const [balance, setBalance] = React.useState('');
  const [color, setColor] = React.useState(GOAL_COLORS[0]);

  if (!open) return null;

  const isDebt = kind === 'Credit';
  const save = () => {
    const raw = parseInt(balance, 10) || 0;
    onAdd({
      id: 'acct' + Date.now(),
      name: name.trim() || kind,
      kind,
      balance: isDebt ? -Math.abs(raw) : Math.abs(raw),
      color,
    });
    setName(''); setBalance(''); setKind('Checking'); setColor(GOAL_COLORS[0]);
    onClose();
  };

  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2>Add account</h2>
          <button className="sheet-x" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <label className="field">
          <span className="field-label">Name</span>
          <input className="field-input" type="text" value={name} placeholder="e.g. Khan Bank · Checking"
            onChange={(e) => setName(e.target.value)} autoFocus />
        </label>

        <span className="field-label">Type</span>
        <div className="swatch-row" style={{ marginBottom: 14 }}>
          {ACCOUNT_KINDS.map((k) => (
            <button key={k} type="button"
              className={'seg-btn' + (k === kind ? ' seg-btn--on' : '')}
              style={{ padding: '8px 12px', borderRadius: 10 }}
              onClick={() => setKind(k)}>{k}</button>
          ))}
        </div>

        <label className="field">
          <span className="field-label">{isDebt ? 'Amount owed' : 'Balance'}</span>
          <MoneyInput className="field-input" value={balance} placeholder="0" onChange={setBalance} />
        </label>

        <span className="field-label">Color</span>
        <div className="swatch-row" style={{ marginBottom: 18 }}>
          {GOAL_COLORS.map((c) => (
            <button key={c} type="button" className={'swatch' + (c === color ? ' swatch--on' : '')}
              style={{ background: c }} onClick={() => setColor(c)} aria-label={'color ' + c} />
          ))}
        </div>

        <button className="save-btn" style={{ background: color, color: '#15130a' }} onClick={save}>
          Add account
        </button>
      </div>
    </div>
  );
}

function AccountsScreen({ accounts, onAddAccount }) {
  const [addOpen, setAddOpen] = React.useState(false);
  const net = accounts.reduce((s, a) => s + a.balance, 0);
  const cash = accounts.filter((a) => a.balance >= 0).reduce((s, a) => s + a.balance, 0);
  const debt = accounts.filter((a) => a.balance < 0).reduce((s, a) => s + a.balance, 0);

  return (
    <main className="accounts-screen">
      <header className="screen-head">
        <div className="screen-head-row"><h1>Accounts</h1></div>
        <div className="acct-net">
          <div className="acct-net-label">Net worth</div>
          <div className="acct-net-amt">{fmtMoney(net)}</div>
          <div className="acct-net-split">
            <span><i className="dot dot--pos" />Cash {fmtMoney(cash)}</span>
            <span><i className="dot dot--neg" />Debt {fmtMoney(debt)}</span>
          </div>
        </div>
      </header>

      <div className="accounts-list">
        {accounts.map((a) => (
          <div className="acct-row" key={a.id}>
            <span className="acct-dot" style={{ background: a.color }} />
            <div className="acct-main">
              <div className="acct-name">{a.name}</div>
              <div className="acct-kind">{a.kind}</div>
            </div>
            <div className={'acct-bal' + (a.balance < 0 ? ' acct-bal--neg' : '')}>{fmtMoney(a.balance)}</div>
          </div>
        ))}
        {accounts.length === 0 && (
          <div style={{ padding: '24px 4px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
            No accounts yet.
          </div>
        )}
        <button className="acct-add" onClick={() => setAddOpen(true)}>+ Add an account</button>
      </div>

      <AddAccountModal open={addOpen} onAdd={onAddAccount} onClose={() => setAddOpen(false)} />
    </main>
  );
}

Object.assign(window, { AccountsScreen });

