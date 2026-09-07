// AI trading engine: technical signal scoring + an autonomous paper-trading cycle.
// Everything here trades the simulated PAPER account only.
import { engine, Quote } from '../data/market'
import { SYMBOL_MAP } from '../data/symbols'
import type { Store, AlgoSettings, AlgoDecision } from './store'
import { computeAccount, requiredMargin } from './account'

function sma(vals: number[], n: number): number {
  if (vals.length < n) return NaN
  let s = 0; for (let i = vals.length - n; i < vals.length; i++) s += vals[i]
  return s / n
}
function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50
  let gain = 0, loss = 0
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    if (d >= 0) gain += d; else loss -= d
  }
  const rs = loss === 0 ? 100 : gain / loss
  return 100 - 100 / (1 + rs)
}

export interface Signal {
  symbol: string
  score: number        // -1 (strong sell) … +1 (strong buy)
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number   // 0..1
  rsi: number
  mom: number          // 10d momentum %
  trend: 'up' | 'down' | 'flat'
  reason: string
}

// Blend trend (SMA20/50), momentum and RSI into a single score.
export function computeSignal(q: Quote): Signal {
  const closes = q.history.map(c => c.c)
  const s20 = sma(closes, 20), s50 = sma(closes, 50)
  const last = closes[closes.length - 1]
  const r = rsi(closes, 14)
  const mom = closes.length > 11 ? (last / closes[closes.length - 11] - 1) * 100 : 0
  const trend: Signal['trend'] = isNaN(s20) || isNaN(s50) ? 'flat' : s20 > s50 * 1.001 ? 'up' : s20 < s50 * 0.999 ? 'down' : 'flat'

  let score = 0
  score += trend === 'up' ? 0.4 : trend === 'down' ? -0.4 : 0
  score += Math.max(-0.3, Math.min(0.3, mom / 30))          // momentum, capped
  if (r < 30) score += 0.25                                  // oversold → buy bias
  else if (r > 70) score -= 0.25                             // overbought → sell bias
  if (!isNaN(s20)) score += Math.max(-0.15, Math.min(0.15, (last - s20) / s20 * 2)) * 0.5
  score = Math.max(-1, Math.min(1, score))

  const action: Signal['action'] = score > 0.15 ? 'BUY' : score < -0.15 ? 'SELL' : 'HOLD'
  const bits: string[] = []
  bits.push(`trend ${trend}`)
  bits.push(`mom ${mom >= 0 ? '+' : ''}${mom.toFixed(1)}%`)
  bits.push(`RSI ${r.toFixed(0)}${r < 30 ? ' (oversold)' : r > 70 ? ' (overbought)' : ''}`)
  return { symbol: q.symbol, score, action, confidence: Math.abs(score), rsi: r, mom, trend, reason: bits.join(' · ') }
}

// A plain-language explanation of why a trade was taken.
export function whyText(sig: Signal, side: 'BUY' | 'SELL'): string {
  const trendTxt = sig.trend === 'up' ? '20-day avg above 50-day (uptrend)'
    : sig.trend === 'down' ? '20-day avg below 50-day (downtrend)' : 'no clear trend'
  const momTxt = `${sig.mom >= 0 ? '+' : ''}${sig.mom.toFixed(1)}% 10-day momentum`
  const rsiTxt = sig.rsi < 30 ? `RSI ${sig.rsi.toFixed(0)} (oversold — bounce likely)`
    : sig.rsi > 70 ? `RSI ${sig.rsi.toFixed(0)} (overbought — pullback risk)`
    : `RSI ${sig.rsi.toFixed(0)} (neutral)`
  const lead = side === 'BUY'
    ? 'Bought: bullish setup —'
    : 'Sold: bearish setup —'
  return `${lead} ${trendTxt}, ${momTxt}, ${rsiTxt}. Signal ${sig.score >= 0 ? '+' : ''}${(sig.score * 100).toFixed(0)}/100.`
}

export const AGGRESSION: Record<AlgoSettings['aggression'], { buy: number; sell: number }> = {
  conservative: { buy: 0.45, sell: -0.35 },
  balanced: { buy: 0.30, sell: -0.25 },
  aggressive: { buy: 0.18, sell: -0.15 },
}

export function universeSymbols(settings: AlgoSettings, store: Store): string[] {
  if (settings.universe === 'positions') return store.positions.map(p => p.symbol)
  if (settings.universe === 'watchlist') return Array.from(new Set([...store.watchlist, ...store.positions.map(p => p.symbol)]))
  // 'equities' — the tradable equity/ETF universe plus current positions
  const eq = engine.all().filter(q => ['Equity', 'ETF'].includes(SYMBOL_MAP[q.symbol].cls)).map(q => q.symbol)
  return Array.from(new Set([...eq, ...store.positions.map(p => p.symbol)]))
}

