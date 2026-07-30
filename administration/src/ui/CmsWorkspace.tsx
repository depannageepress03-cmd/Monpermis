import type { ReactNode } from 'react'

interface CmsWorkspaceProps {
  tree: ReactNode
  editor: ReactNode
  preview?: ReactNode
}

/** Layout CMS : arbre | éditeur | preview (responsive empilé). */
export function CmsWorkspace({ tree, editor, preview }: CmsWorkspaceProps) {
  return (
    <div className="ui-cms-workspace">
      <aside className="ui-cms-tree" aria-label="Arborescence">
        {tree}
      </aside>
      <section className="ui-cms-editor" aria-label="Éditeur">
        {editor}
      </section>
      {preview ? (
        <aside className="ui-cms-preview" aria-label="Aperçu">
          {preview}
        </aside>
      ) : null}
    </div>
  )
}
