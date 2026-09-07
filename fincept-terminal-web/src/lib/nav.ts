export interface NavItem { id: string; label: string; icon: string; group: string; cmd?: string }
export const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Launchpad', icon: '◱', group: 'Home', cmd: 'HOME' },
  { id: 'markets', label: 'Market Monitor', icon: '▤', group: 'Markets', cmd: 'MKT' },
  { id: 'security', label: 'Security', icon: '▦', group: 'Markets', cmd: 'GP' },
  { id: 'watchlist', label: 'Watchlist', icon: '★', group: 'Markets', cmd: 'W' },
  { id: 'screener', label: 'Screener', icon: '⧎', group: 'Markets', cmd: 'SCR' },
  { id: 'news', label: 'News & Wires', icon: '≡', group: 'Research', cmd: 'N' },
  { id: 'economics', label: 'Economics', icon: '∿', group: 'Research', cmd: 'ECO' },
  { id: 'analytics', label: 'Analytics', icon: 'ƒ', group: 'Research', cmd: 'ANLY' },
  { id: 'portfolio', label: 'Portfolio', icon: '▣', group: 'Trading', cmd: 'PORT' },
  { id: 'trade', label: 'Order Ticket', icon: '⇅', group: 'Trading', cmd: 'BUY' },
  { id: 'algo', label: 'AI Auto-Trader', icon: '⚙', group: 'Intelligence', cmd: 'ALGO' },
  { id: 'chat', label: 'AI Research', icon: '✦', group: 'Intelligence', cmd: 'AI' },
]
export const GROUPS = ['Home', 'Markets', 'Research', 'Trading', 'Intelligence']
