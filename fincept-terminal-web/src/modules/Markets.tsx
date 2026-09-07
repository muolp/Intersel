import { useState } from 'react'
import { Ctx } from '../App'
import { Panel } from '../components/Panel'
import { Sparkline } from '../components/charts'
import { useMarket } from '../lib/hooks'
import { fmtPrice, fmtNum, signStr, signCls, fmtBig } from '../data/market'
import { SYMBOL_MAP, SECTORS } from '../data/symbols'

const TABS: { id: string; label: string; cls: string }[] = [
  { id: 'Equity', label: 'Equities', cls: 'Equity' },
  { id: 'Index', label: 'Indices', cls: 'Index' },
  { id: 'Crypto', label: 'Crypto', cls: 'Crypto' },
  { id: 'FX', label: 'FX', cls: 'FX' },
  { id: 'Commodity', label: 'Commodities', cls: 'Commodity' },
  { id: 'Rate', label: 'Rates', cls: 'Rate' },
]

function heatColor(pct: number): { bg: string; fg: string } {
  const c = Math.max(-3, Math.min(3, pct)) / 3
  if (c >= 0) return { bg: `rgba(46,204,113,${0.12 + c * 0.5})`, fg: '#dfeee6' }
  return { bg: `rgba(255,59,71,${0.12 + -c * 0.5})`, fg: '#f6e2e4' }
}

export function Markets({ ctx }: { ctx: Ctx }) {
  const eng = useMarket()
  const [tab, setTab] = useState('Equity')
  const [sortKey, setSortKey] = useState<'changePct' | 'price' | 'volume' | 'symbol'>('changePct')

  const rows = eng.all().filter(q => SYMBOL_MAP[q.symbol].cls === tab)
  rows.sort((a, b) => {
    if (sortKey === 'symbol') return a.symbol.localeCompare(b.symbol)
    return (b[sortKey] as number) - (a[sortKey] as number)
  })

  const allEq = eng.byClass('Equity')

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr', gridAutoRows: 'min-content' }}>
      <Panel title="Sector Heatmap" sub="equities · % change">
        <div className="heat">
          {allEq.map(q => {
            const col = heatColor(q.changePct)
            return (
              <div className="heat-cell" key={q.symbol} style={{ background: col.bg, color: col.fg }} onClick={() => ctx.selectSymbol(q.symbol)}>
                <div className="s">{q.symbol}</div>
                <div className="c">{signStr(q.changePct)}%</div>
              </div>
            )
          })}
        </div>
      </Panel>

      <Panel title="Market Monitor" flush
        right={<div className="pill-row">
          {TABS.map(t => <span key={t.id} className={'pill' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>{t.label}</span>)}
        </div>}>
        <table className="tbl">
          <thead><tr>
            <th onClick={() => setSortKey('symbol')} style={{ cursor: 'pointer' }}>Symbol</th>
            <th style={{ textAlign: 'left' }}>Name</th>
            <th onClick={() => setSortKey('price')} style={{ cursor: 'pointer' }}>Last</th>
            <th>Chg</th>
            <th onClick={() => setSortKey('changePct')} style={{ cursor: 'pointer' }}>%Chg</th>
            <th>Bid</th><th>Ask</th>
            <th onClick={() => setSortKey('volume')} style={{ cursor: 'pointer' }}>Volume</th>
            <th>Day Range</th>
            <th style={{ textAlign: 'left' }}>Trend</th>
          </tr></thead>
          <tbody>
            {rows.map(q => (
              <tr key={q.symbol} className="clickable" onClick={() => ctx.selectSymbol(q.symbol)}>
                <td className="sym">{q.symbol}</td>
                <td className="muted">{q.name}</td>
                <td>{fmtPrice(q)}</td>
                <td className={signCls(q.change)}>{signStr(q.change)}</td>
                <td className={signCls(q.change)}>{signStr(q.changePct)}%</td>
                <td className="faint">{fmtNum(q.bid, q.cls === 'FX' ? 4 : 2)}</td>
                <td className="faint">{fmtNum(q.ask, q.cls === 'FX' ? 4 : 2)}</td>
                <td className="muted">{q.volume ? fmtBig(q.volume) : '—'}</td>
                <td className="faint">{fmtNum(q.dayLow, 2)}–{fmtNum(q.dayHigh, 2)}</td>
                <td style={{ width: 100 }}><Sparkline data={q.intraday} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  )
}

export { SECTORS }
