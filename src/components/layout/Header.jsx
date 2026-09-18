import { useNavigate } from 'react-router-dom'

export default function Header({ title, subtitle, showBack = false, right = null }) {
  const navigate = useNavigate()

  return (
    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-100">
      <div className="flex items-center gap-3 px-4 py-3 min-h-[56px]">
        {showBack ? (
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center active:bg-slate-200"
            aria-label="Volver"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        ) : null}

        <div className="flex-1 min-w-0">
          {subtitle && (
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 leading-none mb-1">
              {subtitle}
            </p>
          )}
          <h1 className="font-semibold text-base leading-tight truncate">{title}</h1>
        </div>

        {right ?? <div className="w-9" />}
      </div>
    </div>
  )
}