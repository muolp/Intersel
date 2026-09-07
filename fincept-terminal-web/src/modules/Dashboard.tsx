import { useMemo } from 'react'
import { Ctx } from '../App'
import { Panel } from '../components/Panel'
import { Sparkline, LineChart } from '../components/charts'
import { useMarket } from '../lib/hooks'
import { fmtPrice, fmtNum, signStr, signCls, fmtBig, Quote } from '../data/market'
import { generateNews } from '../data/news'
import { SYMBOL_MAP } from '../data/symbols'

const INDEX_SET = ['SPX', 'NDX', 'DJI', 'RUT', 'VIX', 'DAX']

function QuoteRow({ q, onClick }: { q: Quote; onClick: () => void }) {
  return (
    <tr className="clickable" onClick={onClick}>
      <td className="sym">{q.symbol}</td>
      <td className="muted" style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.name}</td>
      <td>{fmtPrice(q)}</td>
      <td className={signCls(q.change)}>{signStr(q.change)}</td>
      <td className={signCls(q.change)}>{signStr(q.changePct)}%</td>
      <td style={{ width: 90 }}><Sparkline data={q.intraday} /></td>
    </tr>
  )
}

export function Dashboard({ ctx }: { ctx: Ctx }) {
  const eng = useMarket()
  const news = useMemo(() => generateNews(12), [])
  const indices = INDEX_SET.map(s => eng.get(s)!).filter(Boolean)
  const spx = eng.get('SPX')!

  const movers = eng.all().filter(q => SYMBOL_MAP[q.symbol].cls === 'Equity')
  const gainers = [...movers].sort((a, b) => b.changePct - a.changePct).slice(0, 6)
  const losers = [...movers].sort((a, b) => a.changePct - b.changePct).slice(0, 6)
  const st = ctx.store

  const equity = st.positions.reduce((s, p) => s + (eng.get(p.symbol)?.price ?? p.avg) * p.qty, 0)
  const totalVal = equity + st.cash
  const cost = st.positions.reduce((s, p) => s + p.avg * p.qty, 0)
  const pnl = equity - cost

  return (
    <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gridAutoRows: 'min-content' }}>
      <Panel title="Global Indices" sub="live" style={{ gridColumn: '1 / 2' }}>
        <div className="stats">
          {indices.map(q => (
            <div className="stat" key={q.symbol} style={{ cursor: 'pointer' }} onClick={() => ctx.selectSymbol(q.symbol)}>
              <div className="k">{q.symbol} · {q.name.split(' ')[0]}</div>
              <div className="v">{fmtPrice(q)}</div>
              <div className={signCls(q.change) + ' chg-badge'} style={{ fontSize: 12 }}>
                {signStr(q.change)} ({signStr(q.changePct)}%)
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Portfolio Snapshot" sub="paper" right={<span className="clickable" onClick={() => ctx.go('portfolio')} style={{ cursor: 'pointer', color: 'var(--cyan)' }}>OPEN ▸</span>}>
        <div className="stats" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
          <div className="stat"><div className="k">Total Value</div><div className="v">${fmtNum(totalVal)}</div></div>
          <div className="stat"><div className="k">Cash</div><div className="v">${fmtBig(st.cash)}</div></div>
          <div className="stat"><div className="k">Open P&amp;L</div><div className={'v ' + signCls(pnl)}>{signStr(pnl)}</div></div>
          <div className="stat"><div className="k">Positions</div><div className="v">{st.positions.length}</div></div>
        </div>
      </Panel>

      <Panel title="S&P 500 · Intraday" sub="SPX" style={{ gridColumn: '1 / 2' }}
        right={<span className={signCls(spx.change)}>{fmtPrice(spx)} {signStr(spx.changePct)}%</span>}>
        <LineChart series={spx.intraday} height={190} color="var(--amber)" />
      </Panel>

      <Panel title="Top Gainers" flush>
        <table className="tbl"><tbody>
          {gainers.map(q => <QuoteRow key={q.symbol} q={q} onClick={() => ctx.selectSymbol(q.symbol)} />)}
        </tbody></table>
      </Panel>

      <Panel title="Top Losers" flush style={{ gridColumn: '1 / 2' }}>
        <table className="tbl"><tbody>
          {losers.map(q => <QuoteRow key={q.symbol} q={q} onClick={() => ctx.selectSymbol(q.symbol)} />)}
        </tbody></table>
      </Panel>

      <Panel title="Top Wires" flush right={<span className="clickable" style={{ cursor: 'pointer', color: 'var(--cyan)' }} onClick={() => ctx.go('news')}>ALL ▸</span>}>
        <div style={{ padding: '0 8px' }}>
          {news.map(n => (
            <div className="news-item" key={n.id} onClick={() => n.symbols[0] && SYMBOL_MAP[n.symbols[0]] && ctx.selectSymbol(n.symbols[0])}>
              <div className="h">{n.headline}</div>
              <div className="m"><span className="src">{n.source}</span><span>{n.time}</span><span className="tag">{n.category}</span></div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
