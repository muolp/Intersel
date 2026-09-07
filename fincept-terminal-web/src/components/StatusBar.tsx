import { useMarket } from '../lib/hooks'

export function StatusBar({ view }: { view: string }) {
  const eng = useMarket()
  const eq = eng.byClass('Equity')
  const adv = eq.filter(q => q.change > 0).length
  const dec = eq.filter(q => q.change < 0).length
  return (
    <div className="statusbar">
      <span><span className="dot" />LIVE · SIMULATED FEED</span>
      <span className="faint">VIEW: {view.toUpperCase()}</span>
      <span>ADV <span className="up">{adv}</span> / DEC <span className="down">{dec}</span></span>
      <span className="right">
        <span className="faint">DATA: MOCK ENGINE</span>
        <span className="faint">LATENCY 1.5s</span>
        <span>FINCEPT TERMINAL WEB v1.0 · REMAKE</span>
      </span>
    </div>
  )
}
