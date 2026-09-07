// Deterministic mock market engine: seeded random-walk OHLC history + live tick simulation.
import { SYMBOLS, SYMBOL_MAP, SymbolDef } from './symbols'

export interface Candle { t: number; o: number; h: number; l: number; c: number; v: number }
export interface Quote {
  symbol: string
  name: string
  cls: string
  price: number
  prevClose: number
  open: number
  dayHigh: number
  dayLow: number
  change: number
  changePct: number
  volume: number
  bid: number
  ask: number
  yearHigh: number
  yearLow: number
  mktCap: number
  pe: number
  currency: string
  history: Candle[]   // daily candles (1Y)
  intraday: number[]  // recent minute prices
}

// Mulberry32 seeded PRNG for reproducible base histories
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function hashStr(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
function gauss(rng: () => number) { let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }

const DAYS = 252
const capBySymbol: Record<string, number> = {
  AAPL: 3.42e12, MSFT: 3.19e12, NVDA: 3.01e12, GOOGL: 2.19e12, AMZN: 1.94e12, META: 1.30e12,
  TSLA: 0.79e12, JPM: 0.59e12, LLY: 0.86e12, UNH: 0.54e12, WMT: 0.58e12, XOM: 0.46e12,
}
const peBySymbol: Record<string, number> = {
  AAPL: 34.2, MSFT: 37.1, NVDA: 62.5, GOOGL: 24.8, AMZN: 43.6, META: 27.9, TSLA: 61.0,
  JPM: 12.1, BAC: 13.4, GS: 16.2, XOM: 13.9, CVX: 14.1, UNH: 22.3, JNJ: 15.6, LLY: 118.2,
  WMT: 30.4, HD: 24.7, CAT: 16.8, BA: 0, DIS: 21.3,
}

function buildHistory(def: SymbolDef): Candle[] {
  const rng = mulberry32(hashStr(def.symbol))
  const candles: Candle[] = []
  let price = def.base / (1 + def.drift * 0.6) // start below current so it drifts up to ~base
  const dailyDrift = def.drift / DAYS
  const now = new Date(); now.setHours(0, 0, 0, 0)
  for (let i = DAYS; i >= 0; i--) {
    const t = now.getTime() - i * 86400000
    const o = price
    const shock = gauss(rng) * def.vol + dailyDrift
    const c = Math.max(0.01, o * (1 + shock))
    const wick = Math.abs(gauss(rng)) * def.vol * 0.6
    const h = Math.max(o, c) * (1 + wick)
    const l = Math.min(o, c) * (1 - wick)
    const v = Math.round((0.5 + rng()) * baseVolume(def))
    candles.push({ t, o, h, l, c, v })
    price = c
  }
  // Anchor the series so the latest close sits near the realistic seed price,
  // preserving the path shape (and thus returns/vol) while keeping levels plausible.
  const lastClose = candles[candles.length - 1].c
  const scale = lastClose > 0 ? def.base / lastClose : 1
  for (const cd of candles) { cd.o *= scale; cd.h *= scale; cd.l *= scale; cd.c *= scale }
  return candles
}

function baseVolume(def: SymbolDef): number {
  switch (def.cls) {
    case 'Crypto': return 25_000
    case 'FX': return 0
    case 'Index': return 0
    case 'Rate': return 0
    case 'Commodity': return 180_000
    default: return 30_000_000
  }
}

export type DataMode = 'sim' | 'live'
export interface LiveStatus {
  mode: DataMode
  connecting: boolean
  liveCount: number
  simCount: number
  lastRefresh: number | null
  error: string | null
}

export class MarketEngine {
  quotes: Record<string, Quote> = {}
  source: Record<string, 'sim' | 'live'> = {}
  mode: DataMode = 'sim'
  connecting = false
  lastRefresh: number | null = null
  lastError: string | null = null
  private listeners = new Set<() => void>()
  private statusListeners = new Set<() => void>()
  private timer: number | null = null
  private liveTimer: number | null = null

  constructor() {
    for (const def of SYMBOLS) {
      const hist = buildHistory(def)
      const last = hist[hist.length - 1]
      const prev = hist[hist.length - 2]
      const intraday: number[] = []
      let p = prev.c
      const rng = mulberry32(hashStr(def.symbol) ^ 0x9e3779b9)
      for (let i = 0; i < 120; i++) { p = p * (1 + gauss(rng) * def.vol * 0.18); intraday.push(p) }
      intraday.push(last.c)
      const window = hist.slice(-DAYS)
      const yearHigh = Math.max(...window.map(c => c.h))
      const yearLow = Math.min(...window.map(c => c.l))
      const spread = last.c * (def.cls === 'FX' ? 0.00005 : def.cls === 'Crypto' ? 0.0003 : 0.0004)
      this.quotes[def.symbol] = {
        symbol: def.symbol, name: def.name, cls: def.cls,
        price: last.c, prevClose: prev.c, open: last.o, dayHigh: last.h, dayLow: last.l,
        change: last.c - prev.c, changePct: ((last.c - prev.c) / prev.c) * 100,
        volume: last.v, bid: last.c - spread, ask: last.c + spread,
        yearHigh, yearLow,
        mktCap: capBySymbol[def.symbol] ?? 0,
        pe: peBySymbol[def.symbol] ?? 0,
        currency: def.currency, history: hist, intraday,
      }
      this.source[def.symbol] = 'sim'
    }
  }

  start(ms = 1500) {
    if (this.timer != null) return
    this.timer = window.setInterval(() => this.tick(), ms)
  }
  stop() {
    if (this.timer != null) { clearInterval(this.timer); this.timer = null }
    if (this.liveTimer != null) { clearInterval(this.liveTimer); this.liveTimer = null }
  }

  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
  subscribeStatus(fn: () => void) { this.statusListeners.add(fn); return () => { this.statusListeners.delete(fn) } }
  private emitStatus() { this.statusListeners.forEach(fn => fn()) }

  status(): LiveStatus {
    const vals = Object.values(this.source)
    return {
      mode: this.mode, connecting: this.connecting,
      liveCount: vals.filter(s => s === 'live').length,
      simCount: vals.filter(s => s === 'sim').length,
      lastRefresh: this.lastRefresh, error: this.lastError,
    }
  }

  // Switch between the simulator and live Yahoo data.
  async setMode(mode: DataMode): Promise<void> {
    if (mode === this.mode && !this.lastError) return
    this.mode = mode
    this.lastError = null
    if (this.liveTimer != null) { clearInterval(this.liveTimer); this.liveTimer = null }
    if (mode === 'live') {
      await this.refreshLive(true)
      // poll for fresh prices while live
      this.liveTimer = window.setInterval(() => { void this.refreshLive(false) }, 30000)
    } else {
      // reset source labels; simulator resumes on the next tick
      for (const s of Object.keys(this.source)) this.source[s] = 'sim'
      this.emitStatus()
    }
  }

  // Pull live quotes; on any failure a symbol keeps its current (sim) series.
  async refreshLive(full: boolean): Promise<void> {
    if (this.mode !== 'live') return
    this.connecting = true
    this.emitStatus()
    try {
      const { fetchLiveBatch, LIVE_SYMBOLS } = await import('./providers')
      const range = full ? '1y' : '5d'
      const results = await fetchLiveBatch(LIVE_SYMBOLS, range, '1d')
      let any = false
      for (const [sym, lq] of Object.entries(results)) {
        const q = this.quotes[sym]
        if (!q || !lq) { if (this.source[sym] !== 'live') this.source[sym] = 'sim'; continue }
        any = true
        this.source[sym] = 'live'
        q.price = lq.price
        q.prevClose = lq.prevClose
        q.open = lq.open
        q.dayHigh = lq.dayHigh
        q.dayLow = lq.dayLow
        q.volume = lq.volume
        q.yearHigh = lq.yearHigh
        q.yearLow = lq.yearLow
        q.change = lq.price - lq.prevClose
        q.changePct = lq.prevClose ? (q.change / lq.prevClose) * 100 : 0
        const spread = lq.price * (q.cls === 'FX' ? 0.00005 : q.cls === 'Crypto' ? 0.0003 : 0.0004)
        q.bid = lq.price - spread; q.ask = lq.price + spread
        if (full && lq.history.length) {
          q.history = lq.history
          q.intraday = lq.history.slice(-60).map(c => c.c)
          q.intraday.push(lq.price)
        } else {
          q.intraday.push(lq.price)
          if (q.intraday.length > 240) q.intraday.shift()
        }
      }
      this.lastRefresh = Date.now()
      if (!any) this.lastError = 'No live data available (proxy/network blocked); showing simulated data.'
    } catch (e: any) {
      this.lastError = 'Live data unavailable: ' + (e?.message ?? 'network error') + ' — showing simulated data.'
    } finally {
      this.connecting = false
      this.emitStatus()
      this.listeners.forEach(fn => fn())
    }
  }

  private tick() {
    if (this.mode === 'live') {
      // In live mode, only jitter symbols still on the simulator (no live feed).
      for (const def of SYMBOLS) {
        if (this.source[def.symbol] === 'live') continue
        const q = this.quotes[def.symbol]
        const step = (Math.random() - 0.5) * 2 * def.vol * 0.12
        const np = Math.max(0.0001, q.price * (1 + step))
        q.price = np; q.change = np - q.prevClose
        q.changePct = q.prevClose ? (q.change / q.prevClose) * 100 : 0
        q.intraday.push(np); if (q.intraday.length > 240) q.intraday.shift()
      }
      this.listeners.forEach(fn => fn())
      return
    }
    for (const def of SYMBOLS) {
      const q = this.quotes[def.symbol]
      const step = (Math.random() - 0.5) * 2 * def.vol * 0.12
      const np = Math.max(0.0001, q.price * (1 + step))
      q.price = np
      q.change = np - q.prevClose
      q.changePct = (q.change / q.prevClose) * 100
      q.dayHigh = Math.max(q.dayHigh, np)
      q.dayLow = Math.min(q.dayLow, np)
      const spread = np * (def.cls === 'FX' ? 0.00005 : def.cls === 'Crypto' ? 0.0003 : 0.0004)
      q.bid = np - spread; q.ask = np + spread
      if (baseVolume(def) > 0) q.volume += Math.round(Math.random() * baseVolume(def) * 0.004)
      q.intraday.push(np)
      if (q.intraday.length > 240) q.intraday.shift()
      const lastCandle = q.history[q.history.length - 1]
      lastCandle.c = np
      lastCandle.h = Math.max(lastCandle.h, np)
      lastCandle.l = Math.min(lastCandle.l, np)
    }
    this.listeners.forEach(fn => fn())
  }

  get(symbol: string): Quote | undefined { return this.quotes[symbol] }
  all(): Quote[] { return SYMBOLS.map(s => this.quotes[s.symbol]) }
  byClass(cls: string): Quote[] { return this.all().filter(q => SYMBOL_MAP[q.symbol].cls === cls) }
}

export const engine = new MarketEngine()

// formatting helpers
export function fmtNum(n: number, d = 2): string {
  if (!isFinite(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
}
export function fmtPrice(q: Quote): string {
  const d = q.cls === 'FX' ? (q.symbol === 'USDJPY' ? 3 : 4) : q.cls === 'Rate' ? 3 : 2
  return fmtNum(q.price, d)
}
export function fmtBig(n: number): string {
  if (!n) return '—'
  const abs = Math.abs(n)
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + 'T'
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (abs >= 1e3) return (n / 1e3).toFixed(2) + 'K'
  return n.toFixed(0)
}
export function signCls(n: number): string { return n > 0 ? 'up' : n < 0 ? 'down' : 'flat' }
export function signStr(n: number, d = 2): string { return (n >= 0 ? '+' : '') + fmtNum(n, d) }
