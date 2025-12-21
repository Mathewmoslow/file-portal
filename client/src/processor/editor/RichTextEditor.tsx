import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import './editor.css'
import {
  Box,
  Paper,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Select,
  MenuItem,
  FormControl,
  Divider,
  Tooltip,
  Popover,
  Button,
  Menu,
  MenuItem as MuiMenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Chip,
  CircularProgress,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActionArea,
  Alert,
  InputAdornment,
  useMediaQuery,
  useTheme,
  Tabs,
  Tab,
  Collapse,
} from '@mui/material'
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatStrikethrough,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatAlignJustify,
  FormatListBulleted,
  FormatListNumbered,
  FormatIndentDecrease,
  FormatIndentIncrease,
  FormatQuote,
  Code,
  Link as LinkIcon,
  Image,
  TableChart,
  Undo,
  Redo,
  Save,
  Print,
  FormatColorText,
  FormatColorFill,
  Superscript,
  Subscript,
  ClearAll,
  Functions,
  Rectangle,
  Circle,
  ArrowRightAlt,
  Timeline,
  CheckBox,
  RadioButtonUnchecked,
  Star,
  FavoriteBorder,
  LocalHospital,
  Science,
  Warning,
  Info,
  School,
  Assignment,
  Biotech,
  Psychology,
  Visibility,
  Share,
  FileDownload,
  PictureAsPdf,
  ZoomIn,
  Search,
  TextFormat,
  Add,
  ViewModule,
  MoreHoriz,
  Close,
  KeyboardArrowUp,
  KeyboardArrowDown,
} from '@mui/icons-material'

export interface RichTextHandle {
  getHtml: () => string
  getText: () => string
  getDocumentText: () => string // alias for getText, for CompanionPanel compatibility
  getSelectedText: () => string
  getContainingParagraph: () => string
  applyHtml: (html: string) => void
  applyText: (text: string) => void
  replaceSelectedText: (newText: string) => void
  saveUndoSnapshot: () => void
}

interface RichTextEditorProps {
  initialContent: string
  onSave: (content: string) => void
  onPrint?: () => void
  onChange?: (content: string) => void
  // New props for consolidated toolbar
  fileName?: string
  isUnsaved?: boolean
  onPreview?: () => void
  onShare?: (expiresIn: string) => void
  onExportDocx?: () => void
  onExportPdf?: () => void
  zoom?: number
  onZoomChange?: (zoom: number) => void
  onRename?: (newName: string) => void
  onSelectionChange?: (selectedText: string) => void
}

const fontFamilies = ['Arial', 'Times New Roman', 'Georgia', 'Verdana', 'Helvetica', 'Courier New', 'Comic Sans MS', 'Impact', 'Lucida Console', 'Tahoma', 'Trebuchet MS', 'Palatino']

const fontSizes = ['8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px', '72px']

const colors = [
  '#000000', '#434343', '#666666', '#999999', '#cccccc', '#e0e0e0', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff',
  '#9900ff', '#ff00ff', '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3',
  '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc', '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599',
  '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd', '#cc4125', '#e06666',
  '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
]

