import type { CSSProperties, ReactNode } from 'react'
import { Arcs } from './Arcs'
import './PageHeader.css'

const i = (n: number) => ({ '--i': n }) as CSSProperties

type Props = {
  id: string
  title: ReactNode
  intro: ReactNode
  children?: ReactNode
}

/** The navy opening band every inner page shares, echoing the homepage hero. */
export function PageHeader({ id, title, intro, children }: Props) {
  return (
    <header className="page-header" aria-labelledby={id}>
      <Arcs className="page-header__arcs" />
      <div className="container page-header__inner">
        <h1 id={id} className="rise" style={i(0)}>
          {title}
        </h1>
        <p className="page-header__intro rise" style={i(1)}>
          {intro}
        </p>
        {children && (
          <div className="page-header__extra rise" style={i(2)}>
            {children}
          </div>
        )}
      </div>
    </header>
  )
}
