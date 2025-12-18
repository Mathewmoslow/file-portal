import { useMemo, useState } from 'react'
import activeShape from '../../assets/SVG/activecolor.svg'
import spectrumImg from '../../assets/SVG/spectrum.svg'
import history1 from '../../assets/SVG/history1.svg'
import history2 from '../../assets/SVG/history2.svg'
import history3 from '../../assets/SVG/history3.svg'
import history4 from '../../assets/SVG/history4.svg'
import history5 from '../../assets/SVG/history5.svg'
import history6 from '../../assets/SVG/history6.svg'
import history7 from '../../assets/SVG/history7.svg'
import history8 from '../../assets/SVG/history8.svg'
import shade1 from '../../assets/SVG/shade1.svg'
import shade2 from '../../assets/SVG/shade2.svg'
import shade3 from '../../assets/SVG/shade3.svg'
import shade4 from '../../assets/SVG/shade4.svg'
import tint1 from '../../assets/SVG/tint1.svg'
import tint2 from '../../assets/SVG/tint2.svg'
import tint3 from '../../assets/SVG/tint3.svg'
import tint4 from '../../assets/SVG/tint4.svg'
import dropper from '../../assets/newdropper/SVG/NEWDROPPER.svg'
import './editor.css'

type Cmyk = { c: number; m: number; y: number; k: number }
type Rgb = { r: number; g: number; b: number }

const historyShapes = [history1, history2, history3, history4, history5, history6, history7, history8]
const shadeShapes = [shade1, shade2, shade3, shade4]
const tintShapes = [tint1, tint2, tint3, tint4]
const webColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#000000', '#ffffff']

const themePalettes: { name: string; colors: string[] }[] = [
  { name: 'Office', colors: ['#2f5597', '#ed7d31', '#70ad47', '#ffc000', '#4472c4', '#a5a5a5'] },
  { name: 'Office 2013', colors: ['#5b9bd5', '#ed7d31', '#a5a5a5', '#ffc000', '#4472c4', '#70ad47'] },
  { name: 'Blue Warm', colors: ['#1d3c78', '#2d5ea8', '#4b7cc9', '#6f9ae4', '#8eb3f0', '#c6d8f7'] },
  { name: 'Median', colors: ['#8c735f', '#bfa58a', '#d6c4a0', '#7a8f8c', '#4f6464', '#2c3838'] },
  { name: 'Slipstream', colors: ['#132a3d', '#1e4a66', '#2f6c8f', '#3f8fb6', '#4fb4d9', '#6dcff6'] },
  { name: 'Aspect', colors: ['#4c5b61', '#8eaebd', '#f7c548', '#f19143', '#e2e2e2', '#1e1e1e'] },
]

const clamp = (v: number, min = 0, max = 255) => Math.min(max, Math.max(min, v))

