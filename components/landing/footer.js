
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowUp,
  Mail,
  MapPin,
  ShieldCheck,
  Zap,
  Handshake,
  Linkedin,
  Youtube,
  Instagram,
  Phone,
} from "lucide-react";

function Footer() {
  const columns = [
    {
      title: "Products",
      links: [
        { label: "SmartPOS", href: "#products" },
        { label: "Static & Dynamic QR", href: "#products" },
        { label: "Sound Box", href: "#products" },
        { label: "Merchant App", href: "#products" },
      ],
    },
    {
      title: "Services",
      links: [
        { label: "POS / QR Payments", href: "#services" },
        { label: "Merchant Onboarding", href: "#services" },
        { label: "Collections", href: "#services" },
        { label: "Sales Management", href: "#services" },
        { label: "Merchant UPI", href: "#services", upcoming: true },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About Us", href: "#about" },
    
      ],
    },
  ];

  const socials = [
    { label: "LinkedIn", icon: Linkedin, href: null },
    { label: "YouTube", icon: Youtube, href: null },
    { label: "Instagram", icon: Instagram, href: null },
  ];

  return (
    <footer
      id="resources"
      className="relative isolate overflow-hidden bg-[#071a30] text-white"
    >
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-[#10385d] via-[#071a30] to-[#041124]" />

      <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-96 w-96 rounded-full bg-[#1687e8]/20 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-32 left-1/3 -z-10 h-80 w-80 rounded-full bg-[#28c5e8]/10 blur-3xl" />

      <div className="pointer-events-none absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-[#0878d1] via-[#28c5e8] to-[#0878d1]" />

      <div className="mx-auto max-w-[1440px] px-6 pb-6 pt-14 sm:px-8 sm:pt-16 lg:px-12 lg:pt-20">
        {/* Main footer grid */}
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-10 lg:gap-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-4">
            <Link
              href="/"
              aria-label="SmartHub Pay homepage"
              className="inline-flex items-center gap-3"
            >
              <img
                src="/smarthubpay.jpeg"
                alt="SmartHub Pay logo"
                className="h-[70px] w-[70px] rounded-xl bg-white p-1 object-contain"
              />

            
            </Link>

            <h3 className="mt-4 text-xl font-bold leading-8 sm:text-2xl">
              Smart Payments.
              <span className="ml-2 text-[#28c5e8]">
                Seamless Growth.
              </span>
            </h3>

            <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
              Payments, collections and growth for India's businesses — simple, secure and reliable.
            </p>

            {/* <p className="mt-4 text-xs font-semibold leading-6 text-slate-400">
              Digital Payments
              <span className="mx-2 text-[#28c5e8]">|</span>
              Merchant Solutions
              <span className="mx-2 text-[#28c5e8]">|</span>
              Collections
              <span className="mx-2 text-[#28c5e8]">|</span>
              Payment Technology
            </p> */}

            {/* Social icons: add official URLs when available */}
            <div className="mt-6 flex items-center gap-3">
              {socials.map(({ label, icon: Icon, href }) =>
                href ? (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:border-[#28c5e8]/50 hover:bg-[#0878d1]/30 hover:text-[#28c5e8]"
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                ) : (
                  <span
                    key={label}
                    title={`${label} link not configured`}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                )
              )}
            </div>

           
          </div>

          {/* Navigation columns */}
          {columns.map((column) => (
            <div
              key={column.title}
              className="lg:col-span-2"
            >
              <h4 className="text-base font-bold tracking-wide text-white">
                {column.title}
              </h4>

              <div className="mt-3 h-1 w-10 rounded-full bg-gradient-to-r from-[#0878d1] to-[#28c5e8]" />

              <ul className="mt-6 space-y-4">
                {column.links.map((item) => (
                  <li key={item.label}>
                    {item.upcoming ? (
                      <span className="inline-flex flex-wrap items-center gap-2 text-sm text-slate-300">
                        {item.label}
                        <span className="rounded-full border border-[#28c5e8]/30 bg-[#0878d1]/20 px-2 py-1 text-[9px] font-bold text-[#59def5]">
                          COMING SOON
                        </span>
                      </span>
                    ) : (
                      <a
                        href={item.href}
                        className="group inline-flex items-center gap-2 text-sm text-slate-300 transition-colors hover:text-[#28c5e8]"
                      >
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#28c5e8] transition-transform group-hover:translate-x-1" />
                        {item.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
              {column.title === "Company" && (
  <div className="mt-6 border-t border-white/10 pt-5">
    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
      Contact Us
    </p>

    <div className="mt-3 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0878d1]/20 text-[#28c5e8]">
        <Phone className="h-4 w-4" />
      </div>

      <div>
      
        <p className="mt-1 text-sm font-semibold text-white">
          +91 70836 45607
        </p>
      </div>
    </div>
  </div>
)}
            </div>
          ))}

          
        </div>

        {/* Copyright bar */}
        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs leading-6 text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} SMARTHUB PAY FINTECH PRIVATE LIMITED.
            All rights reserved.
          </p>

          <a
            href="#top"
            className="inline-flex items-center gap-2 font-semibold text-slate-300 transition hover:text-[#28c5e8]"
          >
            Back to top
            <ArrowUp className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Bottom gradient accent */}
      <div className="h-1.5 bg-gradient-to-r from-[#064b8b] via-[#0878d1] to-[#28c5e8]" />
    </footer>
  );
}

export default Footer;
