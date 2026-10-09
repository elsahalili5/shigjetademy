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
      <Link className="button bg-green text-navy shadow-[0_1px_2px_rgba(0,0,0,0.2),0_14px_28px_-12px_rgba(31,176,139,0.55)] hover:bg-[#2bc49c]" href="/">
        Go to the homepage
      </Link>
    </PageHeader>
  )
}
