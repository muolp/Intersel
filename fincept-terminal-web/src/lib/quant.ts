import { Candle } from '../data/market'

export function dailyReturns(candles: Candle[]): number[] {
  const r: number[] = []
  for (let i = 1; i < candles.length; i++) r.push(candles[i].c / candles[i - 1].c - 1)
  return r
}
export function mean(a: number[]): number { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0 }
export function stdev(a: number[]): number {
  if (a.length < 2) return 0
  const m = mean(a)
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1))
}
export function annualVol(candles: Candle[]): number { return stdev(dailyReturns(candles)) * Math.sqrt(252) }
export function annualReturn(candles: Candle[]): number {
  if (candles.length < 2) return 0
  const total = candles[candles.length - 1].c / candles[0].c
  const years = candles.length / 252
  return Math.pow(total, 1 / years) - 1
}
export function sharpe(candles: Candle[], rf = 0.045): number {
  const vol = annualVol(candles)
  if (!vol) return 0
  return (annualReturn(candles) - rf) / vol
}
export function maxDrawdown(candles: Candle[]): number {
  let peak = -Infinity, mdd = 0
  for (const c of candles) { peak = Math.max(peak, c.c); mdd = Math.min(mdd, c.c / peak - 1) }
  return mdd
}
// Historical VaR at confidence, on a position value
export function historicalVaR(candles: Candle[], value: number, conf = 0.95): number {
  const r = dailyReturns(candles).slice().sort((a, b) => a - b)
  if (!r.length) return 0
  const idx = Math.floor((1 - conf) * r.length)
  return -r[Math.max(0, idx)] * value
}

// Simple 5-yr DCF
export interface DcfInput { fcf: number; growth: number; termGrowth: number; wacc: number; shares: number; netDebt: number }
export function dcf(inp: DcfInput): { ev: number; equity: number; perShare: number; pv: number[] } {
  const { fcf, growth, termGrowth, wacc, shares, netDebt } = inp
  const g = growth / 100, tg = termGrowth / 100, w = wacc / 100
  const pv: number[] = []
  let cf = fcf
  let pvSum = 0
  for (let y = 1; y <= 5; y++) {
    cf = cf * (1 + g)
    const disc = cf / Math.pow(1 + w, y)
    pv.push(disc); pvSum += disc
  }
  const terminal = (cf * (1 + tg)) / (w - tg)
  const pvTerminal = terminal / Math.pow(1 + w, 5)
  const ev = pvSum + pvTerminal
  const equity = ev - netDebt
  return { ev, equity, perShare: equity / shares, pv }
}
