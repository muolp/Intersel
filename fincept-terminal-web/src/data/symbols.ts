// Static universe of instruments for the mock market engine.
export type AssetClass = 'Equity' | 'Index' | 'Crypto' | 'FX' | 'Commodity' | 'Rate' | 'ETF'

export interface SymbolDef {
  symbol: string
  name: string
  cls: AssetClass
  sector?: string
  base: number      // seed price
  vol: number       // daily volatility (fraction)
  drift: number     // annual drift bias
  currency: string
}

export const SECTORS = [
  'Technology', 'Financials', 'Healthcare', 'Energy', 'Consumer', 'Industrials', 'Communications',
]

export const SYMBOLS: SymbolDef[] = [
  // Indices
  { symbol: 'SPX', name: 'S&P 500 Index', cls: 'Index', base: 5487.03, vol: 0.009, drift: 0.08, currency: 'USD' },
  { symbol: 'NDX', name: 'Nasdaq 100 Index', cls: 'Index', base: 19750.4, vol: 0.012, drift: 0.11, currency: 'USD' },
  { symbol: 'DJI', name: 'Dow Jones Industrial', cls: 'Index', base: 40233.1, vol: 0.008, drift: 0.06, currency: 'USD' },
  { symbol: 'RUT', name: 'Russell 2000 Index', cls: 'Index', base: 2145.6, vol: 0.013, drift: 0.05, currency: 'USD' },
  { symbol: 'VIX', name: 'CBOE Volatility Index', cls: 'Index', base: 14.2, vol: 0.06, drift: -0.02, currency: 'USD' },
  { symbol: 'UKX', name: 'FTSE 100 Index', cls: 'Index', base: 8210.5, vol: 0.008, drift: 0.04, currency: 'GBP' },
  { symbol: 'DAX', name: 'DAX Index', cls: 'Index', base: 18720.2, vol: 0.010, drift: 0.06, currency: 'EUR' },
  { symbol: 'NKY', name: 'Nikkei 225', cls: 'Index', base: 38450.0, vol: 0.012, drift: 0.07, currency: 'JPY' },
  // Equities
  { symbol: 'AAPL', name: 'Apple Inc', cls: 'Equity', sector: 'Technology', base: 224.31, vol: 0.016, drift: 0.14, currency: 'USD' },
  { symbol: 'MSFT', name: 'Microsoft Corp', cls: 'Equity', sector: 'Technology', base: 428.9, vol: 0.015, drift: 0.16, currency: 'USD' },
  { symbol: 'NVDA', name: 'NVIDIA Corp', cls: 'Equity', sector: 'Technology', base: 122.44, vol: 0.032, drift: 0.35, currency: 'USD' },
  { symbol: 'GOOGL', name: 'Alphabet Inc A', cls: 'Equity', sector: 'Communications', base: 178.02, vol: 0.018, drift: 0.12, currency: 'USD' },
  { symbol: 'AMZN', name: 'Amazon.com Inc', cls: 'Equity', sector: 'Consumer', base: 186.2, vol: 0.02, drift: 0.13, currency: 'USD' },
  { symbol: 'META', name: 'Meta Platforms', cls: 'Equity', sector: 'Communications', base: 512.7, vol: 0.024, drift: 0.18, currency: 'USD' },
  { symbol: 'TSLA', name: 'Tesla Inc', cls: 'Equity', sector: 'Consumer', base: 248.5, vol: 0.038, drift: 0.10, currency: 'USD' },
  { symbol: 'JPM', name: 'JPMorgan Chase', cls: 'Equity', sector: 'Financials', base: 205.8, vol: 0.015, drift: 0.09, currency: 'USD' },
  { symbol: 'BAC', name: 'Bank of America', cls: 'Equity', sector: 'Financials', base: 40.1, vol: 0.017, drift: 0.07, currency: 'USD' },
  { symbol: 'GS', name: 'Goldman Sachs', cls: 'Equity', sector: 'Financials', base: 478.3, vol: 0.018, drift: 0.10, currency: 'USD' },
  { symbol: 'XOM', name: 'Exxon Mobil', cls: 'Equity', sector: 'Energy', base: 114.9, vol: 0.017, drift: 0.05, currency: 'USD' },
  { symbol: 'CVX', name: 'Chevron Corp', cls: 'Equity', sector: 'Energy', base: 158.2, vol: 0.016, drift: 0.04, currency: 'USD' },
  { symbol: 'UNH', name: 'UnitedHealth Group', cls: 'Equity', sector: 'Healthcare', base: 585.6, vol: 0.015, drift: 0.08, currency: 'USD' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', cls: 'Equity', sector: 'Healthcare', base: 158.9, vol: 0.011, drift: 0.05, currency: 'USD' },
  { symbol: 'LLY', name: 'Eli Lilly & Co', cls: 'Equity', sector: 'Healthcare', base: 908.4, vol: 0.02, drift: 0.22, currency: 'USD' },
  { symbol: 'WMT', name: 'Walmart Inc', cls: 'Equity', sector: 'Consumer', base: 72.1, vol: 0.012, drift: 0.10, currency: 'USD' },
  { symbol: 'HD', name: 'Home Depot Inc', cls: 'Equity', sector: 'Consumer', base: 362.4, vol: 0.014, drift: 0.07, currency: 'USD' },
  { symbol: 'CAT', name: 'Caterpillar Inc', cls: 'Equity', sector: 'Industrials', base: 338.2, vol: 0.016, drift: 0.08, currency: 'USD' },
  { symbol: 'BA', name: 'Boeing Co', cls: 'Equity', sector: 'Industrials', base: 178.6, vol: 0.026, drift: -0.02, currency: 'USD' },
  { symbol: 'DIS', name: 'Walt Disney Co', cls: 'Equity', sector: 'Communications', base: 91.3, vol: 0.018, drift: 0.04, currency: 'USD' },
  // ETFs
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', cls: 'ETF', base: 548.2, vol: 0.009, drift: 0.08, currency: 'USD' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', cls: 'ETF', base: 480.6, vol: 0.012, drift: 0.11, currency: 'USD' },
  // Crypto
  { symbol: 'BTC', name: 'Bitcoin / USD', cls: 'Crypto', base: 63250.0, vol: 0.03, drift: 0.30, currency: 'USD' },
  { symbol: 'ETH', name: 'Ethereum / USD', cls: 'Crypto', base: 3120.0, vol: 0.036, drift: 0.28, currency: 'USD' },
  { symbol: 'SOL', name: 'Solana / USD', cls: 'Crypto', base: 148.5, vol: 0.05, drift: 0.40, currency: 'USD' },
  // FX
  { symbol: 'EURUSD', name: 'Euro / US Dollar', cls: 'FX', base: 1.0842, vol: 0.005, drift: 0.0, currency: 'USD' },
  { symbol: 'GBPUSD', name: 'Sterling / US Dollar', cls: 'FX', base: 1.2731, vol: 0.006, drift: 0.0, currency: 'USD' },
  { symbol: 'USDJPY', name: 'US Dollar / Yen', cls: 'FX', base: 157.3, vol: 0.006, drift: 0.02, currency: 'JPY' },
  // Commodities
  { symbol: 'XAUUSD', name: 'Gold Spot / USD', cls: 'Commodity', base: 2398.0, vol: 0.011, drift: 0.10, currency: 'USD' },
  { symbol: 'CL', name: 'WTI Crude Oil', cls: 'Commodity', base: 78.4, vol: 0.02, drift: 0.02, currency: 'USD' },
  { symbol: 'GC', name: 'Gold Futures', cls: 'Commodity', base: 2398.0, vol: 0.011, drift: 0.10, currency: 'USD' },
  { symbol: 'SI', name: 'Silver Spot', cls: 'Commodity', base: 29.1, vol: 0.02, drift: 0.09, currency: 'USD' },
  { symbol: 'NG', name: 'Natural Gas', cls: 'Commodity', base: 2.31, vol: 0.035, drift: -0.05, currency: 'USD' },
  // Rates
  { symbol: 'US10Y', name: 'US 10Y Treasury Yield', cls: 'Rate', base: 4.28, vol: 0.015, drift: 0.0, currency: '%' },
  { symbol: 'US02Y', name: 'US 2Y Treasury Yield', cls: 'Rate', base: 4.71, vol: 0.014, drift: 0.0, currency: '%' },
]

export const SYMBOL_MAP: Record<string, SymbolDef> = Object.fromEntries(SYMBOLS.map(s => [s.symbol, s]))
