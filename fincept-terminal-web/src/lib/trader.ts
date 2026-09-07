// AI trading engine: technical signal scoring + an autonomous paper-trading cycle.
// Everything here trades the simulated PAPER account only.
import { engine, Quote } from '../data/market'
import { SYMBOL_MAP } from '../data/symbols'
import type { Store, AlgoSettings, AlgoDecision } from './store'

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
export function runAlgoCycle(store: Store): AlgoDecision[] {
  const s = store.algo
  const thr = AGGRESSION[s.aggression]
  const syms = universeSymbols(s, store)
  const positions = () => store.positions
  // portfolio equity snapshot for sizing
  const equityNow = () => store.positions.reduce((acc, p) => acc + (engine.get(p.symbol)?.price ?? p.avg) * p.qty, 0)
  const decisions: AlgoDecision[] = []

  // rank candidates by signal strength
  const signals = syms.map(sym => engine.get(sym)).filter((q): q is Quote => !!q).map(computeSignal)
  const buys = signals.filter(x => x.score >= thr.buy).sort((a, b) => b.score - a.score)
  const sells = signals.filter(x => x.score <= thr.sell)

  const time = new Date().toLocaleTimeString('en-US', { hour12: false })
  const isTradable = (sym: string) => {
    const cls = SYMBOL_MAP[sym]?.cls
    return cls === 'Equity' || cls === 'ETF' || cls === 'Crypto'  // avoid indices/FX/rates in autopilot
  }

  // SELLS first (free up cash and cut losers/overbought)
  for (const sig of sells) {
    if (decisions.length >= s.maxTradesPerCycle) break
    const pos = positions().find(p => p.symbol === sig.symbol)
    if (!pos || pos.qty <= 0) continue
    const q = engine.get(sig.symbol)!
    const sellQty = sig.score < thr.sell - 0.2 ? pos.qty : Math.max(1, Math.floor(pos.qty * 0.5))
    if (sellQty <= 0) continue
    store.trade(sig.symbol, 'SELL', sellQty, q.bid, 'ai')
    decisions.push({ id: did++, time, symbol: sig.symbol, side: 'SELL', qty: sellQty, price: q.bid, score: sig.score, reason: `Exit — ${sig.reason}` })
  }

  // BUYS with risk budget
  for (const sig of buys) {
    if (decisions.length >= s.maxTradesPerCycle) break
    if (!isTradable(sig.symbol)) continue
    const q = engine.get(sig.symbol)!
    const totalVal = equityNow() + store.cash
    const eqVal = equityNow()
    const investable = (eqVal + store.cash)
    const cashFloor = totalVal * (s.cashReservePct / 100)
    const available = store.cash - cashFloor
    if (available <= totalVal * 0.01) break  // out of budget
    const pos = positions().find(p => p.symbol === sig.symbol)
    const curPosVal = pos ? q.price * pos.qty : 0
    const maxPosVal = investable * (s.maxPositionPct / 100)
    if (curPosVal >= maxPosVal) continue  // already at cap
    const tranche = Math.min(available, totalVal * (s.riskPerTradePct / 100), maxPosVal - curPosVal)
    const qty = Math.floor(tranche / q.ask)
    const fracQty = q.cls === 'Crypto' ? +(tranche / q.ask).toFixed(4) : qty
    if (fracQty <= 0) continue
    if (fracQty * q.ask < 50) continue  // skip dust
    store.trade(sig.symbol, 'BUY', fracQty, q.ask, 'ai')
    decisions.push({ id: did++, time, symbol: sig.symbol, side: 'BUY', qty: fracQty, price: q.ask, score: sig.score, reason: `Enter — ${sig.reason}` })
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
