import { useMemo, useState } from 'react'
import { Ctx } from '../App'
import { Panel } from '../components/Panel'
import { generateNews, CATS, ECON_CALENDAR } from '../data/news'
import { SYMBOL_MAP } from '../data/symbols'

export function News({ ctx }: { ctx: Ctx }) {
  const news = useMemo(() => generateNews(48), [])
  const [cat, setCat] = useState('All')
  const filtered = cat === 'All' ? news : news.filter(n => n.category === cat)

  const impDot = (i: number) => <span style={{ color: i === 3 ? 'var(--red)' : i === 2 ? 'var(--amber)' : 'var(--text-faint)' }}>{'●'.repeat(i)}</span>

  return (
    <div className="grid" style={{ gridTemplateColumns: '1.7fr 1fr', gridAutoRows: 'min-content' }}>
      <Panel title="News & Wires" sub="aggregated feed" flush style={{ gridRow: 'span 2' }}
        right={<div className="pill-row">
          {['All', ...CATS].map(c => <span key={c} className={'pill' + (cat === c ? ' active' : '')} onClick={() => setCat(c)}>{c}</span>)}
        </div>}>
        <div style={{ padding: '0 8px' }}>
          {filtered.map(n => (
            <div className="news-item" key={n.id} onClick={() => n.symbols[0] && SYMBOL_MAP[n.symbols[0]] && ctx.selectSymbol(n.symbols[0])}>
              <div className="row" style={{ gap: 8 }}>
                <span className={'tag ' + (n.sentiment === 'pos' ? 'g' : n.sentiment === 'neg' ? 'r' : '')}>
                  {n.sentiment === 'pos' ? '▲' : n.sentiment === 'neg' ? '▼' : '■'}
                </span>
                <span className="h">{n.headline}</span>
              </div>
              <div className="m">
                <span className="src">{n.source}</span><span>{n.time}</span><span className="tag">{n.category}</span>
                {n.symbols.map(s => <span key={s} className="sym" style={{ fontSize: 10 }}>{s}</span>)}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Economic Calendar" sub="today" flush>
        <table className="tbl">
          <thead><tr><th style={{ textAlign: 'left' }}>Time</th><th style={{ textAlign: 'left' }}>Ctry</th><th style={{ textAlign: 'left' }}>Event</th><th>Imp</th><th>Act</th><th>Fcst</th><th>Prior</th></tr></thead>
          <tbody>
            {ECON_CALENDAR.map((e, i) => (
              <tr key={i}>
                <td className="muted">{e.time}</td>
                <td className="faint">{e.country}</td>
                <td>{e.event}</td>
                <td style={{ textAlign: 'right' }}>{impDot(e.importance)}</td>
                <td className={e.actual !== '—' ? 'sym' : 'faint'}>{e.actual}</td>
                <td className="muted">{e.forecast}</td>
                <td className="faint">{e.prior}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Sentiment Summary">
        <div className="stats" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          <div className="stat"><div className="k">Positive</div><div className="v up">{news.filter(n => n.sentiment === 'pos').length}</div></div>
          <div className="stat"><div className="k">Neutral</div><div className="v flat">{news.filter(n => n.sentiment === 'neu').length}</div></div>
          <div className="stat"><div className="k">Negative</div><div className="v down">{news.filter(n => n.sentiment === 'neg').length}</div></div>
        </div>
      </Panel>
    </div>
  )
}
