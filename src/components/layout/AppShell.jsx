export default function AppShell({ children, className = '' }) {
  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 ${className}`}>
      <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col">
        {children}
      </div>
    </div>
  )
}