let did = 1
// Run one autonomous cycle. Returns the decisions taken (already executed via store.trade).
// Margin-aware: sizes by equity, respects free margin under the account leverage,
// and can open SHORT positions on strongly bearish signals (MetaTrader-style).
export function runAlgoCycle(store: Store): AlgoDecision[] {
  const s = store.algo
  const lev = store.leverage
  const thr = AGGRESSION[s.aggression]
  const syms = universeSymbols(s, store)
  const price = (sym: string) => engine.get(sym)?.price ?? 0
  const decisions: AlgoDecision[] = []

  const acct = computeAccount(store.positions, store.cash, lev, price)
  const equity = acct.equity
  let freeLeft = acct.freeMargin - equity * (s.cashReservePct / 100)  // keep a margin buffer
  const localQty: Record<string, number> = {}
  for (const p of store.positions) localQty[p.symbol] = p.qty

  const signals = syms.map(sym => engine.get(sym)).filter((q): q is Quote => !!q).map(computeSignal)
  const buys = signals.filter(x => x.score >= thr.buy).sort((a, b) => b.score - a.score)
  const sells = signals.filter(x => x.score <= thr.sell).sort((a, b) => a.score - b.score)

  const time = new Date().toLocaleTimeString('en-US', { hour12: false })
  const isTradable = (sym: string) => {
    const cls = SYMBOL_MAP[sym]?.cls
    return cls === 'Equity' || cls === 'ETF' || cls === 'Crypto' || cls === 'Commodity'
  }
  const trancheNotional = equity * (s.riskPerTradePct / 100)
  const maxPosNotional = equity * (s.maxPositionPct / 100)
  const sizeQty = (cls: string, notional: number, px: number) =>
    (cls === 'Crypto' || cls === 'Commodity') ? +(notional / px).toFixed(4) : Math.floor(notional / px)

  // SELLS: close/reduce longs, or open shorts on strong bearish signals
  for (const sig of sells) {
    if (decisions.length >= s.maxTradesPerCycle) break
    const q = engine.get(sig.symbol)!
    const held = localQty[sig.symbol] ?? 0
    if (held > 0) {
      // reduce or fully exit the long
      const sellQty = sig.score < thr.sell - 0.2 ? held : Math.max(q.cls === 'Crypto' || q.cls === 'Commodity' ? +(held * 0.5).toFixed(4) : Math.floor(held * 0.5), 0)
      if (sellQty <= 0) continue
      store.trade(sig.symbol, 'SELL', sellQty, q.bid, 'ai')
      freeLeft += requiredMargin(sellQty, q.price, lev)
      localQty[sig.symbol] = held - sellQty
      decisions.push({ id: did++, time, symbol: sig.symbol, side: 'SELL', qty: sellQty, price: q.bid, score: sig.score, reason: whyText(sig, 'SELL') })
    } else if (sig.score <= thr.sell - 0.05 && isTradable(sig.symbol)) {
      // open / extend a short
      const curShortNotional = Math.abs(Math.min(0, held)) * q.price
      const room = maxPosNotional - curShortNotional
      if (room <= 0) continue
      const notional = Math.min(trancheNotional, room)
      const qty = sizeQty(q.cls, notional, q.bid)
      const margin = requiredMargin(qty, q.bid, lev)
      if (qty <= 0 || qty * q.bid < 50 || margin > freeLeft) continue
      store.trade(sig.symbol, 'SELL', qty, q.bid, 'ai')
      freeLeft -= margin
      localQty[sig.symbol] = held - qty
      decisions.push({ id: did++, time, symbol: sig.symbol, side: 'SELL', qty, price: q.bid, score: sig.score, reason: whyText(sig, 'SELL') })
    }
  }

  // BUYS: open / extend longs within the margin budget
  for (const sig of buys) {
    if (decisions.length >= s.maxTradesPerCycle) break
    if (!isTradable(sig.symbol)) continue
    const q = engine.get(sig.symbol)!
    const held = localQty[sig.symbol] ?? 0
    if (held < 0) continue  // don't fight an open short in the same cycle
    const curLongNotional = Math.max(0, held) * q.price
    const room = maxPosNotional - curLongNotional
    if (room <= 0) continue
    const notional = Math.min(trancheNotional, room)
    const qty = sizeQty(q.cls, notional, q.ask)
    const margin = requiredMargin(qty, q.ask, lev)
    if (qty <= 0 || qty * q.ask < 50) continue
    if (margin > freeLeft) continue
    store.trade(sig.symbol, 'BUY', qty, q.ask, 'ai')
    freeLeft -= margin
    localQty[sig.symbol] = held + qty
    decisions.push({ id: did++, time, symbol: sig.symbol, side: 'BUY', qty, price: q.ask, score: sig.score, reason: whyText(sig, 'BUY') })
  }

  return decisions
}

// ---- Natural-language trade commands for the chat ----
export interface ParsedTrade { side: 'BUY' | 'SELL'; qty: number | 'all'; symbol: string }
export function parseTradeCommand(input: string): ParsedTrade | null {
  const t = input.trim().toUpperCase()
  const toSide = (w: string): 'BUY' | 'SELL' => (w === 'SELL' || w === 'SHORT' ? 'SELL' : 'BUY')
  const toQty = (w: string): number | 'all' => (w === 'ALL' ? 'all' : +w)
  // "BUY 10 AAPL" / "SELL ALL NVDA"
  let m = t.match(/\b(BUY|SELL|LONG|SHORT)\s+(ALL|\d+(?:\.\d+)?)\s+([A-Z]{2,6})\b/)
  if (m && SYMBOL_MAP[m[3]]) return { side: toSide(m[1]), qty: toQty(m[2]), symbol: m[3] }
  // "BUY AAPL 10" / "SELL NVDA ALL"
  m = t.match(/\b(BUY|SELL|LONG|SHORT)\s+([A-Z]{2,6})\s+(ALL|\d+(?:\.\d+)?)\b/)
  if (m && SYMBOL_MAP[m[2]]) return { side: toSide(m[1]), qty: toQty(m[3]), symbol: m[2] }
  // "CLOSE TSLA"
  const c = t.match(/\bCLOSE\s+([A-Z]{2,6})\b/)
  if (c && SYMBOL_MAP[c[1]]) return { side: 'SELL', qty: 'all', symbol: c[1] }
  return null
}
