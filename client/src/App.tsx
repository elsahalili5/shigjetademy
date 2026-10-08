import { useReveal } from './hooks/useReveal'
import { Nav } from './components/Nav'
import { Hero } from './components/Hero'
import { Patchwork } from './components/Patchwork'
import { Features } from './components/Features'
import { DayTimeline } from './components/DayTimeline'
import { Workflow } from './components/Workflow'
import { Roles } from './components/Roles'
import { Faq } from './components/Faq'
import { Demo } from './components/Demo'
import { Footer } from './components/Footer'

function App() {
  useReveal()

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Patchwork />
        <Features />
        <DayTimeline />
        <Workflow />
        <Roles />
        <Faq />
        <Demo />
      </main>
      <Footer />
    </>
  )
}

export default App
