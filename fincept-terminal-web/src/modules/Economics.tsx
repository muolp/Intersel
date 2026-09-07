import { useState } from 'react'
import { Ctx } from '../App'
import { Panel } from '../components/Panel'
import { LineChart, BarChart } from '../components/charts'
import { ECO_SERIES, YIELD_CURVE } from '../data/economic'
import { fmtNum, signStr, signCls } from '../data/market'

export function Economics(_: { ctx: Ctx }) {
  const [sel, setSel] = useState(ECO_SERIES[0].id)
  const series = ECO_SERIES.find(s => s.id === sel)!
  const labels = series.values.map(v => new Date(v.t).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }))

  return (
    <div className="grid" style={{ gridTemplateColumns: '260px 1fr', gridAutoRows: 'min-content' }}>
      <Panel title="Series Browser" sub="FRED-style" flush style={{ gridRow: 'span 2' }}>
        <table className="tbl"><tbody>
          {ECO_SERIES.map(s => (
            <tr key={s.id} className={'clickable'} onClick={() => setSel(s.id)} style={s.id === sel ? { background: '#12181f' } : undefined}>
              <td>
                <div className={s.id === sel ? 'sym' : ''}>{s.name}</div>
                <div className="faint" style={{ fontSize: 10 }}>{s.id} · {s.freq}</div>
              </td>
              <td style={{ textAlign: 'right' }}>
                <div>{fmtNum(s.latest, 2)}<span className="faint">{s.unit === '%' ? '%' : ''}</span></div>
                <div className={signCls(s.chg) + ' ' + 'faint'} style={{ fontSize: 10 }}>{signStr(s.chg, 2)}</div>
              </td>
            </tr>
          ))}
        </tbody></table>
      </Panel>

      <Panel title={series.name} sub={`${series.id} · ${series.unit} · ${series.freq}`}
        right={<span className={signCls(series.chg)}>{fmtNum(series.latest, 2)} ({signStr(series.chg, 2)})</span>}>
        <LineChart series={series.values.map(v => v.v)} labels={labels} height={260} color="var(--cyan)" />
      </Panel>

      <Panel title="US Treasury Yield Curve" sub="current">
        <BarChart data={YIELD_CURVE.map(y => y.y)} labels={YIELD_CURVE.map(y => y.tenor)} height={220} />
        <div className="row wrap" style={{ gap: 10, marginTop: 8 }}>
          {YIELD_CURVE.map(y => <span key={y.tenor} className="tag">{y.tenor} <b style={{ color: 'var(--text)' }}>{y.y.toFixed(2)}%</b></span>)}
        </div>
      </Panel>
    </div>
  )
}
