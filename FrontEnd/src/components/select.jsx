import { ChevronDown } from 'lucide-react'

function Select({ label, value, onChange, options, disabled = false }) {
  return (
    <div className={`select ${disabled ? 'select--disabled' : ''}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={label}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={20} />
    </div>
  )
}

export default Select