import { useCallback, useEffect, useState } from 'react'
import { CommandBar } from './components/CommandBar'
import { Sidebar } from './components/Sidebar'
import { Ticker } from './components/Ticker'
import { StatusBar } from './components/StatusBar'
import { NAV } from './lib/nav'
import { useStore } from './lib/store'
import { engine } from './data/market'
import { SYMBOL_MAP } from './data/symbols'

import { Dashboard } from './modules/Dashboard'
import { Markets } from './modules/Markets'
import { Security } from './modules/Security'
import { Watchlist } from './modules/Watchlist'
import { Screener } from './modules/Screener'
import { News } from './modules/News'
import { Economics } from './modules/Economics'
import { Analytics } from './modules/Analytics'
import { Portfolio } from './modules/Portfolio'
import { Trade } from './modules/Trade'
import { Chat } from './modules/Chat'

export interface Ctx {
  store: ReturnType<typeof useStore>
  symbol: string
  selectSymbol: (s: string) => void
  go: (view: string) => void
}

export default function App() {
  const store = useStore()
  const [view, setView] = useState('dashboard')
  const [symbol, setSymbol] = useState('AAPL')

  useEffect(() => { engine.start(1500); return () => engine.stop() }, [])

  const selectSymbol = useCallback((s: string) => { setSymbol(s); setView('security') }, [])
  const go = useCallback((v: string) => setView(v), [])

  const onCommand = useCallback((raw: string) => {
    const parts = raw.toUpperCase().split(/\s+/)
    const cmd = parts[0]
    // direct symbol lookup
    if (SYMBOL_MAP[cmd]) { setSymbol(cmd); setView('security'); return }
    const map: Record<string, string> = {
      HOME: 'dashboard', DASH: 'dashboard', MKT: 'markets', MARKETS: 'markets',
      GP: 'security', SEC: 'security', W: 'watchlist', WATCH: 'watchlist', SCR: 'screener', SCREEN: 'screener',
      N: 'news', NEWS: 'news', ECO: 'economics', ECON: 'economics', ANLY: 'analytics', ANALYTICS: 'analytics',
      PORT: 'portfolio', PORTFOLIO: 'portfolio', BUY: 'trade', SELL: 'trade', TRADE: 'trade',
      AI: 'chat', CHAT: 'chat', HELP: 'dashboard',
    }
    if (map[cmd]) {
      if ((cmd === 'GP' || cmd === 'SEC' || cmd === 'BUY' || cmd === 'SELL' || cmd === 'TRADE') && parts[1] && SYMBOL_MAP[parts[1]]) setSymbol(parts[1])
      setView(map[cmd]); return
    }
    setView('dashboard')
  }, [])

  const ctx: Ctx = { store, symbol, selectSymbol, go }

  const render = () => {
    switch (view) {
      case 'dashboard': return <Dashboard ctx={ctx} />
      case 'markets': return <Markets ctx={ctx} />
      case 'security': return <Security ctx={ctx} />
      case 'watchlist': return <Watchlist ctx={ctx} />
      case 'screener': return <Screener ctx={ctx} />
      case 'news': return <News ctx={ctx} />
      case 'economics': return <Economics ctx={ctx} />
      case 'analytics': return <Analytics ctx={ctx} />
      case 'portfolio': return <Portfolio ctx={ctx} />
      case 'trade': return <Trade ctx={ctx} />
      case 'chat': return <Chat ctx={ctx} />
      default: return <Dashboard ctx={ctx} />
    }
  }

  const label = NAV.find(n => n.id === view)?.label ?? view

  return (
    <div className="app">
      <CommandBar onCommand={onCommand} />
      <Ticker />
      <div className="fkeys">
        {NAV.map(n => (
          <button key={n.id} className={'fkey' + (view === n.id ? ' active' : '')} onClick={() => setView(n.id)}>
            <b>{n.cmd}</b>{n.label}
          </button>
        ))}
      </div>
      <div className="body">
        <Sidebar current={view} onNav={setView} />
        <div className="main">{render()}</div>
      </div>
      <StatusBar view={label} />
    </div>
  )
}
