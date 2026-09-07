import { useState } from 'react'
import { Ctx } from '../App'
import { Panel } from '../components/Panel'
import { LineChart } from '../components/charts'
import { useMarket } from '../lib/hooks'
import { fmtNum, signStr, signCls, fmtPrice } from '../data/market'
import { SYMBOL_MAP } from '../data/symbols'

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

  const submit = () => {
    if (qty <= 0) { setMsg('Quantity must be positive.'); return }
    if (side === 'BUY' && notional > st.cash) { setMsg('Insufficient cash for this order.'); return }
    if (side === 'SELL' && (!pos || pos.qty < qty)) { setMsg('Not enough shares to sell.'); return }
    st.trade(q.symbol, side, qty, px)
    setMsg(`✓ ${side} ${qty} ${q.symbol} @ ${fmtNum(px)} filled — notional $${fmtNum(notional, 0)}`)
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: '340px 1fr', gridAutoRows: 'min-content' }}>
      <Panel title="Order Ticket" sub="paper">
        <div className="field mb">
          <label>Symbol</label>
          <select className="inp" value={q.symbol} onChange={e => { setSym(e.target.value); setMsg(null) }}>
            {Object.values(SYMBOL_MAP).map(s => <option key={s.symbol} value={s.symbol}>{s.symbol} — {s.name}</option>)}
          </select>
        </div>
        <div className="row mb" style={{ gap: 6 }}>
          <button className={'btn ' + (side === 'BUY' ? 'buy' : '')} style={{ flex: 1, background: side === 'BUY' ? '#0c1c14' : undefined }} onClick={() => setSide('BUY')}>BUY</button>
          <button className={'btn ' + (side === 'SELL' ? 'sell' : '')} style={{ flex: 1, background: side === 'SELL' ? '#1c0c10' : undefined }} onClick={() => setSide('SELL')}>SELL</button>
        </div>
        <div className="row mb" style={{ gap: 8 }}>
          <div className="field" style={{ flex: 1 }}><label>Quantity</label><input className="inp" type="number" value={qty} onChange={e => setQty(+e.target.value)} /></div>
          <div className="field" style={{ flex: 1 }}><label>Order Type</label>
            <div className="pill-row"><span className={'pill' + (type === 'MKT' ? ' active' : '')} onClick={() => setType('MKT')}>MKT</span><span className={'pill' + (type === 'LMT' ? ' active' : '')} onClick={() => setType('LMT')}>LMT</span></div>
          </div>
        </div>
        {type === 'LMT' && <div className="field mb"><label>Limit Price</label><input className="inp" type="number" value={limit || +q.price.toFixed(2)} onChange={e => setLimit(+e.target.value)} /></div>}
        <div className="stats mb" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
          <div className="stat"><div className="k">Est. Price</div><div className="v">{fmtNum(px)}</div></div>
          <div className="stat"><div className="k">Notional</div><div className="v">${fmtNum(notional, 0)}</div></div>
          <div className="stat"><div className="k">Buying Power</div><div className="v">${fmtNum(st.cash, 0)}</div></div>
          <div className="stat"><div className="k">Current Pos</div><div className="v">{pos ? fmtNum(pos.qty, pos.qty % 1 === 0 ? 0 : 4) : '0'}</div></div>
        </div>
        <button className={'btn ' + (side === 'BUY' ? 'buy' : 'sell')} style={{ width: '100%', padding: '8px' }} onClick={submit}>
          {side} {qty} {q.symbol} {type === 'MKT' ? 'AT MARKET' : 'LIMIT ' + fmtNum(px)}
        </button>
        {msg && <div style={{ marginTop: 10, color: msg.startsWith('✓') ? 'var(--green)' : 'var(--red)' }}>{msg}</div>}
      </Panel>

      <Panel title={q.symbol} sub={q.name}
        right={<span className={signCls(q.change)}>{fmtPrice(q)} {signStr(q.changePct)}%</span>}>
        <LineChart series={q.intraday} height={280} color="var(--amber)" />
        <div className="stats" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginTop: 8 }}>
          <div className="stat"><div className="k">Bid</div><div className="v up">{fmtNum(q.bid, q.cls === 'FX' ? 4 : 2)}</div></div>
          <div className="stat"><div className="k">Ask</div><div className="v down">{fmtNum(q.ask, q.cls === 'FX' ? 4 : 2)}</div></div>
          <div className="stat"><div className="k">Day High</div><div className="v">{fmtNum(q.dayHigh)}</div></div>
          <div className="stat"><div className="k">Day Low</div><div className="v">{fmtNum(q.dayLow)}</div></div>
        </div>
      </Panel>
    </div>
  )
}