function hexToRgb(hex: string): Rgb {
  const raw = hex.replace('#', '')
  if (raw.length !== 6) return { r: 0, g: 0, b: 0 }
  const num = Number.parseInt(raw, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${[r, g, b].map((v) => clamp(Math.round(v)).toString(16).padStart(2, '0')).join('')}`
}

function hexToCmyk(hex: string): Cmyk {
  const { r, g, b } = hexToRgb(hex)
  const r1 = r / 255
  const g1 = g / 255
  const b1 = b / 255
  const k = 1 - Math.max(r1, g1, b1)
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 }
  const c = ((1 - r1 - k) / (1 - k)) * 100
  const m = ((1 - g1 - k) / (1 - k)) * 100
  const y = ((1 - b1 - k) / (1 - k)) * 100
  return { c: clamp(c, 0, 100), m: clamp(m, 0, 100), y: clamp(y, 0, 100), k: clamp(k * 100, 0, 100) }
}

function buildShadesAndTints(hex: string) {
  const { r, g, b } = hexToRgb(hex || '#6bbf8b')
  const shades = shadeShapes.map((_, i) => {
    const f = 1 - (i + 1) * 0.12
    return rgbToHex({ r: r * f, g: g * f, b: b * f })
  })
  const tints = tintShapes.map((_, i) => {
    const f = (i + 1) * 0.12
    return rgbToHex({ r: r + (255 - r) * f, g: g + (255 - g) * f, b: b + (255 - b) * f })
  })
  return { shades, tints }
}

interface ColorPanelProps {
  current: string
  onSelectColor: (color: string) => void
}

export function ColorPanel({ current, onSelectColor }: ColorPanelProps) {
  const [recent, setRecent] = useState<string[]>(['#4aa3ff', '#e46b4a', '#70ad47', '#c00000', '#7030a0', '#ffc000'])
  const [cmyk, setCmyk] = useState<Cmyk>(() => hexToCmyk(current || '#4aa3ff'))
  const [rgb, setRgb] = useState<Rgb>(() => hexToRgb(current || '#4aa3ff'))
  const [pickerPos, setPickerPos] = useState(0.75) // 0-1 across spectrum

  const apply = (color: string) => {
    onSelectColor(color)
    setRecent((prev) => {
      const next = [color, ...prev.filter((c) => c !== color)]
      return next.slice(0, historyShapes.length)
    })
    setCmyk(hexToCmyk(color))
    setRgb(hexToRgb(color))
  }

  const shadesTints = useMemo(() => buildShadesAndTints(current), [current])

  const handleCmykChange = (key: keyof Cmyk, value: number) => {
    const next = { ...cmyk, [key]: clamp(value, 0, 100) }
    setCmyk(next)
    apply(rgbToHex(hexToCmykToRgb(next)))
  }

  const handleRgbChange = (key: keyof Rgb, value: number) => {
    const next = { ...rgb, [key]: clamp(value, 0, 255) }
    setRgb(next)
    apply(rgbToHex(next))
  }

  const hexToCmykToRgb = (cmykVal: Cmyk) => {
    const c1 = clamp(cmykVal.c, 0, 100) / 100
    const m1 = clamp(cmykVal.m, 0, 100) / 100
    const y1 = clamp(cmykVal.y, 0, 100) / 100
    const k1 = clamp(cmykVal.k, 0, 100) / 100
    const r = 255 * (1 - c1) * (1 - k1)
    const g = 255 * (1 - m1) * (1 - k1)
    const b = 255 * (1 - y1) * (1 - k1)
    return { r, g, b }
  }

  const hueToHex = (h: number) => {
    const f = (n: number, k = (n + h / 60) % 6) => 255 * (1 - Math.max(Math.min(k, 4 - k, 1), 0))
    return rgbToHex({ r: f(5), g: f(3), b: f(1) })
  }

  const handleSpectrumMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = clamp(e.clientX - rect.left, 0, rect.width)
    const pos = x / rect.width
    setPickerPos(pos)
    const hue = pos * 360
    apply(hueToHex(hue))
  }

  return (
    <div className="color-panel palette-light">
      <div className="palette-row top">
        <div className="active-chip shape" style={{ backgroundImage: `url(${activeShape})` }}>
          <div className="active-fill" style={{ background: current }} />
        </div>
        <div className="history-grid">
          {historyShapes.map((shape, idx) => {
            const c = recent[idx] || current
            return (
              <button
                key={`${shape}-${idx}`}
                className="history-chip shape"
                style={{ backgroundImage: `url(${shape})` }}
                onClick={() => apply(c)}
              >
                <span className="history-fill" style={{ background: c }} />
              </button>
            )
          })}
        </div>
        <div className="shades-tints">
          <div className="shade-strip">
            {shadeShapes.map((shape, i) => {
              const c = shadesTints.shades[i]
              return (
                <button
                  key={`shade-${i}`}
                  className="history-chip shape"
                  style={{ backgroundImage: `url(${shape})` }}
                  onClick={() => apply(c)}
                >
                  <span className="history-fill" style={{ background: c }} />
                </button>
              )
            })}
          </div>
          <div className="shade-strip">
            {tintShapes.map((shape, i) => {
              const c = shadesTints.tints[i]
              return (
                <button
                  key={`tint-${i}`}
                  className="history-chip shape"
                  style={{ backgroundImage: `url(${shape})` }}
                  onClick={() => apply(c)}
                >
                  <span className="history-fill" style={{ background: c }} />
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="metrics-wrap">
        <div className="metric-labels">
          <span>CMYK</span>
          <span>RGB</span>
        </div>
        <div className="metric-inputs">
          {(['c', 'm', 'y', 'k'] as const).map((key) => (
            <input
              key={key}
              type="number"
              min={0}
              max={100}
              value={Math.round(cmyk[key])}
              onChange={(e) => handleCmykChange(key, Number.parseInt(e.target.value || '0', 10))}
            />
          ))}
          {(['r', 'g', 'b'] as const).map((key) => (
            <input
              key={key}
              type="number"
              min={0}
              max={255}
              value={Math.round(rgb[key])}
              onChange={(e) => handleRgbChange(key, Number.parseInt(e.target.value || '0', 10))}
            />
          ))}
        </div>
        <div className="hex-row">
          <span className="hex-label">Hex</span>
          <input className="hex-input" value={current} onChange={(e) => apply(e.target.value)} />
          <button className="ghost-button shape" onClick={() => navigator.clipboard?.writeText(current)}>
            Copy
          </button>
        </div>
      </div>

      <div className="web-colors">
        {webColors.map((c) => (
          <button key={c} className="history-chip shape square" onClick={() => apply(c)}>
            <span className="history-fill" style={{ background: c }} />
          </button>
        ))}
      </div>

      <div className="spectrum-block">
        <div className="spectrum-bar shape" onMouseMove={handleSpectrumMove} onClick={handleSpectrumMove}>
          <img src={spectrumImg} alt="Spectrum" />
          <img className="dropper" src={dropper} alt="Dropper" style={{ left: `${pickerPos * 100}%` }} />
        </div>
      </div>

      <div className="theme-block">
        <div className="theme-title">Document Theme</div>
        <div className="theme-list">
          {themePalettes.map((t) => (
            <div key={t.name} className="theme-row">
              <div className="theme-swatches">
                {t.colors.map((c, idx) => (
                  <button key={`${t.name}-${idx}`} className="history-chip shape square" onClick={() => apply(c)}>
                    <span className="history-fill" style={{ background: c }} />
                  </button>
                ))}
              </div>
              <span className="theme-name">{t.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
