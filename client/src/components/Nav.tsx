import { useEffect, useState } from "react";
import { LogIn, Menu, X } from "lucide-react";
import wordmark from "../assets/brand/shigjetademy-wordmark.png"
import { Link } from "../lib/router";
import "./Nav.css";

const LINKS = [
  { href: "/platform", label: "Platform" },
  { href: "/solutions", label: "Solutions" },
  { href: "/resources", label: "Resources" },
  { href: "/contact", label: "Contact" },
];

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
    <header className="nav" data-scrolled={scrolled} data-open={open}>
      <div className="nav__bar">
        {/* Light tab cut into the top-left corner of the navy panel */}
        <div className="nav__tab nav__tab--left">
          <Link
            className="nav__brand"
            href="/"
            aria-label="Shigjetademy home"
            onClick={() => setOpen(false)}
          >
            <img className="nav__wordmark" src={wordmark} alt="Shigjetademy" width={136} height={34} />
          </Link>
        </div>

        <nav className="nav__links" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Matching tab in the top-right corner */}
        <div className="nav__tab nav__tab--right">
          <Link className="nav__login" href="/login">
            <LogIn size={17} strokeWidth={1.9} aria-hidden="true" />
            Log in
          </Link>
          <button
            type="button"
            className="nav__toggle"
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

      <div id="mobile-menu" className="nav__sheet" hidden={!open}>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
            {l.label}
          </Link>
        ))}
        <div className="nav__sheet-actions">
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
