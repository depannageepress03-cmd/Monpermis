import { AdminSectionHeader } from '../components/AdminSectionHeader'

interface ModulePlaceholderPageProps {
  title: string
  description: string
  backTo: string
  backLabel?: string
}

export function ModulePlaceholderPage({
  title,
  description,
  backTo,
  backLabel,
}: ModulePlaceholderPageProps) {
  return (
    <div className="admin-page">
      <AdminSectionHeader
        backTo={backTo}
        backLabel={backLabel}
        title={title}
        subtitle={description}
      />

      <section className="admin-section">
        <div className="admin-section-body">
          <p className="admin-empty">Module en préparation — cette section sera construite ensuite.</p>
        </div>
      </section>
    </div>
  )
}
