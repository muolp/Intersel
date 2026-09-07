import { useMarket, useLiveStatus } from '../lib/hooks'

export function StatusBar({ view }: { view: string }) {
  const eng = useMarket()
  const st = useLiveStatus()
  const eq = eng.byClass('Equity')
  const adv = eq.filter(q => q.change > 0).length
  const dec = eq.filter(q => q.change < 0).length
  const live = st.mode === 'live'
  const dot = st.connecting ? 'var(--amber)' : live && st.liveCount > 0 ? 'var(--green)' : live ? 'var(--red)' : 'var(--text-faint)'
  const refreshed = st.lastRefresh ? new Date(st.lastRefresh).toLocaleTimeString('en-US', { hour12: false }) : '—'
  return (
    <div className="statusbar">
      <span><span className="dot" style={{ background: dot, boxShadow: `0 0 6px ${dot}` }} />
        {st.connecting ? 'CONNECTING' : live ? `LIVE · YAHOO (${st.liveCount} live / ${st.simCount} sim)` : 'SIMULATED FEED'}
      </span>
      <span className="faint">VIEW: {view.toUpperCase()}</span>
      <span>ADV <span className="up">{adv}</span> / DEC <span className="down">{dec}</span></span>
      {st.error && <span className="down" title={st.error} style={{ maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>⚠ {st.error}</span>}
      <span className="right">
        <span className="faint">{live ? 'REFRESHED ' + refreshed : 'DATA: MOCK ENGINE'}</span>
        <span className="faint">{live ? 'POLL 30s' : 'LATENCY 1.5s'}</span>
        <span>FINCEPT TERMINAL WEB v1.1 · REMAKE</span>
      </span>
    </div>
  )
}
