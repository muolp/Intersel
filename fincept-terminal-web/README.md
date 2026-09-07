# FINCEPT TERMINAL — Web

A modern, browser-based **remake** of [FinceptTerminal](https://github.com/Fincept-Corporation/FinceptTerminal)
— a Bloomberg-style financial research & trading terminal.

The upstream project is a native C++20 / Qt6 desktop application. This remake
recreates its identity and core workflows as a single-page web app built with
**React + TypeScript + Vite**, using a self-contained mock market engine so it
runs fully offline with zero API keys.

![terminal](docs/screenshot.png)

## Features

- **Command bar** — Bloomberg-style command line. Type a ticker (`AAPL`) to jump
  to a security, or a function code (`GP`, `MKT`, `N`, `ECO`, `ANLY`, `PORT`,
  `AI`, `HELP`) to switch modules.
- **Launchpad** — global indices, S&P intraday, portfolio snapshot, top movers,
  and a live news rail.
- **Market Monitor** — sortable multi-asset board (equities, indices, crypto, FX,
  commodities, rates) with a sector heat-map, bid/ask, volume and trend sparklines.
- **Security** — candlestick + line charts with a volume subplot, selectable
  ranges (1M–1Y), L1 order book, key statistics and tagged headlines.
- **Watchlist** — persisted (localStorage), add/remove with symbol autocomplete.
- **Screener** — filter the universe by asset class, % change and P/E.
- **News & Wires** — categorized feed with sentiment, plus an economic calendar.
- **Economics** — FRED-style macro series browser and the US Treasury yield curve.
- **Analytics** — portfolio risk (annualized return, volatility, Sharpe, max
  drawdown, historical VaR) and a two-stage DCF valuation calculator.
- **Portfolio + Order Ticket** — paper-trading engine with market/limit orders,
  live P&L, equity curve and fills blotter (persisted).
- **AI Research** — an offline, rule-based analyst that reasons over the terminal's
  live data (analyze/compare tickers, review the book, explain metrics).

Everything is driven by a **deterministic mock market engine** (`src/data/market.ts`)
that generates seeded 1-year OHLC histories and simulates live ticks — so charts,
quotes, risk metrics and the AI answers all stay internally consistent.

## Tech stack

- React 18 + TypeScript, bundled with Vite 5
- Zero UI/runtime dependencies beyond React — charts are hand-drawn on `<canvas>`
- State persisted to `localStorage`

## Getting started

```bash
cd fincept-terminal-web
npm install
npm run dev        # http://localhost:5173
```

Build / preview a production bundle:

```bash
npm run build
npm run preview    # http://localhost:4173
```

## Project structure

```
fincept-terminal-web/
├── index.html
├── src/
│   ├── main.tsx / App.tsx        # entry + shell, command routing
│   ├── styles.css                # terminal theme (amber-on-black)
│   ├── components/               # CommandBar, Sidebar, Ticker, StatusBar,
│   │                             # Panel, canvas charts
│   ├── data/                     # symbols, mock market engine, news, macro
│   ├── lib/                      # hooks, store, quant math, AI assistant, nav
│   └── modules/                  # Dashboard, Markets, Security, Watchlist,
│                                 # Screener, News, Economics, Analytics,
│                                 # Portfolio, Trade, Chat
```

## Disclaimer

All market data is **simulated** for demonstration. Nothing here is investment
advice, and it is not affiliated with Fincept Corporation or Bloomberg L.P.
This is an independent, educational remake inspired by the original project.
