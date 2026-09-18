export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-xl transition active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-brand-600 text-white shadow-lg shadow-brand-600/20 hover:bg-brand-700',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    outline: 'border-2 border-slate-200 text-slate-700 hover:bg-slate-50',
    ghost: 'text-brand-600 hover:bg-brand-50'
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-3 text-sm',
    lg: 'px-5 py-3.5 text-base'
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}