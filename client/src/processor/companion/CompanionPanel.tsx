import { useEffect, useState } from 'react'
import type React from 'react'
import { Tabs, Card, Space, Button, Select, Typography, Tag, Input, Alert, Popover, Upload, message, Modal, Radio, Divider } from 'antd'
import { SendOutlined, ReloadOutlined, AuditOutlined, PlayCircleOutlined, PauseOutlined, StopOutlined, WarningOutlined, CheckOutlined, CloseOutlined, UndoOutlined, EyeOutlined } from '@ant-design/icons'
import { useCompanionStore, type CompanionScope } from '../store/companion'
import { voicePresets } from '../shared/voices'
import { auditText } from '../shared/audit'
import { masterRulesSummary, masterStyleCondensed, masterStyleFull, punctuationRules, cadenceRules, styleNotes } from '../shared/rules'
import { callCompanion } from '../api/companion'
import type { RichTextHandle } from '../editor/RichTextEditor'
import './companion.css'

const { Text } = Typography

// Scope labels for UI
const scopeLabels: Record<CompanionScope, string> = {
  selection: 'Selection Only',
  paragraph: 'Current Paragraph',
  full_document: 'Full Document',
}

const scopeDescriptions: Record<CompanionScope, string> = {
  selection: 'AI can only modify selected text',
  paragraph: 'AI can modify the paragraph containing selection',
  full_document: 'AI can modify entire document (requires confirmation)',
}

let requestCounter = 0
const shouldIncludeFullStyle = () => {
  requestCounter += 1
  return requestCounter % 3 === 0
}

function VoiceBadge() {
  const activeVoice = useCompanionStore((s) => s.activeVoice)
  return <Tag color="geekblue">Voice: {activeVoice.name}</Tag>
}

function RulesPopover() {
  const content = (
    <div className="rules-popover">
      <div className="rules-section">
        <Text strong>Master Rules</Text>
        <ul>{masterRulesSummary.map((r) => <li key={r}>{r}</li>)}</ul>
      </div>
      <div className="rules-section">
        <Text strong>Punctuation</Text>
        <ul>{punctuationRules.map((r) => <li key={r}>{r}</li>)}</ul>
      </div>
      <div className="rules-section">
        <Text strong>Cadence</Text>
        <ul>{cadenceRules.map((r) => <li key={r}>{r}</li>)}</ul>
      </div>
      <div className="rules-section">
        <Text strong>Style Notes</Text>
        <ul>{styleNotes.map((r) => <li key={r}>{r}</li>)}</ul>
      </div>
    </div>
  )
  return (
    <Popover content={content} placement="bottomRight" trigger="click">
      <Button size="small" icon={<AuditOutlined />}>View rules</Button>
    </Popover>
  )
}

function VoiceSelect() {
  const activeVoice = useCompanionStore((s) => s.activeVoice)
  const setVoice = useCompanionStore((s) => s.setVoice)
  return (
    <Select
      size="small"
      value={activeVoice.id}
      style={{ width: '100%' }}
      onChange={setVoice}
      options={voicePresets.map((v) => ({ value: v.id, label: v.name }))}
    />
  )
}

function ScopeSelector() {
  const scope = useCompanionStore((s) => s.scope)
  const setScope = useCompanionStore((s) => s.setScope)
  return (
    <div className="scope-selector">
      <Text type="secondary" style={{ fontSize: 11 }}>AI Scope</Text>
      <Radio.Group
        size="small"
        value={scope}
        onChange={(e) => setScope(e.target.value)}
        optionType="button"
        buttonStyle="solid"
      >
        <Radio.Button value="selection">Selection</Radio.Button>
        <Radio.Button value="paragraph">Paragraph</Radio.Button>
        <Radio.Button value="full_document">Full Doc</Radio.Button>
      </Radio.Group>
      <Text type="secondary" style={{ fontSize: 10 }}>{scopeDescriptions[scope]}</Text>
    </div>
  )
}

