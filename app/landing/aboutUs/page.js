import Image from "next/image";
import {
  ArrowRight,
  Eye,
  Target,
  Info,
  ScanLine,
  Calculator,
  Globe,
  FileText,
  RefreshCw,
  Wallet,
  Box,
  Handshake,
  Lightbulb,
  ShieldCheck,
  Settings,
  BarChart3,
} from "lucide-react";

const solutions = [
  {
    title: "UPI and QR Payment Solutions",
    description:
      "Digital payment acceptance through UPI-enabled QR codes and supported payment channels.",
  },
  {
    title: "POS and mPOS Solutions",
    description:
      "Payment acceptance through supported point-of-sale devices and merchant payment terminals.",
  },
  {
    title: "Online Payment Collection",
    description:
      "Technology-enabled payment links, checkout integrations and online collection solutions through authorised payment partners.",
  },
  {
    title: "Merchant Settlement and Reconciliation",
    description:
      "Transaction tracking, collection reports, settlement status and reconciliation support.",
  },
  {
    title: "Recurring Payment Solutions",
    description:
      "Technology support for recurring collections and mandate-based payments, where supported by relevant payment systems and authorised partners.",
  },
  {
    title: "Payout and Disbursement Solutions",
    description:
      "Business payout and fund-transfer integrations through eligible banking and payment partners, subject to applicable permissions and limits.",
  },
  {
    title: "White-Label and Technology Solutions",
    description:
      "Customisable payment technology and integration services for eligible business partners, subject to contractual and regulatory requirements.",
  },
];

const mission = [
  "Simplify digital payment acceptance for businesses of all sizes.",
  "Enable efficient merchant onboarding and payment collection.",
  "Support transparent transaction reporting and settlement tracking.",
  "Build technology-led solutions for merchants, enterprises and financial institutions.",
  "Promote responsible, secure and compliant digital payment practices.",
];

const values = [
  {
    title: "Trust",
    description: "Building transparent and accountable business relationships.",
    icon: Handshake,
  },
  {
    title: "Innovation",
    description: "Developing practical, technology-driven solutions.",
    icon: Lightbulb,
  },
  {
    title: "Security",
    description: "Prioritising data protection and transaction security.",
    icon: ShieldCheck,
  },
  {
    title: "Reliability",
    description: "Focusing on consistent service and operational support.",
    icon: Settings,
  },
  {
    title: "Growth",
    description:
      "Helping our merchant and business partners scale efficiently.",
    icon: BarChart3,
  },
];

/* Small label + title + short blue underline, used for every section */
function SectionHeading({ label }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
        {label}
      </p>

      <span className="mt-3 block h-0.5 w-10 rounded-full bg-blue-600" />
    </div>
  );
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-r from-blue-50 to-sky-100 text-slate-800">
      <div className="mx-auto max-w-6xl space-y-14 px-5 pb-16 pt-5 sm:space-y-16 sm:px-8">
       
        {/* ---------- Who We Are ---------- */}
        <section className="max-w-6xl pt-20">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            Who We Are
          </p>

          <span className="mt-3 block h-0.5 w-10 rounded-full bg-blue-600" />

          <div className="mt-5 space-y-4 text-base leading-7 text-slate-600">
            <p>
              SMARTHUB PAY FINTECH PRIVATE LIMITED is a fintech company focused
              on simplifying digital payments and helping businesses manage
              their payment collection and settlement processes more
              efficiently.
            </p>
            <p>
              We aim to bridge the gap between traditional business operations
              and modern digital payment technology by offering accessible,
              technology-driven solutions for merchants, retailers, service
              providers, enterprises and financial institutions.
            </p>
            <p>
              Our focus is to make digital payment acceptance simpler, improve
              transaction visibility, support efficient reconciliation and help
              businesses grow through reliable technology and service.
            </p>
          </div>
        </section>

        <section>
          <div className="lg:pr-8">
            <SectionHeading label="Our Mission" />
          </div>
          <ul className="mt-3 space-y-2.5">
            {mission.map((item) => (
              <li
                key={item}
                className="flex gap-3 text-sm leading-6 text-slate-600"
              >
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="lg:pr-8">
            <SectionHeading label="Our Vision" />
          </div>
          <p className="mt-5 space-y-4 text-base leading-7 text-slate-600 ">
            To become a trusted fintech partner for businesses across India by
            enabling accessible, secure and efficient digital payment solutions.
          </p>
        </section>
        {/* ---------- Our Commitment ---------- */}
        <section>
          <div className="lg:pr-8">
            <SectionHeading label="Our Commitment" />
          </div>
          <p className="mt-5 space-y-4 text-base leading-7 text-slate-600 ">
            At SMARTHUB PAY, we believe that technology should make business
            simpler. We are committed to developing customer-focused solutions,
            maintaining transparent service practices, protecting information
            and working with authorised financial and technology partners. We
            strive to build long-term relationships through service quality,
            operational efficiency and responsible innovation.
          </p>
        </section>


        {/* ---------- Our Solutions ---------- */}
        <section>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading label="Our Solutions" />
            {/* <p className="inline-flex w-fit items-center gap-2 rounded-lg bg-blue-50 px-4 py-2.5 text-xs font-medium text-slate-600 sm:text-sm">
              <Info size={16} className="shrink-0 text-blue-600" />
              Subject to applicable authorisations and service availability.
            </p> */}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {solutions.map(({ title, description, icon: Icon }, index) => (
              <div
                key={title}
                className={`flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${
                  index === solutions.length - 1 ? "md:col-span-2" : ""
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {/* <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                  <Icon size={24} strokeWidth={1.7} />
                </span> */}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {description}
                  </p>
                </div>
                {/* <ArrowRight
                  size={18}
                  className="hidden shrink-0 text-slate-700 sm:block"
                /> */}
              </div>
            ))}
          </div>
        </section>
        
        {/* ---------- Our Values ---------- */}
        <section>
          <SectionHeading label="Our Values" />

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {values.map(({ title, description, icon: Icon }, i) => (
              <div
                key={title}
                className={`flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${
                  i === values.length - 1 ? "sm:col-span-2 lg:col-span-1" : ""
                }`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                  <Icon size={22} strokeWidth={1.7} />
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
