import { useState } from 'react'
import { Ctx } from '../App'
import { Panel } from '../components/Panel'
import { useMarket } from '../lib/hooks'
import { fmtNum, signStr, signCls } from '../data/market'
import { annualVol, annualReturn, sharpe, maxDrawdown, historicalVaR, dcf, DcfInput } from '../lib/quant'
import { SYMBOL_MAP } from '../data/symbols'

function pct(n: number, d = 2) { return (n * 100).toFixed(d) + '%' }

export function Analytics({ ctx }: { ctx: Ctx }) {
  const eng = useMarket()
  const st = ctx.store

  // Portfolio risk table
  const posRows = st.positions.map(p => {
    const q = eng.get(p.symbol)!
    const value = q.price * p.qty
    return {
      symbol: p.symbol, value,
      ret: annualReturn(q.history), vol: annualVol(q.history),
      sh: sharpe(q.history), mdd: maxDrawdown(q.history),
      var95: historicalVaR(q.history, value, 0.95),
    }
  })
  const totVal = posRows.reduce((s, r) => s + r.value, 0)
  const portVar = posRows.reduce((s, r) => s + r.var95, 0)
  const portRet = totVal ? posRows.reduce((s, r) => s + r.ret * r.value, 0) / totVal : 0
  const portVol = totVal ? posRows.reduce((s, r) => s + r.vol * r.value, 0) / totVal : 0

  // DCF calculator
  const [dcfSym, setDcfSym] = useState('AAPL')
  const [inp, setInp] = useState<DcfInput>({ fcf: 100000, growth: 11, termGrowth: 3, wacc: 8.5, shares: 15200, netDebt: -55000 })
  const res = dcf(inp)
  const dq = eng.get(dcfSym)
  const upside = dq && dq.price ? (res.perShare / dq.price - 1) : 0
  const set = (k: keyof DcfInput) => (e: React.ChangeEvent<HTMLInputElement>) => setInp(s => ({ ...s, [k]: +e.target.value }))

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gridAutoRows: 'min-content' }}>
      <Panel title="Portfolio Risk" sub="annualized · from history" style={{ gridColumn: '1 / 3' }}>
        <div className="stats mb" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <div className="stat"><div className="k">Exp. Return</div><div className={'v ' + signCls(portRet)}>{pct(portRet)}</div></div>
          <div className="stat"><div className="k">Volatility</div><div className="v">{pct(portVol)}</div></div>
          <div className="stat"><div className="k">1-Day VaR 95%</div><div className="v down">${fmtNum(portVar, 0)}</div></div>
          <div className="stat"><div className="k">Portfolio Value</div><div className="v">${fmtNum(totVal, 0)}</div></div>
        </div>
        <table className="tbl">
          <thead><tr><th>Symbol</th><th>Weight</th><th>Ann. Return</th><th>Ann. Vol</th><th>Sharpe</th><th>Max DD</th><th>VaR 95% ($)</th></tr></thead>
          <tbody>
            {posRows.map(r => (
              <tr key={r.symbol} className="clickable" onClick={() => ctx.selectSymbol(r.symbol)}>
                <td className="sym">{r.symbol}</td>
                <td className="muted">{pct(totVal ? r.value / totVal : 0, 1)}</td>
                <td className={signCls(r.ret)}>{pct(r.ret)}</td>
                <td>{pct(r.vol)}</td>
                <td className={r.sh >= 1 ? 'up' : r.sh < 0 ? 'down' : ''}>{fmtNum(r.sh)}</td>
                <td className="down">{pct(r.mdd)}</td>
                <td className="muted">${fmtNum(r.var95, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="DCF Valuation" sub="5-year two-stage model">
        <div className="row" style={{ marginBottom: 8, gap: 8 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Reference Symbol</label>
            <select className="inp" value={dcfSym} onChange={e => setDcfSym(e.target.value)}>
              {Object.values(SYMBOL_MAP).filter(s => s.cls === 'Equity').map(s => <option key={s.symbol} value={s.symbol}>{s.symbol} — {s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="stats" style={{ gridTemplateColumns: 'repeat(2,1fr)', background: 'transparent', gap: 8 }}>
          <div className="field"><label>FCF (base, $M)</label><input className="inp" type="number" value={inp.fcf} onChange={set('fcf')} /></div>
          <div className="field"><label>Growth Rate %</label><input className="inp" type="number" value={inp.growth} onChange={set('growth')} /></div>
          <div className="field"><label>Terminal Growth %</label><input className="inp" type="number" value={inp.termGrowth} onChange={set('termGrowth')} /></div>
          <div className="field"><label>WACC %</label><input className="inp" type="number" value={inp.wacc} onChange={set('wacc')} /></div>
          <div className="field"><label>Shares Out (M)</label><input className="inp" type="number" value={inp.shares} onChange={set('shares')} /></div>
          <div className="field"><label>Net Debt ($M)</label><input className="inp" type="number" value={inp.netDebt} onChange={set('netDebt')} /></div>
        </div>
      </Panel>

      <Panel title="DCF Output">
        <div className="stats" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
          <div className="stat"><div className="k">Enterprise Value</div><div className="v">${fmtNum(res.ev, 0)}M</div></div>
          <div className="stat"><div className="k">Equity Value</div><div className="v">${fmtNum(res.equity, 0)}M</div></div>
          <div className="stat"><div className="k">Fair Value / Share</div><div className="v amber" style={{ color: 'var(--amber)' }}>${fmtNum(res.perShare)}</div></div>
          <div className="stat"><div className="k">Market Price</div><div className="v">{dq ? '$' + fmtNum(dq.price) : '—'}</div></div>
          <div className="stat"><div className="k">Implied Upside</div><div className={'v ' + signCls(upside)}>{signStr(upside * 100)}%</div></div>
          <div className="stat"><div className="k">Rating</div><div className="v">{upside > 0.15 ? 'BUY' : upside < -0.1 ? 'SELL' : 'HOLD'}</div></div>
        </div>
        <div className="section-title" style={{ marginTop: 12 }}>Discounted FCF by Year</div>
        <table className="tbl"><tbody>
          {res.pv.map((v, i) => (
            <tr key={i}><td className="faint">Year {i + 1}</td><td style={{ textAlign: 'right' }}>${fmtNum(v, 0)}M</td></tr>
          ))}
        </tbody></table>
      </Panel>
    </div>
  )
}
