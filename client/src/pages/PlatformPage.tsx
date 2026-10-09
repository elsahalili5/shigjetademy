import { PageHeader } from '../components/PageHeader'
import { Patchwork } from '../components/Patchwork'
import { useTitle } from '../lib/router'
import { MODULES } from '../lib/modules'
import { ModuleCard } from './ModulePage'
import './Platform.css'

export function PlatformPage() {
  useTitle('Platform · Shigjetademy')
  return (
    <>
      <PageHeader
        id="platform-page-title"
        title={
          <>
            One platform for the <em>whole term.</em>
          </>
        }
        intro="Enrolment, timetables, attendance, fees, grades and messages share the same students and the same classes, so every step feeds the next."
      />

      <section className="section container" aria-labelledby="modules-title">
        <div className="section-head" data-reveal>
          <h2 id="modules-title">Every module in the dashboard.</h2>
          <p>Each one has its own page. Pick a module to see what it does and who uses it.</p>
        </div>
        <ul className="modules-grid" data-reveal>
          {MODULES.map((m) => (
            <li key={m.slug}>
              <ModuleCard mod={m} />
            </li>
          ))}
        </ul>
      </section>

      <Patchwork />
    </>
  )
}
