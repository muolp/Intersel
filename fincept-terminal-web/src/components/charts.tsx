import { useEffect, useRef } from 'react'
import { Candle } from '../data/market'

const CSS = getComputedStyle(document.documentElement)
function color(name: string, fallback: string) {
  const v = CSS.getPropertyValue(name).trim()
  return v || fallback
}
const C = {
  green: () => color('--green', '#2ecc71'),
  red: () => color('--red', '#ff3b47'),
  amber: () => color('--amber', '#ffa600'),
  cyan: () => color('--cyan', '#21d4d4'),
  grid: () => '#1a212b',
  text: () => color('--text-dim', '#7f8b9a'),
}

function setup(canvas: HTMLCanvasElement, cssW: number, cssH: number) {
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.max(1, Math.floor(cssW * dpr))
  canvas.height = Math.max(1, Math.floor(cssH * dpr))
  canvas.style.height = cssH + 'px'
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cssW, cssH)
  return ctx
}

export function Sparkline({ data, height = 26, positive }: { data: number[]; height?: number; positive?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!; const w = canvas.clientWidth || 80
    const ctx = setup(canvas, w, height)
    if (data.length < 2) return
    const min = Math.min(...data), max = Math.max(...data), range = max - min || 1
    const up = positive ?? data[data.length - 1] >= data[0]
    ctx.beginPath()
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w
      const y = height - 2 - ((v - min) / range) * (height - 4)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.strokeStyle = up ? C.green() : C.red()
    ctx.lineWidth = 1.25
    ctx.stroke()
    ctx.lineTo(w, height); ctx.lineTo(0, height); ctx.closePath()
    ctx.fillStyle = (up ? C.green() : C.red()) + '20'
    ctx.fill()
  })
  return <canvas ref={ref} style={{ width: '100%', height }} />
}

export function CandleChart({ candles, height = 320, showVolume = true }: { candles: Candle[]; height?: number; showVolume?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!; const w = canvas.clientWidth || 600
    const ctx = setup(canvas, w, height)
    if (!candles.length) return
    const padL = 4, padR = 58, padT = 8
    const volH = showVolume ? 46 : 0
    const priceH = height - padT - volH - 18
    const plotW = w - padL - padR
    const hi = Math.max(...candles.map(c => c.h)), lo = Math.min(...candles.map(c => c.l))
    const range = hi - lo || 1
    const yP = (p: number) => padT + priceH - ((p - lo) / range) * priceH
    const n = candles.length
    const cw = plotW / n
    const bw = Math.max(1, Math.min(9, cw * 0.66))

    // grid + price axis
    ctx.strokeStyle = C.grid(); ctx.fillStyle = C.text(); ctx.lineWidth = 1
    ctx.font = '10px ' + color('--mono', 'monospace')
    ctx.textBaseline = 'middle'
    for (let i = 0; i <= 4; i++) {
      const p = lo + (range * i) / 4
      const y = yP(p)
      ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + plotW, y); ctx.stroke(); ctx.globalAlpha = 1
      ctx.fillText(p.toFixed(2), padL + plotW + 5, y)
    }
    // candles
    candles.forEach((c, i) => {
      const x = padL + i * cw + cw / 2
      const up = c.c >= c.o
      ctx.strokeStyle = up ? C.green() : C.red()
      ctx.fillStyle = up ? C.green() : C.red()
      ctx.beginPath(); ctx.moveTo(x, yP(c.h)); ctx.lineTo(x, yP(c.l)); ctx.stroke()
      const y1 = yP(c.o), y2 = yP(c.c)
      const top = Math.min(y1, y2), h = Math.max(1, Math.abs(y2 - y1))
      ctx.fillRect(x - bw / 2, top, bw, h)
    })
    // volume
    if (showVolume && candles.some(c => c.v > 0)) {
      const vmax = Math.max(...candles.map(c => c.v)) || 1
      const vTop = padT + priceH + 12
      candles.forEach((c, i) => {
        const x = padL + i * cw + cw / 2
        const h = (c.v / vmax) * (volH - 4)
        ctx.fillStyle = (c.c >= c.o ? C.green() : C.red()) + '55'
        ctx.fillRect(x - bw / 2, vTop + volH - h, bw, h)
      })
    }
    // last price line
    const last = candles[candles.length - 1].c
    const ly = yP(last)
    ctx.setLineDash([3, 3]); ctx.strokeStyle = C.amber(); ctx.globalAlpha = 0.8
    ctx.beginPath(); ctx.moveTo(padL, ly); ctx.lineTo(padL + plotW, ly); ctx.stroke()
    ctx.setLineDash([]); ctx.globalAlpha = 1
    ctx.fillStyle = C.amber(); ctx.fillRect(padL + plotW, ly - 7, padR, 14)
    ctx.fillStyle = '#000'; ctx.fillText(last.toFixed(2), padL + plotW + 4, ly)
  })
  return <canvas ref={ref} style={{ width: '100%', height }} />
}

