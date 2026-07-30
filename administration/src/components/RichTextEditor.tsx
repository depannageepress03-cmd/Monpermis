import { useEditor, EditorContent, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Highlight from '@tiptap/extension-highlight'
import CharacterCount from '@tiptap/extension-character-count'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
} from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  /** Hauteur minimale de la zone d’édition (px). */
  minHeight?: number
  /** Limite soft affichée (caractères). 0 = pas de limite. */
  maxCharacters?: number
  compact?: boolean
}

/** Nettoie le HTML collé (Word / Pages / navigateur) tout en gardant la structure utile. */
function cleanPastedHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?(?:meta|link|xml|o:[a-z]+)[^>]*>/gi, '')
    .replace(/\s(?:class|style|id|dir|lang|face|size|color|data-[a-z0-9_-]+)="[^"]*"/gi, '')
    .replace(/\s(?:class|style|id|dir|lang|face|size|color|data-[a-z0-9_-]+)='[^']*'/gi, '')
    .replace(/<span(?:\s[^>]*)?>/gi, '')
    .replace(/<\/span>/gi, '')
    .replace(/<font(?:\s[^>]*)?>/gi, '')
    .replace(/<\/font>/gi, '')
    .replace(/<(?:div|section|article|header|footer)(?:\s[^>]*)?>/gi, '<p>')
    .replace(/<\/(?:div|section|article|header|footer)>/gi, '</p>')
    .replace(/(?:&nbsp;|\u00a0){2,}/g, ' ')
    .replace(/(<p>\s*<\/p>\s*){2,}/gi, '<p></p>')
}

function normalizeLinkHref(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (/^(https?:\/\/|mailto:)/i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function ToolbarButton({
  active,
  disabled,
  onClick,
  label,
  children,
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  label: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={`rich-toolbar-btn${active ? ' is-active' : ''}`}
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault()
      }}
      onClick={(e) => {
        e.preventDefault()
        onClick()
      }}
      aria-label={label}
      aria-pressed={Boolean(active)}
      title={label}
    >
      {children}
    </button>
  )
}

