import { useMarket } from '../lib/hooks'
import { fmtPrice, signStr, signCls } from '../data/market'

export function Ticker() {
  const eng = useMarket()
  const syms = ['SPX', 'NDX', 'DJI', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL',
    'BTC', 'ETH', 'GC', 'CL', 'EURUSD', 'US10Y', 'VIX', 'JPM']
  const items = syms.map(s => eng.get(s)!).filter(Boolean)
  const row = (key: string) => items.map(q => (
    <span className="tape-item" key={key + q.symbol}>
      <span className="s">{q.symbol}</span>{' '}
      <span className="muted">{fmtPrice(q)}</span>{' '}
      <span className={signCls(q.change)}>{signStr(q.changePct)}%</span>
    </span>
  ))
  return (
    <div className="tape">
      <div className="tape-track">{row('a')}{row('b')}</div>
    </div>
  )
}