const RichTextEditor = forwardRef<RichTextHandle, RichTextEditorProps>(function RichTextEditor(
  { initialContent, onSave, onPrint, onChange, fileName, isUnsaved, onPreview, onShare, onExportDocx, onExportPdf, zoom = 1, onZoomChange, onRename, onSelectionChange },
  ref,
) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [fontFamily, setFontFamily] = useState('Arial')
  const [fontSize, setFontSize] = useState('14px')
  const [textColor, setTextColor] = useState('#000000')
  const [bgColor, setBgColor] = useState('transparent')
  const [colorAnchorEl, setColorAnchorEl] = useState<HTMLButtonElement | null>(null)
  const [bgColorAnchorEl, setBgColorAnchorEl] = useState<HTMLButtonElement | null>(null)
  const [shapeAnchorEl, setShapeAnchorEl] = useState<HTMLButtonElement | null>(null)
  const [selectedFormats, setSelectedFormats] = useState<string[]>([])
  const [alignment, setAlignment] = useState<string>('left')
  const [undoStack, setUndoStack] = useState<string[]>([])
  const [redoStack, setRedoStack] = useState<string[]>([])
  const [medicalMenuAnchor, setMedicalMenuAnchor] = useState<HTMLButtonElement | null>(null)
  const [imageSearchOpen, setImageSearchOpen] = useState(false)
  const [shareMenuAnchor, setShareMenuAnchor] = useState<HTMLButtonElement | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [imageSearchQuery, setImageSearchQuery] = useState('')
  const [imageSearchResults, setImageSearchResults] = useState<any[]>([])
  const [imageSearchLoading, setImageSearchLoading] = useState(false)
  const [imageSearchError, setImageSearchError] = useState<string | null>(null)
  const [mobileToolbarTab, setMobileToolbarTab] = useState<number | null>(null) // null = collapsed
  const lastHtmlRef = useRef<string>('') // prevent update loops
  const onChangeRef = useRef(onChange) // stable ref for onChange callback
  const initializedRef = useRef(false) // track if editor has been initialized
  const savedSelectionRef = useRef<Range | null>(null) // save selection for image insertion

  // Mobile detection
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  // Keep onChange ref current without triggering re-renders
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (editorRef.current) {
      const incoming = initialContent || ''
      // Only update if content actually changed and not just a re-render
      if (editorRef.current.innerHTML !== incoming && lastHtmlRef.current !== incoming) {
        editorRef.current.innerHTML = incoming
        lastHtmlRef.current = incoming
        // Only emit change after initial load, not during first render
        if (initializedRef.current) {
          saveToUndoStack(false)
        } else {
          initializedRef.current = true
        }
      }
    }
  }, [initialContent]) // Remove onChange from deps - use ref instead

  // Handle selection changes to sync with companion
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection()
      if (selection && editorRef.current?.contains(selection.anchorNode)) {
        const selectedText = selection.toString().trim()
        if (selectedText && onSelectionChange) {
          onSelectionChange(selectedText)
        }
      }
    }
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [onSelectionChange])

  // Rename handlers - preserve file extension
  const getFileExtension = (name: string) => {
    const match = name.match(/(\.[^.]+)$/)
    return match ? match[1] : ''
  }

  const getNameWithoutExtension = (name: string) => {
    return name.replace(/\.[^.]+$/, '')
  }

  const handleStartRename = () => {
    if (fileName) {
      const baseName = fileName.split('/').pop() || ''
      // Only edit the name part, not the extension
      setEditedName(getNameWithoutExtension(baseName))
      setIsEditingName(true)
    }
  }

  const handleFinishRename = () => {
    if (editedName.trim() && onRename && fileName) {
      const baseName = fileName.split('/').pop() || ''
      const extension = getFileExtension(baseName)
      // Always preserve the original extension
      const newName = editedName.trim() + extension
      onRename(newName)
    }
    setIsEditingName(false)
  }

  // Image search handler
  const handleImageSearch = async (query: string) => {
    if (!query.trim()) return
    setImageSearchLoading(true)
    setImageSearchError(null)
    setImageSearchResults([])

    try {
      const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
      const res = await fetch(`${apiBase}/images/search?q=${encodeURIComponent(query)}&per_page=20`)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Search failed (${res.status})`)
      }
      const data = await res.json()
      setImageSearchResults(data.results || [])
    } catch (err: any) {
      console.error('Image search error:', err)
      setImageSearchError(err?.message || 'Search failed')
    } finally {
      setImageSearchLoading(false)
    }
  }

  // Save selection when opening image search
  const openImageSearch = () => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange()
    }
    setImageSearchOpen(true)
  }

  // Restore selection and insert image
  const insertSearchImage = (img: { url: string; alt: string; credit: string; creditUrl: string }) => {
    // Restore saved selection
    if (savedSelectionRef.current && editorRef.current) {
      editorRef.current.focus()
      const selection = window.getSelection()
      if (selection) {
        selection.removeAllRanges()
        selection.addRange(savedSelectionRef.current)
      }
    } else if (editorRef.current) {
      // If no saved selection, put cursor at end
      editorRef.current.focus()
      const selection = window.getSelection()
      if (selection) {
        const range = document.createRange()
        range.selectNodeContents(editorRef.current)
        range.collapse(false) // collapse to end
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }

    const imgHTML = `
      <figure style="margin: 15px 0; text-align: center;">
        <img src="${img.url}" alt="${img.alt}" style="max-width: 100%; height: auto; border-radius: 4px;">
        <figcaption style="font-size: 12px; color: #666; margin-top: 8px;">
          Photo by <a href="${img.creditUrl}" target="_blank" rel="noopener noreferrer">${img.credit}</a> on Unsplash
        </figcaption>
      </figure>
    `
    execCommand('insertHTML', imgHTML)
    setImageSearchOpen(false)
    setImageSearchQuery('')
    setImageSearchResults([])
    savedSelectionRef.current = null
  }

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    saveToUndoStack(true)
  }

  const saveToUndoStack = (emit = true) => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML
      if (html === lastHtmlRef.current) return
      lastHtmlRef.current = html
      setUndoStack((prev) => [...prev.slice(-49), html])
      setRedoStack([])
      if (emit) onChangeRef.current?.(html)
    }
  }

  const handleUndo = () => {
    if (undoStack.length > 0 && editorRef.current) {
      const lastState = undoStack[undoStack.length - 1]
      setRedoStack((prev) => [...prev, editorRef.current!.innerHTML])
      setUndoStack((prev) => prev.slice(0, -1))
      editorRef.current.innerHTML = lastState
    }
  }

  const handleRedo = () => {
    if (redoStack.length > 0 && editorRef.current) {
      const nextState = redoStack[redoStack.length - 1]
      setUndoStack((prev) => [...prev, editorRef.current!.innerHTML])
      setRedoStack((prev) => prev.slice(0, -1))
      editorRef.current.innerHTML = nextState
    }
  }

  const handleFormat = (_event: React.MouseEvent<HTMLElement>, newFormats: string[]) => {
    setSelectedFormats(newFormats)
    newFormats.forEach((format) => {
      switch (format) {
        case 'bold':
          execCommand('bold')
          break
        case 'italic':
          execCommand('italic')
          break
        case 'underline':
          execCommand('underline')
          break
        case 'strikethrough':
          execCommand('strikeThrough')
          break
        case 'superscript':
          execCommand('superscript')
          break
        case 'subscript':
          execCommand('subscript')
          break
      }
    })
  }

  const handleAlignment = (_event: React.MouseEvent<HTMLElement>, newAlignment: string) => {
    if (newAlignment !== null) {
      setAlignment(newAlignment)
      switch (newAlignment) {
        case 'left':
          execCommand('justifyLeft')
          break
        case 'center':
          execCommand('justifyCenter')
          break
        case 'right':
          execCommand('justifyRight')
          break
        case 'justify':
          execCommand('justifyFull')
          break
      }
    }
  }

  const handleFontFamily = (value: string) => {
    setFontFamily(value)
    execCommand('fontName', value)
  }

  const handleFontSize = (value: string) => {
    setFontSize(value)
    const sizeMap: Record<string, string> = {
      '8px': '1',
      '9px': '1',
      '10px': '1',
      '11px': '2',
      '12px': '2',
      '14px': '3',
      '16px': '4',
      '18px': '5',
      '20px': '5',
      '24px': '6',
      '28px': '6',
      '32px': '7',
      '36px': '7',
      '48px': '7',
      '72px': '7',
    }
    execCommand('fontSize', sizeMap[value] || '3')
  }

  const handleSave = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML
      lastHtmlRef.current = html
      onSave(html)
    }
  }

  const handlePrint = () => {
    if (onPrint) onPrint()
    else window.print()
  }

  const insertTable = () => {
    const rows = prompt('Number of rows:', '3')
    const cols = prompt('Number of columns:', '3')
    if (rows && cols) {
      let table = '<table border="1" style="border-collapse: collapse; width: 100%;">'
      for (let i = 0; i < parseInt(rows); i++) {
        table += '<tr>'
        for (let j = 0; j < parseInt(cols); j++) {
          table += '<td style="padding: 8px; border: 1px solid #ddd;">&nbsp;</td>'
        }
        table += '</tr>'
      }
      table += '</table><br>'
      execCommand('insertHTML', table)
    }
  }

  const insertLink = () => {
    const url = prompt('Enter URL:')
    if (url) execCommand('createLink', url)
  }

  const insertImage = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const img = `<img src="${event.target?.result}" alt="Inserted image" style="max-width: 100%; height: auto;">`
          execCommand('insertHTML', img)
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  const insertShape = (shapeType: string) => {
    let shapeHTML = ''
    const color = textColor
    switch (shapeType) {
      case 'rectangle':
        shapeHTML = `<div style="display: inline-block; width: 100px; height: 60px; background-color: ${color}; margin: 5px;">&nbsp;</div>`
        break
      case 'circle':
        shapeHTML = `<div style="display: inline-block; width: 60px; height: 60px; background-color: ${color}; border-radius: 50%; margin: 5px;">&nbsp;</div>`
        break
      case 'arrow':
        shapeHTML = `<span style="font-size: 24px; color: ${color};">→</span>`
        break
      case 'line':
        shapeHTML = `<hr style="border-color: ${color}; margin: 10px 0;">`
        break
      case 'star':
        shapeHTML = `<span style="font-size: 24px; color: ${color};">★</span>`
        break
      case 'heart':
        shapeHTML = `<span style="font-size: 24px; color: ${color};">♥</span>`
        break
      case 'checkbox':
        shapeHTML = `<input type="checkbox" style="margin: 0 5px;">`
        break
      case 'radio':
        shapeHTML = `<input type="radio" style="margin: 0 5px;">`
        break
    }
    if (shapeHTML) execCommand('insertHTML', shapeHTML)
    setShapeAnchorEl(null)
  }

  const insertMedicalBox = (type: string) => {
    let boxHTML = ''
    switch (type) {
      case 'clinical':
        boxHTML = `<div style="background-color: #ffe6e6; border: 2px solid #ff9999; border-radius: 5px; padding: 10px; margin: 10px 0;"><h4 style="color: #e74c3c; margin-top: 0;">Clinical Box</h4><p>Enter your clinical content here...</p></div><br>`
        break
      case 'nursing':
        boxHTML = `<div style="background-color: #e6f3ff; border: 2px solid #99ccff; border-radius: 5px; padding: 10px; margin: 10px 0;"><h4 style="color: #2980b9; margin-top: 0;">Nursing Box</h4><p>Enter your nursing content here...</p></div><br>`
        break
      case 'education':
        boxHTML = `<div style="background-color: #fff9e6; border: 2px solid #ffcc66; border-radius: 5px; padding: 10px; margin: 10px 0;"><h4 style="color: #f39c12; margin-top: 0;">Patient Education</h4><p>Enter your education content here...</p></div><br>`
        break
      case 'critical':
        boxHTML = `<div style="background-color: #ffe6e6; border-left: 5px solid #ff0000; padding: 10px; margin: 15px 0; font-weight: bold;"><h4 style="color: #c0392b; margin-top: 0;">⚠️ Critical Point</h4><p>Enter critical information here...</p></div><br>`
        break
      case 'key-point':
        boxHTML = `<div style="background-color: #ffffcc; padding: 5px; border-left: 3px solid #ffcc00; margin: 10px 0;"><h4 style="color: #f1c40f; margin-top: 0;">💡 Key Point</h4><p>Enter key information here...</p></div><br>`
        break
      case 'medication':
        boxHTML = `<div style="background-color: #f0f8ff; border: 1px solid #4682b4; border-radius: 5px; padding: 8px; margin: 10px 0;"><h4 style="color: #3498db; margin-top: 0;">💊 Medication Note</h4><p>Enter medication information here...</p></div><br>`
        break
      default:
        return
    }
    execCommand('insertHTML', boxHTML)
    setMedicalMenuAnchor(null)
  }

  const insertMedicalHeading = (type: string) => {
    let headingHTML = ''
    switch (type) {
      case 'main-title':
        headingHTML = `<h1 style="color: #2c3e50; border-bottom: 4px solid #3498db; padding-bottom: 10px; margin-bottom: 30px; font-size: 2.5em; font-weight: 600;">Your Main Title Here</h1><br>`
        break
      case 'module-header':
        headingHTML = `<h2 style="color: #2980b9; background: linear-gradient(to right, #ecf0f1, #fff); padding: 10px; border-left: 5px solid #3498db; margin-top: 30px; font-size: 1.8em;">Module Header</h2><br>`
        break
      case 'section-header':
        headingHTML = `<h3 style="color: #27ae60; margin-top: 20px; padding: 5px; background-color: #e8f8f5; border-left: 3px solid #27ae60; font-size: 1.4em;">Section Header</h3><br>`
        break
      case 'subsection':
        headingHTML = `<h4 style="color: #e74c3c; margin-top: 15px; font-style: italic; font-size: 1.2em;">Subsection</h4><br>`
        break
      default:
        return
    }
    execCommand('insertHTML', headingHTML)
    setMedicalMenuAnchor(null)
  }

  const insertImagePlaceholder = () => {
    const placeholderHTML = `
      <div style="border: 2px dashed #3498db; padding: 20px; margin: 15px 0; text-align: center; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); color: #2c3e50; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); cursor: pointer;" onclick="alert('Click the Medical Images button in the toolbar to search for images')">
        <h5 style="color: #2980b9; margin-top: 0; font-size: 16px; text-decoration: underline;">Suggested Medical Image</h5>
        <p>Click "Medical Images" button to search for relevant medical images from NIH Open Access</p>
      </div><br>
    `
    execCommand('insertHTML', placeholderHTML)
  }

  const clearFormatting = () => {
    execCommand('removeFormat')
    execCommand('formatBlock', 'div')
  }

  useImperativeHandle(ref, () => ({
    getHtml: () => editorRef.current?.innerHTML || '',
    getText: () => editorRef.current?.innerText || '',
    getDocumentText: () => editorRef.current?.innerText || '', // alias for CompanionPanel
    getSelectedText: () => {
      const selection = window.getSelection()
      if (selection && editorRef.current?.contains(selection.anchorNode)) {
        return selection.toString()
      }
      return ''
    },
    getContainingParagraph: () => {
      const selection = window.getSelection()
      if (selection && selection.anchorNode && editorRef.current?.contains(selection.anchorNode)) {
        // Find the containing paragraph or block element
        let node: Node | null = selection.anchorNode
        while (node && node !== editorRef.current) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement
            const tagName = el.tagName.toLowerCase()
            if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote'].includes(tagName)) {
              return el.innerText || ''
            }
          }
          node = node.parentNode
        }
      }
      return ''
    },
    applyHtml: (html: string) => {
      if (editorRef.current) {
        // Save undo snapshot before applying
        saveToUndoStack(false)
        editorRef.current.innerHTML = html
        lastHtmlRef.current = html
        onChange?.(html)
      }
    },
    applyText: (text: string) => {
      if (editorRef.current) {
        // Save undo snapshot before applying
        saveToUndoStack(false)
        editorRef.current.innerHTML += text
        onChange?.(editorRef.current.innerHTML)
      }
    },
    replaceSelectedText: (newText: string) => {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
        // Save undo snapshot before replacing
        saveToUndoStack(false)
        const range = selection.getRangeAt(0)
        range.deleteContents()
        range.insertNode(document.createTextNode(newText))
        // Move cursor to end of inserted text
        range.collapse(false)
        selection.removeAllRanges()
        selection.addRange(range)
        onChange?.(editorRef.current.innerHTML)
      }
    },
    saveUndoSnapshot: () => {
      saveToUndoStack(false)
    },
  }))

  // Mobile toolbar content panels
  const MobileFormatPanel = () => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 1, justifyContent: 'center' }}>
      <ToggleButtonGroup value={selectedFormats} onChange={handleFormat} size="small">
        <ToggleButton value="bold"><FormatBold /></ToggleButton>
        <ToggleButton value="italic"><FormatItalic /></ToggleButton>
        <ToggleButton value="underline"><FormatUnderlined /></ToggleButton>
        <ToggleButton value="strikethrough"><FormatStrikethrough /></ToggleButton>
      </ToggleButtonGroup>
      <ToggleButtonGroup value={alignment} exclusive onChange={handleAlignment} size="small">
        <ToggleButton value="left"><FormatAlignLeft /></ToggleButton>
        <ToggleButton value="center"><FormatAlignCenter /></ToggleButton>
        <ToggleButton value="right"><FormatAlignRight /></ToggleButton>
      </ToggleButtonGroup>
      <IconButton size="small" onClick={(e) => setColorAnchorEl(e.currentTarget)} sx={{ color: textColor }}>
        <FormatColorText />
      </IconButton>
      <IconButton size="small" onClick={(e) => setBgColorAnchorEl(e.currentTarget)} sx={{ bgcolor: bgColor === 'transparent' ? undefined : bgColor }}>
        <FormatColorFill />
      </IconButton>
    </Box>
  )

  const MobileInsertPanel = () => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 1, justifyContent: 'center' }}>
      <IconButton onClick={insertImage} size="small"><Image /></IconButton>
      <IconButton onClick={insertLink} size="small"><LinkIcon /></IconButton>
      <IconButton onClick={insertTable} size="small"><TableChart /></IconButton>
      <IconButton onClick={() => execCommand('insertUnorderedList')} size="small"><FormatListBulleted /></IconButton>
      <IconButton onClick={() => execCommand('insertOrderedList')} size="small"><FormatListNumbered /></IconButton>
      <IconButton onClick={() => execCommand('formatBlock', 'blockquote')} size="small"><FormatQuote /></IconButton>
      <IconButton onClick={(e) => setShapeAnchorEl(e.currentTarget)} size="small"><Rectangle /></IconButton>
      <Button size="small" onClick={openImageSearch} startIcon={<Search />}>Images</Button>
    </Box>
  )

  const MobileLayoutPanel = () => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 1, justifyContent: 'center', alignItems: 'center' }}>
      <FormControl size="small" sx={{ minWidth: 100 }}>
        <Select value={fontFamily} onChange={(e) => handleFontFamily(e.target.value)} displayEmpty>
          {fontFamilies.slice(0, 6).map((font) => (
            <MenuItem key={font} value={font} style={{ fontFamily: font }}>{font}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 70 }}>
        <Select value={fontSize} onChange={(e) => handleFontSize(e.target.value)} displayEmpty>
          {fontSizes.map((size) => (
            <MenuItem key={size} value={size}>{size}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <IconButton onClick={() => execCommand('indent')} size="small"><FormatIndentIncrease /></IconButton>
      <IconButton onClick={() => execCommand('outdent')} size="small"><FormatIndentDecrease /></IconButton>
      <ToggleButtonGroup value={selectedFormats} onChange={handleFormat} size="small">
        <ToggleButton value="superscript"><Superscript /></ToggleButton>
        <ToggleButton value="subscript"><Subscript /></ToggleButton>
      </ToggleButtonGroup>
    </Box>
  )

  const MobileMorePanel = () => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 1, justifyContent: 'center' }}>
      <IconButton onClick={handlePrint} size="small"><Print /></IconButton>
      {onPreview && <IconButton onClick={onPreview} size="small"><Visibility /></IconButton>}
      {onShare && <IconButton onClick={(e) => setShareMenuAnchor(e.currentTarget)} size="small"><Share /></IconButton>}
      {onExportDocx && <IconButton onClick={onExportDocx} size="small"><FileDownload /></IconButton>}
      {onExportPdf && <IconButton onClick={onExportPdf} size="small"><PictureAsPdf /></IconButton>}
      <Button size="small" onClick={(e) => setMedicalMenuAnchor(e.currentTarget)} startIcon={<LocalHospital />}>Sections</Button>
      <IconButton onClick={clearFormatting} size="small"><ClearAll /></IconButton>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* MOBILE TOP BAR - Compact */}
      {isMobile && (
        <Paper
          elevation={2}
          className="editor-toolbar no-print"
          sx={{ p: 0.5, borderRadius: 0, borderBottom: '1px solid #e0e0e0', backgroundColor: '#fafafa' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, minWidth: 0 }}>
              {fileName && !isEditingName && (
                <Typography
                  variant="body2"
                  onClick={onRename ? handleStartRename : undefined}
                  sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, cursor: onRename ? 'pointer' : 'default' }}
                >
                  {fileName.split('/').pop()}
                </Typography>
              )}
              {isEditingName && fileName && (
                <TextField
                  size="small"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={handleFinishRename}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleFinishRename(); if (e.key === 'Escape') setIsEditingName(false); }}
                  autoFocus
                  sx={{ flex: 1 }}
                  inputProps={{ style: { fontSize: 13, padding: '4px 8px' } }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Typography variant="caption" color="text.secondary">{getFileExtension(fileName.split('/').pop() || '')}</Typography>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
              {isUnsaved && <Chip label="•" size="small" color="warning" sx={{ height: 16, '& .MuiChip-label': { px: 0.5 } }} />}
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton onClick={handleUndo} size="small"><Undo fontSize="small" /></IconButton>
              <IconButton onClick={handleRedo} size="small"><Redo fontSize="small" /></IconButton>
              <IconButton onClick={handleSave} size="small" color="primary"><Save fontSize="small" /></IconButton>
            </Box>
          </Box>
        </Paper>
      )}

      {/* DESKTOP TOOLBAR - Full */}
      {!isMobile && (
        <Paper
          elevation={3}
          className="editor-toolbar no-print"
          sx={{
            p: 1,
            borderRadius: 0,
            borderBottom: '2px solid #e0e0e0',
            backgroundColor: '#fafafa',
            position: 'sticky',
            top: 0,
            zIndex: 10
          }}
        >
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            {/* File info - clickable to rename */}
            {fileName && !isEditingName && (
              <Tooltip title="Click to rename">
                <Typography
                  variant="body2"
                  onClick={onRename ? handleStartRename : undefined}
                  sx={{
                    fontWeight: 500,
                    maxWidth: 200,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    cursor: onRename ? 'pointer' : 'default',
                    '&:hover': onRename ? { textDecoration: 'underline' } : {}
                  }}
                >
                  {fileName.split('/').pop()}
                </Typography>
              </Tooltip>
            )}
            {isEditingName && fileName && (
              <TextField
                size="small"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleFinishRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFinishRename()
                  if (e.key === 'Escape') setIsEditingName(false)
                }}
                autoFocus
                sx={{ width: 200 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Typography variant="caption" color="text.secondary">{getFileExtension(fileName.split('/').pop() || '')}</Typography>
                    </InputAdornment>
                  ),
                }}
              />
            )}
            {isUnsaved && <Chip label="Unsaved" size="small" color="warning" sx={{ height: 20 }} />}
            {fileName && <Divider orientation="vertical" flexItem />}
            <Tooltip title="Undo">
              <IconButton onClick={handleUndo} size="small">
                <Undo />
              </IconButton>
            </Tooltip>
            <Tooltip title="Redo">
              <IconButton onClick={handleRedo} size="small">
                <Redo />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem />
            <Tooltip title="Save">
              <IconButton onClick={handleSave} size="small" color="primary">
                <Save />
              </IconButton>
            </Tooltip>
            <Tooltip title="Print">
              <IconButton onClick={handlePrint} size="small">
                <Print />
              </IconButton>
            </Tooltip>
            {onPreview && (
              <Tooltip title="Preview">
                <IconButton onClick={onPreview} size="small">
                  <Visibility />
                </IconButton>
              </Tooltip>
            )}
            {onShare && (
              <Tooltip title="Share">
                <IconButton onClick={(e) => setShareMenuAnchor(e.currentTarget)} size="small">
                  <Share />
                </IconButton>
              </Tooltip>
            )}
            {onExportDocx && (
              <Tooltip title="Export DOCX">
                <IconButton onClick={onExportDocx} size="small">
                  <FileDownload />
                </IconButton>
              </Tooltip>
            )}
            {onExportPdf && (
              <Tooltip title="Export PDF">
                <IconButton onClick={onExportPdf} size="small">
                  <PictureAsPdf />
                </IconButton>
              </Tooltip>
            )}
            {onZoomChange && (
              <>
                <Divider orientation="vertical" flexItem />
                <FormControl size="small" sx={{ minWidth: 80 }}>
                  <Select value={zoom} onChange={(e) => onZoomChange(Number(e.target.value))} displayEmpty>
                    {[0.75, 1, 1.25, 1.5].map((z) => (
                      <MenuItem key={z} value={z}>{Math.round(z * 100)}%</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}
            <Divider orientation="vertical" flexItem />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select value={fontFamily} onChange={(e) => handleFontFamily(e.target.value)} displayEmpty>
                {fontFamilies.map((font) => (
                  <MenuItem key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <Select value={fontSize} onChange={(e) => handleFontSize(e.target.value)} displayEmpty>
                {fontSizes.map((size) => (
                  <MenuItem key={size} value={size}>
                    {size}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Divider orientation="vertical" flexItem />
            <ToggleButtonGroup value={selectedFormats} onChange={handleFormat} aria-label="text formatting" size="small">
              <ToggleButton value="bold" aria-label="bold">
                <FormatBold />
              </ToggleButton>
              <ToggleButton value="italic" aria-label="italic">
                <FormatItalic />
              </ToggleButton>
              <ToggleButton value="underline" aria-label="underline">
                <FormatUnderlined />
              </ToggleButton>
              <ToggleButton value="strikethrough" aria-label="strikethrough">
                <FormatStrikethrough />
              </ToggleButton>
            </ToggleButtonGroup>
            <ToggleButtonGroup value={selectedFormats} onChange={handleFormat} aria-label="super subscript" size="small">
              <ToggleButton value="superscript" aria-label="superscript">
                <Superscript />
              </ToggleButton>
              <ToggleButton value="subscript" aria-label="subscript">
                <Subscript />
              </ToggleButton>
            </ToggleButtonGroup>
            <Divider orientation="vertical" flexItem />
            <Tooltip title="Text Color">
              <IconButton size="small" onClick={(e) => setColorAnchorEl(e.currentTarget)} style={{ color: textColor }}>
                <FormatColorText />
              </IconButton>
            </Tooltip>
            <Tooltip title="Highlight Color">
              <IconButton
                size="small"
                onClick={(e) => setBgColorAnchorEl(e.currentTarget)}
                style={{ backgroundColor: bgColor === 'transparent' ? undefined : bgColor }}
              >
                <FormatColorFill />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem />
            <ToggleButtonGroup value={alignment} exclusive onChange={handleAlignment} aria-label="text alignment" size="small">
              <ToggleButton value="left" aria-label="left aligned">
                <FormatAlignLeft />
              </ToggleButton>
              <ToggleButton value="center" aria-label="centered">
                <FormatAlignCenter />
              </ToggleButton>
              <ToggleButton value="right" aria-label="right aligned">
                <FormatAlignRight />
              </ToggleButton>
              <ToggleButton value="justify" aria-label="justified">
                <FormatAlignJustify />
              </ToggleButton>
            </ToggleButtonGroup>
            <Divider orientation="vertical" flexItem />
            <Tooltip title="Bullet List">
              <IconButton onClick={() => execCommand('insertUnorderedList')} size="small">
                <FormatListBulleted />
              </IconButton>
            </Tooltip>
            <Tooltip title="Numbered List">
              <IconButton onClick={() => execCommand('insertOrderedList')} size="small">
                <FormatListNumbered />
              </IconButton>
            </Tooltip>
            <Tooltip title="Decrease Indent">
              <IconButton onClick={() => execCommand('outdent')} size="small">
                <FormatIndentDecrease />
              </IconButton>
            </Tooltip>
            <Tooltip title="Increase Indent">
              <IconButton onClick={() => execCommand('indent')} size="small">
                <FormatIndentIncrease />
              </IconButton>
            </Tooltip>
            <Tooltip title="Quote">
              <IconButton onClick={() => execCommand('formatBlock', 'blockquote')} size="small">
                <FormatQuote />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem />
            <Tooltip title="Insert Link">
              <IconButton onClick={insertLink} size="small">
                <LinkIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Insert Image">
              <IconButton onClick={insertImage} size="small">
                <Image />
              </IconButton>
            </Tooltip>
            <Tooltip title="Insert Table">
              <IconButton onClick={insertTable} size="small">
                <TableChart />
              </IconButton>
            </Tooltip>
            <Tooltip title="Insert Shape">
              <IconButton onClick={(e) => setShapeAnchorEl(e.currentTarget)} size="small">
                <Rectangle />
              </IconButton>
            </Tooltip>
            <Tooltip title="Insert Math Symbol">
              <IconButton onClick={() => execCommand('insertHTML', '∑')} size="small">
                <Functions />
              </IconButton>
            </Tooltip>
            <Tooltip title="Code">
              <IconButton onClick={() => execCommand('formatBlock', 'pre')} size="small">
                <Code />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem />
            <Tooltip title="Sections + Elements">
              <Button size="small" startIcon={<LocalHospital />} onClick={(e) => setMedicalMenuAnchor(e.currentTarget)} variant="outlined">
                Sections
              </Button>
            </Tooltip>
            <Tooltip title="Image Placeholder">
              <IconButton onClick={insertImagePlaceholder} size="small">
                <Rectangle />
              </IconButton>
            </Tooltip>
            <Tooltip title="Search Images">
              <Button size="small" startIcon={<Image />} onClick={openImageSearch} variant="outlined">
                Images
              </Button>
            </Tooltip>
            <Divider orientation="vertical" flexItem />
            <Tooltip title="Clear Formatting">
              <IconButton onClick={clearFormatting} size="small">
                <ClearAll />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>
      )}

      {/* Page container - 8.5x11 document view */}
      <div className="page-wrap">
        <div
          className="page"
          style={{ '--zoom': zoom } as React.CSSProperties}
        >
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={() => saveToUndoStack(true)}
            style={{
              minHeight: '900px',
              outline: 'none',
              fontFamily: fontFamily,
              fontSize: fontSize,
            }}
          />
        </div>
      </div>

      {/* MOBILE BOTTOM TOOLBAR */}
      {isMobile && (
        <Paper
          elevation={4}
          className="no-print"
          sx={{
            position: 'sticky',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            borderTop: '1px solid #e0e0e0',
            backgroundColor: '#fafafa',
          }}
        >
          {/* Expandable panel content */}
          <Collapse in={mobileToolbarTab !== null}>
            <Box sx={{ borderBottom: '1px solid #e0e0e0', bgcolor: '#fff' }}>
              {mobileToolbarTab === 0 && <MobileFormatPanel />}
              {mobileToolbarTab === 1 && <MobileInsertPanel />}
              {mobileToolbarTab === 2 && <MobileLayoutPanel />}
              {mobileToolbarTab === 3 && <MobileMorePanel />}
            </Box>
          </Collapse>

          {/* Tab bar */}
          <Tabs
            value={mobileToolbarTab ?? false}
            onChange={(_, newValue) => setMobileToolbarTab(mobileToolbarTab === newValue ? null : newValue)}
            variant="fullWidth"
            sx={{
              minHeight: 48,
              '& .MuiTab-root': {
                minHeight: 48,
                textTransform: 'none',
                fontSize: 11,
                py: 0.5,
              },
            }}
          >
            <Tab icon={<TextFormat fontSize="small" />} label="Format" value={0} />
            <Tab icon={<Add fontSize="small" />} label="Insert" value={1} />
            <Tab icon={<ViewModule fontSize="small" />} label="Layout" value={2} />
            <Tab icon={<MoreHoriz fontSize="small" />} label="More" value={3} />
          </Tabs>
        </Paper>
      )}

      <Popover open={Boolean(colorAnchorEl)} anchorEl={colorAnchorEl} onClose={() => setColorAnchorEl(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Box sx={{ p: 2, width: 280, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {colors.map((color) => (
            <Button
              key={color}
              sx={{ minWidth: 30, width: 30, height: 30, backgroundColor: color, border: '1px solid #ccc', padding: 0, '&:hover': { backgroundColor: color, transform: 'scale(1.2)' } }}
              onClick={() => {
                setTextColor(color)
                execCommand('foreColor', color)
                setColorAnchorEl(null)
              }}
            />
          ))}
        </Box>
      </Popover>

      <Popover open={Boolean(bgColorAnchorEl)} anchorEl={bgColorAnchorEl} onClose={() => setBgColorAnchorEl(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Box sx={{ p: 2, width: 280, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {colors.map((color) => (
            <Button
              key={color}
              sx={{ minWidth: 30, width: 30, height: 30, backgroundColor: color, border: '1px solid #ccc', padding: 0, '&:hover': { backgroundColor: color, transform: 'scale(1.2)' } }}
              onClick={() => {
                setBgColor(color)
                execCommand('hiliteColor', color)
                setBgColorAnchorEl(null)
              }}
            />
          ))}
        </Box>
      </Popover>

      <Popover open={Boolean(shapeAnchorEl)} anchorEl={shapeAnchorEl} onClose={() => setShapeAnchorEl(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Box sx={{ p: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Tooltip title="Rectangle">
            <IconButton onClick={() => insertShape('rectangle')}>
              <Rectangle />
            </IconButton>
          </Tooltip>
          <Tooltip title="Circle">
            <IconButton onClick={() => insertShape('circle')}>
              <Circle />
            </IconButton>
          </Tooltip>
          <Tooltip title="Arrow">
            <IconButton onClick={() => insertShape('arrow')}>
              <ArrowRightAlt />
            </IconButton>
          </Tooltip>
          <Tooltip title="Line">
            <IconButton onClick={() => insertShape('line')}>
              <Timeline />
            </IconButton>
          </Tooltip>
          <Tooltip title="Star">
            <IconButton onClick={() => insertShape('star')}>
              <Star />
            </IconButton>
          </Tooltip>
          <Tooltip title="Heart">
            <IconButton onClick={() => insertShape('heart')}>
              <FavoriteBorder />
            </IconButton>
          </Tooltip>
          <Tooltip title="Checkbox">
            <IconButton onClick={() => insertShape('checkbox')}>
              <CheckBox />
            </IconButton>
          </Tooltip>
          <Tooltip title="Radio Button">
            <IconButton onClick={() => insertShape('radio')}>
              <RadioButtonUnchecked />
            </IconButton>
          </Tooltip>
        </Box>
      </Popover>

      <Menu anchorEl={medicalMenuAnchor} open={Boolean(medicalMenuAnchor)} onClose={() => setMedicalMenuAnchor(null)}>
        <MuiMenuItem onClick={() => insertMedicalBox('clinical')}>
          <ListItemIcon>
            <LocalHospital sx={{ color: '#e74c3c' }} />
          </ListItemIcon>
          <ListItemText>Clinical Box</ListItemText>
        </MuiMenuItem>
        <MuiMenuItem onClick={() => insertMedicalBox('nursing')}>
          <ListItemIcon>
            <Assignment sx={{ color: '#2980b9' }} />
          </ListItemIcon>
          <ListItemText>Nursing Box</ListItemText>
        </MuiMenuItem>
        <MuiMenuItem onClick={() => insertMedicalBox('education')}>
          <ListItemIcon>
            <School sx={{ color: '#f39c12' }} />
          </ListItemIcon>
          <ListItemText>Patient Education</ListItemText>
        </MuiMenuItem>
        <MuiMenuItem onClick={() => insertMedicalBox('critical')}>
          <ListItemIcon>
            <Warning sx={{ color: '#c0392b' }} />
          </ListItemIcon>
          <ListItemText>Critical Point</ListItemText>
        </MuiMenuItem>
        <MuiMenuItem onClick={() => insertMedicalBox('key-point')}>
          <ListItemIcon>
            <Info sx={{ color: '#f1c40f' }} />
          </ListItemIcon>
          <ListItemText>Key Point</ListItemText>
        </MuiMenuItem>
        <MuiMenuItem onClick={() => insertMedicalBox('medication')}>
          <ListItemIcon>
            <Biotech sx={{ color: '#3498db' }} />
          </ListItemIcon>
          <ListItemText>Medication Note</ListItemText>
        </MuiMenuItem>
        <Divider />
        <MuiMenuItem onClick={() => insertMedicalHeading('main-title')}>
          <ListItemIcon>
            <Psychology sx={{ color: '#2c3e50' }} />
          </ListItemIcon>
          <ListItemText>Main Title</ListItemText>
        </MuiMenuItem>
        <MuiMenuItem onClick={() => insertMedicalHeading('module-header')}>
          <ListItemIcon>
            <Psychology sx={{ color: '#2980b9' }} />
          </ListItemIcon>
          <ListItemText>Module Header</ListItemText>
        </MuiMenuItem>
        <MuiMenuItem onClick={() => insertMedicalHeading('section-header')}>
          <ListItemIcon>
            <Psychology sx={{ color: '#27ae60' }} />
          </ListItemIcon>
          <ListItemText>Section Header</ListItemText>
        </MuiMenuItem>
        <MuiMenuItem onClick={() => insertMedicalHeading('subsection')}>
          <ListItemIcon>
            <Psychology sx={{ color: '#e74c3c' }} />
          </ListItemIcon>
          <ListItemText>Subsection</ListItemText>
        </MuiMenuItem>
      </Menu>

      {/* Share menu */}
      <Menu anchorEl={shareMenuAnchor} open={Boolean(shareMenuAnchor)} onClose={() => setShareMenuAnchor(null)}>
        <MuiMenuItem onClick={() => { onShare?.('1h'); setShareMenuAnchor(null); }}>
          <ListItemText>1 Hour</ListItemText>
        </MuiMenuItem>
        <MuiMenuItem onClick={() => { onShare?.('24h'); setShareMenuAnchor(null); }}>
          <ListItemText>24 Hours</ListItemText>
        </MuiMenuItem>
        <MuiMenuItem onClick={() => { onShare?.('7d'); setShareMenuAnchor(null); }}>
          <ListItemText>7 Days</ListItemText>
        </MuiMenuItem>
        <MuiMenuItem onClick={() => { onShare?.('30d'); setShareMenuAnchor(null); }}>
          <ListItemText>30 Days</ListItemText>
        </MuiMenuItem>
        <Divider />
        <MuiMenuItem onClick={() => { onShare?.('never'); setShareMenuAnchor(null); }}>
          <ListItemText>Never Expire</ListItemText>
        </MuiMenuItem>
      </Menu>

      <Dialog open={imageSearchOpen} onClose={() => setImageSearchOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Search Medical Images</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Search for medical and educational images. Enter terms like "heart anatomy", "medical diagram", "biology", etc.
          </Typography>
          <TextField
            fullWidth
            label="Search images"
            placeholder="e.g., heart anatomy, medical diagram, biology"
            value={imageSearchQuery}
            onChange={(e) => setImageSearchQuery(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => handleImageSearch(imageSearchQuery)}
                    disabled={imageSearchLoading || !imageSearchQuery.trim()}
                  >
                    {imageSearchLoading ? <CircularProgress size={20} /> : <Search />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleImageSearch(imageSearchQuery)
              }
            }}
          />

          {imageSearchError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {imageSearchError}
            </Alert>
          )}

          {imageSearchLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {!imageSearchLoading && imageSearchResults.length > 0 && (
            <Grid container spacing={2}>
              {imageSearchResults.map((img) => (
                <Grid item xs={6} sm={4} md={3} key={img.id}>
                  <Card sx={{ height: '100%' }}>
                    <CardActionArea onClick={() => insertSearchImage(img)}>
                      <CardMedia
                        component="img"
                        height="120"
                        image={img.thumb}
                        alt={img.alt}
                        sx={{ objectFit: 'cover' }}
                      />
                      <CardContent sx={{ p: 1 }}>
                        <Typography variant="caption" noWrap title={img.alt}>
                          {img.alt || 'Image'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" noWrap>
                          by {img.credit}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {!imageSearchLoading && imageSearchResults.length === 0 && imageSearchQuery && !imageSearchError && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No images found. Try different search terms.
            </Typography>
          )}

          {!imageSearchQuery && imageSearchResults.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Enter a search term and press Enter or click the search icon to find images.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setImageSearchOpen(false)
            setImageSearchQuery('')
            setImageSearchResults([])
            setImageSearchError(null)
          }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
})

export default RichTextEditor
