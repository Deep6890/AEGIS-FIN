/**
 * LandingPage — "Save your finances for the future" landing page.
 * Matches Image 1 exactly.
 */
import React, { useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Star, Check } from "lucide-react";
import { usePersona } from "../context/PersonaContext";

// ── Partners ──────────────────────────────────────────────────────────────────
const PARTNERS = ["BankNesia", "NeedWallet", "WorldBank", "Tabungku", "INVEST"];

// ── Testimonials ──────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    name:   "Abror Al Ghazali",
    role:   "Entrepreneur",
    text:   "Thank you mentors. We are very satisfied with the company to increase and maintain expenses and some more investments. As a new customer, you still get a portion of the benefits when you first registering with our customer service.",
    date:   "1 January 2019",
    rating: 5,
  },
  {
    name:   "Huzein Akbar",
    role:   "Student",
    text:   "Hi, thank you all to the finance mentors and friends. I am very happy to join the finance so I can starting to get used to taking care of my finances.",
    date:   "15 January 2019",
    rating: 5,
  },
  {
    name:   "Abdul Zein",
    role:   "Student",
    text:   "Thank you Finance and everyone who has helped me throughout the finance journey. I can't imagine who I would forget this services of the finance. I thank you again!",
    date:   "2 January 2019",
    rating: 5,
  },
];

// ── Services ──────────────────────────────────────────────────────────────────
const SERVICES = [
  {
    num:   "1",
    color: "#FF8A00",
    title: "Always take care of your finances",
    desc:  "We always help you save and manage your finances, we have a system that can manage expenses that are limited each month.",
  },
  {
    num:   "2",
    color: "#00B341",
    title: "Invest your savings with us easily",
    desc:  "To protect your finances we also have an investment service that can increase $2 per month with a system that is easy to learn for beginners.",
  },
  {
    num:   "3",
    color: "#FFC224",
    title: "Financial expenditure and income data",
    desc:  "We always provide your monthly data to make expenses and financial income with the aim of maintaining client stability.",
  },
];