// Diff preview component - shows original vs suggested with highlights
function DiffPreview({ original, suggested, onConfirm, onCancel, warnings, lengthChange }: {
  original: string
  suggested: string
  onConfirm: () => void
  onCancel: () => void
  warnings: string[]
  lengthChange: number
}) {
  const [showDiff, setShowDiff] = useState(true)

  // Simple word-level diff for visualization
  const getDiffDisplay = () => {
    if (!showDiff) {
      return (
        <div className="diff-single">
          <div className="diff-section">
            <Text strong>Suggested Text:</Text>
            <div className="diff-text suggested">{suggested}</div>
          </div>
        </div>
      )
    }

    return (
      <div className="diff-comparison">
        <div className="diff-section original">
          <Text strong type="secondary">Original:</Text>
          <div className="diff-text">{original}</div>
        </div>
        <div className="diff-arrow">→</div>
        <div className="diff-section suggested">
          <Text strong style={{ color: '#52c41a' }}>Suggested:</Text>
          <div className="diff-text">{suggested}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="diff-preview">
      <div className="diff-header">
        <Space>
          <EyeOutlined />
          <Text strong>Review Changes Before Applying</Text>
        </Space>
        <Button size="small" onClick={() => setShowDiff(!showDiff)}>
          {showDiff ? 'Show Result Only' : 'Show Comparison'}
        </Button>
      </div>

      {warnings.length > 0 && (
        <Alert
          type="warning"
          icon={<WarningOutlined />}
          message="Warnings"
          description={
            <ul className="warning-list">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          }
          style={{ marginBottom: 12 }}
        />
      )}

      <div className="diff-stats">
        <Tag color={lengthChange < 0 ? 'orange' : lengthChange > 0 ? 'blue' : 'default'}>
          {lengthChange > 0 ? '+' : ''}{Math.round(lengthChange)}% length
        </Tag>
        <Tag>{original.length} → {suggested.length} chars</Tag>
      </div>

      {getDiffDisplay()}

      <div className="diff-actions">
        <Button
          type="primary"
          icon={<CheckOutlined />}
          onClick={onConfirm}
        >
          Apply Changes
        </Button>
        <Button
          icon={<CloseOutlined />}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

// Revert button component
function RevertButton({ editorRef }: { editorRef?: React.RefObject<RichTextHandle> }) {
  const lastChange = useCompanionStore((s) => s.getLastAppliedChange())
  const revertLastChange = useCompanionStore((s) => s.revertLastChange)

  if (!lastChange) return null

  const handleRevert = () => {
    const change = revertLastChange()
    if (change && editorRef?.current) {
      // Restore the original text
      const currentHtml = editorRef.current.getHtml()
      const restoredHtml = currentHtml.replace(change.appliedText, change.originalText)
      editorRef.current.applyHtml(restoredHtml)
      message.success('Reverted to previous version')
    }
  }

  const timeAgo = Math.round((Date.now() - lastChange.timestamp) / 1000)
  const timeStr = timeAgo < 60 ? `${timeAgo}s ago` : `${Math.round(timeAgo / 60)}m ago`

  return (
    <Button
      size="small"
      icon={<UndoOutlined />}
      onClick={handleRevert}
      title={`Revert change from ${timeStr}`}
    >
      Revert Last AI Change
    </Button>
  )
}

function ActionMode({ editorRef }: { editorRef?: React.RefObject<RichTextHandle> }) {
  const {
    suggestions,
    addSuggestion,
    clearSuggestions,
    selectionPreview,
    activeVoice,
    scope,
    pendingSuggestion,
    setPendingSuggestion,
    clearPendingSuggestion,
    confirmPendingSuggestion,
    addAppliedChange,
  } = useCompanionStore()
  const [loadingAction, setLoading] = useState(false)
  const [actionText, setActionText] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Get text based on scope - uses editor methods when available
  const getTextForScope = (): string => {
    const manualText = actionText.trim()

    // If user typed text manually, use that regardless of scope
    if (manualText) {
      return manualText
    }

    if (!editorRef?.current) {
      if (selectionPreview) return selectionPreview
      message.warning('Editor not ready')
      return ''
    }

    if (scope === 'selection') {
      const selected = editorRef.current.getSelectedText?.() || selectionPreview
      if (!selected) {
        message.warning('Please select text in the editor first')
        return ''
      }
      return selected
    }

    if (scope === 'paragraph') {
      const para = editorRef.current.getContainingParagraph?.()
      if (para) return para
      // Fallback to selection if no paragraph found
      const selected = editorRef.current.getSelectedText?.() || selectionPreview
      if (!selected) {
        message.warning('Please click in a paragraph or select text')
        return ''
      }
      return selected
    }

    if (scope === 'full_document') {
      const docText = editorRef.current.getDocumentText?.() || ''
      if (!docText) {
        message.warning('No document text available')
        return ''
      }
      return docText
    }

    return selectionPreview || ''
  }

  const runAction = async (label: string) => {
    const textToProcess = getTextForScope()
    if (!textToProcess) return

    setError(null)
    setLoading(true)
    try {
      const includeFull = shouldIncludeFullStyle()
      const res = await callCompanion({
        mode: 'action',
        action: label,
        text: textToProcess,
        voiceId: activeVoice.id,
        rules: includeFull
          ? [...masterRulesSummary, ...masterStyleCondensed, masterStyleFull]
          : [...masterRulesSummary, ...masterStyleCondensed],
      })
      const audit = auditText(res.text)

      // Instead of directly adding suggestion, set as pending for preview
      setPendingSuggestion(textToProcess, res.text, audit.flags)
      addSuggestion(res.text, audit.flags)
    } catch (e: any) {
      setError(e?.message ?? 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmApply = () => {
    const change = confirmPendingSuggestion()
    if (change && editorRef?.current) {
      // Save undo snapshot before applying
      editorRef.current.saveUndoSnapshot?.()

      // Apply the change based on scope
      if (change.scope === 'full_document') {
        // For full document, replace entire content
        editorRef.current.applyHtml(change.appliedText)
        message.success('Document updated')
      } else if (change.scope === 'selection') {
        // For selection, try to use replaceSelectedText if available
        const hasSelection = editorRef.current.getSelectedText?.()
        if (hasSelection) {
          editorRef.current.replaceSelectedText?.(change.appliedText)
          message.success('Selection replaced')
        } else {
          // Fallback: find and replace in HTML
          const currentHtml = editorRef.current.getHtml()
          const newHtml = currentHtml.replace(change.originalText, change.appliedText)
          editorRef.current.applyHtml(newHtml)
          message.success('Changes applied')
        }
      } else {
        // For paragraph, find and replace in HTML
        const currentHtml = editorRef.current.getHtml()
        const escapedOriginal = change.originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const newHtml = currentHtml.replace(new RegExp(escapedOriginal), change.appliedText)
        editorRef.current.applyHtml(newHtml)
        message.success('Paragraph updated')
      }
    }
  }

  const handleApplySuggestion = (text: string, originalText: string) => {
    // Set as pending first for confirmation
    setPendingSuggestion(originalText || selectionPreview || actionText, text)
  }

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      {/* Pending suggestion preview */}
      {pendingSuggestion && (
        <DiffPreview
          original={pendingSuggestion.originalText}
          suggested={pendingSuggestion.suggestedText}
          onConfirm={handleConfirmApply}
          onCancel={clearPendingSuggestion}
          warnings={pendingSuggestion.warnings}
          lengthChange={pendingSuggestion.lengthChange}
        />
      )}

      {!pendingSuggestion && (
        <>
          <Input.TextArea
            rows={3}
            placeholder={selectionPreview || 'Type or select text in the editor to work on it'}
            value={actionText}
            onChange={(e) => setActionText(e.target.value)}
          />
          {error && <Alert type="error" message={error} showIcon />}
          <Space wrap>
            <Button size="small" onClick={() => runAction('Rewrite')} loading={loadingAction}>Rewrite</Button>
            <Button size="small" onClick={() => runAction('Shorten')} loading={loadingAction}>Shorten</Button>
            <Button size="small" onClick={() => runAction('Expand')} loading={loadingAction}>Expand</Button>
            <Button size="small" onClick={() => runAction('Tone match')} loading={loadingAction}>Tone match</Button>
            <Button size="small" onClick={() => runAction('Bulletize')} loading={loadingAction}>Bulletize</Button>
            <Button size="small" onClick={() => runAction('Clarity')} loading={loadingAction}>Clarity</Button>
            <Button size="small" onClick={() => runAction('Grammar')} loading={loadingAction}>Grammar</Button>
          </Space>
          <Space>
            <Button size="small" type="link" onClick={clearSuggestions}>Clear results</Button>
            <RevertButton editorRef={editorRef} />
          </Space>
          <Space direction="vertical" style={{ width: '100%' }}>
            {suggestions.map((s) => (
              <Card key={s.id} size="small" className="suggestion-card">
                <div className="card-meta">
                  <Text strong>Suggestion</Text>
                  {s.auditFlags && s.auditFlags.length > 0 ? (
                    <Tag color="volcano">Audit flags</Tag>
                  ) : (
                    <Tag color="green">Audit pass</Tag>
                  )}
                </div>
                <div className="card-body">{s.text}</div>
                {s.auditFlags && s.auditFlags.length > 0 && (
                  <ul className="flags-list">
                    {s.auditFlags.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                )}
                <Space>
                  <Button
                    size="small"
                    type="primary"
                    icon={<EyeOutlined />}
                    onClick={() => handleApplySuggestion(s.text, selectionPreview || actionText)}
                  >
                    Preview & Apply
                  </Button>
                  <Button size="small" onClick={() => {
                    navigator.clipboard.writeText(s.text)
                    message.success('Copied to clipboard')
                  }}>Copy</Button>
                </Space>
              </Card>
            ))}
          </Space>
        </>
      )}
    </Space>
  )
}

function ChatMode({ editorRef }: { editorRef?: React.RefObject<RichTextHandle> }) {
  const {
    chat,
    addChatTurn,
    selectionPreview,
    activeVoice,
    scope,
    pendingSuggestion,
    setPendingSuggestion,
    clearPendingSuggestion,
    confirmPendingSuggestion,
  } = useCompanionStore()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    if (!input.trim()) return
    setError(null)
    addChatTurn({ id: crypto.randomUUID(), role: 'user', text: input })
    setLoading(true)
    const prompt = input
    setInput('')
    try {
      const includeFull = shouldIncludeFullStyle()
      const res = await callCompanion({
        mode: 'chat',
        text: `${selectionPreview || ''}\n\n${prompt}`.trim(),
        voiceId: activeVoice.id,
        rules: includeFull
          ? [...masterRulesSummary, ...masterStyleCondensed, masterStyleFull]
          : [...masterRulesSummary, ...masterStyleCondensed],
      })
      const audit = auditText(res.text)
      addChatTurn({
        id: crypto.randomUUID(),
        role: 'assistant',
        text: res.text,
        auditFlags: audit.flags,
      })
    } catch (e: any) {
      setError(e?.message ?? 'Chat failed')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyLastReply = () => {
    const last = [...chat].reverse().find((t) => t.role === 'assistant')
    if (!last) {
      message.warning('No assistant reply to apply')
      return
    }
    // Use preview before applying
    setPendingSuggestion(selectionPreview || '', last.text)
  }

  const handleConfirmApply = () => {
    const change = confirmPendingSuggestion()
    if (change && editorRef?.current) {
      // Save undo snapshot before applying
      editorRef.current.saveUndoSnapshot?.()

      if (change.scope === 'full_document') {
        editorRef.current.applyHtml(change.appliedText)
        message.success('Document updated')
      } else if (change.originalText) {
        // Try to use selection replacement first
        const hasSelection = editorRef.current.getSelectedText?.()
        if (hasSelection) {
          editorRef.current.replaceSelectedText?.(change.appliedText)
          message.success('Selection replaced')
        } else {
          const currentHtml = editorRef.current.getHtml()
          const newHtml = currentHtml.replace(change.originalText, change.appliedText)
          editorRef.current.applyHtml(newHtml)
          message.success('Changes applied')
        }
      } else {
        // No original text - append to document
        editorRef.current.applyText(change.appliedText)
        message.success('Text appended')
      }
    }
  }

  return (
    <div className="chat-pane">
      {/* Pending suggestion preview */}
      {pendingSuggestion && (
        <DiffPreview
          original={pendingSuggestion.originalText}
          suggested={pendingSuggestion.suggestedText}
          onConfirm={handleConfirmApply}
          onCancel={clearPendingSuggestion}
          warnings={pendingSuggestion.warnings}
          lengthChange={pendingSuggestion.lengthChange}
        />
      )}

      {!pendingSuggestion && (
        <>
          <div className="chat-log">
            {chat.map((turn) => (
              <div key={turn.id} className={`chat-bubble ${turn.role}`}>
                <div className="chat-role">{turn.role === 'user' ? 'You' : 'Companion'}</div>
                <div className="chat-text">{turn.text}</div>
                {turn.auditFlags && turn.auditFlags.length > 0 && (
                  <ul className="flags-list">
                    {turn.auditFlags.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                )}
                {turn.role === 'assistant' && (
                  <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => setPendingSuggestion(selectionPreview || '', turn.text)}
                    style={{ marginTop: 8 }}
                  >
                    Preview & Apply
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input.TextArea
              rows={3}
              placeholder="Give guidance, ask for a revision, or set a tone tweak."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            {error && <Alert type="error" message={error} showIcon />}
            <Space wrap>
              <Button type="primary" icon={<SendOutlined />} onClick={send} loading={loading} size="small">
                Send
              </Button>
              <Button size="small" icon={<EyeOutlined />} onClick={handleApplyLastReply}>
                Apply last reply
              </Button>
              <Button icon={<ReloadOutlined />} size="small" onClick={() => setInput('More concise, keep order, warmer tone')}>
                Tweak prompt
              </Button>
              <RevertButton editorRef={editorRef} />
            </Space>
          </Space>
        </>
      )}
    </div>
  )
}

function AutonomousMode() {
  const [status, setStatus] = useState<'idle' | 'planning' | 'drafting' | 'paused'>('idle')
  const [log, setLog] = useState<string[]>([])

  const pushLog = (entry: string) => setLog((prev) => [...prev, entry])

  const start = () => {
    setStatus('planning')
    pushLog('Planning beats from outline…')
    setTimeout(() => {
      pushLog('Beat 1 approved. Drafting section…')
      setStatus('drafting')
      setTimeout(() => {
        pushLog('Draft complete. Awaiting review.')
        setStatus('idle')
      }, 800)
    }, 800)
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Upload beforeUpload={() => { message.info('Stub: attach outline/style.'); return false }}>
        <Button size="small">Attach outline / style</Button>
      </Upload>
      <Space>
        <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={start} disabled={status === 'drafting'}>
          Start
        </Button>
        <Button size="small" icon={<PauseOutlined />} disabled={status !== 'drafting'} onClick={() => setStatus('paused')}>
          Pause
        </Button>
        <Button size="small" icon={<StopOutlined />} onClick={() => setStatus('idle')}>
          Stop
        </Button>
      </Space>
      <div className="autonomous-log">
        {log.map((l, idx) => (
          <div key={idx} className="log-line">{l}</div>
        ))}
        {log.length === 0 && <Text type="secondary">Generation log will appear here.</Text>}
      </div>
      <Alert
        type="info"
        message="Autonomous Draft runs beat-by-beat with approvals. This is a stub UI; connect backend to generate real prose from outline/style."
        showIcon
      />
    </Space>
  )
}

export function CompanionPanel({ editorRef }: { editorRef?: React.RefObject<RichTextHandle> }) {
  const companionState = useCompanionStore() as any
  const {
    activeVoice,
    setSelectionPreview,
    selectionPreview,
    setMode,
    writingStyles,
    addWritingStyle,
    loadWritingStyles,
  } = companionState
  const styleList = Array.isArray(writingStyles) ? writingStyles : []
  const [activeTab, setActiveTab] = useState('actions')
  const [auditResult, setAuditResult] = useState<{ flags: string[]; length: number } | null>(null)
  const [uploading, setUploading] = useState(false)

  const selectionStub = 'Selected paragraph will appear here from the editor.'
  useEffect(() => {
    loadWritingStyles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const runFullAudit = () => {
    const text = (editorRef?.current as any)?.getDocumentText?.() || ''
    if (!text) {
      message.warning('No document text available for audit.')
      return
    }
    const audit = auditText(text, { full: true })
    setAuditResult({ flags: audit.flags, length: text.length })
    if (audit.flags.length === 0) {
      message.success('Audit passed: no clichés or banned terms detected.')
    } else {
      message.warning('Audit found items. See details below.')
    }
  }

  return (
    <div className="companion-panel">
      <div className="companion-header">
        <div className="companion-title-wrap">
          <Text strong className="companion-title">Voice</Text>
        </div>
        <Space size={8}>
          <VoiceBadge />
          <RulesPopover />
          <Button size="small" onClick={() => message.info('Loaded master style guide.')} aria-label="Read master style">
            Read style
          </Button>
        </Space>
      </div>

      <div className="voice-select">
        <VoiceSelect />
        <div className="voice-summary">
          <Text type="secondary">{activeVoice.summary}</Text>
        </div>
        <Divider style={{ margin: '12px 0' }} />
        <ScopeSelector />
        <Space direction="vertical" style={{ width: '100%' }}>
          <Upload
            beforeUpload={(file) => {
              setUploading(true)
              const reader = new FileReader()
              reader.onload = () => {
                const text = reader.result?.toString() ?? ''
                addWritingStyle(file.name, text)
                  .then(() => {
                    message.success(`Style "${file.name}" saved.`)
                  })
                  .catch((e: any) => {
                    message.error(e?.message ?? 'Failed to save style')
                  })
                  .finally(() => setUploading(false))
              }
              reader.onerror = () => {
                message.error('Failed to read style file.')
                setUploading(false)
              }
              reader.readAsText(file)
              return false
            }}
            showUploadList={false}
          >
            <Button size="small" loading={uploading}>Upload writing style</Button>
          </Upload>
          {styleList.length > 0 && (
            <div className="style-list">
              <Text type="secondary" style={{ fontSize: 12 }}>Saved styles</Text>
              <ul>
                {styleList.map((s: any) => (
                  <li key={s.id}>
                    <Text>{s.name}</Text>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Space>
      </div>

      <div className="selection-preview">
        <Text type="secondary" style={{ fontSize: 12 }}>Selection</Text>
        <div className="selection-box">{selectionPreview || selectionStub}</div>
        <Button size="small" type="link" onClick={() => setSelectionPreview(selectionStub)}>
          Sync selection
        </Button>
        <Button size="small" onClick={runFullAudit}>
          Audit full document (rules + clichés)
        </Button>
        {auditResult && (
          <Alert
            style={{ marginTop: 6 }}
            type={auditResult.flags.length ? 'warning' : 'success'}
            showIcon
            message={
              auditResult.flags.length
                ? `Audit found ${auditResult.flags.length} issues`
                : 'Audit passed'
            }
            description={
              auditResult.flags.length ? (
                <ul className="flags-list">
                  {auditResult.flags.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              ) : (
                `Document length: ${auditResult.length} chars`
              )
            }
          />
        )}
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key)
          setMode(key as any)
        }}
        size="small"
        items={[
          { key: 'actions', label: 'Actions', children: <ActionMode editorRef={editorRef} /> },
          { key: 'chat', label: 'Iterative Chat', children: <ChatMode editorRef={editorRef} /> },
          { key: 'autonomous', label: 'Autonomous Draft', children: <AutonomousMode /> },
        ]}
      />
    </div>
  )
}
