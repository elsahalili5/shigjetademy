import { useEffect, useState } from "react";
import { LogIn, Menu, X } from "lucide-react";
import wordmark from "../assets/brand/shigjetademy-wordmark.png"
import { Link } from "../lib/router";

const LINKS = [
  { href: "/platform", label: "Platform" },
  { href: "/solutions", label: "Solutions" },
  { href: "/resources", label: "Resources" },
  { href: "/contact", label: "Contact" },
];

/* Tabs: haze blocks over the panel's corners, with concave curves (the ::before/::after notches)
   where they meet the navy. Once the bar is solid they dissolve into it. */
const tab =
  "relative flex h-(--nav-h) items-center gap-1.5 bg-haze transition-colors duration-[260ms] before:pointer-events-none before:absolute before:size-(--notch) before:transition-opacity before:duration-200 before:content-[''] after:pointer-events-none after:absolute after:size-(--notch) after:transition-opacity after:duration-200 after:content-[''] group-data-solid/nav:bg-transparent group-data-solid/nav:before:opacity-0 group-data-solid/nav:after:opacity-0";
const notchLeft =
  "before:bg-[radial-gradient(circle_at_100%_100%,transparent_calc(var(--notch)-0.5px),var(--haze)_var(--notch))] after:bg-[radial-gradient(circle_at_100%_100%,transparent_calc(var(--notch)-0.5px),var(--haze)_var(--notch))]";
const notchRight =
  "before:bg-[radial-gradient(circle_at_0_100%,transparent_calc(var(--notch)-0.5px),var(--haze)_var(--notch))] after:bg-[radial-gradient(circle_at_0_100%,transparent_calc(var(--notch)-0.5px),var(--haze)_var(--notch))]";

export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    // The nav sits on the first navy panel of every page. At the top it reads as part of the panel:
    // logo and actions live in light tabs cut into the panel's corners, links sit white on the navy.
    // Once the page scrolls (or the menu opens) it becomes one floating light bar.
    <header
      className="group/nav pointer-events-none fixed top-(--frame) right-(--frame) left-(--frame) z-50 *:pointer-events-auto"
      data-solid={scrolled || open || undefined}
    >
      <div className="relative grid h-(--nav-h) grid-cols-[1fr_auto_1fr] items-start rounded-[22px] transition-[background-color,box-shadow,height] duration-[260ms] ease-out group-data-solid/nav:bg-[color-mix(in_srgb,var(--haze)_88%,transparent)] group-data-solid/nav:shadow-[0_1px_2px_rgba(20,42,61,0.08),0_18px_36px_-24px_rgba(20,42,61,0.45)] group-data-solid/nav:backdrop-blur-[14px] group-data-solid/nav:backdrop-saturate-[1.4] group-data-solid/nav:[--nav-h:64px] max-[1000px]:grid-cols-[1fr_auto]">
        {/* Light tab cut into the top-left corner of the navy panel */}
        <div
          className={`${tab} ${notchLeft} justify-self-start rounded-br-(--notch) pr-7 pl-5 before:top-0 before:left-full after:top-full after:left-0 max-[1000px]:pr-[22px] max-[1000px]:pl-3.5`}
        >
          <Link
            className="flex items-center gap-2.5 font-display text-[1.22rem] font-bold tracking-[-0.02em] text-ink no-underline max-[640px]:text-[1.08rem]"
            href="/"
            aria-label="Shigjetademy home"
            onClick={() => setOpen(false)}
          >
            <img
              className="block h-[34px] w-auto max-[640px]:h-7"
              src={wordmark}
              alt="Shigjetademy"
              width={136}
              height={34}
            />
          </Link>
        </div>

        {/* Links: white on the navy, the current page underlined in kraft */}
        <nav className="flex h-(--nav-h) items-center gap-[clamp(8px,2vw,28px)] max-[1000px]:hidden" aria-label="Main">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="relative px-1.5 py-2.5 text-[0.98rem] font-semibold text-on-navy/78 no-underline transition-colors duration-200 after:absolute after:right-1.5 after:bottom-0.5 after:left-1.5 after:h-0.5 after:scale-x-0 after:rounded-xs after:bg-kraft after:transition-transform after:duration-[260ms] after:ease-out after:content-[''] hover:text-white hover:after:scale-x-50 aria-[current=page]:text-white aria-[current=page]:after:scale-x-100 group-data-solid/nav:text-ink-2 group-data-solid/nav:hover:text-ink group-data-solid/nav:aria-[current=page]:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Matching tab in the top-right corner */}
        <div
          className={`${tab} ${notchRight} justify-self-end rounded-bl-(--notch) pr-3 pl-[22px] before:top-0 before:right-full after:top-full after:right-0 max-[1000px]:pr-2 max-[1000px]:pl-3.5`}
        >
          <Link
            className="inline-flex min-h-11 items-center gap-[7px] rounded-full px-3.5 text-[0.95rem] font-semibold text-ink no-underline transition-[background-color,scale] duration-200 ease-out hover:bg-mist-deep active:scale-[0.97] max-[1000px]:hidden [&_svg]:text-green-deep"
            href="/login"
          >
            <LogIn size={17} strokeWidth={1.9} aria-hidden="true" />
            Log in
          </Link>
          <button
            type="button"
            className="hidden size-11 place-items-center rounded-full bg-transparent text-ink transition-transform duration-150 ease-out active:scale-[0.94] max-[1000px]:grid"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? (
              <X size={22} strokeWidth={1.75} />
            ) : (
              <Menu size={22} strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>

      {/* Tablet and phone: links move into a sheet under the bar */}
      <div
        id="mobile-menu"
        className="hidden max-[1000px]:mt-2 max-[1000px]:grid max-[1000px]:gap-0.5 max-[1000px]:rounded-[22px] max-[1000px]:bg-haze max-[1000px]:px-5 max-[1000px]:pt-2 max-[1000px]:pb-5 max-[1000px]:shadow-[0_1px_2px_rgba(20,42,61,0.08),0_24px_48px_-24px_rgba(20,42,61,0.5)] [&[hidden]]:hidden!"
        hidden={!open}
      >
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={() => setOpen(false)}
            className="border-b border-rule px-1 py-3.5 font-display text-[1.35rem] font-semibold no-underline aria-[current=page]:text-green-deep"
          >
            {l.label}
          </Link>
        ))}
        <div className="mt-3 grid grid-cols-1 gap-2.5">
          <Link
            className="button button--ghost"
            href="/login"
            onClick={() => setOpen(false)}
          >
            Log in
          </Link>
        </div>
      </div>
    </header>
  );
}
