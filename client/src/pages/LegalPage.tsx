import type { ReactNode } from 'react'
import { PageHeader } from '../components/PageHeader'
import { Link, useTitle } from '../lib/router'
import { SITE } from '../lib/site'

type Kind = 'privacy' | 'terms' | 'security'

type Section = { id: string; heading: string; body: ReactNode }

type Doc = { title: string; intro: string; updated: string; sections: Section[] }

const mail = <a href={`mailto:${SITE.email}`}>{SITE.email}</a>

/*
 * Drafts written to match how the product actually works today (see server/src).
 * Have them reviewed by a lawyer before launch, and update `updated` whenever the text changes.
 */
const DOCS: Record<Kind, Doc> = {
  privacy: {
    title: 'Privacy Policy',
    intro: 'What personal information Shigjetademy collects, why we collect it, and the choices you have.',
    updated: '9 October 2026',
    sections: [
      {
        id: 'who-we-are',
        heading: 'Who we are',
        body: (
          <>
            <p>
              Shigjetademy is an education management platform for schools, academies and tutoring centres. This
              policy covers this website and the Shigjetademy dashboard.
            </p>
            <p>
              Schools and academies that use Shigjetademy decide what student, parent and staff information they put in
              it. For that information, the organization is the data controller and Shigjetademy processes it on their
              behalf. For information you give us directly, such as a demo request, Shigjetademy is the controller.
            </p>
          </>
        ),
      },
      {
        id: 'what-we-collect',
        heading: 'Information we collect',
        body: (
          <>
            <p>
              <strong>When you request a demo:</strong> your name, email address, organization name, organization type
              and size.
            </p>
            <p>
              <strong>When you have an account:</strong> your name, email address, organization and a securely hashed
              version of your password. We never store your password in readable form.
            </p>
            <p>
              <strong>Information organizations add to the dashboard:</strong> such as student and family contact
              details, enrolments, timetables, attendance, grades, learning materials, invoices and payment status, and
              messages.
            </p>
            <p>
              <strong>When you sign in:</strong> a session cookie that keeps you signed in. We do not use advertising or
              analytics cookies.
            </p>
          </>
        ),
      },
      {
        id: 'how-we-use',
        heading: 'How we use it',
        body: (
          <ul>
            <li>To reply to demo requests and set up your organization’s account.</li>
            <li>To provide the dashboard and its features to your organization.</li>
            <li>To keep accounts secure, for example by limiting repeated failed sign-ins.</li>
            <li>To contact you about your account and important changes to the service.</li>
          </ul>
        ),
      },
      {
        id: 'sharing',
        heading: 'Who we share it with',
        body: (
          <>
            <p>
              We do not sell personal information, and we do not use it for advertising. Inside an organization, people
              see information according to their role: for example, parents see their own child’s grades and attendance,
              not anyone else’s.
            </p>
            <p>
              We may share information with service providers that help us run Shigjetademy, such as hosting, under
              agreements that protect it, or where the law requires us to.
            </p>
          </>
        ),
      },
      {
        id: 'children',
        heading: 'Children’s information',
        body: (
          <p>
            Many students in Shigjetademy are children. Their information is added by their school or academy, which is
            responsible for having the right basis and, where needed, parental consent to do so. We use it only to
            provide the service to that organization.
          </p>
        ),
      },
      {
        id: 'retention',
        heading: 'How long we keep it',
        body: (
          <p>
            We keep account and dashboard information for as long as the organization uses Shigjetademy. When an
            organization closes its account, we delete or return its data within a reasonable period, unless the law
            requires us to keep it longer. We keep demo requests only as long as needed to follow up on them.
          </p>
        ),
      },
      {
        id: 'your-rights',
        heading: 'Your rights',
        body: (
          <>
            <p>
              Depending on where you live, you can ask to access, correct, delete or export your personal information,
              or object to how it is used. If your information was added by a school or academy, contact them first; we
              will help them respond.
            </p>
            <p>To make a request, email us at {mail}.</p>
          </>
        ),
      },
      {
        id: 'changes',
        heading: 'Changes to this policy',
        body: (
          <p>
            If we change this policy, we will update the date at the top of this page. If the change is significant, we
            will also tell account holders by email.
          </p>
        ),
      },
    ],
  },

  terms: {
    title: 'Terms of Service',
    intro: 'The agreement between Shigjetademy and the organizations and people who use it.',
    updated: '9 October 2026',
    sections: [
      {
        id: 'agreement',
        heading: 'Agreement',
        body: (
          <p>
            By using Shigjetademy, you agree to these terms. If you use it on behalf of a school, academy or other
            organization, you confirm that you are allowed to accept these terms for that organization.
          </p>
        ),
      },
      {
        id: 'accounts',
        heading: 'Accounts',
        body: (
          <>
            <p>
              Accounts are created for organizations by Shigjetademy. Each organization is responsible for who it gives
              access to and for the roles those people have.
            </p>
            <p>
              Keep your password private and tell us straight away at {mail} if you think someone else has used your
              account.
            </p>
          </>
        ),
      },
      {
        id: 'your-data',
        heading: 'Your data',
        body: (
          <p>
            Your organization owns the information it puts into Shigjetademy. You give us permission to store and
            process it only to provide the service to you. You are responsible for having the right to add that
            information, including any consent needed from students or parents. Our{' '}
            <Link href="/privacy">Privacy Policy</Link> explains how we handle it.
          </p>
        ),
      },
      {
        id: 'acceptable-use',
        heading: 'Acceptable use',
        body: (
          <>
            <p>You agree not to:</p>
            <ul>
              <li>Use Shigjetademy for anything unlawful, or to harass or harm others.</li>
              <li>Upload content you have no right to share, or that contains malware.</li>
              <li>Try to access accounts or data that are not yours, or to break or overload the service.</li>
              <li>Copy, resell or reverse engineer the service.</li>
            </ul>
          </>
        ),
      },
      {
        id: 'fees',
        heading: 'Fees',
        body: (
          <p>
            Any fees for using Shigjetademy are agreed with your organization before you start. Fees that students pay
            your organization through the dashboard are between you and them; Shigjetademy only helps you record and
            track them.
          </p>
        ),
      },
      {
        id: 'availability',
        heading: 'Availability and changes',
        body: (
          <p>
            We work to keep Shigjetademy available and reliable, but we cannot promise it will never be interrupted. We
            may improve or change features over time. If we remove something your organization relies on, we will tell
            you in advance.
          </p>
        ),
      },
      {
        id: 'ending',
        heading: 'Ending your use',
        body: (
          <p>
            You can stop using Shigjetademy at any time. We may suspend or close an account that seriously or repeatedly
            breaks these terms. When an account closes, you can ask us to export your organization’s data before it is
            deleted.
          </p>
        ),
      },
      {
        id: 'liability',
        heading: 'Liability',
        body: (
          <p>
            Shigjetademy is provided as it is. To the extent the law allows, we are not liable for indirect losses, such
            as lost profits or lost data, arising from use of the service. Nothing in these terms limits liability that
            cannot be limited by law.
          </p>
        ),
      },
      {
        id: 'changes',
        heading: 'Changes to these terms',
        body: (
          <p>
            We may update these terms. We will change the date at the top of this page and, for significant changes, tell
            account holders by email before they take effect. Questions? Email {mail}.
          </p>
        ),
      },
    ],
  },

  security: {
    title: 'Security',
    intro: 'How Shigjetademy protects your organization’s accounts and data.',
    updated: '9 October 2026',
    sections: [
      {
        id: 'accounts',
        heading: 'Account security',
        body: (
          <ul>
            <li>
              Passwords are never stored in readable form. They are hashed with scrypt and a unique salt for every user.
            </li>
            <li>
              Sign-in sessions use a random token in a cookie that page scripts cannot read, and they expire
              automatically.
            </li>
            <li>Repeated failed sign-ins are blocked for a period, which slows down password-guessing attempts.</li>
            <li>There is no public sign-up: accounts are created for each organization by our team.</li>
          </ul>
        ),
      },
      {
        id: 'access',
        heading: 'Access by role',
        body: (
          <p>
            Owners, admins, teachers, students and parents each see only what their role needs. A teacher sees their own
            groups; a parent sees their own child’s information.
          </p>
        ),
      },
      {
        id: 'data',
        heading: 'Protecting data',
        body: (
          <ul>
            <li>We collect only the information needed to run the service.</li>
            <li>Each organization’s data is kept separate from every other organization’s.</li>
            <li>We do not sell data or use it for advertising, and the site has no tracking cookies.</li>
          </ul>
        ),
      },
      {
        id: 'you',
        heading: 'What you can do',
        body: (
          <ul>
            <li>Use a strong password that you do not use anywhere else.</li>
            <li>Give each person their own account, and remove access when someone leaves.</li>
            <li>Sign out on shared computers.</li>
          </ul>
        ),
      },
      {
        id: 'report',
        heading: 'Reporting a problem',
        body: (
          <p>
            If you think you have found a security issue, or that your account has been accessed by someone else, email
            us straight away at {mail}. Please give us a chance to fix an issue before you share it publicly. We will
            reply as quickly as we can.
          </p>
        ),
      },
    ],
  },
}

