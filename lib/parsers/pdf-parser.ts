// lib/parsers/pdf-parser.ts
//
// Uses `pdf-parse`, but overrides its per-page rendering via the
// `pagerender` option instead of relying on its default text flattening.
// pdf-parse's default renderer only inserts a space where the PDF itself
// has a literal space glyph — for a columnar report like this, adjacent
// numeric cells sit with near-zero gap and get glued together
// ("100050.8140.81" instead of "10 0 0 50.81 40.81"), which is why the
// transaction count was coming back as 0.
//
// `pagerender` receives the underlying pdfjs page object for each page,
// so we can call page.getTextContent() ourselves, keep every text run as
// a separate, unambiguous cell, and encode that structure into the string
// pdf-parse expects back — instead of guessing spacing from x-distance.

import 'server-only'
// Deep-import the implementation module directly. pdf-parse's package
// root (index.js) runs debug code on import that tries to read a local
// test fixture file, throwing ENOENT once bundled by Next.js/webpack.
import pdfParse from 'pdf-parse/lib/pdf-parse.js'

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

interface PdfTextItem {
  str: string
  transform: number[]
}

interface PdfPageLike {
  getTextContent: () => Promise<{ items: PdfTextItem[] }>
}

// Unlikely-to-collide separator used to encode cell boundaries into the
// plain-text string pdf-parse aggregates across pages.
const CELL_SEP = '\u0001'

async function renderPageAsRows(pageData: PdfPageLike): Promise<string> {
  const textContent = await pageData.getTextContent()
  const items = textContent.items

  const rows = new Map<number, PdfTextItem[]>()
  for (const item of items) {
    if (!item.str || !item.str.trim()) continue
    const y = Math.round(item.transform[5])
    if (!rows.has(y)) rows.set(y, [])
    rows.get(y)!.push(item)
  }

  // PDF y-coordinates increase upward — sort descending to read top to bottom.
  const sortedYs = [...rows.keys()].sort((a, b) => b - a)

  const lines: string[] = []
  for (const y of sortedYs) {
    const cells = rows
      .get(y)!
      .sort((a, b) => a.transform[4] - b.transform[4])
      .map((i) => i.str.trim())
      .filter(Boolean)
    if (cells.length) lines.push(cells.join(CELL_SEP))
  }

  return lines.join('\n')
}

const FULL_DATE_RE =
  /^\d{2}-[A-Za-z]{3}-\d{4}\s+\d{2}:\d{2}:\d{2}\s+(?:AM|PM)$/

const BOILERPLATE_RE =
  /^(TRANSACTION DATE|FROM ACCT|FROM NAME|FROM NO\.?|TRANS\.? TYPE|AMOUNT|FEES|E-LEVY|BAL BEFORE|BAL AFTER|TO NO\.?|TO NAME|TO ACCT|F_ID|REF|OVA|Time Run:.*|MOBILE MONEY TRANSACTION HISTORY|From:.*To:.*|MSISDN:.*|Powered by MTNGH)$/i

const TRANS_TYPES = [
  'CUSTOM_PAYMENT',
  'PAYMENT_SEND',
  'DEBT_REPAYMENT',
  'SELF_INITIATED_REVERSAL',
  'ADJUSTMENT',
  'TRANSFER',
  'CASH_OUT',
  'CASH_IN',
  'PAYMENT',
  'REFUND',
  'DEBIT',
]

const NUM_RE = /-?\d+(?:\.\d+)?/g

// Common reference keywords to look for
const COMMON_REFS = [
  'food', 'meal', 'restaurant', 'rice', 'chicken', 'pizza', 'burger',
  'jeans', 'shoe', 'sneakers', 'vans', 'lv', 'travis', 'kicks', 'af1', 
  'puma', 'nb', 'asics', 'j3', 'birk', 'jogger', 'slides', 'crocs',
  'medicine', 'gift', 'ads', 'airtime', 'MSPORT', 'delivery', 'clothes',
  'top', 'shirt', 'pants', 'dress', 'transport', 'uber', 'taxi', 'fuel',
  'bill', 'electricity', 'water', 'internet', 'wifi', 'data', 'call',
  'bet', 'sportybet', 'movie', 'game', 'party', 'school', 'tuition', 'books',
  'salary', 'wages', 'cashin', 'deposit', 'commission', 'bonus'
]

