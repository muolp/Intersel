import { useState } from 'react'
import { Ctx } from '../App'
import { Panel } from '../components/Panel'
import { useMarket, useLiveStatus } from '../lib/hooks'
import { engine } from '../data/market'
import { SYMBOL_MAP } from '../data/symbols'
import { fmtPrice, signStr, signCls } from '../data/market'

export function DataFeed({ ctx }: { ctx: Ctx }) {
  const eng = useMarket()
  const st = useLiveStatus()
  const feed = ctx.store.feed
  const [key, setKey] = useState(feed.apiKey)
  const [testing, setTesting] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const provider = feed.provider
  const setProvider = (p: 'yahoo' | 'finnhub') => { ctx.store.setFeed({ provider: p }); engine.configureLive(p, key); setMsg(null) }

  const saveKey = () => { ctx.store.setFeed({ apiKey: key.trim() }); engine.configureLive(provider, key.trim()); setMsg('API key saved.') }

  const test = async () => {
    setTesting(true); setMsg(null)
    engine.configureLive(provider, key.trim())
    await engine.setMode('live')
    const s = engine.status()
    setTesting(false)
    if (s.liveCount > 0) setMsg(`✓ Connected — ${s.liveCount} symbols receiving live ${provider} data.`)
    else setMsg(`✗ No live data received. ${s.error ?? ''} In the sandboxed preview, external requests are blocked; run locally or deploy to your own host.`)
  }

  const rows = eng.all()

  return (
    <div className="grid" style={{ gridTemplateColumns: '380px 1fr', gridAutoRows: 'min-content' }}>
      <Panel title="Data Feed" sub="live source" style={{ gridRow: 'span 2' }}>
        <div className="field mb">
          <label>Provider</label>
          <div className="pill-row">
            <span className={'pill' + (provider === 'yahoo' ? ' active' : '')} onClick={() => setProvider('yahoo')}>Yahoo (no key)</span>
            <span className={'pill' + (provider === 'finnhub' ? ' active' : '')} onClick={() => setProvider('finnhub')}>Finnhub (API key)</span>
          </div>
        </div>

        {provider === 'yahoo' ? (
          <div className="faint" style={{ fontSize: 11, lineHeight: 1.6, marginBottom: 10 }}>
            Free, no key. Covers the whole universe (stocks, indices, crypto, FX, commodities, 10Y).
            Uses the dev-server proxy at <span className="sym">/api/yahoo</span>, so it works under
            <span className="sym"> npm run dev</span> / <span className="sym">preview</span>. Not available in the
            hosted sandbox (external calls blocked).
          </div>
        ) : (
          <>
            <div className="field mb">
              <label>Finnhub API Key</label>
              <input className="inp" value={key} onChange={e => setKey(e.target.value)} placeholder="paste your free finnhub.io token" type="password" />
            </div>
            <div className="row mb" style={{ gap: 6 }}>
              <button className="btn amber" onClick={saveKey}>Save key</button>
              <a className="btn" href="https://finnhub.io/register" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>Get a free key ↗</a>
            </div>
            <div className="faint" style={{ fontSize: 11, lineHeight: 1.6, marginBottom: 10 }}>
              Finnhub's quote API is CORS-enabled, so live prices work directly from the browser on any
              normal deployment (and dev/preview) — no proxy needed. Free tier covers US stocks &amp; ETFs
              (real-time quotes, prices updated on the existing chart). Indices, FX, commodities and crypto
              stay simulated. The key is stored only in your browser (localStorage) and sent only to Finnhub.
            </div>
          </>
        )}

        <button className="btn buy" style={{ width: '100%' }} onClick={test} disabled={testing}>
          {testing ? 'Testing…' : '▸ Connect & test live feed'}
        </button>
        <button className="btn" style={{ width: '100%', marginTop: 6 }} onClick={() => void engine.setMode('sim')}>Switch to simulated</button>
        {msg && <div style={{ marginTop: 10, color: msg.startsWith('✓') ? 'var(--green)' : msg.startsWith('✗') ? 'var(--red)' : 'var(--text)' }}>{msg}</div>}

        <div className="stats" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginTop: 12 }}>
          <div className="stat"><div className="k">Mode</div><div className="v">{st.mode.toUpperCase()}</div></div>
          <div className="stat"><div className="k">Provider</div><div className="v">{st.provider}</div></div>
          <div className="stat"><div className="k">Live symbols</div><div className="v up">{st.liveCount}</div></div>
          <div className="stat"><div className="k">Simulated</div><div className="v">{st.simCount}</div></div>
        </div>
      </Panel>

      <Panel title="Feed Status" sub="per-instrument source" flush>
        <table className="tbl">
          <thead><tr><th>Symbol</th><th style={{ textAlign: 'left' }}>Name</th><th>Class</th><th>Last</th><th>%Chg</th><th>Source</th></tr></thead>
          <tbody>
            {rows.map(q => (
              <tr key={q.symbol} className="clickable" onClick={() => ctx.selectSymbol(q.symbol)}>
                <td className="sym">{q.symbol}</td>
                <td className="muted">{q.name}</td>
                <td className="faint">{SYMBOL_MAP[q.symbol].cls}</td>
                <td>{fmtPrice(q)}</td>
                <td className={signCls(q.change)}>{signStr(q.changePct)}%</td>
                <td><span className={'tag' + (eng.source[q.symbol] === 'live' ? ' g' : '')}>{eng.source[q.symbol] === 'live' ? 'LIVE' : 'SIM'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  )
}
