import { useEffect, useReducer } from 'react'
import { engine } from '../data/market'

// Re-render on every market tick.
export function useMarket() {
  const [, force] = useReducer((x: number) => x + 1, 0)
  useEffect(() => { const off = engine.subscribe(force); return () => { off() } }, [])
  return engine
}

export function useNow(intervalMs = 1000) {
  const [now, tick] = useReducer(() => new Date(), new Date())
  useEffect(() => { const id = setInterval(tick, intervalMs); return () => clearInterval(id) }, [intervalMs])
  return now
}

import { useEffect as _useEffect, useReducer as _useReducer } from 'react'
// Re-render whenever the live/sim data status changes.
export function useLiveStatus() {
  const [, force] = _useReducer((x: number) => x + 1, 0)
  _useEffect(() => engine.subscribeStatus(force), [])
  return engine.status()
}
