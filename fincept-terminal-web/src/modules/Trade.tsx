import { useState } from 'react'
import { Ctx } from '../App'
import { Panel } from '../components/Panel'
import { LineChart } from '../components/charts'
import { useMarket } from '../lib/hooks'
import { fmtNum, signStr, signCls, fmtPrice } from '../data/market'
import { SYMBOL_MAP } from '../data/symbols'
import { computeAccount, requiredMargin, marginForOrder, LEVERAGE_OPTIONS } from '../lib/account'

export function Trade({ ctx }: { ctx: Ctx }) {
  const eng = useMarket()
  const st = ctx.store
  const [sym, setSym] = useState(ctx.symbol)
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [qty, setQty] = useState(10)
  const [type, setType] = useState<'MKT' | 'LMT'>('MKT')
  const [limit, setLimit] = useState(0)
  const [msg, setMsg] = useState<string | null>(null)

  const q = eng.get(sym) ?? eng.get(ctx.symbol)!
  const px = type === 'MKT' ? (side === 'BUY' ? q.ask : q.bid) : (limit || q.price)
  const notional = qty * px
  const pos = st.positions.find(p => p.symbol === q.symbol)
  const acct = computeAccount(st.positions, st.cash, st.leverage, s => eng.get(s)?.price ?? 0)
  const needMargin = marginForOrder(pos?.qty ?? 0, side, qty, px, st.leverage)

  const submit = () => {
    if (qty <= 0) { setMsg('Volume must be positive.'); return }
    if (needMargin > acct.freeMargin + 1e-6) {
      setMsg(`✗ Not enough free margin. Order needs $${fmtNum(needMargin, 0)} margin, free margin is $${fmtNum(acct.freeMargin, 0)}. Raise leverage or reduce size.`)
      return
    }
    st.trade(q.symbol, side, qty, px)
    setMsg(`✓ ${side} ${qty} ${q.symbol} @ ${fmtNum(px)} — notional $${fmtNum(notional, 0)}, margin $${fmtNum(needMargin, 0)} @ 1:${st.leverage}. (paper)`)
  }

  const posDir = pos ? (pos.qty > 0 ? 'LONG' : 'SHORT') : null
  const marginLevelTxt = acct.marginLevel === Infinity ? '—' : fmtNum(acct.marginLevel, 0) + '%'

  return (
    <div className="grid" style={{ gridTemplateColumns: '360px 1fr', gridAutoRows: 'min-content' }}>
      <Panel title="Order Ticket" sub={`margin · 1:${st.leverage}`}>
        <div className="field mb">
          <label>Instrument</label>
          <select className="inp" value={q.symbol} onChange={e => { setSym(e.target.value); setMsg(null) }}>
            {Object.values(SYMBOL_MAP).map(s => <option key={s.symbol} value={s.symbol}>{s.symbol} — {s.name}</option>)}
          </select>
        </div>
        <div className="field mb">
          <label>Leverage</label>
          <div className="pill-row">
            {LEVERAGE_OPTIONS.map(l => <span key={l} className={'pill' + (st.leverage === l ? ' active' : '')} onClick={() => st.setLeverage(l)}>1:{l}</span>)}
          </div>
        </div>
        <div className="row mb" style={{ gap: 6 }}>
          <button className={'btn ' + (side === 'BUY' ? 'buy' : '')} style={{ flex: 1, background: side === 'BUY' ? '#0c1c14' : undefined }} onClick={() => setSide('BUY')}>BUY / LONG</button>
          <button className={'btn ' + (side === 'SELL' ? 'sell' : '')} style={{ flex: 1, background: side === 'SELL' ? '#1c0c10' : undefined }} onClick={() => setSide('SELL')}>SELL / SHORT</button>
        </div>
        <div className="row mb" style={{ gap: 8 }}>
          <div className="field" style={{ flex: 1 }}><label>Volume (units)</label><input className="inp" type="number" value={qty} onChange={e => setQty(+e.target.value)} /></div>
          <div className="field" style={{ flex: 1 }}><label>Order Type</label>
            <div className="pill-row"><span className={'pill' + (type === 'MKT' ? ' active' : '')} onClick={() => setType('MKT')}>MKT</span><span className={'pill' + (type === 'LMT' ? ' active' : '')} onClick={() => setType('LMT')}>LMT</span></div>
          </div>
        </div>
        {type === 'LMT' && <div className="field mb"><label>Limit Price</label><input className="inp" type="number" value={limit || +q.price.toFixed(2)} onChange={e => setLimit(+e.target.value)} /></div>}
        <div className="stats mb" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
          <div className="stat"><div className="k">Est. Price</div><div className="v">{fmtNum(px)}</div></div>
          <div className="stat"><div className="k">Notional</div><div className="v">${fmtNum(notional, 0)}</div></div>
          <div className="stat"><div className="k">Required Margin</div><div className="v">${fmtNum(needMargin, 0)}</div></div>
          <div className="stat"><div className="k">Free Margin</div><div className={'v ' + (needMargin > acct.freeMargin ? 'down' : '')}>${fmtNum(acct.freeMargin, 0)}</div></div>
        </div>
        <button className={'btn ' + (side === 'BUY' ? 'buy' : 'sell')} style={{ width: '100%', padding: '8px' }} onClick={submit}>
          {side} {qty} {q.symbol} {type === 'MKT' ? 'AT MARKET' : 'LIMIT ' + fmtNum(px)}
        </button>
        {msg && <div style={{ marginTop: 10, color: msg.startsWith('✓') ? 'var(--green)' : 'var(--red)' }}>{msg}</div>}
        {posDir && <div className="faint" style={{ marginTop: 8, fontSize: 11 }}>Current position: <span className={pos!.qty > 0 ? 'up' : 'down'}>{posDir} {fmtNum(Math.abs(pos!.qty), Math.abs(pos!.qty) % 1 ? 4 : 0)}</span> @ {fmtNum(pos!.avg)}</div>}
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1fr', gridAutoRows: 'min-content' }}>
        <Panel title="Account" sub={`1:${st.leverage} leverage`}>
          <div className="stats" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            <div className="stat"><div className="k">Balance</div><div className="v">${fmtNum(acct.balance, 0)}</div></div>
            <div className="stat"><div className="k">Equity</div><div className="v">${fmtNum(acct.equity, 0)}</div></div>
            <div className="stat"><div className="k">Floating P&amp;L</div><div className={'v ' + signCls(acct.floating)}>{signStr(acct.floating, 0)}</div></div>
            <div className="stat"><div className="k">Used Margin</div><div className="v">${fmtNum(acct.usedMargin, 0)}</div></div>
            <div className="stat"><div className="k">Free Margin</div><div className="v">${fmtNum(acct.freeMargin, 0)}</div></div>
            <div className="stat"><div className="k">Margin Level</div><div className={'v ' + (acct.marginLevel !== Infinity && acct.marginLevel < 100 ? 'down' : '')}>{marginLevelTxt}</div></div>
          </div>
        </Panel>

        <Panel title={q.symbol} sub={q.name}
          right={<span className={signCls(q.change)}>{fmtPrice(q)} {signStr(q.changePct)}%</span>}>
          <LineChart series={q.intraday} height={230} color="var(--amber)" />
          <div className="stats" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginTop: 8 }}>
            <div className="stat"><div className="k">Bid</div><div className="v up">{fmtNum(q.bid, q.cls === 'FX' ? 4 : 2)}</div></div>
            <div className="stat"><div className="k">Ask</div><div className="v down">{fmtNum(q.ask, q.cls === 'FX' ? 4 : 2)}</div></div>
            <div className="stat"><div className="k">Margin/unit</div><div className="v">${fmtNum(requiredMargin(1, q.price, st.leverage), 2)}</div></div>
            <div className="stat"><div className="k">Day Range</div><div className="v" style={{ fontSize: 11 }}>{fmtNum(q.dayLow)}–{fmtNum(q.dayHigh)}</div></div>
          </div>
        </Panel>
      </div>
    </div>
  )
}
