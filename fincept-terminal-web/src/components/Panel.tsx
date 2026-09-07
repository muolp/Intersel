import { ReactNode } from 'react'

export function Panel(props: {
  title: string
  sub?: string
  right?: ReactNode
  children: ReactNode
  flush?: boolean
  style?: React.CSSProperties
}) {
  return (
    <div className="panel" style={props.style}>
      <div className="panel-head">
        <span className="title">{props.title}</span>
        {props.sub && <span className="sub">{props.sub}</span>}
        {props.right && <span className="right">{props.right}</span>}
      </div>
      <div className={'panel-body' + (props.flush ? ' flush' : '')}>{props.children}</div>
    </div>
  )
}
