import { useState } from 'react'
import { Ctx } from '../App'
import { Panel } from '../components/Panel'
import { Sparkline } from '../components/charts'
import { useMarket } from '../lib/hooks'
import { fmtPrice, fmtNum, signStr, signCls, fmtBig } from '../data/market'
import { SYMBOLS, SYMBOL_MAP } from '../data/symbols'

export function Watchlist({ ctx }: { ctx: Ctx }) {
  const eng = useMarket()
  const st = ctx.store
  const [add, setAdd] = useState('')
  const list = st.watchlist.map(s => eng.get(s)!).filter(Boolean)

  const suggestions = SYMBOLS.filter(s => !st.watchlist.includes(s.symbol) &&
    (add ? s.symbol.startsWith(add.toUpperCase()) || s.name.toUpperCase().includes(add.toUpperCase()) : false)).slice(0, 6)

  const doAdd = (s: string) => { if (SYMBOL_MAP[s.toUpperCase()]) { st.addWatch(s.toUpperCase()); setAdd('') } }

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr', gridAutoRows: 'min-content' }}>
      <Panel title="Watchlist" sub={`${list.length} instruments`}
        right={
          <form onSubmit={e => { e.preventDefault(); doAdd(add) }} style={{ position: 'relative' }}>
            <input className="inp" value={add} onChange={e => setAdd(e.target.value)} placeholder="Add symbol…" style={{ width: 150 }} />
            {suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: 26, right: 0, background: 'var(--bg-panel-2)', border: '1px solid var(--border-bright)', zIndex: 5, width: 220 }}>
                {suggestions.map(s => (
                  <div key={s.symbol} className="side-item" onClick={() => doAdd(s.symbol)}>
                    <span className="sym">{s.symbol}</span><span className="muted" style={{ marginLeft: 8, fontSize: 10 }}>{s.name}</span>
                  </div>
                ))}
              </div>
            )}
          </form>
        }>
        {list.length === 0
          ? <div className="empty">Watchlist empty. Add symbols above or from any security page.</div>
          : (
            <table className="tbl">
              <thead><tr>
                <th>Symbol</th><th style={{ textAlign: 'left' }}>Name</th><th>Last</th><th>Chg</th><th>%Chg</th>
                <th>Bid</th><th>Ask</th><th>Volume</th><th style={{ textAlign: 'left' }}>Trend</th><th></th>
              </tr></thead>
              <tbody>
                {list.map(q => (
                  <tr key={q.symbol} className="clickable">
                    <td className="sym" onClick={() => ctx.selectSymbol(q.symbol)}>{q.symbol}</td>
                    <td className="muted" onClick={() => ctx.selectSymbol(q.symbol)}>{q.name}</td>
                    <td onClick={() => ctx.selectSymbol(q.symbol)}>{fmtPrice(q)}</td>
                    <td className={signCls(q.change)}>{signStr(q.change)}</td>
                    <td className={signCls(q.change)}>{signStr(q.changePct)}%</td>
                    <td className="faint">{fmtNum(q.bid, q.cls === 'FX' ? 4 : 2)}</td>
                    <td className="faint">{fmtNum(q.ask, q.cls === 'FX' ? 4 : 2)}</td>
                    <td className="muted">{q.volume ? fmtBig(q.volume) : '—'}</td>
                    <td style={{ width: 100 }}><Sparkline data={q.intraday} /></td>
                    <td><span className="faint" style={{ cursor: 'pointer' }} onClick={() => st.removeWatch(q.symbol)}>✕</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </Panel>
    </div>
  )
}
