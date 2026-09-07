import { useRef, useState, useEffect } from 'react'
import { Ctx } from '../App'
import { Panel } from '../components/Panel'
import { respond } from '../lib/assistant'
import { parseTradeCommand, runAlgoCycle } from '../lib/trader'
import { engine, fmtNum } from '../data/market'
import { computeAccount, marginForOrder } from '../lib/account'

interface Msg { who: 'user' | 'ai'; text: string }
const SUGGESTS = ['Buy 10 AAPL', 'Short 5 XAUUSD', 'Sell all TSLA', 'Start AI trading', 'Rebalance my book', 'How is my portfolio doing?']

// Execute a natural-language trade against the margin paper account. Returns a reply.
function doTrade(input: string, store: Ctx['store']): string | null {
  const t = parseTradeCommand(input)
  if (!t) return null
  const q = engine.get(t.symbol)
  if (!q) return `I don't have data for ${t.symbol}.`
  const lev = store.leverage
  const acct = computeAccount(store.positions, store.cash, lev, s => engine.get(s)?.price ?? 0)
  const pos = store.positions.find(p => p.symbol === t.symbol)
  const held = pos?.qty ?? 0

  if (t.side === 'SELL') {
    // "sell all" closes a long, or (if flat/short) is treated as a request to specify size
    if (t.qty === 'all') {
      if (held > 0) { store.trade(t.symbol, 'SELL', held, q.bid, 'ai'); return `✓ Closed LONG ${fmtNum(held, held % 1 ? 4 : 0)} ${t.symbol} @ $${fmtNum(q.bid)}. (paper)` }
      return `You have no long ${t.symbol} to close. To open a short, say e.g. "short 10 ${t.symbol}".`
    }
    const qty = t.qty
    const px = q.bid
    const need = marginForOrder(held, 'SELL', qty, px, lev)
    if (need > acct.freeMargin + 1e-6) return `✗ Not enough free margin to short ${qty} ${t.symbol}: needs $${fmtNum(need, 0)}, free $${fmtNum(acct.freeMargin, 0)}. Raise leverage (now 1:${lev}) or reduce size.`
    store.trade(t.symbol, 'SELL', qty, px, 'ai')
    const verb = held > 0 ? 'Reduced/closed long' : 'Opened SHORT'
    return `✓ ${verb} — SELL ${fmtNum(qty, qty % 1 ? 4 : 0)} ${t.symbol} @ $${fmtNum(px)} · margin $${fmtNum(need, 0)} @ 1:${lev}. (paper)`
  }

  // BUY / LONG
  const px = q.ask
  const qty = t.qty === 'all'
    ? ((q.cls === 'Crypto' || q.cls === 'Commodity') ? +((acct.freeMargin * lev * 0.95) / px).toFixed(4) : Math.floor((acct.freeMargin * lev * 0.95) / px))
    : t.qty
  if (qty <= 0) return `Volume must be positive.`
  const need = marginForOrder(held, 'BUY', qty, px, lev)
  if (need > acct.freeMargin + 1e-6) return `✗ Not enough free margin to buy ${qty} ${t.symbol}: needs $${fmtNum(need, 0)}, free $${fmtNum(acct.freeMargin, 0)}. Raise leverage (now 1:${lev}) or reduce size.`
  store.trade(t.symbol, 'BUY', qty, px, 'ai')
  const verb = held < 0 ? 'Reduced/closed short' : 'Opened LONG'
  return `✓ ${verb} — BUY ${fmtNum(qty, qty % 1 ? 4 : 0)} ${t.symbol} @ $${fmtNum(px)} · notional $${fmtNum(qty * px, 0)}, margin $${fmtNum(need, 0)} @ 1:${lev}. (paper)`
}

function doControl(input: string, store: Ctx['store']): string | null {
  const t = input.toLowerCase()
  const wantsStart = /(start|enable|turn on|activate|begin|let).*(ai|auto|algo|bot|trad)/.test(t) || t === 'start ai trading'
  const wantsStop = /(stop|disable|turn off|halt|pause).*(ai|auto|algo|bot|trad)/.test(t)
  if (wantsStop) { store.setAlgo({ enabled: false }); return 'AI auto-trader stopped. It will no longer place trades.' }
  if (wantsStart) {
    store.setAlgo({ enabled: true })
    return `AI auto-trader started (${store.algo.aggression}, universe: ${store.algo.universe}). I'll evaluate signals every ${store.algo.intervalSec}s and trade your paper book within your risk limits. Open the ALGO tab to watch decisions. (paper money only — not investment advice.)`
  }
  if (/rebalance|run (a )?cycle|trade now|scan( the)? market/.test(t)) {
    const d = runAlgoCycle(store); store.logAlgo(d)
    if (!d.length) return 'Ran one cycle — no trades met the thresholds right now. Signals are mixed; I stayed flat.'
    return 'Ran one AI cycle:\n' + d.map(x => `• ${x.side} ${fmtNum(x.qty, x.qty % 1 ? 4 : 0)} ${x.symbol} @ $${fmtNum(x.price)} — ${x.reason}`).join('\n')
  }
  return null
}

export function Chat({ ctx }: { ctx: Ctx }) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { who: 'ai', text: 'Fincept AI online. I reason over the terminal\'s data and can trade your paper account.\nTry: "buy 10 AAPL", "sell all TSLA", "start AI trading", "rebalance my book", or "analyze NVDA". Type "help" for more. (Paper money only — not investment advice.)' },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => { logRef.current?.scrollTo(0, logRef.current.scrollHeight) }, [msgs, typing])

  const send = (text: string) => {
    const q = text.trim(); if (!q) return
    setMsgs(m => [...m, { who: 'user', text: q }])
    setInput('')
    setTyping(true)
    const answer = doTrade(q, ctx.store) ?? doControl(q, ctx.store) ?? respond(q, ctx.store)
    setTimeout(() => { setMsgs(m => [...m, { who: 'ai', text: answer }]); setTyping(false) }, 300 + Math.random() * 350)
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr', gridTemplateRows: 'minmax(0,1fr)', height: '100%' }}>
      <Panel title="AI Research Assistant" sub="reasons over data · trades your paper book" style={{ height: '100%' }}>
        <div className="chat">
          <div className="chat-log" ref={logRef}>
            {msgs.map((m, i) => (
              <div key={i} className={'msg ' + m.who}>
                <div className="who">{m.who === 'ai' ? 'FINCEPT AI' : 'YOU'}</div>
                {m.text}
              </div>
            ))}
            {typing && <div className="msg ai"><div className="who">FINCEPT AI</div><span className="blink">▍ analyzing…</span></div>}
          </div>
          <div className="pill-row" style={{ padding: '6px 2px 0' }}>
            {SUGGESTS.map(s => <span key={s} className="pill" onClick={() => send(s)}>{s}</span>)}
          </div>
          <form className="chat-input" onSubmit={e => { e.preventDefault(); send(input) }}>
            <input className="inp" value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about a security, your portfolio, or a metric…" autoFocus />
            <button className="btn amber" type="submit">Send</button>
          </form>
        </div>
      </Panel>
    </div>
  )
}
