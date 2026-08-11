// types/index.ts
export interface Transaction {
  date: string
  fromAcct: string
  fromName: string
  fromNo: string
  transType: 'TRANSFER' | 'DEBIT' | 'CASH_OUT' | 'PAYMENT' | 'CASH_IN' | 'PAYMENT_SEND' | 'CUSTOM_PAYMENT'
  amount: number
  fees: number
  eLevy: number
  balanceBefore: number
  balanceAfter: number
  toNo: string
  toName: string
  toAcct: string
  fId: string
  ref: string
  ova: string
  category?: string
}

export interface CategorySummary {
  name: string
  total: number
  count: number
  percentage: number
}

export interface BudgetItem {
  category: string
  budgeted: number
  actual: number
  variance: number
  status: 'under' | 'over' | 'on-track'
}

export interface DashboardStats {
  totalTransactions: number
  totalInflow: number
  totalOutflow: number
  netFlow: number
  averageTransaction: number
}


export interface Contact {
  name: string
  phone: string
  totalSent: number
  totalReceived: number
  transactionCount: number
}

export interface MonthlyData {
  month: string
  income: number
  expenses: number
  savings: number
}