// lib/parsers/csv-parser.ts
import Papa from 'papaparse'

export interface ParsedTransaction {
  date: string
  description: string
  amount: number
  type: 'credit' | 'debit'
  balanceAfter: number
  reference: string
  fromName: string
  toName: string
  category?: string
}

export function parseCSV(content: string): Promise<ParsedTransaction[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        return header
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '')
      },
      complete: (results: Papa.ParseResult<any>) => {
        try {
          const transactions: ParsedTransaction[] = results.data
            .filter((row: any) => {
              return Object.values(row).some(val => val && val.toString().trim())
            })
            .map((row: any) => {
              const amount = parseFloat(
                row.amount || 
                row.credit || 
                row.debit || 
                row.amount_in || 
                row.amount_out || 
                0
              )
              
              let type: 'credit' | 'debit' = 'debit'
              if (row.type) {
                const typeLower = row.type.toLowerCase()
                if (typeLower.includes('credit') || typeLower.includes('in') || typeLower.includes('received')) {
                  type = 'credit'
                }
              } else if (row.credit && !row.debit) {
                type = 'credit'
              } else if (row.amount && row.amount > 0 && (row.type === 'credit' || row.type === 'cash_in')) {
                type = 'credit'
              } else if (amount > 0 && (row.type === 'debit' || row.type === 'cash_out')) {
                type = 'debit'
              } else if (amount < 0) {
                type = 'debit'
              }

              let date = row.date || row.transaction_date || row.trans_date || row['date'] || ''
              if (date) {
                try {
                  const d = new Date(date)
                  if (!isNaN(d.getTime())) {
                    date = d.toISOString().split('T')[0]
                  }
                } catch (_e) {
                  // Keep original
                }
              }

              return {
                date: date || new Date().toISOString().split('T')[0],
                description: row.description || row.particulars || row.narrative || row.remarks || row['description'] || '',
                amount: Math.abs(amount),
                type: type,
                balanceAfter: parseFloat(row.balance || row.balance_after || row.balance_after_transaction || 0),
                reference: row.reference || row.ref || row.transaction_id || row.id || '',
                fromName: row.from_name || row.sender || row.source || row.payer || '',
                toName: row.to_name || row.recipient || row.destination || row.payee || '',
                category: row.category || '',
              }
            })
            .filter((t: ParsedTransaction) => t.amount > 0)
          
          resolve(transactions)
        } catch (error) {
          reject(error)
        }
      },
      error: (error: Error) => reject(error),
    })
  })
}