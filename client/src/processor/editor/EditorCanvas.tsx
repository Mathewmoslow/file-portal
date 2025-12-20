import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type React from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Color from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Typography from '@tiptap/extension-typography'
import CharacterCount from '@tiptap/extension-character-count'
import HardBreak from '@tiptap/extension-hard-break'
import { generateHTML } from '@tiptap/html'
import { useCompanionStore } from '../store/companion'
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  HighlightOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  ColumnWidthOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  FieldBinaryOutlined,
  ClearOutlined,
  BgColorsOutlined,
  FontSizeOutlined,
} from '@ant-design/icons'
import { Button, Space, Tooltip, InputNumber, Switch, Select, Popover } from 'antd'
import './editor.css'

type AlignOption = 'left' | 'center' | 'right' | 'justify'

interface EditorCanvasProps {
  isMobile?: boolean
  swatchColor: string
  onSwatchChange?: (color: string) => void
  content?: string
  onContentChange?: (html: string) => void
  zoom?: number
  theme?: { name: string; colors: string[]; fontBody?: string; fontHeading?: string }
}

export interface EditorHandle {
  applyColor: (color: string) => void
  applyText: (text: string) => void
  getDocumentText: () => string
  getDocumentHtml: () => string
}

const RibbonButton = ({
  label,
  icon,
  active,
  onClick,
  size = 'small',
  flat = true,
}: {
  label: string
  icon: React.ReactNode
  active?: boolean
  onClick: () => void
  size?: 'small' | 'middle'
  flat?: boolean
}) => (
  <Tooltip title={label}>
    <Button
      size={size}
      type={flat ? 'text' : active ? 'primary' : 'default'}
      className={`ribbon-btn ${flat ? 'flat' : ''} ${active ? 'active' : ''}`}
      icon={icon}
      onClick={onClick}
      aria-label={label}
    />
  </Tooltip>
)

function useRibbon(editor: Editor | null) {
  const setAlign = (align: AlignOption) => editor?.chain().focus().setTextAlign(align).run()

  return {
    bold: () => editor?.chain().focus().toggleBold().run(),
    italic: () => editor?.chain().focus().toggleItalic().run(),
    underline: () => editor?.chain().focus().toggleUnderline().run(),
    strike: () => editor?.chain().focus().toggleStrike().run(),
    highlight: () => editor?.chain().focus().toggleHighlight({ color: '#ffeb3b66' }).run(),
    alignLeft: () => setAlign('left'),
    alignCenter: () => setAlign('center'),
    alignRight: () => setAlign('right'),
    alignJustify: () => setAlign('justify'),
    bullet: () => editor?.chain().focus().toggleBulletList().run(),
    ordered: () => editor?.chain().focus().toggleOrderedList().run(),
    indent: () => editor?.chain().focus().sinkListItem('listItem').run(),
    outdent: () => editor?.chain().focus().liftListItem('listItem').run(),
    clearFormatting: () => editor?.chain().focus().unsetAllMarks().clearNodes().run(),
  }
}

