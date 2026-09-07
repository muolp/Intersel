// Live data provider: fetches free, no-key market data from Yahoo Finance.
//
// Browsers cannot call Yahoo directly (no CORS headers), so requests go to a
// same-origin path ("/api/yahoo/...") that the Vite dev server proxies to
// Yahoo (see vite.config.ts `server.proxy`). This means LIVE data works when
// running `npm run dev`. In a static/hosted build (or the sandboxed Artifact,
// whose security policy blocks all external fetches) requests fail and the app
// transparently falls back to the built-in simulator, per symbol.
import { Candle } from './market'
import { SYMBOLS } from './symbols'

// Map internal symbols to Yahoo tickers. Symbols with no reliable free ticker
// are omitted and stay on the simulator.
export const YAHOO_MAP: Record<string, string> = {
  SPX: '^GSPC', NDX: '^NDX', DJI: '^DJI', RUT: '^RUT', VIX: '^VIX',
  UKX: '^FTSE', DAX: '^GDAXI', NKY: '^N225',
  AAPL: 'AAPL', MSFT: 'MSFT', NVDA: 'NVDA', GOOGL: 'GOOGL', AMZN: 'AMZN',
  META: 'META', TSLA: 'TSLA', JPM: 'JPM', BAC: 'BAC', GS: 'GS', XOM: 'XOM',
  CVX: 'CVX', UNH: 'UNH', JNJ: 'JNJ', LLY: 'LLY', WMT: 'WMT', HD: 'HD',
  CAT: 'CAT', BA: 'BA', DIS: 'DIS', SPY: 'SPY', QQQ: 'QQQ',
  BTC: 'BTC-USD', ETH: 'ETH-USD', SOL: 'SOL-USD',
  EURUSD: 'EURUSD=X', GBPUSD: 'GBPUSD=X', USDJPY: 'USDJPY=X',
  CL: 'CL=F', GC: 'GC=F', SI: 'SI=F', NG: 'NG=F',
  US10Y: '^TNX',
}

export const LIVE_SYMBOLS = SYMBOLS.map(s => s.symbol).filter(s => YAHOO_MAP[s])

export interface LiveQuote {
  symbol: string
  price: number
  prevClose: number
  open: number
  dayHigh: number
  dayLow: number
  volume: number
  yearHigh: number
  yearLow: number
  history: Candle[]
}

const BASE = '/api/yahoo'

// Extract a Yahoo chart JSON payload into our shape.
export function parseYahooChart(symbol: string, json: any): LiveQuote | null {
  const res = json?.chart?.result?.[0]
  if (!res || !res.meta) return null
  const meta = res.meta
  const ts: number[] = res.timestamp ?? []
  const q = res.indicators?.quote?.[0] ?? {}
  const history: Candle[] = []
  for (let i = 0; i < ts.length; i++) {
    const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i], v = q.volume?.[i]
    if (o == null || h == null || l == null || c == null) continue
    history.push({ t: ts[i] * 1000, o, h, l, c, v: v ?? 0 })
  }
  const price = meta.regularMarketPrice ?? (history.length ? history[history.length - 1].c : null)
  if (price == null) return null
  const prevClose = meta.chartPreviousClose ?? meta.previousClose ??
    (history.length >= 2 ? history[history.length - 2].c : price)
  const window = history.slice(-252)
  const yearHigh = meta.fiftyTwoWeekHigh ?? (window.length ? Math.max(...window.map(c => c.h)) : price)
  const yearLow = meta.fiftyTwoWeekLow ?? (window.length ? Math.min(...window.map(c => c.l)) : price)
  const lastC = history[history.length - 1]
  return {
    symbol, price, prevClose,
    open: meta.regularMarketOpen ?? lastC?.o ?? price,
    dayHigh: meta.regularMarketDayHigh ?? lastC?.h ?? price,
    dayLow: meta.regularMarketDayLow ?? lastC?.l ?? price,
    volume: meta.regularMarketVolume ?? lastC?.v ?? 0,
    yearHigh, yearLow, history,
  }
}

async function fetchJson(url: string, timeoutMs = 9000): Promise<any> {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } })
    if (!r.ok) throw new Error('HTTP ' + r.status)
    return await r.json()
  } finally { clearTimeout(id) }
}

export async function fetchLive(symbol: string, range = '1y', interval = '1d'): Promise<LiveQuote | null> {
  const yt = YAHOO_MAP[symbol]
  if (!yt) return null
  const url = `${BASE}/v8/finance/chart/${encodeURIComponent(yt)}?range=${range}&interval=${interval}`
  const json = await fetchJson(url)
  return parseYahooChart(symbol, json)
}

// Fetch many symbols with limited concurrency; never throws — failures resolve null.
export async function fetchLiveBatch(
  symbols: string[], range = '1y', interval = '1d', concurrency = 6,
): Promise<Record<string, LiveQuote | null>> {
  const out: Record<string, LiveQuote | null> = {}
  let i = 0
  async function worker() {
    while (i < symbols.length) {
      const s = symbols[i++]
      try { out[s] = await fetchLive(s, range, interval) } catch { out[s] = null }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, symbols.length) }, worker))
  return out
}

// Probe whether the live proxy is reachable in this deployment.
export async function liveAvailable(): Promise<boolean> {
  try { const q = await fetchLive('AAPL', '5d', '1d'); return !!q } catch { return false }
}
