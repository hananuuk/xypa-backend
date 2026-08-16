// settings.jsx — full-screen Category Settings (edit) + Add Category modal.

function Swatches({ keys, value, onPick }) {
  return (
    <div className="swatch-row">
      {keys.map((k) => (
        <button key={k} className={'swatch' + (k === value ? ' swatch--on' : '')}
          style={{ background: PALETTE[k].fill }} onClick={() => onPick(k)} aria-label={'color ' + k} />
      ))}
    </div>
  );
}

function Seg({ options, value, onChange }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.v} className={'seg-btn' + (o.v === value ? ' seg-btn--on' : '')}
          onClick={() => onChange(o.v)}>{o.label}</button>
      ))}
    </div>
  );
}

function CategorySettings({ cat, group, onSave, onDelete, onClose }) {
  if (!cat) return null;
  const famKeys = familyKeys(groupFamily(group));

  const [name, setName] = React.useState(cat.name);
  const [color, setColor] = React.useState(cat.color);
  const [assigned, setAssigned] = React.useState(String(cat.assigned));
  const [tType, setTType] = React.useState(cat.target ? cat.target.type : 'none');
  const [tAmt, setTAmt] = React.useState(cat.target ? String(cat.target.amount) : '');
  const [tBy, setTBy] = React.useState(cat.target && cat.target.by ? cat.target.by : '');
  const [note, setNote] = React.useState(cat.note || '');
  const [confirmDel, setConfirmDel] = React.useState(false);

  const save = () => {
    let target = null;
    const amt = parseInt(tAmt, 10) || 0;
    if (tType === 'monthly' && amt > 0) target = { type: 'monthly', amount: amt };
    if (tType === 'date' && amt > 0) target = { type: 'date', amount: amt, by: tBy.trim() || 'someday' };
    onSave(cat.id, {
      name: name.trim() || cat.name,
      color,
      assigned: parseInt(assigned, 10) || 0,
      target,
      note: note.trim(),
    });
    onClose();
  };

  return (
    <div className="detail settings" data-screen-label="Category settings">
      <header className="detail-top">
        <button className="detail-back" onClick={onClose} aria-label="Cancel">&lsaquo;</button>
        <h2>Edit category</h2>
        <button className="text-btn" onClick={save}>Save</button>
      </header>

      <div className="detail-scroll">
        <section className="form-sec">
          <span className="field-label">Name</span>
          <input className="field-input" type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </section>

        <section className="form-sec">
          <span className="field-label">Color</span>
          <Swatches keys={famKeys} value={color} onPick={setColor} />
        </section>

        <section className="form-sec">
          <span className="field-label">Assigned this month</span>
          <div className="amount-input">
            <input className="field-input" type="number" inputMode="numeric" value={assigned}
              onChange={(e) => setAssigned(e.target.value)} />
            <span className="amount-cur">{'\u20ae'}</span>
          </div>
          <div className="field-hint">Last month you assigned {fmtMoney(cat.prevAssigned || 0)}</div>
        </section>

        <section className="form-sec">
          <span className="field-label">Target</span>
          <Seg value={tType} onChange={setTType}
            options={[{ v: 'none', label: 'None' }, { v: 'monthly', label: 'Monthly' }, { v: 'date', label: 'By date' }]} />
          {tType !== 'none' && (
            <div className="amount-input" style={{ marginTop: 10 }}>
              <input className="field-input" type="number" inputMode="numeric" value={tAmt} placeholder="0"
                onChange={(e) => setTAmt(e.target.value)} />
              <span className="amount-cur">{'\u20ae'}</span>
            </div>
          )}
          {tType === 'date' && (
            <input className="field-input" type="text" value={tBy} placeholder="e.g. Dec 2026" style={{ marginTop: 10 }}
              onChange={(e) => setTBy(e.target.value)} />
          )}
          {tType !== 'none' && (
            <div className="field-hint">
              {tType === 'monthly' ? 'Assign this much every month.' : 'Build this balance by the target date.'}
            </div>
          )}
        </section>

        <section className="form-sec">
          <span className="field-label">Note</span>
          <textarea className="field-input field-area" value={note} rows="2"
            placeholder="Add a note…" onChange={(e) => setNote(e.target.value)} />
        </section>

        <button className={'danger-btn' + (confirmDel ? ' danger-btn--armed' : '')}
          onClick={() => { if (confirmDel) { onDelete(cat.id); onClose(); } else setConfirmDel(true); }}>
          {confirmDel ? 'Tap again to delete' : 'Delete category'}
        </button>
        {confirmDel && <div className="field-hint" style={{ textAlign: 'center' }}>Remaining money returns to “To Be Assigned”.</div>}
      </div>
    </div>
  );
}

