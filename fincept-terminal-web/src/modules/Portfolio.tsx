import { Ctx } from '../App'
import { Panel } from '../components/Panel'
import { LineChart } from '../components/charts'
import { useMarket } from '../lib/hooks'
import { fmtNum, signStr, signCls, fmtBig } from '../data/market'

export function Portfolio({ ctx }: { ctx: Ctx }) {
  const eng = useMarket()
  const st = ctx.store

  const rows = st.positions.map(p => {
    const q = eng.get(p.symbol)!
    const mkt = q.price * p.qty
    const costBasis = p.avg * p.qty
    const pnl = mkt - costBasis
    const pnlPct = costBasis ? pnl / costBasis : 0
    const dayPnl = q.change * p.qty
    return { p, q, mkt, costBasis, pnl, pnlPct, dayPnl }
  })
  const equity = rows.reduce((s, r) => s + r.mkt, 0)
  const totalVal = equity + st.cash
  const totalCost = rows.reduce((s, r) => s + r.costBasis, 0)
  const totalPnl = equity - totalCost
  const dayPnl = rows.reduce((s, r) => s + r.dayPnl, 0)

  // synthetic equity curve
  const curve: number[] = []
  let base = totalVal * 0.82
  for (let i = 0; i < 60; i++) { base = base * (1 + (Math.sin(i / 6) * 0.004) + (i / 60) * 0.006 + (Math.random() - 0.5) * 0.006); curve.push(base) }
  curve.push(totalVal)

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gridAutoRows: 'min-content' }}>
      <Panel title="Account Summary" sub="paper trading" style={{ gridColumn: '1 / 3' }}
        right={<button className="btn" onClick={() => { if (confirm('Reset portfolio to defaults?')) st.reset() }}>Reset</button>}>
        <div className="stats" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
          <div className="stat"><div className="k">Total Value</div><div className="v">${fmtNum(totalVal)}</div></div>
          <div className="stat"><div className="k">Equity</div><div className="v">${fmtNum(equity)}</div></div>
          <div className="stat"><div className="k">Cash</div><div className="v">${fmtNum(st.cash)}</div></div>
          <div className="stat"><div className="k">Open P&amp;L</div><div className={'v ' + signCls(totalPnl)}>{signStr(totalPnl)}</div></div>
          <div className="stat"><div className="k">Day P&amp;L</div><div className={'v ' + signCls(dayPnl)}>{signStr(dayPnl)}</div></div>
        </div>
      </Panel>

      <Panel title="Equity Curve" sub="90 sessions" style={{ gridColumn: '1 / 3' }}>
        <LineChart series={curve} height={180} color="var(--amber)" />
      </Panel>

      <Panel title="Positions" flush style={{ gridColumn: '1 / 3' }}
        right={<button className="btn buy" onClick={() => ctx.go('trade')}>New Order ▸</button>}>
        {rows.length === 0 ? <div className="empty">No open positions. Place an order from the Order Ticket.</div> : (
          <table className="tbl">
            <thead><tr><th>Symbol</th><th>Qty</th><th>Avg Cost</th><th>Last</th><th>Mkt Value</th><th>Day P&amp;L</th><th>Open P&amp;L</th><th>%</th><th></th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.p.symbol} className="clickable">
                  <td className="sym" onClick={() => ctx.selectSymbol(r.p.symbol)}>{r.p.symbol}</td>
                  <td className="muted">{fmtNum(r.p.qty, r.p.qty % 1 === 0 ? 0 : 4)}</td>
                  <td className="faint">{fmtNum(r.p.avg)}</td>
                  <td>{fmtNum(r.q.price)}</td>
                  <td>${fmtBig(r.mkt)}</td>
                  <td className={signCls(r.dayPnl)}>{signStr(r.dayPnl)}</td>
                  <td className={signCls(r.pnl)}>{signStr(r.pnl)}</td>
                  <td className={signCls(r.pnl)}>{signStr(r.pnlPct * 100)}%</td>
                  <td><button className="btn sell" onClick={() => { ctx.selectSymbol(r.p.symbol); ctx.go('trade') }}>Trade</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel title="Recent Fills" flush style={{ gridColumn: '1 / 3' }}>
        {st.trades.length === 0 ? <div className="empty">No trades yet.</div> : (
          <table className="tbl">
            <thead><tr><th style={{ textAlign: 'left' }}>Time</th><th>Symbol</th><th>Side</th><th>Qty</th><th>Price</th><th>Value</th></tr></thead>
            <tbody>
              {st.trades.map(t => (
                <tr key={t.id}>
                  <td className="faint">{t.time}</td>
                  <td className="sym">{t.symbol}</td>
                  <td className={t.side === 'BUY' ? 'up' : 'down'}>{t.side}</td>
                  <td className="muted">{fmtNum(t.qty, t.qty % 1 === 0 ? 0 : 4)}</td>
                  <td>{fmtNum(t.price)}</td>
                  <td className="muted">${fmtBig(t.qty * t.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  )
}
