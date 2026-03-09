"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

const navLinks = [
  { href: "/", label: "Beranda" },
  { href: "/komoditas", label: "Komoditas" },
  { href: "/provinsi", label: "Provinsi" },
  { href: "/bandingkan", label: "Bandingkan" },
  { href: "/insight", label: "Insight" },
  { href: "/tentang", label: "Tentang" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Refs for the desktop nav container and the sliding indicator
  const navContainerRef = useRef<HTMLDivElement | null>(null);
  const linkRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const updateIndicator = useCallback(() => {
    const container = navContainerRef.current;
    if (!container) return;

    const activeHref = navLinks.find((l) => isActive(l.href))?.href;
    if (!activeHref) {
      setIndicator(null);
      return;
    }

    const activeEl = linkRefs.current.get(activeHref);
    if (!activeEl) return;

    const containerRect = container.getBoundingClientRect();
    const linkRect = activeEl.getBoundingClientRect();

    setIndicator({
      left: linkRect.left - containerRect.left + 12, // 12px = px-3 padding
      width: linkRect.width - 24, // subtract left+right padding
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  function handleNavClick(e: React.MouseEvent, href: string) {
    // If clicking the same page we're already on, scroll to top
    if (isActive(href)) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-warm-200">
      <div className="container-page flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group" onClick={(e) => handleNavClick(e, "/")}>
          <Image
            src="/homelogopanganid.png"
            alt="Pangan.id"
            width={36}
            height={36}
            className="object-contain"
            priority
          />
          <span className="font-bold text-lg text-warm-800 tracking-tight">
            Pangan<span className="text-brand-orange">.id</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div ref={navContainerRef} className="hidden md:flex items-center gap-1 relative">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              ref={(el) => {
                if (el) linkRefs.current.set(link.href, el);
              }}
              onClick={(e) => handleNavClick(e, link.href)}
              className={`relative px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive(link.href)
                  ? "text-brand-orange"
                  : "text-warm-500 hover:text-warm-800 hover:bg-warm-100"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* Sliding underline indicator — pure CSS transition */}
          <span
            className="absolute bottom-0 h-0.5 bg-brand-orange rounded-full transition-all duration-300 ease-out"
            style={
              indicator
                ? { left: indicator.left, width: indicator.width, opacity: 1 }
                : { left: 0, width: 0, opacity: 0 }
            }
          />
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-warm-600 hover:text-warm-800 transition-colors"
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Nav Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-white border-b border-warm-200 overflow-hidden"
          >
            <div className="container-page py-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    setMobileOpen(false);
                    handleNavClick(e, link.href);
                  }}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? "text-brand-orange bg-brand-orange-light"
                      : "text-warm-600 hover:bg-warm-100"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
