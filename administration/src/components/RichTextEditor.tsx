import { useEditor, EditorContent, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Pilcrow,
  Strikethrough,
  Underline as UnderlineIcon,
} from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean
  onClick: () => void
  label: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={`rich-toolbar-btn${active ? ' is-active' : ''}`}
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

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Rédigez le cours…',
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
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
      // Évite qu’un format (gras, etc.) reste « armé » sans clic explicite.
      current.view.dispatch(current.state.tr.setStoredMarks([]))
    },
    editorProps: {
      attributes: {
        class: 'rich-editor-content',
      },
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
          paragraph: false,
          heading: false,
          bulletList: false,
          orderedList: false,
          alignLeft: false,
          alignCenter: false,
          alignRight: false,
        }
      }

      return {
        // Les marques ne s’affichent actives que si le curseur est vraiment dessus
        // (pas seulement une marque « en attente » hors focus).
        bold: current.isFocused && current.isActive('bold'),
        italic: current.isFocused && current.isActive('italic'),
        underline: current.isFocused && current.isActive('underline'),
        strike: current.isFocused && current.isActive('strike'),
        paragraph: current.isActive('paragraph'),
        heading: current.isActive('heading', { level: 2 }),
        bulletList: current.isActive('bulletList'),
        orderedList: current.isActive('orderedList'),
        alignLeft: current.isActive({ textAlign: 'left' }),
        alignCenter: current.isActive({ textAlign: 'center' }),
        alignRight: current.isActive({ textAlign: 'right' }),
      }
    },
  })

  if (!editor || !toolbar) return null

  return (
    <div className="rich-editor">
      <div className="rich-toolbar" role="toolbar" aria-label="Mise en forme">
        <ToolbarButton
          label="Gras"
          active={toolbar.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Italique"
          active={toolbar.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Souligné"
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

        <span className="rich-toolbar-sep" />

        <ToolbarButton
          label="Paragraphe"
          active={toolbar.paragraph}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          <Pilcrow size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Sous-titre"
          active={toolbar.heading}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={15} />
        </ToolbarButton>

        <span className="rich-toolbar-sep" />

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

        <span className="rich-toolbar-sep" />

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
    </div>
  )
}
