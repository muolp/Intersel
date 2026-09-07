// Mock newsroom + economic calendar feeds.
export interface NewsItem { id: number; time: string; source: string; headline: string; symbols: string[]; category: string; sentiment: 'pos' | 'neg' | 'neu' }

const SOURCES = ['BLOOMBERG', 'REUTERS', 'FINCEPT WIRE', 'FT', 'WSJ', 'CNBC', 'DOW JONES']
const CATS = ['Markets', 'Earnings', 'Macro', 'Central Banks', 'Commodities', 'Crypto', 'M&A', 'Geopolitics']

const TEMPLATES: { h: string; syms: string[]; cat: string; s: 'pos' | 'neg' | 'neu' }[] = [
  { h: 'NVIDIA extends rally as data-center demand outlook lifts chip sector', syms: ['NVDA', 'AMD'], cat: 'Markets', s: 'pos' },
  { h: 'Fed officials signal patience on rate cuts amid sticky services inflation', syms: ['SPX', 'US10Y'], cat: 'Central Banks', s: 'neu' },
  { h: 'Apple suppliers point to stronger iPhone build orders into Q4', syms: ['AAPL'], cat: 'Earnings', s: 'pos' },
  { h: 'Crude slips as OPEC+ weighs unwinding voluntary output cuts', syms: ['CL', 'XOM', 'CVX'], cat: 'Commodities', s: 'neg' },
  { h: 'Bitcoin reclaims key level as ETF inflows accelerate', syms: ['BTC', 'ETH'], cat: 'Crypto', s: 'pos' },
  { h: 'Microsoft cloud growth beats estimates, AI backlog swells', syms: ['MSFT'], cat: 'Earnings', s: 'pos' },
  { h: 'Treasury yields rise after hotter-than-expected payrolls print', syms: ['US10Y', 'US02Y'], cat: 'Macro', s: 'neu' },
  { h: 'Tesla deliveries miss street view; margins in focus', syms: ['TSLA'], cat: 'Earnings', s: 'neg' },
  { h: 'Gold hits fresh record as haven demand and rate-cut bets build', syms: ['GC'], cat: 'Commodities', s: 'pos' },
  { h: 'JPMorgan lifts net-interest-income guidance for full year', syms: ['JPM', 'BAC'], cat: 'Earnings', s: 'pos' },
  { h: 'Euro steadies versus dollar ahead of ECB policy decision', syms: ['EURUSD'], cat: 'Central Banks', s: 'neu' },
  { h: 'Meta unveils new ad-ranking models, raises capex outlook', syms: ['META'], cat: 'Markets', s: 'pos' },
  { h: 'Boeing faces fresh regulatory scrutiny over production quality', syms: ['BA'], cat: 'Markets', s: 'neg' },
  { h: 'Eli Lilly obesity-drug demand outpaces supply, expands capacity', syms: ['LLY'], cat: 'Earnings', s: 'pos' },
  { h: 'Nikkei closes higher as yen weakness supports exporters', syms: ['NKY', 'USDJPY'], cat: 'Markets', s: 'pos' },
  { h: 'Amazon Web Services signs multi-year AI infrastructure deals', syms: ['AMZN'], cat: 'Markets', s: 'pos' },
  { h: 'Volatility gauge eases as equities grind to new highs', syms: ['VIX', 'SPX'], cat: 'Markets', s: 'neu' },
  { h: 'Chevron completes acquisition, boosts Permian output guidance', syms: ['CVX'], cat: 'M&A', s: 'pos' },
  { h: 'Geopolitical tensions in shipping lanes lift freight and oil risk premia', syms: ['CL', 'NG'], cat: 'Geopolitics', s: 'neg' },
  { h: 'Solana network activity surges on new DeFi launches', syms: ['SOL'], cat: 'Crypto', s: 'pos' },
]

function ago(mins: number): string {
  const d = new Date(Date.now() - mins * 60000)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

let nid = 1
export function generateNews(count = 40): NewsItem[] {
  const out: NewsItem[] = []
  for (let i = 0; i < count; i++) {
    const t = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)]
    out.push({
      id: nid++, time: ago(i * 7 + Math.floor(Math.random() * 6)),
      source: SOURCES[Math.floor(Math.random() * SOURCES.length)],
      headline: t.h, symbols: t.syms, category: t.cat, sentiment: t.s,
    })
  }
  return out
}
export { CATS }

export interface EcoEvent { time: string; country: string; event: string; importance: 1 | 2 | 3; actual: string; forecast: string; prior: string }
export const ECON_CALENDAR: EcoEvent[] = [
  { time: '08:30', country: 'US', event: 'Nonfarm Payrolls', importance: 3, actual: '215K', forecast: '190K', prior: '206K' },
  { time: '08:30', country: 'US', event: 'Unemployment Rate', importance: 3, actual: '4.1%', forecast: '4.1%', prior: '4.0%' },
  { time: '10:00', country: 'US', event: 'ISM Services PMI', importance: 2, actual: '—', forecast: '52.5', prior: '51.4' },
  { time: '09:00', country: 'EU', event: 'ECB Rate Decision', importance: 3, actual: '—', forecast: '3.75%', prior: '4.00%' },
  { time: '02:00', country: 'UK', event: 'GDP m/m', importance: 2, actual: '0.4%', forecast: '0.2%', prior: '0.0%' },
  { time: '19:50', country: 'JP', event: 'Tankan Index', importance: 1, actual: '13', forecast: '11', prior: '11' },
  { time: '14:00', country: 'US', event: 'FOMC Minutes', importance: 3, actual: '—', forecast: '—', prior: '—' },
  { time: '10:30', country: 'US', event: 'EIA Crude Stocks', importance: 1, actual: '—', forecast: '-1.2M', prior: '3.6M' },
]
