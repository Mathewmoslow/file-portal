import { useMemo, useState } from 'react'
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
  const themePalette = useMemo(
    () => [
      ['#ffffff', '#000000', '#1f365d', '#c55a11', '#2f6a4f', '#2b579a', '#1e7145'],
      ['#f2f2f2', '#7f7f7f', '#2f5597', '#ed7d31', '#70ad47', '#4472c4', '#70ad47'],
      ['#d9d9d9', '#595959', '#376092', '#c55a11', '#4bacc6', '#8064a2', '#9bbb59'],
      ['#bfbfbf', '#3f3f3f', '#254061', '#9c4a0c', '#2f6a4f', '#305496', '#385723'],
      ['#a6a6a6', '#262626', '#1f365d', '#7f3f0c', '#1f4e60', '#203864', '#244f2b'],
    ],
    [],
  )
  const standardColors = ['#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050', '#00b0f0', '#0070c0', '#002060', '#7030a0']

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
        <input type="color" value={current} onChange={(e) => apply(e.target.value)} aria-label="Pick color" />
        <input className="hex-input" value={current} onChange={(e) => apply(e.target.value)} />
      </div>

      <div className="theme-colors">
        <div className="theme-title">Theme Colors</div>
        <div className="theme-grid">
          {themePalette.map((row, rIdx) =>
            row.map((c, idx) => (
              <button key={`${rIdx}-${idx}`} className="history-chip shape" onClick={() => apply(c)}>
                <span className="history-fill" style={{ background: c }} />
              </button>
            )),
          )}
        </div>
        <div className="theme-title">Standard Colors</div>
        <div className="standard-row">
          {standardColors.map((c, idx) => (
            <button key={`std-${idx}`} className="history-chip shape" onClick={() => apply(c)}>
              <span className="history-fill" style={{ background: c }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
