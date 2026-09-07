import { useState } from 'react'
import { Ctx } from '../App'
import { Panel } from '../components/Panel'
import { useMarket } from '../lib/hooks'
import { fmtPrice, fmtNum, signStr, signCls, fmtBig } from '../data/market'
import { SYMBOL_MAP } from '../data/symbols'

export function Screener({ ctx }: { ctx: Ctx }) {
  const eng = useMarket()
  const [cls, setCls] = useState('All')
  const [minChg, setMinChg] = useState(-100)
  const [maxPe, setMaxPe] = useState(200)
  const [query, setQuery] = useState('')

  let rows = eng.all()
  if (cls !== 'All') rows = rows.filter(q => SYMBOL_MAP[q.symbol].cls === cls)
  rows = rows.filter(q => q.changePct >= minChg)
  rows = rows.filter(q => (q.pe === 0 ? true : q.pe <= maxPe))
  if (query) rows = rows.filter(q => q.symbol.includes(query.toUpperCase()) || q.name.toUpperCase().includes(query.toUpperCase()))
  rows.sort((a, b) => b.changePct - a.changePct)

  const classes = ['All', 'Equity', 'Index', 'ETF', 'Crypto', 'FX', 'Commodity', 'Rate']

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr', gridAutoRows: 'min-content' }}>
      <Panel title="Screener Filters">
        <div className="row wrap" style={{ gap: 14 }}>
          <div className="field"><label>Search</label><input className="inp" value={query} onChange={e => setQuery(e.target.value)} placeholder="symbol / name" /></div>
          <div className="field"><label>Asset Class</label>
            <div className="pill-row">{classes.map(c => <span key={c} className={'pill' + (cls === c ? ' active' : '')} onClick={() => setCls(c)}>{c}</span>)}</div>
          </div>
          <div className="field"><label>Min %Chg: {minChg === -100 ? 'any' : minChg + '%'}</label>
            <input type="range" min={-5} max={5} step={0.5} value={minChg === -100 ? -5 : minChg} onChange={e => setMinChg(+e.target.value <= -5 ? -100 : +e.target.value)} />
          </div>
          <div className="field"><label>Max P/E: {maxPe >= 200 ? 'any' : maxPe}</label>
            <input type="range" min={5} max={200} step={5} value={maxPe} onChange={e => setMaxPe(+e.target.value)} />
          </div>
        </div>
      </Panel>
      <Panel title="Results" sub={`${rows.length} matches`} flush>
        <table className="tbl">
          <thead><tr><th>Symbol</th><th style={{ textAlign: 'left' }}>Name</th><th>Class</th><th>Last</th><th>%Chg</th><th>P/E</th><th>Mkt Cap</th><th>Volume</th></tr></thead>
          <tbody>
            {rows.map(q => (
              <tr key={q.symbol} className="clickable" onClick={() => ctx.selectSymbol(q.symbol)}>
                <td className="sym">{q.symbol}</td>
                <td className="muted">{q.name}</td>
                <td className="faint">{q.cls}</td>
                <td>{fmtPrice(q)}</td>
                <td className={signCls(q.change)}>{signStr(q.changePct)}%</td>
                <td className="muted">{q.pe ? fmtNum(q.pe) : '—'}</td>
                <td className="muted">{q.mktCap ? '$' + fmtBig(q.mktCap) : '—'}</td>
                <td className="muted">{q.volume ? fmtBig(q.volume) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  )
}
