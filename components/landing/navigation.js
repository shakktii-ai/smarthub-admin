"use client"
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", f);
    return () => window.removeEventListener("scroll", f);
  }, []);

  const links = [
    { label: "Products", href: "/#products" },
    { label: "Services", href: "/#services" },
    { label: "About Us", href: "/landing/aboutUs" },
  ];

  const linkClass =
    "relative w-fit transition hover:text-primary after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all ${
        scrolled ? "bg-background shadow-soft" : "bg-background/95"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2">
        <a href="/" className="flex items-center gap-2">
          <img
            src="/Logo.png"
            alt="SmartHub Pay logo"
            className="h-12 w-12 object-contain"
          />

          <span className="text-xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-[#0878D1] to-[#0BA8F5] bg-clip-text text-transparent">
              SMART
            </span>
            <span className="text-[#20242D]">HUB</span>{" "}
            <span className="bg-gradient-to-r from-[#0878D1] to-[#0BA8F5] bg-clip-text text-transparent">
              PAY
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          {links.map((link) => (
            <a key={link.label} href={link.href} className={linkClass}>
              {link.label}
            </a>
          ))}

          <a href="/login" className={linkClass}>
            Login
          </a>
        </nav>

        <button
          className="md:hidden"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-4 bg-background px-6 pb-6 md:hidden">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={linkClass}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}

          <a
            href="/login"
            className={linkClass}
            onClick={() => setOpen(false)}
          >
            Login
          </a>
        </div>
      )}
    </header>
  );
}
