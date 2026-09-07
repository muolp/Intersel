import { useState } from 'react'
import { Ctx } from '../App'
import { Panel } from '../components/Panel'
import { CandleChart, LineChart } from '../components/charts'
import { useMarket } from '../lib/hooks'
import { fmtPrice, fmtNum, signStr, signCls, fmtBig, Candle } from '../data/market'
import { generateNews } from '../data/news'
import { useMemo } from 'react'

const RANGES: { id: string; label: string; days: number }[] = [
  { id: '1M', label: '1M', days: 22 },
  { id: '3M', label: '3M', days: 66 },
  { id: '6M', label: '6M', days: 132 },
  { id: 'YTD', label: 'YTD', days: 175 },
  { id: '1Y', label: '1Y', days: 252 },
]

function Kv({ k, v, cls }: { k: string; v: string; cls?: string }) {
  return <div className="stat"><div className="k">{k}</div><div className={'v ' + (cls ?? '')}>{v}</div></div>
}

export function Security({ ctx }: { ctx: Ctx }) {
  const eng = useMarket()
  const [range, setRange] = useState('3M')
  const [mode, setMode] = useState<'candle' | 'line'>('candle')
  const q = eng.get(ctx.symbol)
  const news = useMemo(() => generateNews(30), [])

  if (!q) return <div className="empty">No security selected. Type a symbol in the command bar.</div>

  const days = RANGES.find(r => r.id === range)!.days
  const candles: Candle[] = q.history.slice(-days)
  const relNews = news.filter(n => n.symbols.includes(q.symbol)).slice(0, 8)
  const st = ctx.store
  const watched = st.watchlist.includes(q.symbol)

  const inRange = q.yearLow === q.yearHigh ? 0 : ((q.price - q.yearLow) / (q.yearHigh - q.yearLow)) * 100

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 300px', gridAutoRows: 'min-content' }}>
      <Panel title={q.symbol} sub={q.name} style={{ gridColumn: '1 / 2' }}
        right={<>
          <button className={'btn ' + (watched ? 'amber' : '')} onClick={() => st.toggleWatch(q.symbol)}>{watched ? '★ Watching' : '☆ Watch'}</button>
          <button className="btn buy" onClick={() => ctx.go('trade')}>Trade ▸</button>
        </>}>
        <div className="row spread" style={{ alignItems: 'flex-end', marginBottom: 10 }}>
          <div>
            <span className={'big-price ' + signCls(q.change)}>{fmtPrice(q)}</span>
            <span className={'chg-badge ' + signCls(q.change)} style={{ marginLeft: 12 }}>
              {signStr(q.change)} ({signStr(q.changePct)}%)
            </span>
            <span className="faint" style={{ marginLeft: 10 }}>{q.currency}</span>
          </div>
          <div className="row" style={{ gap: 12 }}>
            <div className="pill-row">
              <span className={'pill' + (mode === 'candle' ? ' active' : '')} onClick={() => setMode('candle')}>Candles</span>
              <span className={'pill' + (mode === 'line' ? ' active' : '')} onClick={() => setMode('line')}>Line</span>
            </div>
            <div className="pill-row">
              {RANGES.map(r => <span key={r.id} className={'pill' + (range === r.id ? ' active' : '')} onClick={() => setRange(r.id)}>{r.label}</span>)}
            </div>
          </div>
        </div>
        {mode === 'candle'
          ? <CandleChart candles={candles} height={330} />
          : <LineChart series={candles.map(c => c.c)} height={330} color="var(--amber)" />}
      </Panel>

      <Panel title="Order Book" sub="L1 · simulated">
        <table className="tbl"><tbody>
          <tr><td className="down">ASK</td><td className="down" style={{ textAlign: 'right' }}>{fmtNum(q.ask, q.cls === 'FX' ? 4 : 2)}</td><td className="faint" style={{ textAlign: 'right' }}>{fmtBig(Math.round(Math.random() * 5000 + 500))}</td></tr>
          <tr><td className="up">BID</td><td className="up" style={{ textAlign: 'right' }}>{fmtNum(q.bid, q.cls === 'FX' ? 4 : 2)}</td><td className="faint" style={{ textAlign: 'right' }}>{fmtBig(Math.round(Math.random() * 5000 + 500))}</td></tr>
          <tr><td className="faint">SPREAD</td><td className="muted" style={{ textAlign: 'right' }}>{fmtNum(q.ask - q.bid, 4)}</td><td /></tr>
        </tbody></table>
      </Panel>

      <Panel title="Key Statistics" style={{ gridColumn: '1 / 2' }}>
        <div className="stats">
          <Kv k="Prev Close" v={fmtNum(q.prevClose)} />
          <Kv k="Open" v={fmtNum(q.open)} />
          <Kv k="Day High" v={fmtNum(q.dayHigh)} />
          <Kv k="Day Low" v={fmtNum(q.dayLow)} />
          <Kv k="52W High" v={fmtNum(q.yearHigh)} />
          <Kv k="52W Low" v={fmtNum(q.yearLow)} />
          <Kv k="Volume" v={q.volume ? fmtBig(q.volume) : '—'} />
          <Kv k="Mkt Cap" v={q.mktCap ? '$' + fmtBig(q.mktCap) : '—'} />
          <Kv k="P/E" v={q.pe ? fmtNum(q.pe) : '—'} />
          <Kv k="Asset Class" v={q.cls} />
          <Kv k="52W Range" v={fmtNum(inRange, 0) + '%'} />
          <Kv k="Bid / Ask" v={fmtNum(q.bid, 2) + ' / ' + fmtNum(q.ask, 2)} />
        </div>
      </Panel>

      <Panel title="Related News" flush>
        <div style={{ padding: '0 8px' }}>
          {relNews.length ? relNews.map(n => (
            <div className="news-item" key={n.id}>
              <div className="h">{n.headline}</div>
              <div className="m"><span className="src">{n.source}</span><span>{n.time}</span></div>
            </div>
          )) : <div className="empty">No headlines tagged {q.symbol}.</div>}
        </div>
      </Panel>
    </div>
  )
}