// ── Benefits ──────────────────────────────────────────────────────────────────
const BENEFITS = [
  "Free investment videos every time you become a new registrant",
  "Free financial transfer admin fees worldwide",
  "Access with financial management mentor",
  "Structured financial management data",
];

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ onGetStarted }) {
  return (
    <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-[#FF8A00] flex items-center justify-center">
          <span className="text-white text-xs font-black">L</span>
        </div>
        <span className="font-black text-black dark:text-white text-sm">Lichelete</span>
      </div>

      <div className="hidden md:flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
        {["Service", "Use Case", "Community", "Blog", "About"].map(item => (
          <a key={item} href="#" className="hover:text-black dark:hover:text-white transition-colors">
            {item}
          </a>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button className="hidden sm:flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white">
          🇺🇸 US <span className="text-xs">▾</span>
        </button>
        <button
          onClick={onGetStarted}
          className="px-4 py-2 rounded-lg bg-[#FF8A00] text-white text-sm font-bold hover:bg-[#e07800] transition-colors"
        >
          Register
        </button>
      </div>
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero({ onGetStarted }) {
  return (
    <section className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      {/* Left */}
      <div>
        {/* Dotted decoration */}
        <div className="flex gap-1 mb-6">
          {[...Array(6)].map((_, i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          ))}
        </div>

        <h1 className="text-5xl sm:text-6xl font-black text-black dark:text-white leading-[1.05] mb-6">
          Save your{" "}
          <span className="relative inline-block">
            <span className="relative z-10 italic">finances</span>
            <span className="absolute bottom-1 left-0 w-full h-3 bg-[#FFC224] opacity-50 -z-0 rounded" />
          </span>{" "}
          for<br />the future
        </h1>

        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-8 max-w-sm">
          We take care of your finances for the better for the future and get a positive experience in maintaining finances
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={onGetStarted}
            className="px-6 py-3 rounded-xl bg-[#FFC224] text-black font-bold text-sm hover:bg-[#e6b020] transition-all hover:scale-105"
          >
            Get Started
          </button>
          <button className="px-6 py-3 rounded-xl bg-[#00B341] text-white font-bold text-sm hover:bg-[#009a38] transition-all hover:scale-105">
            Consultant
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-start gap-8 mt-10">
          <div>
            <p className="text-3xl font-black text-black dark:text-white">
              <span className="text-[#FF8A00]">50%</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[120px] leading-relaxed">
              Save half your salary to stabilize your financial management, we help you to be even better
            </p>
          </div>
          <div>
            <p className="text-3xl font-black text-black dark:text-white">
              <span className="text-[#FF8A00]">$2</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[120px] leading-relaxed">
              Do an investigation to increase your financial savings and get a bonus for each month
            </p>
          </div>
        </div>
      </div>

      {/* Right — floating bento elements */}
      <div className="relative h-80 lg:h-96">
        {/* Orange photo card */}
        <div className="absolute top-0 right-0 w-44 h-52 rounded-2xl bg-[#FF8A00] overflow-hidden shadow-xl">
          <div className="w-full h-full bg-gradient-to-b from-[#FF8A00] to-[#e07800] flex items-end justify-center pb-4">
            <div className="w-28 h-36 rounded-xl bg-white/20 flex items-center justify-center">
              <span className="text-white text-4xl">👩</span>
            </div>
          </div>
        </div>

        {/* Dollar icon card */}
        <div className="absolute top-8 right-48 w-20 h-20 rounded-2xl bg-[#00B341] flex items-center justify-center shadow-lg">
          <span className="text-4xl">💵</span>
        </div>

        {/* Data viz card */}
        <div className="absolute bottom-16 right-44 w-44 bg-white dark:bg-[#111] rounded-2xl p-3 shadow-xl border border-gray-100 dark:border-[#1f1f1f]">
          <p className="text-xs font-bold text-gray-800 dark:text-white mb-1">Data visualization</p>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            reports, and insights to stabilize your finances and help achieve your goals
          </p>
          {/* Mini bars */}
          <div className="flex items-end gap-1 mt-2 h-8">
            {[60, 80, 50, 90, 70, 85, 55].map((h, i) => (
              <div key={i} className="flex-1 rounded-sm bg-[#FFC224]" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>

        {/* Person photo card */}
        <div className="absolute bottom-0 right-0 w-36 h-36 rounded-2xl bg-gray-100 dark:bg-[#1a1a1a] overflow-hidden shadow-lg flex items-center justify-center">
          <span className="text-6xl">👨‍💼</span>
        </div>

        {/* Floating dots */}
        <span className="absolute top-4 left-4 w-3 h-3 rounded-full bg-[#FF8A00]" />
        <span className="absolute bottom-24 left-8 w-2 h-2 rounded-full bg-[#00B341]" />
        <span className="absolute top-32 left-20 w-2 h-2 rounded-full bg-[#FFC224]" />

        {/* Dashed border decoration */}
        <div className="absolute top-2 left-2 w-32 h-32 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl" />
      </div>
    </section>
  );
}

// ── Partners ──────────────────────────────────────────────────────────────────
function Partners() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-8 border-t border-b border-gray-100 dark:border-[#1f1f1f]">
      <p className="text-center text-xs text-gray-400 mb-6">We cooperate from financial companies in the world</p>
      <div className="flex items-center justify-center gap-8 flex-wrap">
        {PARTNERS.map(p => (
          <span key={p} className="text-sm font-bold text-gray-400 dark:text-gray-600 hover:text-black dark:hover:text-white transition-colors cursor-pointer">
            {p}
          </span>
        ))}
      </div>
    </section>
  );
}

// ── Services section ──────────────────────────────────────────────────────────
function ServicesSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-black text-black dark:text-white mb-3">
          We are ready to{" "}
          <span className="relative inline-block">
            <span className="relative z-10 italic">serve</span>
            <span className="absolute bottom-1 left-0 w-full h-3 bg-[#FFC224] opacity-50 -z-0 rounded" />
          </span>{" "}
          your needs
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Our customer service always provides good service to help you solve financial problems
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SERVICES.map(s => (
          <div key={s.num} className="border-2 border-gray-100 dark:border-[#1f1f1f] rounded-2xl p-6 hover:border-black dark:hover:border-white transition-all group">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm mb-4"
              style={{ backgroundColor: s.color }}
            >
              {s.num}
            </div>
            <h3 className="font-black text-black dark:text-white text-base mb-3">{s.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">{s.desc}</p>
            <button className="flex items-center gap-1 text-xs font-bold text-black dark:text-white hover:gap-2 transition-all">
              Learn More <ArrowRight size={12} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Benefits / CTA dark section ───────────────────────────────────────────────
function BenefitsSection({ onGetStarted }) {
  const [openIdx, setOpenIdx] = useState(null);

  return (
    <section className="max-w-6xl mx-auto px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left — try to join */}
        <div className="bg-white dark:bg-[#111] border border-gray-100 dark:border-[#1f1f1f] rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-[#00B341]" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Join us</p>
          </div>
          <h3 className="text-2xl font-black text-black dark:text-white mb-2">
            Try to join us<br />and get{" "}
            <span className="italic text-[#FF8A00]">benefits</span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            There have been many customers who join our company to increase and maintain expenses and some more investments. As a new customer, you still get a portion of the benefits when you first registering with our customer service.
          </p>

          <div className="space-y-3">
            {BENEFITS.map((b, i) => (
              <button
                key={i}
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-[#1f1f1f] hover:border-black dark:hover:border-white transition-all text-left"
              >
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{b}</span>
                <span className="text-gray-400 text-xs">{openIdx === i ? "▲" : "▼"}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right — goal section */}
        <div className="bg-black rounded-2xl p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-[#00B341]" />
            </div>
            <h3 className="text-2xl font-black text-white leading-tight mb-4">
              Our goal is to make sure you have the money you need for your business, so that it can{" "}
              <span className="text-[#00B341] italic">grow</span> and{" "}
              <span className="text-[#FFC224] italic">prosper.</span>
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-6">
              Our goal is to make sure you have the money you need. We provide the best service for those of you who have difficulties in managing finances. Here we stand to solve problems that allow you to be better with a trusted system.
            </p>
          </div>

          {/* Photo grid */}
          <div className="grid grid-cols-3 gap-2">
            {["👨‍💼", "👩‍💼", "📊"].map((e, i) => (
              <div key={i} className="aspect-square rounded-xl bg-gray-800 flex items-center justify-center text-3xl">
                {e}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── What makes us stand out ───────────────────────────────────────────────────
function StandOut({ onGetStarted }) {
  return (
    <section className="max-w-6xl mx-auto px-6 py-8">
      <div className="bg-black rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-black text-white mb-4">
            What makes us stand out<br />from the rest?
          </h3>
          <div className="flex items-center gap-8">
            {[
              { val: "960K", label: "Customer" },
              { val: "730K", label: "Review Found" },
              { val: "740K", label: "Customer Happy" },
            ].map(({ val, label }) => (
              <div key={label}>
                <p className="text-xl font-black text-white">{val}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onGetStarted}
          className="w-16 h-16 rounded-full bg-[#FFC224] flex items-center justify-center hover:scale-110 transition-all shrink-0"
        >
          <ArrowRight size={24} className="text-black" />
        </button>
      </div>
    </section>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────────
function Testimonials() {
  const [idx, setIdx] = useState(0);

  return (
    <section className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black text-black dark:text-white">
          What our{" "}
          <span className="relative inline-block">
            <span className="relative z-10 italic">customers</span>
            <span className="absolute bottom-1 left-0 w-full h-3 bg-[#FFC224] opacity-50 -z-0 rounded" />
          </span>{" "}
          say
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIdx(Math.max(0, idx - 1))}
            className="w-9 h-9 rounded-full border-2 border-gray-200 dark:border-[#2a2a2a] flex items-center justify-center hover:border-black dark:hover:border-white transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setIdx(Math.min(TESTIMONIALS.length - 1, idx + 1))}
            className="w-9 h-9 rounded-full border-2 border-gray-200 dark:border-[#2a2a2a] flex items-center justify-center hover:border-black dark:hover:border-white transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TESTIMONIALS.map((t, i) => (
          <div
            key={i}
            className={`border-2 rounded-2xl p-5 transition-all ${
              i === idx
                ? "border-black dark:border-white shadow-lg"
                : "border-gray-100 dark:border-[#1f1f1f]"
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white font-bold text-sm">
                {t.name[0]}
              </div>
              <div>
                <p className="text-xs font-bold text-black dark:text-white">{t.name}</p>
                <p className="text-[10px] text-gray-400">{t.role}</p>
              </div>
            </div>
            <div className="flex gap-0.5 mb-3">
              {[...Array(t.rating)].map((_, j) => (
                <Star key={j} size={10} className="text-[#FFC224] fill-[#FFC224]" />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">{t.text}</p>
            <p className="text-[10px] text-gray-300 dark:text-gray-600">{t.date}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Footer CTA ────────────────────────────────────────────────────────────────
function FooterCTA({ onGetStarted }) {
  return (
    <section className="max-w-6xl mx-auto px-6 py-12">
      <div className="bg-[#FDFBF7] dark:bg-[#111] border-2 border-dashed border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-10 text-center">
        <h3 className="text-3xl font-black text-black dark:text-white mb-2">
          We know that you're going to have<br />a lot of questions, and we're here to help!
        </h3>
        <button
          onClick={onGetStarted}
          className="mt-6 px-8 py-3 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-sm hover:scale-105 transition-all"
        >
          Get Started Free
        </button>
      </div>
    </section>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function LandingPage({ onGetStarted }) {
  return (
    <div className="bg-[#FDFBF7] dark:bg-[#0a0a0a] min-h-screen">
      <Navbar onGetStarted={onGetStarted} />
      <Hero onGetStarted={onGetStarted} />
      <Partners />
      <ServicesSection />
      <BenefitsSection onGetStarted={onGetStarted} />
      <StandOut onGetStarted={onGetStarted} />
      <Testimonials />
      <FooterCTA onGetStarted={onGetStarted} />
    </div>
  );
}
