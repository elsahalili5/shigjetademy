import { PageHeader } from '../components/PageHeader'
import { Link, useTitle } from '../lib/router'

export function NotFound() {
  useTitle('Page not found · Shigjetademy')
  return (
    <PageHeader
      id="not-found-title"
      title="This page doesn’t exist."
      intro="The link may be old or mistyped. Head back to the homepage to find what you need."
    >
      <Link className="button hero__primary" href="/">
        Go to the homepage
      </Link>
    </PageHeader>
  )
}