export const EditorCanvas = forwardRef<EditorHandle, EditorCanvasProps>(
  ({ isMobile, swatchColor, onSwatchChange, content, onContentChange, zoom = 1, theme }, ref) => {
    const btnSize: 'small' | 'middle' = isMobile ? 'small' : 'middle'
    const initialized = useRef(false)
    const [lineHeight, setLineHeight] = useState(1.6)
    const [paraSpacing, setParaSpacing] = useState(14)
    const [paraBefore, setParaBefore] = useState(0)
    const [paraAfter, setParaAfter] = useState(14)
    const [hyphenate, setHyphenate] = useState(true)
    const [fontFamily, setFontFamily] = useState('Inter Tight')
    const [fontSize, setFontSize] = useState(17)
    const [textCase, setTextCase] = useState<'none' | 'uppercase' | 'lowercase' | 'small-caps'>('none')
    const [indentLeft, setIndentLeft] = useState(0)
    const [indentRight, setIndentRight] = useState(0)
    const setSelectionPreview = useCompanionStore((s) => s.setSelectionPreview)
    const editor = useEditor({
      extensions: [
        Color.configure({ types: ['textStyle'] }),
        TextStyle,
        StarterKit.configure({
          heading: { levels: [1, 2, 3, 4] },
          bulletList: { keepMarks: true },
          orderedList: { keepMarks: true },
          hardBreak: false,
          underline: false,
        }),
        HardBreak.configure({
          keepMarks: true,
          HTMLAttributes: { class: 'soft-break' },
        }),
        Underline,
        Placeholder.configure({ placeholder: 'Start writing your piece...' }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Highlight,
        Typography,
        CharacterCount,
      ],
      content:
        content && content.length > 0
          ? content
          : '<h1>Welcome to Atelier Moslow</h1><p>Compose with clarity. The companion and project rails sit to your sides, leaving the page pure.</p>',
      onCreate: () => {
        initialized.current = true
      },
      onUpdate: ({ editor }) => {
        if (!initialized.current) {
          initialized.current = true
          return
        }
        onContentChange?.(editor.getHTML())
      },
    })

    const ribbon = useRibbon(editor)

    useEffect(() => {
      if (!editor) return
      const handleSelection = ({ editor: ed }: { editor: Editor }) => {
        const { from, to } = ed.state.selection
        const text =
          ed.state.doc.textBetween(from, to, ' ') ||
          ed.state.doc.textBetween(0, ed.state.doc.content.size, ' ')
        setSelectionPreview(text.slice(0, 500))
        const attrs = ed.getAttributes('textStyle') || {}
        if (attrs.fontFamily) setFontFamily(attrs.fontFamily)
        if (attrs.fontSize) {
          const num = Number.parseInt(String(attrs.fontSize).replace('px', ''), 10)
          if (!Number.isNaN(num)) setFontSize(num)
        }
        if (attrs.textTransform === 'uppercase') setTextCase('uppercase')
        else if (attrs.textTransform === 'lowercase') setTextCase('lowercase')
        else if (attrs.fontVariant === 'small-caps') setTextCase('small-caps')
        else setTextCase('none')
      }
      editor.on('selectionUpdate', handleSelection)
      return () => {
        editor.off('selectionUpdate', handleSelection)
      }
    }, [editor, setSelectionPreview])

    useEffect(() => {
      if (!editor || content === undefined) return
      const current = editor.getHTML()
      if (content !== current) {
        initialized.current = false
        editor.commands.setContent(content, false)
      }
    }, [content, editor])

  const applyColor = (color: string) => {
    onSwatchChange?.(color)
    editor?.chain().focus().setColor(color).run()
  }

    const applyFontFamily = (family: string) => {
      setFontFamily(family)
      editor?.chain().focus().setMark('textStyle', { fontFamily: family }).run()
    }

  const applyFontSize = (size: number) => {
    setFontSize(size)
    editor?.chain().focus().setMark('textStyle', { fontSize: `${size}px` }).run()
  }

  const applyTextCase = (value: 'none' | 'uppercase' | 'lowercase' | 'small-caps') => {
    setTextCase(value)
    const attrs: Record<string, string> = {}
    if (value === 'uppercase' || value === 'lowercase') {
      attrs.textTransform = value
    } else if (value === 'small-caps') {
      attrs.fontVariant = 'small-caps'
    } else {
      attrs.textTransform = 'none'
      attrs.fontVariant = 'normal'
    }
    editor?.chain().focus().setMark('textStyle', attrs).run()
  }

  const applyIndentLeft = (value: number) => {
    setIndentLeft(value)
    editor?.chain().focus().setNode('paragraph', { style: `margin-left:${value}px;` }).run()
  }

  const applyIndentRight = (value: number) => {
    setIndentRight(value)
    editor?.chain().focus().setNode('paragraph', { style: `margin-right:${value}px;` }).run()
  }

  const applyParagraphSpacing = (before: number, after: number, spacing: number) => {
    setParaBefore(before)
    setParaAfter(after)
    setParaSpacing(spacing)
  }

  useImperativeHandle(
    ref,
    () => ({
      applyColor: (color: string) => applyColor(color),
      applyText: (text: string) => {
        editor?.chain().focus().insertContent(text).run()
      },
      getDocumentText: () => {
        const doc = editor?.state.doc
        if (!doc) return ''
        return doc.textBetween(0, doc.content.size, '\n')
      },
      getDocumentHtml: () => editor?.getHTML() || '',
    }),
    [editor],
  )

    const applyLineHeight = (value: number) => {
      setLineHeight(value)
      editor?.chain().focus().setMark('textStyle', { lineHeight: value }).run()
    }
    const applyParaSpacing = (value: number) => {
      setParaSpacing(value)
      editor?.chain().focus().setNode('paragraph', { style: `margin-bottom:${value}px;` }).run()
    }

    const stats = useMemo(() => {
      if (!editor) return { words: 0, chars: 0 }
      const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, ' ')
      const words = text.trim().length ? text.trim().split(/\s+/).length : 0
      const chars = text.length
      return { words, chars }
    }, [editor, editor?.state?.doc])

    const parseNumber = (value: number | string | null | undefined, fallback: number) => {
      if (typeof value === 'number' && Number.isFinite(value)) return value
      return fallback
    }

    return (
      <div className="editor-shell">
      <div className="toolbar">
          <div className="toolbar-group">
            <span className="toolbar-label">Font</span>
            <Select
              size="small"
              value={fontFamily}
              style={{ width: 210 }}
              popupMatchSelectWidth={240}
              onChange={applyFontFamily}
              options={[
                { value: 'Inter Tight', label: <span style={{ fontFamily: 'Inter Tight' }}>Inter Tight</span> },
                { value: 'IBM Plex Sans Condensed', label: <span style={{ fontFamily: 'IBM Plex Sans Condensed' }}>IBM Plex Sans Condensed</span> },
                { value: 'Georgia', label: <span style={{ fontFamily: 'Georgia' }}>Georgia</span> },
                { value: 'Times New Roman', label: <span style={{ fontFamily: 'Times New Roman' }}>Times New Roman</span> },
                { value: 'Arial', label: <span style={{ fontFamily: 'Arial' }}>Arial</span> },
              ]}
            />
          </div>

          <div className="toolbar-group compact">
            <span className="toolbar-label">Case</span>
            <div className="case-buttons">
              <Button
                size="small"
                type="text"
                className={`case-btn ${textCase === 'none' ? 'active' : ''}`}
                onClick={() => applyTextCase('none')}
                title="Normal case"
              >
                Aa
              </Button>
              <Button
                size="small"
                type="text"
                className={`case-btn ${textCase === 'uppercase' ? 'active' : ''}`}
                onClick={() => applyTextCase('uppercase')}
                title="All caps"
              >
                TT
              </Button>
              <Button
                size="small"
                type="text"
                className={`case-btn ${textCase === 'lowercase' ? 'active' : ''}`}
                onClick={() => applyTextCase('lowercase')}
                title="Lowercase"
              >
                tt
              </Button>
              <Button
                size="small"
                type="text"
                className={`case-btn ${textCase === 'small-caps' ? 'active' : ''}`}
                onClick={() => applyTextCase('small-caps')}
                title="Small caps"
              >
                Sc
              </Button>
            </div>
          </div>

          <div className="toolbar-group compact">
            <span className="toolbar-label">Size</span>
            <InputNumber
              size="small"
              min={8}
              max={96}
              step={1}
              value={fontSize}
              onChange={(v) => applyFontSize(parseNumber(v, fontSize))}
              style={{ width: 70 }}
            />
          </div>

          <div className="toolbar-sep" />

          <Space className="toolbar-buttons" size={4} wrap>
            <RibbonButton label="Bold" icon={<BoldOutlined />} active={editor?.isActive('bold')} onClick={ribbon.bold} size={btnSize} />
            <RibbonButton label="Italic" icon={<ItalicOutlined />} active={editor?.isActive('italic')} onClick={ribbon.italic} size={btnSize} />
            <RibbonButton label="Underline" icon={<UnderlineOutlined />} active={editor?.isActive('underline')} onClick={ribbon.underline} size={btnSize} />
            <RibbonButton label="Strikethrough" icon={<StrikethroughOutlined />} active={editor?.isActive('strike')} onClick={ribbon.strike} size={btnSize} />
            <RibbonButton label="Highlight" icon={<HighlightOutlined />} active={editor?.isActive('highlight')} onClick={ribbon.highlight} size={btnSize} />
            <RibbonButton label="Superscript" icon={<FontSizeOutlined />} active={editor?.getAttributes('textStyle')?.verticalAlign === 'super'} onClick={() => editor?.chain().focus().setMark('textStyle', { verticalAlign: 'super' }).run()} size={btnSize} />
            <RibbonButton label="Subscript" icon={<FontSizeOutlined rotate={180} />} active={editor?.getAttributes('textStyle')?.verticalAlign === 'sub'} onClick={() => editor?.chain().focus().setMark('textStyle', { verticalAlign: 'sub' }).run()} size={btnSize} />
            <RibbonButton label="Text color" icon={<BgColorsOutlined />} onClick={() => applyColor(swatchColor)} size={btnSize} />
          </Space>

          <div className="toolbar-sep" />

          <div className="toolbar-group align-group">
            <Space className="toolbar-buttons" size={4} wrap>
            <RibbonButton label="Align left" icon={<AlignLeftOutlined />} active={editor?.isActive({ textAlign: 'left' })} onClick={ribbon.alignLeft} size={btnSize} />
            <RibbonButton label="Align center" icon={<AlignCenterOutlined />} active={editor?.isActive({ textAlign: 'center' })} onClick={ribbon.alignCenter} size={btnSize} />
            <RibbonButton label="Align right" icon={<AlignRightOutlined />} active={editor?.isActive({ textAlign: 'right' })} onClick={ribbon.alignRight} size={btnSize} />
            <RibbonButton label="Justify" icon={<ColumnWidthOutlined />} active={editor?.isActive({ textAlign: 'justify' })} onClick={ribbon.alignJustify} size={btnSize} />
            <RibbonButton label="Bullets" icon={<UnorderedListOutlined />} active={editor?.isActive('bulletList')} onClick={ribbon.bullet} size={btnSize} />
            <RibbonButton label="Numbered" icon={<OrderedListOutlined />} active={editor?.isActive('orderedList')} onClick={ribbon.ordered} size={btnSize} />
            <RibbonButton label="Indent" icon={<FieldBinaryOutlined />} onClick={ribbon.indent} size={btnSize} />
            <RibbonButton label="Outdent" icon={<FieldBinaryOutlined rotate={180} />} onClick={ribbon.outdent} size={btnSize} />
            <RibbonButton label="Clear" icon={<ClearOutlined />} onClick={ribbon.clearFormatting} size={btnSize} />
            </Space>
          </div>
          <div className="toolbar-group align-group-pop">
            <Popover
              trigger="click"
              placement="bottomLeft"
              content={
                <Space className="toolbar-buttons" size={4} wrap>
                  <RibbonButton label="Align left" icon={<AlignLeftOutlined />} onClick={ribbon.alignLeft} size={btnSize} />
                  <RibbonButton label="Align center" icon={<AlignCenterOutlined />} onClick={ribbon.alignCenter} size={btnSize} />
                  <RibbonButton label="Align right" icon={<AlignRightOutlined />} onClick={ribbon.alignRight} size={btnSize} />
                  <RibbonButton label="Justify" icon={<ColumnWidthOutlined />} onClick={ribbon.alignJustify} size={btnSize} />
                  <RibbonButton label="Bullets" icon={<UnorderedListOutlined />} onClick={ribbon.bullet} size={btnSize} />
                  <RibbonButton label="Numbered" icon={<OrderedListOutlined />} onClick={ribbon.ordered} size={btnSize} />
                  <RibbonButton label="Indent" icon={<FieldBinaryOutlined />} onClick={ribbon.indent} size={btnSize} />
                  <RibbonButton label="Outdent" icon={<FieldBinaryOutlined rotate={180} />} onClick={ribbon.outdent} size={btnSize} />
                  <RibbonButton label="Clear" icon={<ClearOutlined />} onClick={ribbon.clearFormatting} size={btnSize} />
                </Space>
              }
            >
              <Button size="small">More</Button>
            </Popover>
          </div>

          <div className="toolbar-sep" />

          <Popover
            placement="bottomLeft"
            trigger="click"
            content={
              <Space direction="vertical" size={8}>
                <label className="metric-field">
                  <span>Line</span>
                  <InputNumber size="small" min={1} max={3} step={0.1} value={lineHeight} onChange={(v) => applyLineHeight(parseNumber(v, lineHeight))} />
                </label>
                <label className="metric-field">
                  <span>Before</span>
                  <InputNumber size="small" min={0} max={48} step={2} value={paraBefore} onChange={(v) => setParaBefore(parseNumber(v, paraBefore))} />
                </label>
                <label className="metric-field">
                  <span>After</span>
                  <InputNumber size="small" min={0} max={48} step={2} value={paraAfter} onChange={(v) => setParaAfter(parseNumber(v, paraAfter))} />
                </label>
                <label className="metric-field">
                  <span>Spacing</span>
                  <InputNumber size="small" min={0} max={48} step={2} value={paraSpacing} onChange={(v) => applyParaSpacing(parseNumber(v, paraSpacing))} />
                </label>
                <label className="metric-field">
                  <span>Indent L</span>
                  <InputNumber size="small" min={0} max={60} step={1} value={indentLeft} onChange={(v) => applyIndentLeft(parseNumber(v, indentLeft))} />
                </label>
                <label className="metric-field">
                  <span>Indent R</span>
                  <InputNumber size="small" min={0} max={60} step={1} value={indentRight} onChange={(v) => applyIndentRight(parseNumber(v, indentRight))} />
                </label>
                <label className="metric-field switch">
                  <span>Hyphen</span>
                  <Switch size="small" checked={hyphenate} onChange={setHyphenate} />
                </label>
              </Space>
            }
          >
            <Button size="small">Spacing & Indent</Button>
          </Popover>
        </div>

        <div className="ruler-bar">
          <div className="ruler-track">
            {Array.from({ length: 13 }).map((_, i) => (
              <span key={i} className="tick" style={{ left: `${i * 8}%` }}>
                <span className="label">{i * 10}</span>
              </span>
            ))}
            <span className="indent-marker left" style={{ left: `${indentLeft / 2 + 8}px` }} title={`Indent L: ${indentLeft}px`} />
            <span className="indent-marker right" style={{ right: `${indentRight / 2 + 8}px` }} title={`Indent R: ${indentRight}px`} />
          </div>
        </div>

        <div className="page-wrap">
          <div
            className="page"
            style={
              {
                '--line-height': lineHeight,
                '--para-spacing': `${paraSpacing}px`,
                '--para-before': `${paraBefore}px`,
                '--para-after': `${paraAfter}px`,
                '--indent-left': `${indentLeft}px`,
                '--indent-right': `${indentRight}px`,
                '--hyphenate': hyphenate ? 'auto' : 'manual',
                '--zoom': zoom,
                '--theme-accent1': theme?.colors?.[0] || '#2f5597',
                '--theme-accent2': theme?.colors?.[1] || '#ed7d31',
                '--theme-accent3': theme?.colors?.[2] || '#70ad47',
                '--theme-accent4': theme?.colors?.[3] || '#ffc000',
                '--theme-accent5': theme?.colors?.[4] || '#4472c4',
                '--theme-accent6': theme?.colors?.[5] || '#a5a5a5',
                '--theme-font-body': theme?.fontBody || 'Inter Tight',
                '--theme-font-heading': theme?.fontHeading || 'Inter Tight',
              } as React.CSSProperties
            }
          >
            <EditorContent editor={editor} />
          </div>
        </div>

        <div className="statusbar">
          <span>Words: {stats.words}</span>
          <span>Characters: {stats.chars}</span>
          <span>Typing saved locally</span>
        </div>
      </div>
    )
  },
)
