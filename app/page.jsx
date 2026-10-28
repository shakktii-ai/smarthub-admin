// import { redirect } from 'next/navigation';
// export default function Home() { redirect('/login'); }

"use client";
import { toast } from "react-toastify";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Play,
  CheckCircle2,
  BarChart3,
  Wallet,
  QrCode,
  Smartphone,
  Volume2,
  ShoppingBag,
  CreditCard,
  Zap,
  ShieldCheck,
  TrendingUp,
  Store,
  Landmark,
  UserPlus,
  Users,
  HeartPulse,
  GraduationCap,
  Hotel,
  Fuel,
  Building2,
  Coins,
  Menu,
  X,
  Sparkles,
  Clock,
  LayoutDashboard,
  Users2,
  Download,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import AboutUs from "@/components/landing/Aboutus";
import Navigation from "@/components/landing/navigation";
import Footer from "@/components/landing/footer";
function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
      { threshold: 0.15 },
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function Counter({ to, prefix = "", suffix = "" }) {
  const [v, setV] = useState(0);

  useEffect(() => {
    let raf;
    const start = performance.now();

    const tick = (t) => {
      const p = Math.min((t - start) / 1800, 1);

      setV(Math.floor(to * (1 - Math.pow(1 - p, 3))));

      if (p < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [to]);

  return (
    <>
      {prefix}
      {v.toLocaleString("en-IN")}
      {suffix}
    </>
  );
}

const Pill = ({ children }) => (
  <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
    {children}
  </span>
);

const DETAILS = {
  "POS / QR": {
    icon: QrCode,
    tagline: "Every payment, right at the counter",
    body: "SmartPOS terminals, static and dynamic QR and sound box alerts — a complete counter setup that accepts every payment your customer prefers.",
    points: [
      "Android SmartPOS with built-in printer",
      "Static and dynamic QR",
      "Sound box voice alerts",
      "All UPI, cards and wallets accepted",
    ],
  },
  SmartPOS: {
    icon: Smartphone,
    tagline: "Your counter, upgraded",
    body: "An Android-powered point-of-sale terminal that accepts UPI, cards and wallets, prints receipts and syncs every sale to your dashboard in real time.",
    points: [
      "All payment modes in one device",
      "Built-in receipt printer",
      "Real-time sale tracking",
      "All-day battery life",
    ],
  },
  "Static & Dynamic QR": {
    icon: QrCode,
    tagline: "One QR for your shop, dynamic for every bill",
    body: "Display a static QR for quick collections or generate a dynamic QR with the exact amount for each bill — customers scan and pay in seconds.",
    points: [
      "Set up in minutes, no hardware needed",
      "Dynamic QR with the exact bill amount",
      "Instant confirmation on your phone",
      "Works with every UPI app",
    ],
  },
  "Sound Box": {
    icon: Volume2,
    tagline: "Hear every payment instantly",
    body: "A loud, clear voice box that announces each payment the moment it lands, so you never have to check your phone during rush hour.",
    points: [
      "Instant voice alert for every payment",
      "Loud speaker that cuts through noise",
      "4G connected — no WiFi needed",
      "Only real payments are announced",
    ],
  },
  "Merchant UPI": {
    icon: Zap,
    tagline: "Accept UPI from every app, instantly",
    body: "Take payments from PhonePe, Google Pay, Paytm and every other UPI app with instant confirmation and next-day settlement straight to your bank.",
    points: [
      "Zero MDR on UPI transactions",
      "T+1 settlement to your bank",
      "Real-time payment tracking",
      "Works with all UPI apps",
    ],
  },
  "Card Payments": {
    icon: CreditCard,
    tagline: "Debit, credit and contactless — all accepted",
    body: "Accept debit and credit cards, contactless taps and wearables on certified POS terminals with fast authorisation and transparent pricing.",
    points: [
      "Debit and credit cards supported",
      "Contactless tap and wearables",
      "Fast, secure authorisation",
      "Transparent card pricing",
    ],
  },
  Collections: {
    icon: Coins,
    tagline: "Collections that run themselves",
    body: "Automate EMI, field and bill collections with payment links, scheduled reminders and automatic reconciliation, so nothing slips through.",
    points: [
      "Single and bulk payment links",
      "Auto reminders on SMS and WhatsApp",
      "Field agent collection app",
      "Automatic reconciliation and reports",
    ],
  },
  Lending: {
    icon: Landmark,
    tagline: "Working capital based on your own sales",
    body: "Get quick business loans sized on your transaction history, with flexible EMIs and minimal paperwork — no collateral hassle.",
    points: [
      "Instant eligibility check",
      "Flexible EMI options",
      "Minimal paperwork, fully digital",
      "Daily or monthly repayment choices",
    ],
  },
  Onboarding: {
    icon: UserPlus,
    tagline: "Go live as a merchant in minutes",
    body: "Complete digital KYC from your phone and get your QR, POS and settlements activated fast, with a dedicated manager to help at every step.",
    points: [
      "100% digital KYC",
      "Same-day account activation",
      "QR, POS and settlement setup included",
      "Dedicated onboarding support",
    ],
  },
  "Business Onboarding": {
    icon: UserPlus,
    tagline: "Go live as a merchant in minutes",
    body: "Complete digital KYC from your phone and get your QR, POS and settlements activated fast, with a dedicated manager to help at every step.",
    points: [
      "100% digital KYC",
      "Same-day account activation",
      "QR, POS and settlement setup included",
      "Dedicated onboarding support",
    ],
  },
};

function DetailModal({ title, onClose }) {
  useEffect(() => {
    if (!title) return;
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [title, onClose]);
  if (!title) return null;
  const d = DETAILS[title];
  const Icon = d.icon;
  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-sm animate-fade"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border bg-card shadow-soft animate-pop">
        <div className="relative bg-gradient-brand p-8 text-primary-foreground">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-background/20 transition hover:bg-background/30"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-background/20">
            <Icon className="h-7 w-7" />
          </span>
          <h3 className="mt-4 text-2xl font-extrabold">{title}</h3>
          <p className="mt-1 text-sm opacity-90">{d.tagline}</p>
        </div>
        <div className="p-8">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {d.body}
          </p>
          <ul className="mt-5 grid gap-2.5 text-sm">
            {d.points.map((p) => (
              <li key={p} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                {p}
              </li>
            ))}
          </ul>
          <a
            href="#onboard"
            onClick={onClose}
            className="group mt-7 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition hover:-translate-y-0.5"
          >
            Get Started{" "}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </div>
  );
}


function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", f);
    return () => window.removeEventListener("scroll", f);
  }, []);

  const links = [
    { label: "Products", href: "#products" },
    { label: "Services", href: "#services" },
    { label: "About Us", href: "/landing/about" },
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

function FloatCard({ icon: Icon, title, className, delay }) {
  return (
    <div
  className={`absolute flex max-w-[170px] items-center gap-2 rounded-xl bg-card px-2.5 py-2 text-[10px] font-semibold shadow-soft backdrop-blur animate-floaty sm:max-w-none sm:gap-2 sm:rounded-2xl sm:px-4 sm:py-2 sm:text-xs ${className}`}
  style={{ animationDelay: delay }}
>
  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-secondary text-primary sm:h-8 sm:w-8">
    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
  </span>
  <span className="min-w-0 leading-tight">{title}</span>
</div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero pt-32 pb-6">
      <div className="absolute -right-40 -top-40 h-[620px] w-[620px] bg-[#28c5e8]/80 blur-3xl animate-blob" />
      <div
        className="absolute -left-32 bottom-0 h-80 w-80 bg-primary/10 blur-3xl animate-blob"
        style={{ animationDelay: "-5s" }}
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2">
        <div className="animate-fadeup">
          <Pill>Built for India's businesses</Pill>
          <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight md:text-[2.75rem]">
            Payments, Collections and Growth{" "}
            <span className="text-gradient">— All in One Place</span>
          </h1>
          <p className="mt-5 max-w-lg text-base text-muted-foreground">
            SmartHub Pay helps merchants, businesses and financial institutions
            accept payments, manage collections and grow with simple, secure and
            reliable financial solutions.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <a
              href="#onboard"
              className="group inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-4 font-semibold text-primary-foreground shadow-soft transition hover:-translate-y-1"
            >
              Get Started{" "}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </a>
            {/* <button className="flex items-center gap-3 font-semibold">
              <span className="relative grid h-11 w-11 place-items-center rounded-full bg-card text-primary shadow-soft"><span className="absolute inset-0 rounded-full bg-primary/30 animate-pulse-ring" /><Play className="h-4 w-4 fill-current" /></span>Watch Video
            </button> */}
          </div>
          {/* <div className="mt-10 flex gap-10">
            {[[50000, "+", "Merchants"], [120, "Cr+", "Monthly volume ₹"], [99, ".9%", "Uptime"]].map(([n, s, l]) => (
              <div key={l}><div className="text-3xl font-extrabold text-primary"><Counter to={n} suffix={s} /></div><div className="text-sm text-muted-foreground">{l}</div></div>
            ))}
          </div> */}
        </div>
        <div
          className="relative animate-fadeup"
          style={{ animationDelay: ".2s" }}
        >
          <img
            src="/heroSection.png"
            alt="SmartHub Pay QR, soundbox and POS devices"
            width={1200}
            height={1008}
            className="rounded-[2.5rem] shadow-soft"
          />
          <FloatCard
            icon={CheckCircle2}
            title="Payments Accepted"
            className="-top-4 right-6"
            delay="0s"
          />
          <FloatCard
            icon={Wallet}
            title="Instant Settlements"
            className="left-[-1rem] top-1/4"
            delay="1s"
          />
          <FloatCard
            icon={BarChart3}
            title="Real-time Insights"
            className="bottom-16 -left-6"
            delay="2s"
          />
          <FloatCard
            icon={CreditCard}
            title="UPI • Cards • Wallets"
            className="-bottom-5 right-10"
            delay="1.5s"
          />
        </div>
      </div>
    </section>
  );
}

function Strip() {
  const items = [
    [Smartphone, "SmartPOS", "Android POS accepting all payment methods."],
    [QrCode, "Static & Dynamic QR", "Create QR for your business in minutes."],
    [Volume2, "Sound Box", "Instant audio alerts for every payment."],
    [Zap, "Merchant UPI", "Accept UPI from every app, instantly."],
    [CreditCard, "Card Payments", "Debit, credit and contactless cards."],
    [ShoppingBag, "Collections", "Payment links, reminders and recon."],
    [Landmark, "Lending", "Working capital based on your sales."],
    [UserPlus, "Onboarding", "Go live with digital KYC in minutes."],
  ];
  const [idx, setIdx] = useState(0);
  const [per, setPer] = useState(4);
  const [paused, setPaused] = useState(false);
  const [open, setOpen] = useState(null);
  useEffect(() => {
    const f = () =>
      setPer(window.innerWidth < 640 ? 1 : window.innerWidth < 1024 ? 2 : 4);
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  const max = items.length - per;
  const go = (n) => setIdx(n < 0 ? max : n > max ? 0 : n);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIdx((i) => (i >= max ? 0 : i + 1)), 3500);
    return () => clearInterval(t);
  }, [paused, max]);
  return (
    <section id="products" className="scroll-mt-24 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="reveal flex items-end justify-between gap-6">
          <div>
            <Pill>Our Products</Pill>
            {/* <h2 className="mt-4 text-3xl font-extrabold md:text-4xl">
              Products for <span className="text-gradient">every counter</span>
            </h2> */}
          </div>
          <div className="flex gap-3">
            {[
              [-1, "Previous", "rotate-180"],
              [1, "Next", ""],
            ].map(([d, l, r]) => (
              <button
                key={l}
                aria-label={l}
                onClick={() => go(idx + d)}
                className="grid h-11 w-11 place-items-center rounded-full border bg-card text-primary transition hover:bg-primary hover:text-primary-foreground"
              >
                <ArrowRight className={`h-4 w-4 ${r}`} />
              </button>
            ))}
          </div>
        </div>
        <div
          className="mt-10 overflow-hidden"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            className="flex transition-transform duration-700 ease-[cubic-bezier(.65,0,.35,1)]"
            style={{ transform: `translateX(-${(idx * 100) / per}%)` }}
          >
            {items.map(([I, t, d]) => (
              <div
                key={t}
                className="shrink-0 px-3"
                style={{ width: `${100 / per}%` }}
              >
                <div className="group h-full rounded-3xl border bg-card p-7 transition duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-soft">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                    <I className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold">{t}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{d}</p>
                  {/* <a
                    href="#services"
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"
                  >
                    Know More{" "}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </a> */}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: max + 1 }).map((_, i) => (
            <button
              key={i}
              aria-label={`Slide ${i + 1}`}
              onClick={() => go(i)}
              className={`h-2 rounded-full transition-all duration-500 ${i === idx ? "w-8 bg-primary" : "w-2 bg-border"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

const services = [
  {
    icon: QrCode,
    title: "POS / QR",
    desc: "Android SmartPOS, static & dynamic QR and sound box alerts to accept every payment at the counter.",
    pts: ["SmartPOS terminals", "Dynamic QR", "Soundbox alerts"],
  },
  {
    icon: LayoutDashboard,
    title: "Merchant Dashboard",
    desc: "Give merchants a centralized platform to monitor payment activity and manage their business transactions.",
    pts: [
      "Transaction history",
      "Settlement tracking",
      "Reports & payment insights",
    ],
  },
  {
    icon: UserPlus,
    title: "Merchant Onboarding",
    desc: "Simplify merchant registration with digital onboarding, business verification, and KYC document management.",
    pts: [
      "Digital merchant registration",
      "KYC & document tracking",
      "Bank account verification",
    ],
  },
  {
    icon: Users2,
    title: "Sales Management",
    desc: "Manage field sales teams, track merchant acquisition, and monitor staff performance across assigned territories.",
    pts: [
      "Sales staff management",
      "Merchant onboarding tracking",
      "Targets & territory management",
    ],
  },
  {
    icon: Coins,
    title: "Collections",
    desc: "Automate EMI, field and bill collections with payment links, auto-reminders and reconciliation.",
    pts: ["Payment links", "Field agent app", "Auto reconciliation"],
  },
];

function Services() {
  return (
    <section id="services" className="py-4">
      <div className="mx-auto max-w-7xl px-6">
        <div className="reveal text-center">
          <Pill>Our Services</Pill>
          <h2 className="mt-4 text-xl font-extrabold md:text-4xl">
            Everything you need to{" "}
            <span className="text-gradient">run and grow</span> your business
          </h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <div
              key={s.title}
              className="reveal group relative overflow-hidden rounded-3xl border bg-card p-8 transition duration-500 hover:-translate-y-2 hover:shadow-soft"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-secondary transition-all duration-500 group-hover:scale-[3]" />
              <div className="relative">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-soft transition group-hover:rotate-6">
                  <s.icon className="h-7 w-7" />
                </span>
                <h3 className="mt-6 text-2xl font-bold">{s.title}</h3>
                <p className="mt-3 text-muted-foreground">{s.desc}</p>
                <ul className="mt-5 space-y-2 text-sm">
                  {s.pts.map((p) => (
                    <li key={p} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      {p}
                    </li>
                  ))}
                </ul>
                {/* <a className="mt-6 inline-flex items-center gap-2 font-semibold text-primary">Know More <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></a> */}
              </div>
            </div>
          ))}
          <div className="reveal relative overflow-hidden rounded-3xl bg-gradient-brand p-8 text-primary-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-background/20 px-3 py-1 text-xs font-bold uppercase">
              <Clock className="h-3 w-3" /> Upcoming
            </span>
            <h3 className="mt-6 text-2xl font-bold"> Merchant UPI</h3>
            <p className="mt-3 opacity-90">
              {" "}
              An upcoming UPI payment solution designed to help merchants accept
              and track digital payments through a streamlined payment
              experience.
            </p>
            <Sparkles className="absolute bottom-6 right-6 h-20 w-20 opacity-30 animate-floaty" />
            {/* <button className="mt-6 rounded-xl bg-background px-5 py-2.5 text-sm font-semibold text-primary">Notify Me</button> */}
          </div>
        </div>
      </div>
    </section>
  );
}



function Merchants() {
  return (
    <section id="onboard" className="py-6 px-4">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 lg:grid-cols-2 border border-primary py-2 rounded-3xl">
        <div className="reveal relative">
          <img
            src="/store.png"
            alt="Merchant store growth illustration"
            loading="lazy"
            width={1008}
            height={1000}
            className="rounded-[2rem]"
          />
          {/* <div className="absolute left-6 top-6 rounded-2xl bg-card p-4 shadow-soft animate-floaty">
            <div className="text-xs text-muted-foreground">Total Payments</div>
            <div className="text-2xl font-extrabold">₹<Counter to={124230} /></div>
            <div className="text-xs font-semibold text-success">▲ 12% from last month</div>
          </div> */}
        </div>
        <div className="reveal">
          <Pill>Become a Merchant</Pill>
          <h2 className="mt-4 text-xl md:text-4xl font-extrabold">
            Onboard in <span className="text-gradient">3 simple steps</span>
          </h2>
          <div className="mt-8 space-y-6">
            {[
              ["Sign up", "Share your mobile number and business details."],
              [
                "Complete digital KYC",
                "Upload PAN, Aadhaar and bank details — fully paperless.",
              ],
              [
                "Start accepting payments",
                "Get your QR, Soundbox or SmartPOS and go live.",
              ],
            ].map(([t, d], i) => (
              <div key={t} className="group flex gap-5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-secondary text-lg font-extrabold text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-bold">{t}</h3>
                  <p className="text-muted-foreground">{d}</p>
                </div>
              </div>
            ))}
          </div>
        <button
  type="button"
  onClick={() =>
    toast.info("Coming soon!", {
      position: "top-right",
      autoClose: 3000,
    })
  }
  className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-4 font-semibold text-primary-foreground shadow-soft transition hover:-translate-y-1 hover:shadow-lg"
>
  Download App
  <Download className="h-4 w-4 transition group-hover:translate-y-0.5" />
</button>
        </div>
      </div>
    </section>
  );
}

function Why() {
  const w = [
    [CreditCard, "Simple Integration", "Quick and easy setup across channels."],
    [
      ShieldCheck,
      "Secure & Compliant",
      "RBI guidelines and industry best practices.",
    ],
    [
      BarChart3,
      "Real-time Insights",
      "Detailed analytics to make better decisions.",
    ],
    [
      Store,
      "Built for Growth",
      "Solutions designed for businesses of all sizes.",
    ],
  ];
  return (
    <section id="aboutus" className="bg-hero py-20">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="reveal text-3xl font-extrabold">
          Why choose SmartHub Pay?
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {w.map(([I, t, d], i) => (
            <div
              key={t}
              className="reveal flex gap-4 rounded-2xl bg-card p-6 transition hover:-translate-y-1 hover:shadow-soft"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                <I className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-bold">{t}</h3>
                <p className="text-sm text-muted-foreground">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}



export default function Page() {
  useReveal();
  return (
    <main className="font-sans">
      <Navigation/>
      <Hero />
      <Strip />
      <Services />
      <Merchants />
      {/* <Why /> */}
      <AboutUs/>
      <Footer />
    </main>
  );
}
