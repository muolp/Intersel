// FRED-style macro time series (synthetic).
export interface EcoSeries { id: string; name: string; unit: string; freq: string; values: { t: number; v: number }[]; latest: number; chg: number }

function series(start: number, drift: number, noise: number, n = 60, monthly = true): { t: number; v: number }[] {
  const out: { t: number; v: number }[] = []
  let v = start
  const now = new Date(); now.setDate(1); now.setHours(0, 0, 0, 0)
  for (let i = n; i >= 0; i--) {
    const d = new Date(now)
    if (monthly) d.setMonth(now.getMonth() - i); else d.setFullYear(now.getFullYear() - i)
    v = v + drift + (Math.random() - 0.5) * noise
    out.push({ t: d.getTime(), v: Math.max(0, v) })
  }
  return out
}

function mk(id: string, name: string, unit: string, freq: string, s: { t: number; v: number }[]): EcoSeries {
  const latest = s[s.length - 1].v, prev = s[s.length - 2].v
  return { id, name, unit, freq, values: s, latest, chg: latest - prev }
}

export const ECO_SERIES: EcoSeries[] = [
  mk('CPIAUCSL', 'CPI Inflation (YoY)', '%', 'Monthly', series(3.4, -0.02, 0.18)),
  mk('UNRATE', 'Unemployment Rate', '%', 'Monthly', series(3.8, 0.006, 0.1)),
  mk('FEDFUNDS', 'Fed Funds Rate', '%', 'Monthly', series(5.33, -0.004, 0.02)),
  mk('GDPC1', 'Real GDP Growth (QoQ ann.)', '%', 'Quarterly', series(2.4, 0.01, 0.5)),
  mk('DGS10', '10-Year Treasury', '%', 'Monthly', series(4.1, 0.01, 0.12)),
  mk('PAYEMS', 'Nonfarm Payrolls (chg, K)', 'K', 'Monthly', series(210, -1.2, 60)),
  mk('UMCSENT', 'Consumer Sentiment', 'idx', 'Monthly', series(69, 0.2, 3)),
  mk('HOUST', 'Housing Starts', 'M SAAR', 'Monthly', series(1.35, 0.002, 0.08)),
  mk('INDPRO', 'Industrial Production', 'idx', 'Monthly', series(102.5, 0.08, 0.5)),
  mk('PCE', 'Core PCE (YoY)', '%', 'Monthly', series(2.9, -0.015, 0.1)),
]

export const YIELD_CURVE: { tenor: string; y: number }[] = [
  { tenor: '1M', y: 5.38 }, { tenor: '3M', y: 5.31 }, { tenor: '6M', y: 5.12 },
  { tenor: '1Y', y: 4.86 }, { tenor: '2Y', y: 4.71 }, { tenor: '3Y', y: 4.52 },
  { tenor: '5Y', y: 4.36 }, { tenor: '7Y', y: 4.33 }, { tenor: '10Y', y: 4.28 },
  { tenor: '20Y', y: 4.55 }, { tenor: '30Y', y: 4.43 },
]
