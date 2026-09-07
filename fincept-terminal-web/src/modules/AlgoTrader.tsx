import { useMemo } from 'react'
import { Ctx } from '../App'
import { Panel } from '../components/Panel'
import { useMarket } from '../lib/hooks'
import { fmtNum, signStr, signCls, fmtBig } from '../data/market'
import { computeSignal, universeSymbols, runAlgoCycle, AGGRESSION } from '../lib/trader'
import { engine } from '../data/market'
import { AlgoSettings } from '../lib/store'

function Bar({ score }: { score: number }) {
  const pct = Math.abs(score) * 50
  const up = score >= 0
  return (
    <div style={{ position: 'relative', height: 8, background: '#12171e', borderRadius: 2, width: 90 }}>
      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: '#2a3746' }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, [up ? 'left' : 'right']: '50%', width: pct + '%', background: up ? 'var(--green)' : 'var(--red)', borderRadius: 2 } as any} />
    </div>
  )
}

export function AlgoTrader({ ctx }: { ctx: Ctx }) {
  const eng = useMarket()
  const st = ctx.store
  const a = st.algo

  const signals = useMemo(() => {
    const syms = universeSymbols(a, st)
    return syms.map(s => eng.get(s)).filter(Boolean).map(q => computeSignal(q!)).sort((x, y) => y.score - x.score)
  }, [a.universe, eng, st.positions, st.watchlist])

  const equity = st.positions.reduce((s, p) => s + (eng.get(p.symbol)?.price ?? p.avg) * p.qty, 0)
  const totalVal = equity + st.cash
  const aiTrades = st.trades.filter(t => t.by === 'ai')

  const set = (patch: Partial<AlgoSettings>) => st.setAlgo(patch)
  const thr = AGGRESSION[a.aggression]

  const runOnce = () => { const d = runAlgoCycle(st); st.logAlgo(d) }

  return (
    <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gridAutoRows: 'min-content' }}>
      <Panel title="AI Auto-Trader" sub="paper autopilot"
        right={<span className={a.enabled ? 'up' : 'faint'}>{a.enabled ? '● RUNNING' : '○ IDLE'}</span>}>
        <div className="row spread mb">
          <span className="muted">Autopilot</span>
          <button className={'btn ' + (a.enabled ? 'sell' : 'buy')} onClick={() => set({ enabled: !a.enabled })}>
            {a.enabled ? 'STOP' : 'START'} AI TRADING
          </button>
        </div>
        <div className="field mb">
          <label>Aggression</label>
          <div className="pill-row">
            {(['conservative', 'balanced', 'aggressive'] as const).map(x =>
              <span key={x} className={'pill' + (a.aggression === x ? ' active' : '')} onClick={() => set({ aggression: x })}>{x}</span>)}
          </div>
        </div>
        <div className="field mb">
          <label>Universe</label>
          <div className="pill-row">
            {(['watchlist', 'positions', 'equities'] as const).map(x =>
              <span key={x} className={'pill' + (a.universe === x ? ' active' : '')} onClick={() => set({ universe: x })}>{x}</span>)}
          </div>
        </div>
        <div className="field mb"><label>Risk / trade: {a.riskPerTradePct}% of book</label>
          <input type="range" min={2} max={20} step={1} value={a.riskPerTradePct} onChange={e => set({ riskPerTradePct: +e.target.value })} /></div>
        <div className="field mb"><label>Max position: {a.maxPositionPct}%</label>
          <input type="range" min={5} max={50} step={5} value={a.maxPositionPct} onChange={e => set({ maxPositionPct: +e.target.value })} /></div>
        <div className="field mb"><label>Cash reserve: {a.cashReservePct}%</label>
          <input type="range" min={0} max={50} step={5} value={a.cashReservePct} onChange={e => set({ cashReservePct: +e.target.value })} /></div>
        <div className="row mb" style={{ gap: 8 }}>
          <div className="field" style={{ flex: 1 }}><label>Max trades/cycle</label>
            <input className="inp" type="number" min={1} max={10} value={a.maxTradesPerCycle} onChange={e => set({ maxTradesPerCycle: +e.target.value })} /></div>
          <div className="field" style={{ flex: 1 }}><label>Cycle (sec)</label>
            <input className="inp" type="number" min={5} max={120} value={a.intervalSec} onChange={e => set({ intervalSec: +e.target.value })} /></div>
        </div>
        <button className="btn amber" style={{ width: '100%' }} onClick={runOnce}>▸ Run one cycle now</button>
        <div className="faint" style={{ marginTop: 10, fontSize: 10, lineHeight: 1.5 }}>
          Signals from SMA(20/50) trend, 10-day momentum and RSI(14). Buys when score ≥ {thr.buy.toFixed(2)}, exits when ≤ {thr.sell.toFixed(2)}.
          Paper money only — not investment advice.
        </div>
      </Panel>

      <Panel title="Signals" sub={`${signals.length} instruments · ranked`} flush style={{ maxHeight: 420, overflow: 'auto' }}>
        <table className="tbl">
          <thead><tr><th>Symbol</th><th>Last</th><th>Signal</th><th>Score</th><th>Trend</th><th>Mom</th><th>RSI</th><th style={{ textAlign: 'left' }}>Bias</th></tr></thead>
          <tbody>
            {signals.map(s => {
              const q = eng.get(s.symbol)!
              return (
                <tr key={s.symbol} className="clickable" onClick={() => ctx.selectSymbol(s.symbol)}>
                  <td className="sym">{s.symbol}</td>
                  <td>{fmtNum(q.price)}</td>
                  <td className={s.action === 'BUY' ? 'up' : s.action === 'SELL' ? 'down' : 'flat'}>{s.action}</td>
                  <td className={signCls(s.score)}>{signStr(s.score * 100, 0)}</td>
                  <td className={s.trend === 'up' ? 'up' : s.trend === 'down' ? 'down' : 'flat'}>{s.trend}</td>
                  <td className={signCls(s.mom)}>{signStr(s.mom, 1)}%</td>
                  <td className={s.rsi < 30 ? 'up' : s.rsi > 70 ? 'down' : 'muted'}>{s.rsi.toFixed(0)}</td>
                  <td><Bar score={s.score} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Panel>

      <Panel title="AI Activity" sub={`${aiTrades.length} AI fills · entry vs live price · why`} style={{ gridColumn: '1 / 3' }}
        right={<button className="btn" onClick={() => st.clearAlgoLog()}>Clear log</button>}>
        <div className="stats mb" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <div className="stat"><div className="k">Book Value</div><div className="v">${fmtBig(totalVal)}</div></div>
          <div className="stat"><div className="k">Cash</div><div className="v">${fmtBig(st.cash)}</div></div>
          <div className="stat"><div className="k">Open Positions</div><div className="v">{st.positions.length}</div></div>
          <div className="stat"><div className="k">AI Trades</div><div className="v">{aiTrades.length}</div></div>
        </div>
        {st.algoLog.length === 0
          ? <div className="empty">Warming up — the AI evaluates signals every {a.intervalSec}s and will trade shortly. Or hit “Run one cycle now”.</div>
          : (
            <table className="tbl">
              <thead><tr>
                <th style={{ textAlign: 'left' }}>Time</th><th>Symbol</th><th>Side</th><th>Qty</th>
                <th>Entry</th><th>Now</th><th>Δ Since</th><th>Score</th><th style={{ textAlign: 'left' }}>Why the AI took it</th>
              </tr></thead>
              <tbody>
                {st.algoLog.map(d => {
                  const now = eng.get(d.symbol)?.price ?? d.price
                  const chg = d.price ? (now - d.price) / d.price * 100 : 0
                  const dir = d.side === 'BUY' ? 1 : -1  // favorable move direction
                  return (
                    <tr key={d.id}>
                      <td className="faint">{d.time}</td>
                      <td className="sym clickable" onClick={() => ctx.selectSymbol(d.symbol)}>{d.symbol}</td>
                      <td className={d.side === 'BUY' ? 'up' : 'down'}>{d.side}</td>
                      <td className="muted">{fmtNum(d.qty, d.qty % 1 === 0 ? 0 : 4)}</td>
                      <td>{fmtNum(d.price)}</td>
                      <td>{fmtNum(now)}</td>
                      <td className={signCls(chg * dir)}>{signStr(chg, 2)}%</td>
                      <td className={signCls(d.score)}>{signStr(d.score * 100, 0)}</td>
                      <td className="muted" style={{ whiteSpace: 'normal', fontSize: 11, maxWidth: 460 }}>{d.reason}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
      </Panel>
    </div>
  )
}

export { engine }
