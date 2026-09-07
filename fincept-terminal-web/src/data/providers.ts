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
  XAUUSD: 'XAUUSD=X', CL: 'CL=F', GC: 'GC=F', SI: 'SI=F', NG: 'NG=F',
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
  history?: Candle[]   // omitted by quote-only providers (e.g. Finnhub free tier)
}

export type FeedProvider = 'yahoo' | 'finnhub'

const BASES = ['/api/yahoo', '/api/yahoo2']

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
  let lastErr: unknown = null
  // Try query1, then query2 as a fallback (Yahoo hosts intermittently 401/429).
  for (const base of BASES) {
    try {
      const url = `${base}/v8/finance/chart/${encodeURIComponent(yt)}?range=${range}&interval=${interval}`
      const json = await fetchJson(url)
      const q = parseYahooChart(symbol, json)
      if (q) return q
    } catch (e) { lastErr = e }
  }
  if (lastErr) throw lastErr
  return null
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

// ---------------------------------------------------------------------------
// Finnhub provider (optional API key). Finnhub's /quote endpoint is CORS-enabled
// and works directly from the browser — no proxy needed — so it powers LIVE data
// on any normal static deployment (and `npm run dev`/`preview`). It does NOT work
// inside the sandboxed claude.ai Artifact, whose policy blocks all external fetch.
//
// Free tier note: /quote covers US stocks & ETFs (real-time-ish) and returns no
// history, so live prices update on top of the existing chart. Indices, FX,
// commodities and crypto stay on the simulator under Finnhub.
const FINNHUB = 'https://finnhub.io/api/v1'

// Symbols Finnhub free tier can quote (US equities + ETFs).
export const FINNHUB_SYMBOLS = SYMBOLS
  .filter(s => s.cls === 'Equity' || s.cls === 'ETF')
  .map(s => s.symbol)

export function parseFinnhubQuote(symbol: string, j: any): LiveQuote | null {
  // { c: current, d: change, dp: pct, h, l, o, pc: prevClose, t: epoch }
  if (!j || typeof j.c !== 'number' || j.c === 0) return null
  const price = j.c
  const prevClose = typeof j.pc === 'number' && j.pc > 0 ? j.pc : price
  return {
    symbol, price, prevClose,
    open: j.o || price, dayHigh: j.h || price, dayLow: j.l || price,
    volume: 0, yearHigh: j.h || price, yearLow: j.l || price,
  }
}

export async function fetchFinnhub(symbol: string, apiKey: string): Promise<LiveQuote | null> {
  const url = `${FINNHUB}/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`
  const j = await fetchJson(url)
  return parseFinnhubQuote(symbol, j)
}

export async function fetchFinnhubBatch(
  symbols: string[], apiKey: string, concurrency = 5,
): Promise<Record<string, LiveQuote | null>> {
  const out: Record<string, LiveQuote | null> = {}
  let i = 0
  async function worker() {
    while (i < symbols.length) {
      const s = symbols[i++]
      try { out[s] = await fetchFinnhub(s, apiKey) } catch { out[s] = null }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, symbols.length) }, worker))
  return out
}
