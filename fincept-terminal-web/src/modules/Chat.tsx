import { useRef, useState, useEffect } from 'react'
import { Ctx } from '../App'
import { Panel } from '../components/Panel'
import { respond } from '../lib/assistant'

interface Msg { who: 'user' | 'ai'; text: string }
const SUGGESTS = ['Analyze NVDA', 'Compare AAPL and MSFT', 'How is my portfolio doing?', "Today's top movers", 'Explain Sharpe ratio', 'Risk of TSLA']

export function Chat({ ctx }: { ctx: Ctx }) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { who: 'ai', text: 'Fincept Research Assistant online. I reason over the terminal\'s live (simulated) data. Ask me to analyze a security, compare names, review your portfolio, or explain a metric. Type "help" for examples.' },
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
    const answer = respond(q, ctx.store)
    setTimeout(() => { setMsgs(m => [...m, { who: 'ai', text: answer }]); setTyping(false) }, 350 + Math.random() * 400)
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr', gridTemplateRows: 'minmax(0,1fr)', height: '100%' }}>
      <Panel title="AI Research Assistant" sub="offline · rule-based demo" style={{ height: '100%' }}>
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
