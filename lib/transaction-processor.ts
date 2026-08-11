// lib/transaction-processor.ts

import {
  Transaction,
  CategorySummary,
} from '@/types'

export class TransactionProcessor {

  // ==========================================================
  // PROCESS TRANSACTIONS
  // ==========================================================

  processTransactions(
    transactions: Transaction[]
  ): Transaction[] {

    return transactions.map(
      (transaction) => ({
        ...transaction,

        category:
          transaction.category ||
          'Miscellaneous',
      })
    )
  }

  // ==========================================================
  // CATEGORY SUMMARY
  // ==========================================================

  getCategorySummary(
    transactions: Transaction[]
  ): CategorySummary[] {

    const categoryMap =
      new Map<
        string,
        {
          total: number
          count: number
        }
      >()

    const totalAmount =
      transactions.reduce(
        (
          sum,
          transaction
        ) =>
          sum +
          Number(
            transaction.amount
          ),
        0
      )

    transactions.forEach(
      (
        transaction
      ) => {

        const category =
          transaction.category ||
          'Miscellaneous'

        const existing =
          categoryMap.get(
            category
          ) || {
            total: 0,
            count: 0,
          }

        categoryMap.set(
          category,
          {
            total:
              existing.total +
              Number(
                transaction.amount
              ),

            count:
              existing.count + 1,
          }
        )
      }
    )

    return Array.from(
      categoryMap.entries()
    ).map(
      ([
        name,
        data,
      ]) => ({

        name,

        total:
          data.total,

        count:
          data.count,

        percentage:
          totalAmount > 0
            ? (
                data.total /
                totalAmount
              ) * 100
            : 0,
      })
    )
  }
}