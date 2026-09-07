import { engine, fmtNum, signStr } from '../data/market'
import { annualReturn, annualVol, sharpe, maxDrawdown } from './quant'
import { SYMBOL_MAP, SYMBOLS } from '../data/symbols'
import { Store } from './store'

// A lightweight rule-based "research analyst" that reasons over the live mock data.
export function respond(input: string, store: Store): string {
  const q = input.trim()
  const upper = q.toUpperCase()
  const syms = SYMBOLS.map(s => s.symbol).filter(s => new RegExp(`\\b${s}\\b`).test(upper))

  if (/help|what can you|commands?/i.test(q)) {
    return `I'm the Fincept research assistant (offline demo). Try:
• "Analyze NVDA" — snapshot, risk & signal
• "Compare AAPL and MSFT"
• "How is my portfolio doing?"
• "What are today's top movers?"
• "Risk of TSLA" — vol / Sharpe / drawdown
• "Explain Sharpe ratio / VaR / DCF"`
  }

  if (/portfolio|my (positions|holdings|book)|how am i|p&l|pnl/i.test(q)) {
    const rows = store.positions.map(p => { const qt = engine.get(p.symbol)!; return { p, qt, mkt: qt.price * p.qty, cost: p.avg * p.qty } })
    const equity = rows.reduce((s, r) => s + r.mkt, 0)
    const cost = rows.reduce((s, r) => s + r.cost, 0)
    const pnl = equity - cost
    const day = rows.reduce((s, r) => s + r.qt.change * r.p.qty, 0)
    const best = rows.slice().sort((a, b) => (b.mkt - b.cost) - (a.mkt - a.cost))[0]
    const worst = rows.slice().sort((a, b) => (a.mkt - a.cost) - (b.mkt - b.cost))[0]
    return `Portfolio value $${fmtNum(equity + store.cash, 0)} (equity $${fmtNum(equity, 0)}, cash $${fmtNum(store.cash, 0)}).
Open P&L ${signStr(pnl, 0)} (${signStr((pnl / cost) * 100, 1)}%), day P&L ${signStr(day, 0)}.
Across ${rows.length} positions — best: ${best.p.symbol} (${signStr(best.mkt - best.cost, 0)}), worst: ${worst.p.symbol} (${signStr(worst.mkt - worst.cost, 0)}).
${pnl >= 0 ? 'Book is in the green; consider trimming winners into strength.' : 'Book is under water; review position sizing and stops.'}`
  }

  if (/top (movers|gainers|losers)|biggest (movers|gainers|losers)|what.*moving/i.test(q)) {
    const eq = engine.byClass('Equity')
    const g = eq.slice().sort((a, b) => b.changePct - a.changePct).slice(0, 3)
    const l = eq.slice().sort((a, b) => a.changePct - b.changePct).slice(0, 3)
    return `Today's equity movers:
▲ Gainers: ${g.map(x => `${x.symbol} ${signStr(x.changePct)}%`).join(', ')}
▼ Losers: ${l.map(x => `${x.symbol} ${signStr(x.changePct)}%`).join(', ')}`
  }

  if (/sharpe/i.test(q)) return 'Sharpe ratio = (annualized return − risk-free rate) / annualized volatility. It measures excess return per unit of total risk. >1 is generally good, >2 very strong. It penalizes both up- and down-side volatility equally.'
  if (/\bvar\b|value at risk/i.test(q)) return 'Value at Risk (VaR) estimates the maximum expected loss over a horizon at a confidence level. A 1-day 95% VaR of $10k means: on 95% of days losses should not exceed $10k. This terminal uses historical VaR from the empirical return distribution.'
  if (/\bdcf\b|discounted cash/i.test(q)) return 'DCF (Discounted Cash Flow) values a business as the present value of projected free cash flows plus a terminal value, discounted at the WACC. Fair value per share = (enterprise value − net debt) / shares. Try it in Analytics ▸ DCF.'
  if (/max ?drawdown|drawdown/i.test(q)) return 'Max drawdown is the largest peak-to-trough decline over a period. It captures worst-case pain an investor would have endured holding the asset.'

  if (syms.length >= 2 && /compare|versus|vs\b/i.test(q)) {
    return syms.slice(0, 3).map(s => {
      const x = engine.get(s)!
      return `${s}: ${fmtNum(x.price)} (${signStr(x.changePct)}%) · ann.ret ${(annualReturn(x.history) * 100).toFixed(1)}% · vol ${(annualVol(x.history) * 100).toFixed(1)}% · Sharpe ${sharpe(x.history).toFixed(2)}`
    }).join('\n')
  }

  if (syms.length >= 1) {
    const s = syms[0]; const x = engine.get(s)!; const def = SYMBOL_MAP[s]
    const ar = annualReturn(x.history), av = annualVol(x.history), sh = sharpe(x.history), mdd = maxDrawdown(x.history)
    const signal = sh > 1 && x.changePct > 0 ? 'Constructive — positive momentum with a solid risk-adjusted profile.'
      : sh < 0 ? 'Cautious — negative risk-adjusted return over the trailing window.'
        : 'Neutral — mixed signals; wait for confirmation.'
    return `${s} — ${def.name} (${def.cls})
Last ${fmtNum(x.price)} ${signStr(x.change)} (${signStr(x.changePct)}%). 52-wk ${fmtNum(x.yearLow)}–${fmtNum(x.yearHigh)}.
Trailing: return ${(ar * 100).toFixed(1)}%, vol ${(av * 100).toFixed(1)}%, Sharpe ${sh.toFixed(2)}, max DD ${(mdd * 100).toFixed(1)}%.
${x.pe ? 'P/E ' + fmtNum(x.pe) + '. ' : ''}${x.mktCap ? 'Mkt cap $' + (x.mktCap / 1e9).toFixed(0) + 'B. ' : ''}
Signal: ${signal}
(Demo analysis on simulated data — not investment advice.)`
  }

  return `I couldn't map that to a symbol or metric. Ask me to analyze a ticker (e.g. "analyze AAPL"), compare names, review your portfolio, or explain a concept like Sharpe, VaR, or DCF. Type "help" for examples.`
}