export function LegalPage({ kind }: { kind: Kind }) {
  const doc = DOCS[kind]
  useTitle(`${doc.title} · Shigjetademy`)
  return (
    <>
      <PageHeader id={`${kind}-title`} title={doc.title} intro={doc.intro} />
      <section className="section shell grid grid-cols-[minmax(200px,3fr)_minmax(0,7fr)] items-start gap-[clamp(32px,6vw,96px)] pb-[clamp(96px,13vw,160px)] max-[860px]:grid-cols-1">
        {/* Contents list stays in view while reading */}
        <nav className="sticky top-[calc(var(--nav-h)+24px)] max-[860px]:static" aria-label="On this page">
          <p className="mb-4 font-data text-[0.8rem] text-ink-3">Last updated {doc.updated}</p>
          <ol className="border-l border-rule-strong">
            {doc.sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block py-[7px] pl-4 text-ink-2 no-underline hover:text-green-deep">
                  {s.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="max-w-[68ch] text-[1.05rem] text-ink-2 [&_a]:font-semibold [&_a]:text-green-deep [&_strong]:text-ink [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-2 [&_ul]:pl-[1.2em] [&_:is(p,ul)+:is(p,ul)]:mt-3">
          {doc.sections.map((s) => (
            <section
              key={s.id}
              id={s.id}
              aria-labelledby={`${s.id}-h`}
              className="scroll-mt-[calc(var(--nav-h)+24px)] pb-9 [&+section]:border-t [&+section]:border-rule [&+section]:pt-9"
            >
              <h2 id={`${s.id}-h`} className="mb-3.5 text-[clamp(1.35rem,2vw,1.65rem)] font-[650] tracking-[-0.02em] text-ink">{s.heading}</h2>
              {s.body}
            </section>
          ))}

          <p className="border-t border-rule-strong pt-7">
            Also see{' '}
            {(['privacy', 'terms', 'security'] as Kind[])
              .filter((k) => k !== kind)
              .map((k, n) => (
                <span key={k}>
                  {n > 0 && ' and '}
                  <Link href={`/${k}`}>{DOCS[k].title}</Link>
                </span>
              ))}
            .
          </p>
        </div>
      </section>
    </>
  )
}
