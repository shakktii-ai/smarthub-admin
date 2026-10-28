import { Target, Users } from "lucide-react";

function AboutUs() {
  const leaders = [
    {
      image: "/sharad-muluk.jpeg",
      name: "Sharad Balasaheb Muluk",
      role: "Chief Executive Officer (CEO)",
      experience: "20+ Years of Experience",
      paragraphs: [
        "Sharad Balasaheb Muluk brings over 20 years of experience in banking and financial services, with expertise in banking operations, retail banking, business development, customer relationship management, and financial services distribution.",
        "As CEO, he leads business strategy, operational excellence, strategic partnerships, and market expansion, with a focus on POS machines, QR code payments, UPI solutions, and digital payment services.",
      ],
      expertise: [
        "Banking & financial services",
        "Business development",
        "Customer relationship management",
        "Digital payment strategy",
      ],
      vision:
        "To simplify digital payments and enable seamless business growth through technology and innovation.",
    },
    {
      image: "/sameer-paygude.jpeg",
      name: "Sameer Madhukar Paygude",
      role: "Managing Director (MD)",
      experience: "10 Years of Experience",
      paragraphs: [
        "Sameer Madhukar Paygude brings 10 years of experience in microfinance and financial services, including microfinance operations, customer relationships, business development, and financial services.",
        "He contributes to the company's strategic direction, business growth, operational development, and financial services network expansion. His focus includes building business partnerships and supporting customer-focused fintech and digital payment solutions.",
      ],
      expertise: [
        "Microfinance operations",
        "Business partnerships",
        "Financial services",
        "Business growth & expansion",
      ],
      vision:
        "To build a trusted financial and fintech ecosystem that creates value for businesses, merchants, and customers.",
    },
  ];

  return (
    <main className="overflow-hidden bg-[#f5f9ff] text-[#20242D]">
      <section id="about" className="scroll-mt-20 px-6 py-14 md:py-20">
        <div className="mx-auto max-w-7xl">
          {/* Section heading */}
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex rounded-full border border-[#1687e8]/15 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#1687e8]">
              The People Behind Our Vision
            </span>

            <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-4xl">
              Meet Our Leadership
            </h1>

            <p className="mt-4 text-base leading-7 text-slate-600">
              <span className="font-bold text-[#0878d1]">
                Smart Payments. Seamless Growth.
              </span>
              <span className="mt-2 block text-sm font-medium leading-7 text-slate-500">
                Digital Payments · Merchant Solutions · Collections · Payment
                Technology
              </span>
            </p>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              We empower merchants and businesses with technology-led payment
              and collection solutions designed to simplify transactions,
              improve operational efficiency, and support sustainable growth.
            </p>
          </div>

          {/* Leadership cards */}
          <div className="mt-10 grid items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
            {leaders.map((leader) => (
              <article
                key={leader.name}
                className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                {/* Photo and profile */}

                {/* Professional profile header */}
                <div className="border-b border-slate-100 bg-gradient-to-br from-white to-[#eff8ff] p-6 sm:p-8">
                  <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
                    {/* Leader photo */}
                    <div className="h-32 w-32 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-[#e8f5ff] shadow-md ring-1 ring-slate-200 sm:h-36 sm:w-36">
                      <img
                        src={leader.image}
                        alt={`Portrait of ${leader.name}`}
                        className="h-full w-full object-cover object-center"
                        loading="lazy"
                      />
                    </div>

                    {/* Leader details */}
                    <div className="min-w-0 flex-1 text-center sm:text-left">
                      <span className="inline-flex max-w-full items-center justify-center rounded-full bg-[#e1f2ff] px-3 py-1.5 text-[10px] font-bold uppercase leading-5 tracking-wide text-[#0878d1] sm:text-xs">
                        {leader.role}
                      </span>

                      <h2 className="mt-3 break-words text-xl font-semibold leading-tight text-[#20242d] sm:text-2xl">
                        {leader.name}
                      </h2>
                    </div>
                  </div>
                </div>

                {/* Profile details */}
                <div className="flex flex-1 flex-col p-6 sm:p-8">
                  <div className="space-y-4 text-sm leading-7 text-slate-600">
                    {leader.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>

                  {/* Vision aligned at bottom */}
                  <div className="mt-auto pt-7">
                    <div className="rounded-2xl border border-[#d7ebff] bg-[#f1f8ff] p-5">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-[#1687e8]" />
                        <h3 className="text-sm font-bold text-[#20242d]">
                          Vision
                        </h3>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {leader.vision}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default AboutUs;
