import { useState, useCallback } from 'react'

export interface Position { symbol: string; qty: number; avg: number }
export interface Trade { id: number; time: string; symbol: string; side: 'BUY' | 'SELL'; qty: number; price: number; by?: 'you' | 'ai' }

export interface AlgoSettings {
  enabled: boolean
  aggression: 'conservative' | 'balanced' | 'aggressive'
  universe: 'watchlist' | 'positions' | 'equities'
  riskPerTradePct: number   // tranche size per new entry, % of total value
  maxPositionPct: number    // cap per position, % of total value
  cashReservePct: number    // keep at least this % in cash
  maxTradesPerCycle: number
  intervalSec: number
}
export interface AlgoDecision { id: number; time: string; symbol: string; side: 'BUY' | 'SELL'; qty: number; price: number; score: number; reason: string }

export interface FeedSettings { provider: 'yahoo' | 'finnhub'; apiKey: string }

const LS = 'fincept-terminal-state-v2'
interface Persisted {
  watchlist: string[]; positions: Position[]; cash: number; trades: Trade[]
  algo: AlgoSettings; algoLog: AlgoDecision[]
  feed: FeedSettings
}

const DEFAULT_ALGO: AlgoSettings = {
  // The AI trades from the start, on a clean book, so activity is visible.
  enabled: true, aggression: 'balanced', universe: 'equities',
  riskPerTradePct: 8, maxPositionPct: 25, cashReservePct: 15,
  maxTradesPerCycle: 3, intervalSec: 12,
}

const DEFAULT: Persisted = {
  watchlist: ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'BTC', 'SPX', 'GC', 'EURUSD'],
  positions: [],   // clean slate — the AI builds the book itself
  cash: 250000,
  trades: [],
  algo: DEFAULT_ALGO,
  algoLog: [],
  feed: { provider: 'yahoo', apiKey: '' },
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(LS)
    if (raw) {
      const p = JSON.parse(raw)
      return { ...DEFAULT, ...p, algo: { ...DEFAULT_ALGO, ...(p.algo ?? {}) }, algoLog: p.algoLog ?? [], feed: { provider: 'yahoo', apiKey: '', ...(p.feed ?? {}) } }
    }
  } catch { /* ignore */ }
  return DEFAULT
}
function save(p: Persisted) { try { localStorage.setItem(LS, JSON.stringify(p)) } catch { /* ignore */ } }

let tid = 1
export function useStore() {
  const [state, setState] = useState<Persisted>(load)
  const persist = useCallback((next: Persisted) => { setState(next); save(next) }, [])

  const addWatch = useCallback((s: string) => setState(p => {
    if (p.watchlist.includes(s)) return p
    const n = { ...p, watchlist: [...p.watchlist, s] }; save(n); return n
  }), [])
  const removeWatch = useCallback((s: string) => setState(p => {
    const n = { ...p, watchlist: p.watchlist.filter(x => x !== s) }; save(n); return n
  }), [])
  const toggleWatch = useCallback((s: string) => setState(p => {
    const n = p.watchlist.includes(s)
      ? { ...p, watchlist: p.watchlist.filter(x => x !== s) }
      : { ...p, watchlist: [...p.watchlist, s] }
    save(n); return n
  }), [])

  const trade = useCallback((symbol: string, side: 'BUY' | 'SELL', qty: number, price: number, by: 'you' | 'ai' = 'you') => {
    setState(p => {
      const cost = qty * price
      let positions = [...p.positions]
      let cash = p.cash
      const idx = positions.findIndex(x => x.symbol === symbol)
      if (side === 'BUY') {
        cash -= cost
        if (idx >= 0) {
          const pos = positions[idx]; const newQty = pos.qty + qty
          positions[idx] = { ...pos, qty: newQty, avg: (pos.avg * pos.qty + cost) / newQty }
        } else positions.push({ symbol, qty, avg: price })
      } else {
        cash += cost
        if (idx >= 0) {
          const pos = positions[idx]; const newQty = pos.qty - qty
          if (newQty <= 0.0000001) positions.splice(idx, 1)
          else positions[idx] = { ...pos, qty: newQty }
        }
      }
      const t: Trade = { id: tid++, time: new Date().toLocaleTimeString('en-US', { hour12: false }), symbol, side, qty, price, by }
      const n = { ...p, positions, cash, trades: [t, ...p.trades].slice(0, 100) }
      save(n); return n
    })
  }, [])

  const setAlgo = useCallback((patch: Partial<AlgoSettings>) => setState(p => {
    const n = { ...p, algo: { ...p.algo, ...patch } }; save(n); return n
  }), [])
  const logAlgo = useCallback((decisions: AlgoDecision[]) => {
    if (!decisions.length) return
    setState(p => { const n = { ...p, algoLog: [...decisions, ...p.algoLog].slice(0, 80) }; save(n); return n })
  }, [])
  const clearAlgoLog = useCallback(() => setState(p => { const n = { ...p, algoLog: [] }; save(n); return n }), [])
  const setFeed = useCallback((patch: Partial<FeedSettings>) => setState(p => { const n = { ...p, feed: { ...p.feed, ...patch } }; save(n); return n }), [])

  const reset = useCallback(() => persist(DEFAULT), [persist])

  return { ...state, addWatch, removeWatch, toggleWatch, trade, setAlgo, logAlgo, clearAlgoLog, setFeed, reset }
}
export type Store = ReturnType<typeof useStore>
