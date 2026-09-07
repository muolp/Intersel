import { NAV, GROUPS } from '../lib/nav'

export function Sidebar({ current, onNav }: { current: string; onNav: (id: string) => void }) {
  return (
    <div className="sidebar">
      {GROUPS.map(g => (
        <div key={g}>
          <div className="side-group">{g}</div>
          {NAV.filter(n => n.group === g).map(n => (
            <div
              key={n.id}
              className={'side-item' + (current === n.id ? ' active' : '')}
              onClick={() => onNav(n.id)}
            >
              <span className="ico">{n.icon}</span>
              <span>{n.label}</span>
              {n.cmd && <span className="kbd">{n.cmd}</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
