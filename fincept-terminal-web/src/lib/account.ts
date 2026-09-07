// MetaTrader-style margin accounting for the paper account.
// Positions carry a SIGNED quantity: qty > 0 is long, qty < 0 is short.
import type { Position } from './store'

export const LEVERAGE_OPTIONS = [1, 2, 5, 10, 20, 30, 50, 100, 200, 500]

export interface Account {
  balance: number        // realized cash
  floating: number       // unrealized P&L across open positions
  equity: number         // balance + floating
  usedMargin: number     // margin locked by open positions
  freeMargin: number     // equity - usedMargin (available to open more)
  marginLevel: number    // equity / usedMargin * 100 (Infinity if flat)
  exposure: number       // gross notional of open positions
}

// Margin required to hold `qty` units at `price` under `leverage`.
export function requiredMargin(qty: number, price: number, leverage: number): number {
  return (Math.abs(qty) * price) / Math.max(1, leverage)
}

export function computeAccount(
  positions: Position[], balance: number, leverage: number, priceOf: (s: string) => number,
): Account {
  let floating = 0, usedMargin = 0, exposure = 0
  for (const p of positions) {
    const px = priceOf(p.symbol) || p.avg
    floating += (px - p.avg) * p.qty            // signed qty → correct for shorts
    usedMargin += requiredMargin(p.qty, p.avg, leverage)
    exposure += Math.abs(p.qty) * px
  }
  const equity = balance + floating
  return {
    balance, floating, equity, usedMargin,
    freeMargin: equity - usedMargin,
    marginLevel: usedMargin > 0 ? (equity / usedMargin) * 100 : Infinity,
    exposure,
  }
}

// How much additional margin an order adds (0 if it only reduces/closes).
export function marginForOrder(
  posQty: number, side: 'BUY' | 'SELL', qty: number, price: number, leverage: number,
): number {
  const delta = side === 'BUY' ? qty : -qty
  const newQty = posQty + delta
  // exposure increases only for the portion that grows |position| in the new direction
  const added = Math.max(0, Math.abs(newQty) - Math.abs(posQty))
  // if flipping through zero, the whole new-side portion is "added" exposure
  const openedByFlip = Math.sign(newQty) !== 0 && Math.sign(newQty) !== Math.sign(posQty) && posQty !== 0
    ? Math.abs(newQty) : added
  return requiredMargin(openedByFlip, price, leverage)
}
