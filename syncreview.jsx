// syncreview.jsx — shown when Gmail sync finds new transactions. Nothing
// gets added to the budget silently; the person reviews merchant, amount,
// and category (pre-filled with a guess) before confirming.

function SyncReviewSheet({ items, groups, onConfirm, onSkip, onClose }) {
  const [rows, setRows] = React.useState(items);
  React.useEffect(() => { setRows(items); }, [items]);

  if (!items || items.length === 0) return null;

  const updateRow = (gmailId, patch) => {
    setRows((prev) => prev.map((r) => (r.gmailId === gmailId ? { ...r, ...patch } : r)));
  };
  const removeRow = (gmailId) => {
    onSkip(gmailId);
    setRows((prev) => prev.filter((r) => r.gmailId !== gmailId));
  };

  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2>New from Gmail</h2>
          <button className="sheet-x" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="add-cat" style={{ marginBottom: 14 }}>
          {rows.length} transaction{rows.length !== 1 ? 's' : ''} found since last sync — check the category on each, then add them.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
          {rows.map((r) => (
            <div key={r.gmailId} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <input type="text" value={r.merchant}
                  onChange={(e) => updateRow(r.gmailId, { merchant: e.target.value })}
                  style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', color: 'var(--ink)', fontSize: 15, fontWeight: 700, padding: 0 }} />
                <span style={{ fontFamily: 'inherit', fontWeight: 800, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {fmtMoney(r.amount)}
                </span>
                <button onClick={() => removeRow(r.gmailId)} aria-label="Skip this transaction"
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 18, lineHeight: 1, cursor: 'pointer', padding: '0 0 0 4px' }}>&times;</button>
              </div>
              <select value={r.categoryId} onChange={(e) => updateRow(r.gmailId, { categoryId: e.target.value })}
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 8px', color: 'var(--ink)', fontSize: 13, fontFamily: 'inherit' }}>
                {groups.map((g) => (
                  <optgroup label={g.name} key={g.id}>
                    {g.cats.map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
          ))}
          {rows.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '12px 0' }}>All skipped.</div>
          )}
        </div>

        <button className="save-btn" style={{ background: '#9be36f', color: '#0d2600' }}
          disabled={rows.length === 0}
          onClick={() => onConfirm(rows)}>
          Add {rows.length > 0 ? rows.length : ''} transaction{rows.length !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { SyncReviewSheet });