function AddCategoryModal({ open, groups, initialGroupId, onAdd, onClose }) {
  if (!open) return null;
  const [groupId, setGroupId] = React.useState(initialGroupId || (groups[0] && groups[0].id));
  const group = groups.find((g) => g.id === groupId) || groups[0];
  const famKeys = familyKeys(groupFamily(group));
  const used = group.cats.map((c) => c.color);
  const defaultColor = famKeys.find((k) => !used.includes(k)) || famKeys[0];

  const [name, setName] = React.useState('');
  const [color, setColor] = React.useState(defaultColor);
  const [assigned, setAssigned] = React.useState('');
  const [targetOn, setTargetOn] = React.useState(false);

  // when the chosen group changes, snap color back into that group's family
  React.useEffect(() => {
    const fk = familyKeys(groupFamily(group));
    if (!fk.includes(color)) {
      const u = group.cats.map((c) => c.color);
      setColor(fk.find((k) => !u.includes(k)) || fk[0]);
    }
  }, [groupId]);

  const amt = parseInt(assigned, 10) || 0;
  const valid = name.trim().length > 0;

  const save = () => {
    if (!valid) return;
    const target = targetOn && amt > 0 ? { type: 'monthly', amount: amt } : null;
    onAdd(group.id, { name: name.trim(), color, assigned: amt, target });
    onClose();
  };

  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2>New category</h2>
          <button className="sheet-x" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <section className="form-sec">
          <span className="field-label">Group</span>
          <div className="gpick-row">
            {groups.map((g) => (
              <button key={g.id} className={'gpick' + (g.id === groupId ? ' gpick--on' : '')}
                onClick={() => setGroupId(g.id)}>{g.name}</button>
            ))}
          </div>
        </section>

        <section className="form-sec">
          <span className="field-label">Name</span>
          <input className="field-input" type="text" value={name} placeholder="e.g. Pet Care"
            onChange={(e) => setName(e.target.value)} />
        </section>

        <section className="form-sec">
          <span className="field-label">Color</span>
          <Swatches keys={famKeys} value={color} onPick={setColor} />
        </section>

        <section className="form-sec">
          <span className="field-label">Assign now (optional)</span>
          <div className="amount-input">
            <input className="field-input" type="number" inputMode="numeric" value={assigned} placeholder="0"
              onChange={(e) => setAssigned(e.target.value)} />
            <span className="amount-cur">{'\u20ae'}</span>
          </div>
          <label className="check-row">
            <input type="checkbox" checked={targetOn} onChange={(e) => setTargetOn(e.target.checked)} />
            <span>Set a monthly target of this amount</span>
          </label>
        </section>

        <button className="save-btn" disabled={!valid}
          style={{ background: valid ? PALETTE[color].fill : 'rgba(255,255,255,0.08)', color: valid ? '#15130a' : '#666' }}
          onClick={save}>
          Add to {group.name}
        </button>
      </div>
    </div>
  );
}

// little popover under the top-bar "+"
function AddMenu({ onCategory, onGroup, onClose }) {
  return (
    <div className="menu-scrim" onClick={onClose}>
      <div className="menu" onClick={(e) => e.stopPropagation()}>
        <button className="menu-item" onClick={onCategory}>
          <span className="menu-ico">+</span> New category
        </button>
        <button className="menu-item" onClick={onGroup}>
          <span className="menu-ico">{'\u229E'}</span> New group
        </button>
      </div>
    </div>
  );
}

// create or rename a category group (edit mode also deletes)
function GroupModal({ mode, group, onSave, onDelete, onClose }) {
  const [name, setName] = React.useState(group ? group.name : '');
  const [family, setFamily] = React.useState(group ? groupFamily(group) : 'b');
  const [confirmDel, setConfirmDel] = React.useState(false);
  const valid = name.trim().length > 0;
  const count = group ? group.cats.length : 0;

  const save = () => {
    if (!valid) return;
    onSave(group ? group.id : null, name.trim(), family);
    onClose();
  };

  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2>{mode === 'new' ? 'New group' : 'Edit group'}</h2>
          <button className="sheet-x" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <section className="form-sec">
          <span className="field-label">Group name</span>
          <input className="field-input" type="text" value={name} autoFocus
            placeholder="e.g. Subscriptions" onChange={(e) => setName(e.target.value)} />
        </section>

        <section className="form-sec">
          <span className="field-label">Color</span>
          <div className="swatch-row">
            {FAMILIES.map((f) => (
              <button key={f.key} className={'swatch' + (f.key === family ? ' swatch--on' : '')}
                style={{ background: f.fill }} onClick={() => setFamily(f.key)} aria-label={f.name} />
            ))}
          </div>
          {mode === 'edit' && count > 0 && (
            <div className="field-hint">Recolors the {count} categor{count === 1 ? 'y' : 'ies'} in this group.</div>
          )}
        </section>

        <button className="save-btn" disabled={!valid}
          style={{ background: valid ? familyFill(family) : 'rgba(255,255,255,0.08)', color: valid ? '#15130a' : '#666' }}
          onClick={save}>
          {mode === 'new' ? 'Create group' : 'Save'}
        </button>

        {mode === 'edit' && (
          <>
            <button className={'danger-btn' + (confirmDel ? ' danger-btn--armed' : '')} style={{ marginTop: 12 }}
              onClick={() => { if (confirmDel) { onDelete(group.id); onClose(); } else setConfirmDel(true); }}>
              {confirmDel ? 'Tap again to delete group' : 'Delete group'}
            </button>
            {confirmDel && (
              <div className="field-hint" style={{ textAlign: 'center' }}>
                {count > 0
                  ? 'Deletes ' + count + ' categor' + (count === 1 ? 'y' : 'ies') + '. Their money returns to “To Be Assigned”.'
                  : 'This group is empty.'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { CategorySettings, AddCategoryModal, AddMenu, GroupModal });