export function LineChart({ series, height = 200, color: col, fill = true, labels }:
  { series: number[]; height?: number; color?: string; fill?: boolean; labels?: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!; const w = canvas.clientWidth || 400
    const ctx = setup(canvas, w, height)
    if (series.length < 2) return
    const padL = 4, padR = 46, padT = 8, padB = labels ? 16 : 8
    const plotW = w - padL - padR, plotH = height - padT - padB
    const min = Math.min(...series), max = Math.max(...series), range = max - min || 1
    const line = col || C.cyan()
    const x = (i: number) => padL + (i / (series.length - 1)) * plotW
    const y = (v: number) => padT + plotH - ((v - min) / range) * plotH
    ctx.strokeStyle = C.grid(); ctx.fillStyle = C.text(); ctx.font = '10px ' + color('--mono', 'monospace'); ctx.textBaseline = 'middle'
    for (let i = 0; i <= 3; i++) {
      const v = min + (range * i) / 3, yy = y(v)
      ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(padL + plotW, yy); ctx.stroke(); ctx.globalAlpha = 1
      ctx.fillText(v.toFixed(2), padL + plotW + 4, yy)
    }
    ctx.beginPath()
    series.forEach((v, i) => (i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v))))
    ctx.strokeStyle = line; ctx.lineWidth = 1.5; ctx.stroke()
    if (fill) {
      ctx.lineTo(x(series.length - 1), padT + plotH); ctx.lineTo(x(0), padT + plotH); ctx.closePath()
      ctx.fillStyle = line + '1e'; ctx.fill()
    }
    if (labels) {
      ctx.fillStyle = C.text(); ctx.textAlign = 'center'
      const step = Math.ceil(labels.length / 6)
      labels.forEach((lb, i) => { if (i % step === 0) ctx.fillText(lb, x(i), height - 6) })
      ctx.textAlign = 'left'
    }
  })
  return <canvas ref={ref} style={{ width: '100%', height }} />
}

export function BarChart({ data, height = 200, labels }: { data: number[]; height?: number; labels: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!; const w = canvas.clientWidth || 400
    const ctx = setup(canvas, w, height)
    if (!data.length) return
    const padL = 4, padR = 40, padT = 8, padB = 16
    const plotW = w - padL - padR, plotH = height - padT - padB
    const min = Math.min(0, ...data), max = Math.max(...data), range = max - min || 1
    const cw = plotW / data.length
    const y0 = padT + plotH - ((0 - min) / range) * plotH
    ctx.strokeStyle = C.grid(); ctx.globalAlpha = 0.5
    ctx.beginPath(); ctx.moveTo(padL, y0); ctx.lineTo(padL + plotW, y0); ctx.stroke(); ctx.globalAlpha = 1
    ctx.fillStyle = C.text(); ctx.font = '10px ' + color('--mono', 'monospace'); ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    data.forEach((v, i) => {
      const x = padL + i * cw + cw * 0.15
      const bw = cw * 0.7
      const yv = padT + plotH - ((v - min) / range) * plotH
      ctx.fillStyle = v >= 0 ? C.green() : C.red()
      ctx.fillRect(x, Math.min(yv, y0), bw, Math.abs(yv - y0))
      ctx.fillStyle = C.text()
      if (i % Math.ceil(data.length / 8) === 0) ctx.fillText(labels[i] ?? '', x + bw / 2, height - 14)
    })
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  })
  return <canvas ref={ref} style={{ width: '100%', height }} />
}
