import { ArrowRight, BookOpen, FileQuestion, MessageSquare } from 'lucide-react'
import { Link } from '../lib/router'
import art from '../assets/illustrations/online-learning.png'

const POINTS = [
  { icon: BookOpen, title: 'Learning materials', text: 'Notes and files ready whenever students study.', href: '/platform/materials' },
  { icon: FileQuestion, title: 'Tests', text: 'Results recorded straight into the gradebook.', href: '/platform/tests' },
  { icon: MessageSquare, title: 'Messages', text: 'Families and teachers in touch between lessons.', href: '/platform/messages' },
]

/** Learning beyond the classroom: what reaches students and families between lessons. */
export function Anywhere() {
  return (
    <section className="band-white section" aria-labelledby="anywhere-title">
      <div className="shell">
        <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-center gap-[clamp(32px,5vw,80px)] max-[900px]:grid-cols-1">
          <div>
            <h2
              id="anywhere-title"
              className="text-[clamp(2rem,4vw,3.6rem)] font-[680] leading-[1.04] tracking-[-0.032em] text-balance"
            >
              Teaching doesn’t stop at the <em className="not-italic text-green-deep">classroom door.</em>
            </h2>
            <p className="mt-5 max-w-[42ch] text-[1.1rem] text-ink-2">
              Between lessons, students study, families check in and teachers follow up. Shigjetademy keeps all of it
              tied to the same classes.
            </p>
            <Link
              className="group/more mt-7 inline-flex items-center gap-2 font-[650] text-green-deep no-underline"
              href="/platform"
            >
              See every module
              <ArrowRight
                className="transition-transform duration-200 ease-out group-hover/more:translate-x-[3px]"
                size={16}
                strokeWidth={2.2}
                aria-hidden="true"
              />
            </Link>
          </div>

          {/* Always visible: the picture never waits on a scroll animation */}
          <img
            className="block h-auto w-full max-[900px]:-order-1"
            src={art}
            alt="A teacher giving a video lesson while a student reads on a laptop."
            width={1200}
            height={896}
            decoding="async"
          />
        </div>

        <ul className="mt-[clamp(48px,6vw,80px)] grid grid-cols-3 gap-3 max-[900px]:grid-cols-1">
          {POINTS.map(({ icon: Icon, title, text, href }) => (
            <li key={title}>
              <Link
                href={href}
                className="group relative isolate grid h-full gap-1.5 overflow-hidden rounded-card border border-rule p-6 text-ink-2 no-underline transition-[border-color,translate,scale,box-shadow] duration-[250ms] ease-out hover:-translate-y-1 hover:border-green/40 hover:shadow-[0_18px_36px_-20px_rgba(15,125,95,0.45)] active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                {/* Green wash that rises from the bottom on hover */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 bg-linear-to-t from-green-wash to-[color-mix(in_srgb,var(--green-wash)_30%,white)] transition-[clip-path] duration-[400ms] ease-out [clip-path:inset(100%_0_0_0)] group-hover:[clip-path:inset(0)] group-focus-visible:[clip-path:inset(0)] motion-reduce:transition-none"
                />
                <span
                  aria-hidden="true"
                  className="mb-3 grid size-12 place-items-center rounded-[14px] bg-green-wash text-green-deep transition-[background-color,color,translate,rotate] duration-300 ease-out group-hover:-translate-y-0.5 group-hover:-rotate-6 group-hover:bg-green-deep group-hover:text-white motion-reduce:group-hover:translate-y-0 motion-reduce:group-hover:rotate-0"
                >
                  <Icon size={22} strokeWidth={1.8} />
                </span>
                <strong className="inline-flex items-center gap-2 text-[1.1rem] text-ink transition-colors duration-200 group-hover:text-green-deep">
                  {title}
                  <ArrowRight
                    className="-translate-x-1.5 opacity-0 transition-[opacity,translate] duration-[250ms] ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
                    size={16}
                    strokeWidth={2.2}
                    aria-hidden="true"
                  />
                </strong>
                <span>{text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