// Names to ignore as references
const IGNORE_NAMES = [
  'BOADI', 'KINGSLEY NAAB', 'KINGSLEY', 'NAAB', 'KINGSLEY NAAB BOADI',
  'Internal', 'transfer', 'payment', '0', '00', 'N/A'
]

function isMeaningfulReference(text: string): boolean {
  if (!text || text.length < 2) return false
  
  const upperText = text.toUpperCase()
  
  // Check if it's a name to ignore
  if (IGNORE_NAMES.some(name => upperText === name.toUpperCase())) {
    return false
  }
  
  // Check if it's all numbers
  if (/^\d+$/.test(text)) {
    return false
  }
  
  // Check if it's boilerplate
  if (BOILERPLATE_RE.test(text)) {
    return false
  }
  
  return true
}

export async function parsePDF(buffer: Buffer): Promise<ParsedTransaction[]> {
  if (!buffer || buffer.length === 0) {
    throw new Error('PDF buffer is empty')
  }

  const signature = buffer.subarray(0, 10).toString()
  if (!signature.startsWith('%PDF-')) {
    throw new Error('Uploaded file is not a valid PDF')
  }

  const data = await pdfParse(buffer, { pagerender: renderPageAsRows })
  const text = typeof data.text === 'string' ? data.text : ''

  if (!text.trim()) {
    throw new Error(
      'PDF was read successfully, but no text could be extracted'
    )
  }

  const rows: string[][] = text
    .split('\n')
    .map((line) => line.split(CELL_SEP).map((c) => c.trim()).filter(Boolean))
    .filter((r) => r.length > 0)

  const transactionCells = groupIntoTransactionCells(rows)

  console.log('Physical PDF rows:', rows.length)
  console.log('Logical transactions grouped:', transactionCells.length)
  if (transactionCells.length > 0) {
    console.log('First transaction cells:', transactionCells[0])
  }

  const transactions = transactionCells
    .map((cells) => parseTransactionCells(cells))
    .filter((t): t is ParsedTransaction => t !== null)

  console.log('Transactions parsed:', transactions.length)

  return transactions
}

/**
 * Groups physical PDF rows into one cell-array per logical transaction: a
 * row starting with a full date/time token begins a new transaction; any
 * row that doesn't (wrapped names, boilerplate) folds into the one
 * currently being built.
 */
function groupIntoTransactionCells(rows: string[][]): string[][] {
  const transactions: string[][] = []
  let current: string[] | null = null

  for (const row of rows) {
    if (row.every((c) => BOILERPLATE_RE.test(c))) continue

    if (FULL_DATE_RE.test(row[0])) {
      if (current) transactions.push(current)
      current = [...row]
    } else if (current) {
      current.push(...row.filter((c) => !BOILERPLATE_RE.test(c)))
    }
  }
  if (current) transactions.push(current)

  return transactions
}

