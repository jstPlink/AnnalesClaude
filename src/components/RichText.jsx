import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

const HTML_RE = /<[a-z!/][\s\S]*>/i

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Converte il valore memorizzato in HTML da mettere nell'editor.
// Le note vecchie sono testo semplice: preserva gli a capo.
function toHtml(value) {
  const v = value || ''
  if (HTML_RE.test(v)) return v
  return escapeHtml(v).replace(/\r\n|\r|\n/g, '<br>')
}

function isEmpty(el) {
  return el.textContent.trim() === '' && !el.querySelector('img')
}

// Editor WYSIWYG minimale (grassetto / corsivo / sottolineato).
// Il contenuto viene emesso come HTML tramite onChange.
const RichText = forwardRef(function RichText(
  { value, onChange, onFocusChange, placeholder = '', className = '' },
  ref,
) {
  const elRef = useRef(null)
  const lastHtml = useRef(undefined)

  useImperativeHandle(ref, () => ({
    exec(command) {
      const el = elRef.current
      if (!el) return
      el.focus()
      document.execCommand(command, false)
      const html = el.innerHTML
      lastHtml.current = html
      el.dataset.empty = String(isEmpty(el))
      onChange?.(html)
    },
    focus() {
      elRef.current?.focus()
    },
  }))

  // Sincronizza value -> DOM solo quando cambia dall'esterno (evita salti del cursore).
  useEffect(() => {
    const el = elRef.current
    if (!el) return
    if (value !== lastHtml.current) {
      el.innerHTML = toHtml(value)
      lastHtml.current = value
      el.dataset.empty = String(isEmpty(el))
    }
  }, [value])

  function emit() {
    const el = elRef.current
    const html = el.innerHTML
    lastHtml.current = html
    el.dataset.empty = String(isEmpty(el))
    onChange?.(html)
  }

  function handleInput() {
    emit()
  }

  // "-" + spazio a inizio riga -> punto elenco.
  function handleKeyDown(e) {
    if (e.key !== ' ' && e.key !== 'Spacebar') return
    const sel = window.getSelection()
    if (!sel || !sel.isCollapsed || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    const node = range.startContainer
    if (node.nodeType !== 3) return
    const before = node.textContent.slice(0, range.startOffset)
    const lineStart = before.lastIndexOf('\n') + 1
    if (before.slice(lineStart).trim() !== '-') return

    e.preventDefault()
    range.setStart(node, range.startOffset - 1)
    range.deleteContents()
    document.execCommand('insertUnorderedList', false)
    emit()
  }

  return (
    <div
      ref={elRef}
      className={'richtext ' + className}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label={placeholder || 'Contenuto della nota'}
      data-placeholder={placeholder}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onFocus={() => onFocusChange?.(true)}
      onBlur={() => onFocusChange?.(false)}
    />
  )
})

export default RichText
