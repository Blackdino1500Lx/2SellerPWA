export default function AppShell({ children, className = '' }) {
  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 ${className}`}>
      {children}
    </div>
  )
}