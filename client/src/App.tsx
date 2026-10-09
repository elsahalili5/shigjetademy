import { useReveal } from './hooks/useReveal'
import { usePath } from './lib/router'
import { Nav } from './components/Nav'
import { Footer } from './components/Footer'
import { Home } from './pages/Home'
import { PlatformPage } from './pages/PlatformPage'
import { SolutionsPage } from './pages/SolutionsPage'
import { FeaturesPage } from './pages/FeaturesPage'
import { ResourcesPage } from './pages/ResourcesPage'
import { ContactPage } from './pages/ContactPage'
import { AuthPage } from './pages/AuthPage'
import { LegalPage } from './pages/LegalPage'
import { NotFound } from './pages/NotFound'

const PAGES: Record<string, () => React.JSX.Element> = {
  '/': Home,
  '/platform': PlatformPage,
  '/solutions': SolutionsPage,
  '/features': FeaturesPage,
  '/resources': ResourcesPage,
  '/contact': ContactPage,
  '/privacy': () => <LegalPage kind="privacy" />,
  '/terms': () => <LegalPage kind="terms" />,
  '/security': () => <LegalPage kind="security" />,
}

function App() {
  const path = usePath()
  useReveal(path)
  const Page = PAGES[path] ?? NotFound

  // Auth pages stand alone: no site nav or footer
  if (path === '/login') {
    return <AuthPage />
  }

  return (
    <>
      <Nav />
      <main key={path}>
        <Page />
      </main>
      <Footer />
    </>
  )
}

export default App