function parseTransactionCells(cells: string[]): ParsedTransaction | null {
  if (cells.length === 0) return null
  
  const date = cells[0]
  
  // ============================================================
  // DIRECT REF EXTRACTION - FIXED!
  // ============================================================
  
  // Based on your PDF, the columns are:
  // 0: DATE, 1: FROM_ACCT, 2: FROM_NAME, 3: FROM_NO, 4: TRANS_TYPE,
  // 5: AMOUNT, 6: FEES, 7: E-LEVY, 8: BAL_BEFORE, 9: BAL_AFTER,
  // 10: TO_NO, 11: TO_NAME, 12: TO_ACCT, 13: F_ID, 14: REF, 15: OVA
  
  let reference = ''
  let toName = ''
  let fromName = ''
  let amount = 0
  let balBefore = 0
  let balAfter = 0
  let typeToken: string | null = null
  
  // ============================================================
  // METHOD 1: Get REF from cell index 14
  // ============================================================
  if (cells.length > 14) {
    const possibleRef = cells[14].trim()
    if (isMeaningfulReference(possibleRef)) {
      reference = possibleRef
      console.log(`✅ Found REF at index 14: "${reference}"`)
    }
  }
  
  // ============================================================
  // METHOD 2: If no REF, check OVA at index 15
  // ============================================================
  if (!reference && cells.length > 15) {
    const ova = cells[15].trim()
    if (isMeaningfulReference(ova)) {
      reference = ova
      console.log(`✅ Found REF from OVA (index 15): "${reference}"`)
    }
  }
  
  // ============================================================
  // METHOD 3: Check for common reference keywords in any cell
  // ============================================================
  if (!reference) {
    for (const cell of cells) {
      const cellLower = cell.trim().toLowerCase()
      for (const ref of COMMON_REFS) {
        const refLower = ref.toLowerCase()
        if (cellLower === refLower || cellLower.includes(refLower)) {
          reference = ref
          console.log(`✅ Found REF from keyword match: "${reference}"`)
          break
        }
      }
      if (reference) break
    }
  }
  
  // ============================================================
  // METHOD 4: Try to get from the tail (last resort)
  // ============================================================
  if (!reference) {
    // Check if the last cell has a meaningful value
    const lastCell = cells[cells.length - 1].trim()
    if (isMeaningfulReference(lastCell)) {
      reference = lastCell
      console.log(`✅ Found REF from last cell: "${reference}"`)
    }
  }

  // Every remaining cell is a real, discrete field, so this rejoin is
  // unambiguous — no glued numbers to untangle.
  const afterDate = cells.slice(1).join(' ')

  // Find transaction type
  for (const t of TRANS_TYPES) {
    const m = afterDate.match(new RegExp(`\\b${t}\\b`))
    if (m && m.index !== undefined) {
      if (typeToken === null || (m.index !== undefined && m.index < (afterDate.indexOf(typeToken) || Infinity))) {
        typeToken = t
      }
    }
  }
  
  if (!typeToken) return null

  const typeIndex = afterDate.indexOf(typeToken)
  const leftPart = afterDate.slice(0, typeIndex).trim()
  const rightPart = afterDate.slice(typeIndex + typeToken.length).trim()

  // Extract fromName
  const fromAcctMatch = leftPart.match(/^(\d+)/)
  let restLeft = fromAcctMatch
    ? leftPart.slice(fromAcctMatch[0].length).trim()
    : leftPart

  const fromNoMatch = restLeft.match(/(233\d{9})\s*$/)
  if (fromNoMatch) {
    restLeft = restLeft.slice(0, fromNoMatch.index).trim()
  }
  fromName = restLeft === '0' ? '' : restLeft

  // Extract numbers
  const nums = [...rightPart.matchAll(NUM_RE)]
  if (nums.length < 5) return null

  amount = parseFloat(nums[0][0])
  balBefore = parseFloat(nums[3][0])
  balAfter = parseFloat(nums[4][0])

  const afterBalIdx = (nums[4].index ?? 0) + nums[4][0].length
  let tail = rightPart.slice(afterBalIdx).trim()

  const toNoMatch = tail.match(/^(233\d{9}|0)\b/)
  if (toNoMatch) {
    tail = tail.slice(toNoMatch[0].length).trim()
  }

  // Extract toName
  const tailNums = [...tail.matchAll(NUM_RE)]
  if (tailNums.length >= 2) {
    const toAcctMatch = tailNums[0]
    toName = tail.slice(0, toAcctMatch.index).trim()
  } else if (tailNums.length === 1) {
    toName = tail.slice(0, tailNums[0].index).trim()
  }
  if (toName === '0') toName = ''

  // If still no reference, try to use the tail
  if (!reference && tailNums.length >= 2) {
    const fIdMatch = tailNums[1]
    const afterFId = tail.slice((fIdMatch.index ?? 0) + fIdMatch[0].length).trim()
    const refParts = afterFId.split(/\s+/)
    if (refParts.length > 0 && isMeaningfulReference(refParts[0])) {
      reference = refParts[0]
      console.log(`✅ Found REF from tail: "${reference}"`)
    }
  }

  // Determine credit/debit based on balance comparison
  const type: 'credit' | 'debit' = balAfter >= balBefore ? 'credit' : 'debit'
  
  // Build description
  const description = reference || toName || fromName || typeToken

  // Log the extracted reference for debugging
  if (reference) {
    console.log(`📝 Transaction: ${date} | REF: "${reference}" | Type: ${typeToken}`)
  } else {
    console.log(`⚠️ No REF found for: ${date} | Type: ${typeToken}`)
  }

  return {
    date,
    description,
    amount: Number.isFinite(amount) ? amount : 0,
    type,
    balanceAfter: Number.isFinite(balAfter) ? balAfter : 0,
    reference: reference || '',
    fromName: fromName || '',
    toName: toName || '',
    category: typeToken,
  }
}