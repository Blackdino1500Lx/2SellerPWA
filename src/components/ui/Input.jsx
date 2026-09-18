export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="text-xs font-semibold text-slate-600 block mb-1.5">
          {label}
        </label>
      )}
      <input
        className={`w-full border rounded-xl px-4 py-3 text-sm outline-none transition
          ${error
            ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100'
            : 'border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100'
          }
          bg-white text-slate-900 placeholder:text-slate-400
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}