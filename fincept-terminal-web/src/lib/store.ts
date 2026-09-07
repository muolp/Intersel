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

const LS = 'fincept-terminal-state-v3'
interface Persisted {
  watchlist: string[]; positions: Position[]; cash: number; trades: Trade[]
  algo: AlgoSettings; algoLog: AlgoDecision[]
  feed: FeedSettings
  leverage: number    // account leverage, e.g. 100 → 1:100
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
  leverage: 100,
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(LS)
    if (raw) {
      const p = JSON.parse(raw)
      return { ...DEFAULT, ...p, algo: { ...DEFAULT_ALGO, ...(p.algo ?? {}) }, algoLog: p.algoLog ?? [], feed: { provider: 'yahoo', apiKey: '', ...(p.feed ?? {}) }, leverage: p.leverage ?? DEFAULT.leverage }
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

  // Signed/margin trade: qty is always a positive size; side sets direction.
  // Positions carry signed qty (long +, short -). Only realized P&L moves cash;
  // margin is a computed constraint (see lib/account.ts), not a cash deduction.
  const trade = useCallback((symbol: string, side: 'BUY' | 'SELL', qty: number, price: number, by: 'you' | 'ai' = 'you') => {
    if (qty <= 0) return
    setState(p => {
      const positions = p.positions.map(x => ({ ...x }))
      let cash = p.cash
      const delta = side === 'BUY' ? qty : -qty
      const idx = positions.findIndex(x => x.symbol === symbol)
      if (idx < 0) {
        positions.push({ symbol, qty: delta, avg: price })
      } else {
        const pos = positions[idx]
        const oldQty = pos.qty
        const newQty = oldQty + delta
        if (oldQty === 0 || Math.sign(delta) === Math.sign(oldQty)) {
          // increasing in the same direction → weighted-average entry
          const absOld = Math.abs(oldQty), absAdd = Math.abs(delta)
          pos.avg = (pos.avg * absOld + price * absAdd) / (absOld + absAdd)
          pos.qty = newQty
        } else {
          // reducing / closing / flipping → realize P&L on the closed portion
          const closed = Math.min(Math.abs(delta), Math.abs(oldQty))
          const dir = oldQty > 0 ? 1 : -1
          cash += (price - pos.avg) * dir * closed
          if (Math.abs(delta) < Math.abs(oldQty)) { pos.qty = newQty /* avg unchanged */ }
          else if (Math.abs(delta) === Math.abs(oldQty)) { positions.splice(idx, 1) }
          else { pos.qty = newQty; pos.avg = price /* flipped to the other side */ }
        }
        if (positions[idx] && Math.abs(positions[idx].qty) < 1e-9) positions.splice(idx, 1)
      }
      const t: Trade = { id: tid++, time: new Date().toLocaleTimeString('en-US', { hour12: false }), symbol, side, qty, price, by }
      const n = { ...p, positions, cash, trades: [t, ...p.trades].slice(0, 100) }
      save(n); return n
    })
  }, [])

  const setLeverage = useCallback((lev: number) => setState(p => { const n = { ...p, leverage: lev }; save(n); return n }), [])

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

  return { ...state, addWatch, removeWatch, toggleWatch, trade, setLeverage, setAlgo, logAlgo, clearAlgoLog, setFeed, reset }
}
export type Store = ReturnType<typeof useStore>
