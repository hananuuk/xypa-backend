// inputs.jsx — MoneyInput: a text input that displays thousands separators
// live while typing (e.g. "1,000,000") but reports a plain digit string to
// the parent, so existing parseInt(...) call sites keep working unchanged.

function MoneyInput({ className, value, onChange, placeholder, autoFocus }) {
  const digits = (value == null ? '' : String(value)).replace(/[^\d]/g, '');
  const display = digits === '' ? '' : Number(digits).toLocaleString('en-US');

  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^\d]/g, '');
    onChange(raw);
  };

  return (
    <input
      className={className}
      type="text"
      inputMode="numeric"
      autoFocus={autoFocus}
      value={display}
      placeholder={placeholder}
      onChange={handleChange}
      onFocus={(e) => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' })}
    />
  );
}

Object.assign(window, { MoneyInput });
