// accounts.jsx — light Accounts tab: net worth + list of accounts with balances.

function AccountsScreen({ accounts }) {
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
        <button className="acct-add">+ Link an account</button>
      </div>
    </main>
  );
}

Object.assign(window, { AccountsScreen });