function ToolbarSep() {
  return <span className="rich-toolbar-sep" aria-hidden="true" />
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Rédigez le cours…',
  minHeight = 220,
  maxCharacters = 0,
  compact = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        blockquote: {},
        horizontalRule: {},
      }),
      Underline,
      Highlight.configure({ multicolor: false }),
      CharacterCount.configure({
        limit: maxCharacters > 0 ? maxCharacters : undefined,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    onUpdate: ({ editor: current }) => {
      const html = current.getHTML()
      onChange(html === '<p></p>' ? '' : html)
    },
    onBlur: ({ editor: current }) => {
      current.view.dispatch(current.state.tr.setStoredMarks([]))
    },
    editorProps: {
      attributes: {
        class: `rich-editor-content${compact ? ' is-compact' : ''}`,
        spellcheck: 'true',
        style: `min-height: ${compact ? Math.min(minHeight, 140) : minHeight}px`,
      },
      transformPastedHTML: cleanPastedHtml,
    },
  })

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    const next = value || ''
    if (next !== current && next !== (current === '<p></p>' ? '' : current)) {
      editor.commands.setContent(next || '', { emitUpdate: false })
      editor.view.dispatch(editor.state.tr.setStoredMarks([]))
    }
  }, [value, editor])

  const toolbar = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      if (!current) {
        return {
          bold: false,
          italic: false,
          underline: false,
          strike: false,
          highlight: false,
          paragraph: false,
          heading2: false,
          heading3: false,
          bulletList: false,
          orderedList: false,
          blockquote: false,
          alignLeft: false,
          alignCenter: false,
          alignRight: false,
          link: false,
          canUndo: false,
          canRedo: false,
          characters: 0,
          words: 0,
        }
      }

      const storage = current.storage.characterCount as
        | { characters: () => number; words: () => number }
        | undefined

      return {
        bold: current.isFocused && current.isActive('bold'),
        italic: current.isFocused && current.isActive('italic'),
        underline: current.isFocused && current.isActive('underline'),
        strike: current.isFocused && current.isActive('strike'),
        highlight: current.isFocused && current.isActive('highlight'),
        paragraph: current.isActive('paragraph'),
        heading2: current.isActive('heading', { level: 2 }),
        heading3: current.isActive('heading', { level: 3 }),
        bulletList: current.isActive('bulletList'),
        orderedList: current.isActive('orderedList'),
        blockquote: current.isActive('blockquote'),
        alignLeft: current.isActive({ textAlign: 'left' }),
        alignCenter: current.isActive({ textAlign: 'center' }),
        alignRight: current.isActive({ textAlign: 'right' }),
        link: current.isActive('link'),
        canUndo: current.can().undo(),
        canRedo: current.can().redo(),
        characters: storage?.characters() ?? 0,
        words: storage?.words() ?? 0,
      }
    },
  })

  if (!editor || !toolbar) return null

  const applyLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined
    const raw = window.prompt('URL du lien', previous || 'https://')
    if (raw === null) return
    const href = normalizeLinkHref(raw)
    if (!href) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
  }

  const clearFormatting = () => {
    editor.chain().focus().unsetAllMarks().clearNodes().run()
  }

  const overLimit = maxCharacters > 0 && toolbar.characters > maxCharacters

  return (
    <div className={`rich-editor${compact ? ' rich-editor--compact' : ''}`}>
      <div className="rich-toolbar" role="toolbar" aria-label="Mise en forme">
        <ToolbarButton
          label="Annuler (Ctrl+Z)"
          disabled={!toolbar.canUndo}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Rétablir (Ctrl+Shift+Z)"
          disabled={!toolbar.canRedo}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 size={15} />
        </ToolbarButton>

        <ToolbarSep />

        <ToolbarButton
          label="Gras (Ctrl+B)"
          active={toolbar.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Italique (Ctrl+I)"
          active={toolbar.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Souligné (Ctrl+U)"
          active={toolbar.underline}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Barré"
          active={toolbar.strike}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Surligner"
          active={toolbar.highlight}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <Highlighter size={15} />
        </ToolbarButton>
        <ToolbarButton label="Effacer la mise en forme" onClick={clearFormatting}>
          <Eraser size={15} />
        </ToolbarButton>

        <ToolbarSep />

        <ToolbarButton
          label="Paragraphe"
          active={toolbar.paragraph}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          <Pilcrow size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Titre"
          active={toolbar.heading2}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Sous-titre"
          active={toolbar.heading3}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Citation"
          active={toolbar.blockquote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Ligne horizontale"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus size={15} />
        </ToolbarButton>

        <ToolbarSep />

        <ToolbarButton
          label="Liste à puces"
          active={toolbar.bulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Liste numérotée"
          active={toolbar.orderedList}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={15} />
        </ToolbarButton>

        <ToolbarSep />

        <ToolbarButton label="Insérer un lien" active={toolbar.link} onClick={applyLink}>
          <LinkIcon size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Retirer le lien"
          disabled={!toolbar.link}
          onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}
        >
          <Unlink size={15} />
        </ToolbarButton>

        <ToolbarSep />

        <ToolbarButton
          label="Aligner à gauche"
          active={toolbar.alignLeft}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Centrer"
          active={toolbar.alignCenter}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Aligner à droite"
          active={toolbar.alignRight}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight size={15} />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />

      <div className="rich-editor-footer">
        <span className="rich-editor-hint">
          Coller depuis Word OK · Ctrl+B/I/U · Tab pour indenter une liste
        </span>
        <span className={`rich-editor-count${overLimit ? ' is-over' : ''}`}>
          {toolbar.words} mot{toolbar.words === 1 ? '' : 's'} · {toolbar.characters}
          {maxCharacters > 0 ? ` / ${maxCharacters}` : ''} car.
        </span>
      </div>
    </div>
  )
}
