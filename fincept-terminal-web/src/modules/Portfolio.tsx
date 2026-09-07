import { Ctx } from '../App'
import { Panel } from '../components/Panel'
import { LineChart } from '../components/charts'
import { useMarket } from '../lib/hooks'
import { fmtNum, signStr, signCls, fmtBig } from '../data/market'
import { computeAccount, requiredMargin } from '../lib/account'

export function Portfolio({ ctx }: { ctx: Ctx }) {
  const eng = useMarket()
  const st = ctx.store
  const priceOf = (s: string) => eng.get(s)?.price ?? 0
  const acct = computeAccount(st.positions, st.cash, st.leverage, priceOf)

  const rows = st.positions.map(p => {
    const q = eng.get(p.symbol)!
    const dir = p.qty > 0 ? 'LONG' : 'SHORT'
    const floating = (q.price - p.avg) * p.qty
    const cost = Math.abs(p.qty) * p.avg
    const pnlPct = cost ? floating / cost * 100 : 0
    const dayPnl = q.change * p.qty
    const margin = requiredMargin(p.qty, p.avg, st.leverage)
    return { p, q, dir, floating, pnlPct, dayPnl, margin, notional: Math.abs(p.qty) * q.price }
  })

  const curve: number[] = []
  let base = acct.equity * 0.82
  for (let i = 0; i < 60; i++) { base = base * (1 + (Math.sin(i / 6) * 0.004) + (i / 60) * 0.006 + (Math.random() - 0.5) * 0.006); curve.push(base) }
  curve.push(acct.equity)

  const marginLevelTxt = acct.marginLevel === Infinity ? '—' : fmtNum(acct.marginLevel, 0) + '%'
  const marginWarn = acct.marginLevel !== Infinity && acct.marginLevel < 100

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gridAutoRows: 'min-content' }}>
      <Panel title="Account Summary" sub={`paper · margin 1:${st.leverage}`} style={{ gridColumn: '1 / 3' }}
        right={<button className="btn" onClick={() => { if (confirm('Reset account to defaults?')) st.reset() }}>Reset</button>}>
        <div className="stats" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
          <div className="stat"><div className="k">Balance</div><div className="v">${fmtNum(acct.balance, 0)}</div></div>
          <div className="stat"><div className="k">Equity</div><div className="v">${fmtNum(acct.equity, 0)}</div></div>
          <div className="stat"><div className="k">Floating P&amp;L</div><div className={'v ' + signCls(acct.floating)}>{signStr(acct.floating, 0)}</div></div>
          <div className="stat"><div className="k">Used Margin</div><div className="v">${fmtNum(acct.usedMargin, 0)}</div></div>
          <div className="stat"><div className="k">Free Margin</div><div className="v">${fmtNum(acct.freeMargin, 0)}</div></div>
          <div className="stat"><div className="k">Margin Level</div><div className={'v ' + (marginWarn ? 'down' : '')}>{marginLevelTxt}</div></div>
        </div>
        {marginWarn && <div className="down" style={{ marginTop: 8, fontSize: 11 }}>⚠ Margin level below 100% — a real broker would issue a margin call.</div>}
      </Panel>

      <Panel title="Equity Curve" sub="90 sessions" style={{ gridColumn: '1 / 3' }}>
        <LineChart series={curve} height={170} color="var(--amber)" />
      </Panel>

      <Panel title="Open Positions" flush style={{ gridColumn: '1 / 3' }}
        right={<span className="faint">exposure ${fmtBig(acct.exposure)} · <button className="btn buy" onClick={() => ctx.go('trade')} style={{ marginLeft: 6 }}>New Order ▸</button></span>}>
        {rows.length === 0 ? <div className="empty">No open positions. The AI trader or the Order Ticket will open them.</div> : (
          <table className="tbl">
            <thead><tr><th>Symbol</th><th>Side</th><th>Volume</th><th>Entry</th><th>Now</th><th>Margin</th><th>Notional</th><th>Day P&amp;L</th><th>Floating P&amp;L</th><th>%</th><th></th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.p.symbol} className="clickable">
                  <td className="sym" onClick={() => ctx.selectSymbol(r.p.symbol)}>{r.p.symbol}</td>
                  <td className={r.p.qty > 0 ? 'up' : 'down'}>{r.dir}</td>
                  <td className="muted">{fmtNum(Math.abs(r.p.qty), Math.abs(r.p.qty) % 1 ? 4 : 0)}</td>
                  <td className="faint">{fmtNum(r.p.avg)}</td>
                  <td>{fmtNum(r.q.price)}</td>
                  <td className="faint">${fmtBig(r.margin)}</td>
                  <td className="muted">${fmtBig(r.notional)}</td>
                  <td className={signCls(r.dayPnl)}>{signStr(r.dayPnl)}</td>
                  <td className={signCls(r.floating)}>{signStr(r.floating)}</td>
                  <td className={signCls(r.floating)}>{signStr(r.pnlPct)}%</td>
                  <td><button className="btn" onClick={() => { ctx.selectSymbol(r.p.symbol); ctx.go('trade') }}>Trade</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel title="Recent Fills" flush style={{ gridColumn: '1 / 3' }}>
        {st.trades.length === 0 ? <div className="empty">No trades yet.</div> : (
          <table className="tbl">
            <thead><tr><th style={{ textAlign: 'left' }}>Time</th><th>Symbol</th><th>Side</th><th>Volume</th><th>Price</th><th>Notional</th><th>By</th></tr></thead>
            <tbody>
              {st.trades.map(t => (
                <tr key={t.id}>
                  <td className="faint">{t.time}</td>
                  <td className="sym">{t.symbol}</td>
                  <td className={t.side === 'BUY' ? 'up' : 'down'}>{t.side}</td>
                  <td className="muted">{fmtNum(t.qty, t.qty % 1 === 0 ? 0 : 4)}</td>
                  <td>{fmtNum(t.price)}</td>
                  <td className="muted">${fmtBig(t.qty * t.price)}</td>
                  <td><span className={'tag' + (t.by === 'ai' ? ' g' : '')}>{t.by === 'ai' ? 'AI' : 'YOU'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  )
}
