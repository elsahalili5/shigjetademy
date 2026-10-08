import logo from '../assets/brand/shigjetademy-logo.png'
import './Footer.css'

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <img src={logo} alt="Shigjetademy" width={96} height={98} />
          <p>Education management for schools, academies, training centres and educators.</p>
        </div>
        <nav aria-label="Footer">
          <a href="#platform">Platform</a>
          <a href="#workflow">How it works</a>
          <a href="#roles">Who it’s for</a>
          <a href="#demo">Book a demo</a>
        </nav>
      </div>
      <p className="footer__legal">© {new Date().getFullYear()} Shigjetademy</p>
    </footer>
  )
}
