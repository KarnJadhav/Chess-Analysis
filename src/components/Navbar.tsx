import React, { useState } from "react";
import Link from "next/link";
import styles from "./Navbar.module.css";

const NAV_LINKS = [
  { label: "About", href: "/about" },
  { label: "Sign In", href: "/auth/signin" },
];

const Navbar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={styles.navbar}>
      <div className={styles.navContent}>
        <Link href="/" className={styles.brand}>
          <span className={styles.logo}>
            {/* Chess Logo - Knight piece */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="16" fill="#1e40af" />
              <text x="16" y="21" textAnchor="middle" fontSize="16" fill="#fff" fontWeight="bold">♘</text>
            </svg>
          </span>
          <span className={styles.brandName}>Chanakya</span>
        </Link>
        <nav className={styles.desktopNav}>
          {NAV_LINKS.map((link) => (
            <Link key={link.label} href={link.href} className={styles.navLink}>
              {link.label}
            </Link>
          ))}
          <Link href="/auth/signup" className={styles.ctaButton}>
            Sign Up
          </Link>
        </nav>
        <button
          className={styles.hamburger}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className={styles.hamburgerIcon}></span>
        </button>
      </div>
      {/* Mobile Menu */}
      {menuOpen && (
        <nav className={styles.mobileMenu}>
          {NAV_LINKS.map((link) => (
            <Link key={link.label} href={link.href} className={styles.mobileNavLink} onClick={() => setMenuOpen(false)}>
              {link.label}
            </Link>
          ))}
          <Link href="/auth/signin" className={styles.mobileCtaButton} onClick={() => setMenuOpen(false)}>
            Sign Up
          </Link>
        </nav>
      )}
    </header>
  );
};

export default Navbar;
