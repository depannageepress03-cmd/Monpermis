import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ModuleItem, ModuleTone } from '../data/modules'

const toneClass: Record<ModuleTone, string> = {
  green: 'module-card-green',
  gold: 'module-card-gold',
  navy: 'module-card-navy',
}

interface ModuleCardProps {
  item: ModuleItem
}

export function ModuleCard({ item }: ModuleCardProps) {
  const Icon = item.icon

  return (
    <Link to={item.path} className={`module-card ${toneClass[item.tone]}`}>
      <div className="module-card-top">
        <span className={`module-card-icon module-card-icon-${item.tone}`}>
          <Icon size={22} />
        </span>
        <ChevronRight size={20} className="module-card-chevron" />
      </div>
      <h3 className="module-card-title">{item.label}</h3>
      <p className="module-card-subtitle">{item.subtitle}</p>
    </Link>
  )
}
