// components/dashboard/StatsCard.tsx

import { TrendingUp, TrendingDown, Wallet, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface DashboardStats {
  totalTransactions: number
  totalInflow: number
  totalOutflow: number
  netFlow: number
  previousMonth?: {
    totalInflow: number
    totalOutflow: number
  }
}

interface StatsCardsProps {
  stats: DashboardStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  // Calculate month-over-month changes
  const getInflowChange = () => {
    if (!stats.previousMonth || stats.previousMonth.totalInflow === 0) return { value: '+0%', isUp: true }
    const change = ((stats.totalInflow - stats.previousMonth.totalInflow) / stats.previousMonth.totalInflow) * 100
    return { value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`, isUp: change >= 0 }
  }

  const getOutflowChange = () => {
    if (!stats.previousMonth || stats.previousMonth.totalOutflow === 0) return { value: '+0%', isUp: false }
    const change = ((stats.totalOutflow - stats.previousMonth.totalOutflow) / stats.previousMonth.totalOutflow) * 100
    return { value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`, isUp: change >= 0 }
  }

  const inflowChange = getInflowChange()
  const outflowChange = getOutflowChange()
  const isNetPositive = (stats.netFlow || 0) >= 0

  const cards = [
    {
      label: 'Total Transactions',
      value: stats.totalTransactions || 0,
      icon: Activity,
      color: 'text-blue-500',
      bgColor: 'bg-white',
      change: '+12.5%',
      changeType: 'up' as const,
      subtitle: 'vs last month'
    },
    {
      label: 'Total Inflow',
      value: `GH₵ ${(stats.totalInflow || 0).toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-emerald-500',
      bgColor: 'bg-white',
      change: inflowChange.value,
      changeType: inflowChange.isUp ? 'up' as const : 'down' as const,
      subtitle: 'vs last month'
    },
    {
      label: 'Total Outflow',
      value: `GH₵ ${(stats.totalOutflow || 0).toFixed(2)}`,
      icon: TrendingDown,
      color: 'text-rose-500',
      bgColor: 'bg-white',
      change: outflowChange.value,
      changeType: outflowChange.isUp ? 'up' as const : 'down' as const,
      subtitle: 'vs last month'
    },
    {
      label: 'Net Flow',
      value: `GH₵ ${(stats.netFlow || 0).toFixed(2)}`,
      icon: Wallet,
      color: isNetPositive ? 'text-emerald-500' : 'text-rose-500',
      bgColor: 'bg-white',
      change: isNetPositive ? '+5.7%' : '-5.7%',
      changeType: isNetPositive ? 'up' as const : 'down' as const,
      subtitle: 'vs last month'
    }
  ]

  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => (
        <div 
          key={card.label} 
          className="rounded-xl bg-gradient-to-br from-electric-blue via-blue-500 to-blue-400 shadow-card-dark p-4 sm:p-5 transition-all duration-300 hover:shadow-card-hover hover:scale-[1.02]"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs text-blue-200 font-medium uppercase tracking-wider truncate">
                {card.label}
              </p>
              <p className="text-base sm:text-lg lg:text-xl font-bold text-white mt-0.5 truncate">
                {card.value}
              </p>
              <div className="flex items-center gap-1 mt-1.5">
                <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${
                  card.changeType === 'up' 
                    ? 'bg-white text-emerald-500' 
                    : 'bg-white text-rose-500'
                }`}>
                  {card.changeType === 'up' ? (
                    <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  ) : (
                    <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  )}
                  <span className="text-[9px] sm:text-[10px] font-medium">
                    {card.change}
                  </span>
                </div>
                <span className="text-[10px] sm:text-[12px] text-blue-200">
                  {card.subtitle}
                </span>
              </div>
            </div>
            <div className={`${card.bgColor} backdrop-blur-sm p-1.5 sm:p-2 rounded-lg flex-shrink-0 ml-2 border border-white/10`}>
              <card.icon className={`${card.color} w-3.5 h-3.5 sm:w-4 sm:h-4`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}