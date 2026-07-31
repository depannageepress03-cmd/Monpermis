import { ModuleCard } from '../../components/ModuleCard'
import { AdminSectionHeader } from '../../components/AdminSectionHeader'
import { conduiteModules } from '../../data/modules'

export function ConduiteHubPage() {
  return (
    <section className="admin-panel">
      <AdminSectionHeader
        backTo="/"
        backLabel="Tableau de bord"
        kicker="Formation"
        title="Conduite"
        subtitle="Leçons pratiques, moniteurs et réservations."
      />
      <div className="module-grid">
        {conduiteModules.map((module, index) => (
          <ModuleCard key={module.id} item={module} delay={index * 70} />
        ))}
      </div>
    </section>
  )
}
