import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'

export default function SalesChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-slate-400">
        Sin datos en el período
      </div>
    )
  }

  const chartData = data.map((d) => ({
    label: d.label,
    ventas: Number(d.ventas),
    pedidos: d.pedidos
  }))

  return (
    <div className="h-56 -ml-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
            width={40}
          />
          <Tooltip
            cursor={{ fill: 'rgba(37,99,235,0.05)' }}
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              fontSize: 12,
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
            }}
            formatter={(v) => [`₡${Number(v).toLocaleString('es-CR')}`, 'Ventas']}
          />
          <Bar dataKey="ventas" fill="#2563eb" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}