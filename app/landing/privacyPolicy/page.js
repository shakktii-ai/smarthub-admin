
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | SmartHub Pay",
  description:
    "Learn how SMARTHUB PAY FINTECH PRIVATE LIMITED collects, uses, stores, shares and protects personal information.",
};

const sections = [
  {
    title: "1. Introduction",
    paragraphs: [
      'SMARTHUB PAY FINTECH PRIVATE LIMITED ("SmartHub Pay", "Company", "we", "our" or "us") respects the privacy of individuals and businesses that access our website, applications, merchant platforms or services.',
      "This Privacy Policy explains how we collect, use, store, disclose and protect information in connection with our services.",
      "By accessing our website or using our services, you acknowledge this Policy. Where consent is legally required, we will seek the appropriate consent.",
    ],
  },
  {
    title: "2. Scope",
    paragraphs: [
      "This Policy applies to merchants, business customers, authorised users, website visitors, prospective customers and other individuals whose information we process in connection with our services.",
      "Certain services may also be governed by the privacy policies of our banking partners, payment aggregators, payment gateways, technology providers and other third parties.",
    ],
  },
  {
    title: "3. Information We May Collect",
    paragraphs: [
      "Depending on the services used, we may collect the following categories of information:",
    ],
    subsections: [
      {
        title: "A. Personal and contact information",
        bullets: [
          "Name, mobile number and email address.",
          "Business address and correspondence details.",
          "Identity and verification information where required.",
        ],
      },
      {
        title: "B. Business and merchant information",
        bullets: [
          "Business or trade name and business address.",
          "PAN, GSTIN, business registration and related documents, where applicable.",
          "Authorised signatory and beneficial ownership information where required for verification.",
        ],
      },
      {
        title: "C. Banking and settlement information",
        bullets: [
          "Bank account details and beneficiary information necessary for onboarding and settlements.",
          "Settlement instructions, transaction references and reconciliation records.",
        ],
      },
      {
        title: "D. Transaction information",
        bullets: [
          "Transaction amount, date, time, status and reference number.",
          "Merchant identifiers, payment method and refund or dispute information.",
          "Relevant records received from authorised payment partners.",
        ],
      },
      {
        title: "E. Technical information",
        bullets: [
          "IP address, device and browser information, access logs and diagnostic information.",
          "Application usage, security events and authentication records.",
        ],
      },
    ],
    footer:
      "We will collect only information reasonably necessary for the relevant purpose and applicable legal obligations.",
  },
  {
    title: "4. How We Use Information",
    paragraphs: ["We may use information to:"],
    bullets: [
      "Register, onboard and verify merchants and business customers.",
      "Provide payment acceptance, transaction tracking and related technology services.",
      "Facilitate authorised payment processing, refunds, reconciliation and settlements through relevant partners.",
      "Prevent fraud, detect suspicious activity and protect platform security.",
      "Comply with applicable laws, regulatory requirements and lawful requests.",
      "Respond to customer enquiries, grievances and technical support requests.",
      "Maintain operational, financial, audit and transaction records.",
      "Improve our products, systems, service quality and user experience.",
      "Send service notifications, security alerts and relevant operational communications.",
      "Send marketing communications where permitted by law and subject to applicable preferences.",
    ],
  },
  {
    title: "5. Legal Basis and Consent",
    paragraphs: [
      "We process personal data on the basis permitted under applicable Indian law, including valid consent where required, legitimate uses recognised by law, contractual or service-related necessity where applicable, and compliance with legal obligations.",
      "Where consent is the applicable basis, individuals may withdraw consent using the available process. Withdrawal does not affect processing already lawfully undertaken and may affect our ability to provide certain services.",
    ],
  },
  {
    title: "6. Sharing and Disclosure",
    paragraphs: [
      "We may share relevant information, to the extent necessary and lawful, with:",
    ],
    bullets: [
      "Banks, payment aggregators, payment gateways and payment system participants.",
      "UPI, card-network and other payment infrastructure partners, where applicable.",
      "KYC, identity verification, fraud prevention and security service providers.",
      "Technology, cloud hosting, customer support and communication providers.",
      "Auditors, legal advisers and professional service providers.",
      "Regulators, law enforcement agencies, courts and government authorities when legally required.",
      "Successor entities in connection with a lawful merger, restructuring or business transfer.",
    ],
    footer:
      "We do not authorise third parties to use personal information for purposes unrelated to the services or their lawful obligations.",
  },
  {
    title: "7. Payment Card and Authentication Data",
    paragraphs: [
      "Payment credentials and sensitive authentication data must be handled in accordance with applicable law, payment-network requirements and relevant security standards.",
      "Where card payments are supported, card processing may be performed by authorised payment partners. SmartHub Pay will not knowingly store sensitive authentication data, such as card PINs or card verification values, beyond what applicable rules expressly permit.",
      "Users must never share OTPs, UPI PINs, passwords or other confidential authentication credentials with anyone claiming to represent SmartHub Pay.",
    ],
  },
  {
    title: "8. Data Security",
    paragraphs: [
      "We seek to maintain reasonable technical, organisational and operational safeguards appropriate to the nature of the information processed. These may include access controls, authentication, encryption where appropriate, monitoring, staff confidentiality requirements, secure development practices and vendor oversight.",
      "No electronic system or internet transmission can be guaranteed to be completely secure. If a personal data breach occurs, we will take the steps required under applicable law.",
    ],
  },
  {
    title: "9. Data Retention",
    paragraphs: [
      "We retain personal and transaction information only for as long as reasonably necessary for the stated purposes, service delivery, dispute resolution, accounting, audit, fraud prevention and applicable legal or regulatory requirements.",
      "Information will be erased or its processing restricted when retention is no longer necessary, subject to lawful retention obligations and permitted exceptions.",
    ],
  },
  {
    title: "10. Your Rights and Choices",
    paragraphs: ["Subject to applicable law, you may have the right to:"],
    bullets: [
      "Request information about personal data processed by us.",
      "Request correction or updating of inaccurate or incomplete data.",
      "Request erasure of personal data where legally applicable.",
      "Withdraw consent where processing is based on consent.",
      "Raise a grievance regarding the processing of personal data.",
      "Nominate another person where such nomination is provided under applicable law.",
    ],
    footer:
      "Requests may require identity verification. Certain information cannot be erased while retention is legally required or necessary for an applicable legal claim.",
  },
  {
    title: "11. Cookies and Similar Technologies",
    paragraphs: [
      "Our website or applications may use cookies and similar technologies for essential functionality, security, preferences, analytics and performance.",
      "Where required, we will provide appropriate notice and consent choices. Users may also manage cookies through their browser settings, although disabling certain cookies may affect functionality.",
    ],
  },
  {
    title: "12. Third-Party Websites and Services",
    paragraphs: [
      "Our platforms may contain links to or integrations with third-party websites, applications or payment services. Those third parties operate under their own terms and privacy policies.",
      "SmartHub Pay is not responsible for the independent privacy practices of third parties, except to the extent required by applicable law or contract.",
    ],
  },
  {
    title: "13. Children's Data",
    paragraphs: [
      "Our merchant and business services are not intended to be used independently by children where prohibited by law. We will handle children's personal data in accordance with applicable legal requirements, including any applicable parental consent and safeguards.",
    ],
  },
  {
    title: "14. Cross-Border Processing",
    paragraphs: [
      "Where personal data is processed or transferred outside India, we will follow applicable Indian data protection requirements and any restrictions or conditions imposed by law.",
    ],
  },
  {
    title: "15. Changes to This Policy",
    paragraphs: [
      'We may revise this Privacy Policy to reflect changes in our services, security practices or legal requirements. The updated version will be published with a revised "Last Updated" date. Where required, we will provide additional notice or seek consent.',
    ],
  },
  {
    title: "16. Contact and Grievances",
    paragraphs: [
      "For privacy-related requests, complaints or questions, please contact:",
    ],
    bullets: [
      "Company: SMARTHUB PAY FINTECH PRIVATE LIMITED",
      "Address: Registered Office: Shop No. 2, Wing B, PMT Bus Stand Building, Survey No. 2/1, CTS No. 438, Kothrud, Pune – 411038, Maharashtra, India.",
      "Privacy / Grievance Officer: Rudra Narayan Yadav",
      "Email: tech@smarthubpay.com",
      "Phone: +91 70836 45607",
    ],
    footer:
      "We will handle complaints and requests in accordance with applicable law and our published grievance-handling procedure.",
  },
  {
    title: "17. Applicable Law",
    paragraphs: [
      "This Policy is governed by the laws of India, subject to applicable data protection, payment system and other regulatory requirements.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#f4f8fd] text-slate-700">
      {/* Page heading */}
      <section className="relative isolate overflow-hidden  bg-white">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_85%_25%,rgba(40,197,232,0.16),transparent_40%),linear-gradient(115deg,#eff6ff_0%,#ffffff_65%,#eafaff_100%)]" />

        <div className="mx-auto max-w-7xl px-5 pt-12 pb-2 sm:px-8 sm:pt-16 sm:pb-4 lg:px-10 lg:pt-20 lg:pb-4">
          <div className="max-w-3xl">
           

            <h1 className="text-3xl font-semibold tracking-tight text-[#102c55] sm:text-4xl lg:text-4xl">
              Privacy Policy
            </h1>


            {/* <div className="mt-7 flex flex-wrap gap-3 text-xs text-slate-500 sm:text-sm">
              <span className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2">
                Effective Date: [Insert Date]
              </span>
              <span className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2">
                Last Updated: [Insert Date]
              </span>
            </div> */}
          </div>
        </div>
      </section>

      {/* Policy content */}
      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10">
        <div className="grid items-start gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
          {/* Table of contents */}
          <aside className="lg:sticky lg:top-28">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-[#102c55]">
                In this document
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Browse the policy by section.
              </p>

              <nav className="mt-4 max-h-[65vh] space-y-1 overflow-y-auto pr-1">
                {sections.map((section, index) => (
                  <a
                    key={section.title}
                    href={`#privacy-${index + 1}`}
                    className="block rounded-lg px-3 py-2 text-xs leading-5 text-slate-600 transition hover:bg-blue-50 hover:text-[#0878d1] sm:text-sm"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main policy */}
          <div className="min-w-0 space-y-5">
            

            {sections.map((section, index) => (
              <article
                key={section.title}
                id={`privacy-${index + 1}`}
                className="scroll-mt-32 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_4px_20px_-14px_rgba(15,39,73,0.18)] sm:p-7 lg:p-8"
              >
                <h2 className="border-b border-slate-100 pb-4 text-lg font-bold leading-7 text-[#102c55] sm:text-xl">
                  {section.title}
                </h2>

                <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600 sm:text-[15px] sm:leading-8">
                  {section.paragraphs?.map((paragraph, paragraphIndex) => (
                    <p key={paragraphIndex}>{paragraph}</p>
                  ))}

                  {section.subsections?.map((subsection) => (
                    <div
                      key={subsection.title}
                      className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5"
                    >
                      <h3 className="font-semibold text-[#102c55]">
                        {subsection.title}
                      </h3>
                      <ul className="mt-3 space-y-2">
                        {subsection.bullets.map((item) => (
                          <li key={item} className="flex items-start gap-3">
                            <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#0878d1]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  {section.bullets && (
                    <ul className="space-y-2.5 pl-1">
                      {section.bullets.map((item) => (
                        <li key={item} className="flex items-start gap-3">
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
                </div>
              </article>
            ))}

           
          </div>
        </div>
      </section>

     
    </main>
  );
}
