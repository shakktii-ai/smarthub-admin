
import Link from "next/link";
import { ArrowLeft, ShieldCheck, FileText, CalendarDays } from "lucide-react";

const sections = [
  {
    title: "1. Acceptance of Terms",
    paragraphs: [
      'These Terms & Conditions ("Terms") govern access to and use of the website, merchant platform, applications and services provided by SMARTHUB PAY FINTECH PRIVATE LIMITED ("SmartHub Pay", "Company", "we", "our" or "us").',
      "By accessing our platform, registering as a merchant, entering into a service agreement or using our services, you agree to these Terms and any applicable product-specific conditions.",
      "If you do not agree to these Terms, you must not use the relevant services.",
    ],
  },
  {
    title: "2. About Our Services",
    paragraphs: [
      "SmartHub Pay may provide or facilitate technology and payment-related services, depending on the relevant product, contract, partner arrangement and regulatory permissions.",
      "These services may include:",
    ],
    bullets: [
      "Merchant onboarding and digital payment acceptance.",
      "UPI QR and supported POS solutions.",
      "Online payment collection and payment gateway integrations.",
      "Transaction reporting, reconciliation and settlement tracking.",
      "Recurring collection and mandate-related technology.",
      "Payout and disbursement integrations.",
      "White-label and other payment technology services.",
    ],
    footer:
      "Not every service is available to every user. Services requiring regulatory authorisation will be offered only within the scope of applicable permissions and through appropriately authorised entities or partners.",
  },
  {
    title: "3. Eligibility and Merchant Onboarding",
    paragraphs: ["To use merchant services, you must:"],
    bullets: [
      "Be legally eligible to enter into a binding agreement.",
      "Provide accurate, complete and current business and identity information.",
      "Submit KYC, business, banking and beneficial ownership documents when required.",
      "Ensure that the business and its activities are lawful.",
      "Maintain a valid bank account and other required registrations.",
      "Cooperate with verification, compliance and risk reviews.",
    ],
    footer:
      "Approval is subject to verification and acceptance by SmartHub Pay and, where applicable, its banking or payment partners. Submission of an application does not guarantee approval.",
  },
  {
    title: "4. KYC and Compliance",
    paragraphs: [
      "You agree to provide documents and information required for customer due diligence, fraud prevention, sanctions screening, transaction monitoring and other applicable compliance processes.",
      "We or our authorised partners may request updated documents or additional information. Services may be declined, restricted or suspended where information is incomplete, inconsistent or raises legitimate compliance concerns, subject to applicable law.",
    ],
  },
  {
    title: "5. Account Security",
    paragraphs: [
      "You are responsible for safeguarding your login credentials, registered devices and authorised-user access.",
      "You must:",
    ],
    bullets: [
      "Keep passwords, OTPs, UPI PINs and security credentials confidential.",
      "Notify us promptly if you suspect unauthorised access.",
      "Ensure only authorised personnel access your account.",
      "Maintain the security of your devices and business systems.",
      "Not impersonate another person, circumvent security controls or allow unauthorised use of your account.",
    ],
  },
  {
    title: "6. Permitted Use",
    paragraphs: [
      "You may use the services only for lawful business and payment activities permitted by the relevant product and applicable law.",
      "You must not use the platform to:",
    ],
    bullets: [
      "Facilitate fraud, money laundering, terrorist financing or other unlawful activity.",
      "Process prohibited or unauthorised transactions.",
      "Misrepresent your business, products or services.",
      "Manipulate transaction records or misuse refunds or chargebacks.",
      "Interfere with platform security, availability or integrity.",
      "Violate intellectual property, privacy or other third-party rights.",
    ],
    footer:
      "SmartHub Pay may take appropriate action where misuse or a compliance concern is identified, subject to applicable law and contractual obligations.",
  },
  {
    title: "7. Transaction Processing",
    paragraphs: [
      "Transactions are subject to the rules, technical requirements and availability of the relevant banks, payment networks, payment service providers and other participants.",
      "SmartHub Pay does not guarantee that every transaction will be successful, instantaneous or uninterrupted. A transaction may be declined, delayed, reversed or remain pending because of technical issues, insufficient funds, risk controls, incorrect information or a third-party system failure.",
      "Users should check the transaction status before attempting a repeat payment to reduce the risk of duplicate transactions.",
    ],
  },
  {
    title: "8. Settlements",
    paragraphs: [
      "Settlement timelines, eligible balances, settlement cycles, cut-off times and applicable conditions will be communicated in the relevant service agreement or product schedule.",
      "Settlements may be delayed or placed under review where permitted by law or contract, including in cases involving suspected fraud, disputes, reversals, incomplete documentation or banking and payment-system restrictions.",
      "SmartHub Pay will not represent a settlement as completed until supported by the relevant transaction or partner status.",
    ],
  },
  {
    title: "9. Fees and Taxes",
    paragraphs: [
      "Applicable onboarding charges, device charges, rental fees, transaction fees, service charges and other commercial terms will be communicated through the relevant pricing schedule, order form or service agreement.",
      "You authorise collection of applicable fees in accordance with the agreed terms and applicable law. Taxes will be charged as required by law.",
      "Any changes to fees will be communicated in accordance with the applicable agreement and legal requirements.",
    ],
  },
  {
    title: "10. Refunds, Reversals and Disputes",
    paragraphs: [
      "Refunds, reversals and transaction disputes are subject to the applicable payment method, partner rules, merchant agreement and law.",
      "Merchants are responsible for providing accurate product and service information, honouring their customer commitments and responding to legitimate disputes.",
      "A payment receipt or transaction reference alone does not guarantee final settlement or prevent a transaction from being reversed where permitted by applicable rules.",
      "Customers should raise payment-related concerns through the appropriate merchant, bank or payment-service grievance channel.",
    ],
  },
  {
    title: "11. POS Devices and QR Codes",
    paragraphs: [
      "Where SmartHub Pay supplies or arranges POS devices, QR codes or related equipment:",
    ],
    bullets: [
      "Ownership, rental, warranty, maintenance and replacement terms will be specified in the relevant order or agreement.",
      "Merchants must use equipment only for authorised purposes.",
      "Devices and credentials must be protected from tampering or unauthorised use.",
      "Lost, damaged or malfunctioning equipment must be reported promptly.",
      "Return, recovery and replacement charges, where applicable, will follow the agreed commercial terms.",
    ],
  },
  {
    title: "12. Service Availability and Maintenance",
    paragraphs: [
      "We aim to provide reliable services but do not guarantee uninterrupted access. Services may be temporarily unavailable because of maintenance, upgrades, network failures, cyber incidents, third-party outages or circumstances beyond our reasonable control.",
      "We will take reasonable steps to restore services and communicate material disruptions where appropriate.",
    ],
  },
  {
    title: "13. Third-Party Providers",
    paragraphs: [
      "Certain services may depend on banks, payment aggregators, gateways, payment networks, device manufacturers, telecom operators and technology providers.",
      "Those services may be subject to separate terms and operational requirements. SmartHub Pay is not responsible for independent third-party actions or failures to the extent such matters are outside our control, subject always to applicable law and any obligations we have expressly accepted.",
    ],
  },
  {
    title: "14. Intellectual Property",
    paragraphs: [
      "All rights in SmartHub Pay's platform, software, branding, logos, designs, documentation and proprietary materials belong to the Company or its licensors.",
      "You may use these materials only as authorised in writing or under the applicable service agreement. You must not copy, modify, reverse-engineer, distribute or commercially exploit protected materials except where expressly permitted by law or written agreement.",
    ],
  },
  {
    title: "15. Confidentiality and Data Protection",
    paragraphs: [
      "Each party must protect confidential information received from the other party and use it only for authorised purposes.",
      "SmartHub Pay's processing of personal information is governed by its Privacy Policy and applicable law. Merchants must also comply with their own privacy, security and data protection obligations.",
    ],
  },
  {
    title: "16. Suspension and Termination",
    paragraphs: [
      "We may suspend, restrict or terminate access to a service in accordance with the applicable agreement and law, including where:",
    ],
    bullets: [
      "Required KYC or compliance information is not provided.",
      "Fraud, unlawful activity or security risks are reasonably suspected.",
      "A partner or regulator requires restriction.",
      "The user materially breaches these Terms.",
      "The relevant service is discontinued or becomes legally unavailable.",
    ],
    footer:
      "Where legally and operationally appropriate, we will provide notice and an opportunity to resolve the issue. Termination does not eliminate outstanding payment, fee, dispute or record-retention obligations.",
  },
  {
    title: "17. Disclaimers",
    paragraphs: [
      "To the extent permitted by law, the platform and technology services are provided subject to their documented specifications and applicable service commitments.",
      "We do not guarantee that the services will be error-free, available at all times or suitable for every business requirement. Nothing in these Terms excludes a statutory right or liability that cannot lawfully be excluded.",
    ],
  },
  {
    title: "18. Limitation of Liability",
    paragraphs: [
      "To the extent permitted by applicable law, SmartHub Pay will not be liable for indirect or consequential losses, loss of anticipated profits or business interruption arising from the use of the services, except where such exclusion is prohibited by law.",
      "Any additional liability limitations must be set out in the applicable commercial agreement and must not override mandatory legal or regulatory obligations.",
    ],
  },
  {
    title: "19. Indemnity",
    paragraphs: [
      "To the extent permitted by law, you agree to indemnify SmartHub Pay against third-party claims and reasonable costs arising directly from your unlawful activity, fraud, material breach of these Terms or infringement of third-party rights.",
      "This clause does not apply to the extent a claim results from SmartHub Pay's own breach, negligence, wilful misconduct or other liability that cannot lawfully be excluded.",
    ],
  },
  {
    title: "20. Force Majeure",
    paragraphs: [
      "Neither party will be responsible for a failure caused by circumstances beyond its reasonable control, such as natural disasters, war, government action, widespread network failures or major third-party infrastructure disruptions, subject to applicable law and any continuing obligations.",
    ],
  },
  {
    title: "21. Changes to These Terms",
    paragraphs: [
      "We may update these Terms to reflect changes in our services, business operations or legal requirements.",
      "The updated version will be published with a revised date. Where required, we will provide prior notice or obtain acceptance before applying material changes to an existing service.",
    ],
  },
  {
    title: "22. Governing Law and Dispute Resolution",
    paragraphs: [
      "These Terms are governed by the laws of India.",
      "Disputes will be addressed through good-faith discussions and, where applicable, the dispute-resolution procedure in the relevant service agreement. Any court jurisdiction clause must be finalised to reflect the Company's registered office, applicable law and competent courts.",
      "Nothing in these Terms limits rights available under mandatory consumer protection, payment-system or other applicable laws.",
    ],
  },
  {
    title: "23. Grievance and Customer Support",
    paragraphs: [
      "For service questions, complaints or disputes, please contact:",
    ],
    bullets: [
      "Company: SMARTHUB PAY FINTECH PRIVATE LIMITED",
      "Address: Registered Office: Shop No. 2, Wing B, PMT Bus Stand Building, Survey No. 2/1, CTS No. 438, Kothrud, Pune – 411038, Maharashtra, India.",
      "Customer Support Email: tech@smarthubpay.com",
      "Grievance Officer: Grievance Redressal Officer & Customer Support Head",
      "Grievance Email: customercare@smarthubpay.com",
      "Phone: +91 98238 28491",
      "Support Hours: [Insert operating hours]",
    ],
    footer:
      "Please include your merchant ID, transaction reference and a brief description of the issue where relevant. Do not send passwords, OTPs, UPI PINs or other confidential authentication credentials.",
    extra:
      "We will acknowledge and handle complaints in accordance with applicable law and our published grievance procedure.",
  },
  {
    title: "24. Severability and Entire Agreement",
    paragraphs: [
      "If any provision of these Terms is held invalid or unenforceable, the remaining provisions will continue to apply to the extent permitted by law.",
      "These Terms, together with the applicable service agreement, pricing schedule, Privacy Policy and product-specific conditions, constitute the agreement governing the relevant use of the services.",
    ],
  },
   {
    title: "25. Contact Us",
    paragraphs: [
      "For questions about these Terms, contact SMARTHUB PAY FINTECH PRIVATE LIMITED using the official contact details published on our website.",
    ],
  },

];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f4f8fd] text-slate-700">
      {/* Header */}
      
      {/* Page heading */}
      <section className="relative isolate overflow-hidden  bg-white">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_85%_25%,rgba(40,197,232,0.16),transparent_40%),linear-gradient(115deg,#eff6ff_0%,#ffffff_65%,#eafaff_100%)]" />

        <div className="mx-auto max-w-7xl px-5 pt-12 sm:px-8 sm:pt-16 lg:px-10 lg:pt-20">
          <div className="max-w-3xl">
           

            <h1 className="text-3xl font-semibold tracking-tight text-[#102c55] sm:text-4xl lg:text-4xl">
              Terms &amp; Conditions
            </h1>

           
          </div>
        </div>
      </section>

      {/* Terms content */}
      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10">
        <div className="grid items-start gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
          {/* Table of contents */}
          <aside className="lg:sticky lg:top-24">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-[#102c55]">
                In this document
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Browse the terms by section.
              </p>

              <nav className="mt-4 max-h-[65vh] space-y-1 overflow-y-auto pr-1">
                {sections.map((section, index) => (
                  <a
                    key={section.title}
                    href={`#section-${index + 1}`}
                    className="block rounded-lg px-3 py-2 text-xs leading-5 text-slate-600 transition hover:bg-blue-50 hover:text-[#0878d1] sm:text-sm"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main document */}
          <div className="min-w-0 space-y-5">
          

            {sections.map((section, index) => (
              <article
                key={section.title}
                id={`section-${index + 1}`}
                className="scroll-mt-28 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_4px_20px_-14px_rgba(15,39,73,0.18)] sm:p-7 lg:p-8"
              >
                <h2 className="border-b border-slate-100 pb-4 text-lg font-bold leading-7 text-[#102c55] sm:text-xl">
                  {section.title}
                </h2>

                <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600 sm:text-[15px] sm:leading-8">
                  {section.paragraphs?.map((paragraph, paragraphIndex) => (
                    <p key={paragraphIndex}>{paragraph}</p>
                  ))}

                  {section.bullets && (
                    <ul className="space-y-2.5 pl-1">
                      {section.bullets.map((item, bulletIndex) => (
                        <li
                          key={bulletIndex}
                          className="flex items-start gap-3"
                        >
                          <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#0878d1]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.footer && (
                    <p className="rounded-xl bg-slate-50 p-4 text-slate-600">
                      {section.footer}
                    </p>
                  )}

                  {section.extra && <p>{section.extra}</p>}
                </div>
              </article>
            ))}

            
          </div>
        </div>
      </section>

     
    </main>
  );
}
