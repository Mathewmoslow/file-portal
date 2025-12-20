import { useMemo, useState } from 'react'
import spectrumImg from '../../assets/SVG/spectrum.svg'
import dropper from '../../assets/newdropper/SVG/NEWDROPPER.svg'
import './editor.css'

interface ColorPanelProps {
  current: string
  onSelectColor: (color: string) => void
  onSelectTheme?: (theme: any) => void
}

function hexToRgb(hex: string) {
  const raw = hex.replace('#', '')
  if (raw.length !== 6) return { r: 0, g: 0, b: 0 }
  const num = Number.parseInt(raw, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v)))
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`
}

function buildShadesAndTints(hex: string) {
  const { r, g, b } = hexToRgb(hex || '#4aa3ff')
  const shades = Array.from({ length: 4 }).map((_, i) => {
    const f = 1 - (i + 1) * 0.12
    return rgbToHex({ r: r * f, g: g * f, b: b * f })
  })
  const tints = Array.from({ length: 4 }).map((_, i) => {
    const f = (i + 1) * 0.12
    return rgbToHex({ r: r + (255 - r) * f, g: g + (255 - g) * f, b: b + (255 - b) * f })
  })
  return { shades, tints }
}

export function ColorPanel({ current, onSelectColor }: ColorPanelProps) {
  const [recent, setRecent] = useState<string[]>(['#4aa3ff', '#e46b4a', '#70ad47', '#c00000', '#7030a0', '#ffc000'])
  const [pickerPos, setPickerPos] = useState(0.75)

  const apply = (color: string) => {
    onSelectColor(color)
    setRecent((prev) => {
      const next = [color, ...prev.filter((c) => c !== color)]
      return next.slice(0, 8)
    })
  }

  const shadesTints = useMemo(() => buildShadesAndTints(current), [current])

  const handleSpectrumMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.min(rect.width, Math.max(0, e.clientX - rect.left))
    const pos = x / rect.width
    setPickerPos(pos)
    const hue = pos * 360
    const f = (n: number, k = (n + hue / 60) % 6) => 255 * (1 - Math.max(Math.min(k, 4 - k, 1), 0))
    apply(rgbToHex({ r: f(5), g: f(3), b: f(1) }))
  }

  return (
    <div className="color-panel palette-light">
      <div className="palette-row top simple">
        <div className="active-chip shape">
          <div className="active-fill" style={{ background: current }} />
        </div>
        <div className="history-grid simple">
          {recent.map((c, idx) => (
            <button key={idx} className="history-chip shape" onClick={() => apply(c)}>
              <span className="history-fill" style={{ background: c }} />
            </button>
          ))}
        </div>
      </div>

      <div className="metrics-wrap simple">
        <div className="metric-labels">
          <span>Tints</span>
          <span>Shades</span>
        </div>
        <div className="shades-tints horizontal">
          <div className="shade-strip">
            {shadesTints.tints.map((c, i) => (
              <button key={`tint-${i}`} className="history-chip shape" onClick={() => apply(c)}>
                <span className="history-fill" style={{ background: c }} />
              </button>
            ))}
          </div>
          <div className="shade-strip">
            {shadesTints.shades.map((c, i) => (
              <button key={`shade-${i}`} className="history-chip shape" onClick={() => apply(c)}>
                <span className="history-fill" style={{ background: c }} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="simple-picker">
        <input
          type="color"
          value={current}
          onChange={(e) => apply(e.target.value)}
          aria-label="Pick color"
        />
        <input
          className="hex-input"
          value={current}
          onChange={(e) => apply(e.target.value)}
        />
      </div>

      <div className="spectrum-block">
        <div className="spectrum-bar shape" onMouseMove={handleSpectrumMove} onClick={handleSpectrumMove}>
          <img src={spectrumImg} alt="Spectrum" />
          <img className="dropper" src={dropper} alt="Dropper" style={{ left: `${pickerPos * 100}%` }} />
        </div>
      </div>
    </div>
  )
}
