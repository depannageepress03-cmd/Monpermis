import { ModuleCard } from '../../components/ModuleCard'
import { AdminSectionHeader } from '../../components/AdminSectionHeader'
import { codeModules } from '../../data/modules'

export function CodeRouteHubPage() {
  return (
    <section className="admin-panel">
      <AdminSectionHeader
        backTo="/"
        backLabel="Tableau de bord"
        kicker="Formation"
        title="Code de la route"
        subtitle="Révision, examens, notes et examen blanc."
      />
      <div className="module-grid">
        {codeModules.map((module) => (
          <ModuleCard key={module.id} item={module} />
        ))}
      </div>
    </section>
  )
}
