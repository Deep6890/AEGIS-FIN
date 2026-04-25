/**
 * LandingPage — "Save your finances for the future" landing page.
 * Responsive, Emoji-Free, and features an Exponential Blur Background.
 */
import React, { useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Star, Check, DollarSign, Briefcase, BarChart2, User, Globe, TrendingUp, ShieldCheck, Activity } from "lucide-react";
import { usePersona } from "../context/PersonaContext";

// ── Partners ──────────────────────────────────────────────────────────────────
const PARTNERS = ["BankNesia", "NeedWallet", "WorldBank", "Tabungku", "INVEST"];

// ── Testimonials ──────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    name:   "Abror Al Ghazali",
    role:   "Entrepreneur",
    text:   "Thank you mentors. We are very satisfied with the company to increase and maintain expenses and some more investments. As a new customer, you still get a portion of the benefits when you first registering with our customer service.",
    date:   "1 January 2024",
    rating: 5,
  },
  {
    name:   "Huzein Akbar",
    role:   "Student",
    text:   "Hi, thank you all to the finance mentors and friends. I am very happy to join the finance so I can starting to get used to taking care of my finances.",
    date:   "15 January 2024",
    rating: 5,
  },
  {
    name:   "Abdul Zein",
    role:   "Student",
    text:   "Thank you Finance and everyone who has helped me throughout the finance journey. I can't imagine who I would forget this services of the finance. I thank you again!",
    date:   "2 January 2024",
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
    <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto relative z-20">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#FF8A00] flex items-center justify-center shadow-lg shadow-[#FF8A00]/30">
          <span className="text-white text-sm font-black">L</span>
        </div>
        <span className="font-black text-black dark:text-white text-lg tracking-tight">Lichelete</span>
      </div>

      <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-400">
        {["Service", "Use Case", "Community", "Blog", "About"].map(item => (
          <a key={item} href="#" className="hover:text-black dark:hover:text-white transition-colors">
            {item}
          </a>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">
          🇺🇸 US <span className="text-[10px]">▼</span>
        </button>
        <button
          onClick={onGetStarted}
          className="px-5 py-2.5 rounded-xl bg-[#FF8A00] text-white text-sm font-bold shadow-lg shadow-[#FF8A00]/20 hover:bg-[#e07800] hover:shadow-[#FF8A00]/40 hover:-translate-y-0.5 transition-all"
        >
          Register
        </button>
      </div>
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero({ onGetStarted, appData }) {
  const avgSurvival = appData?.portfolioStats?.avgSurvival || 50;
  const companiesTracked = appData?.companies?.length || 2;

  return (
    <section className="relative max-w-6xl mx-auto px-6 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
      {/* Background Exponential Blur Animation */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#FF8A00]/10 rounded-full blur-[100px] animate-pulse-soft mix-blend-multiply dark:mix-blend-screen" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#00B341]/10 rounded-full blur-[120px] animate-float mix-blend-multiply dark:mix-blend-screen" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FFC224]/5 rounded-full blur-[150px]" />
      </div>

      {/* Left Content */}
      <div className="relative z-10">
        <div className="flex gap-1.5 mb-8">
          {[...Array(6)].map((_, i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
          ))}
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-black dark:text-white leading-[1.1] mb-8 tracking-tighter">
          Save your{" "}
          <span className="relative inline-block">
            <span className="relative z-10 italic pr-2">finances</span>
            <span className="absolute bottom-2 left-0 w-full h-4 bg-[#FFC224] opacity-40 -z-0 rounded-sm" />
          </span>{" "}
          <br className="hidden sm:block" />for the future
        </h1>

        <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg leading-relaxed mb-10 max-w-md">
          We take care of your finances for the better for the future and get a positive experience in maintaining finances.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={onGetStarted}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#FFC224] text-black font-bold text-base shadow-xl shadow-[#FFC224]/20 hover:bg-[#e6b020] hover:-translate-y-1 transition-all"
          >
            Get Started
          </button>
          <button className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#00B341] text-white font-bold text-base shadow-xl shadow-[#00B341]/20 hover:bg-[#009a38] hover:-translate-y-1 transition-all">
            Consultant
          </button>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-start gap-8 sm:gap-12 mt-16 pt-8 border-t border-gray-200 dark:border-gray-800">
          <div>
            <p className="text-4xl font-black text-black dark:text-white mb-2">
              <span className="text-[#FF8A00]">{avgSurvival}%</span>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[160px] leading-relaxed">
              Average portfolio survival score across tracked assets.
            </p>
          </div>
          <div>
            <p className="text-4xl font-black text-black dark:text-white mb-2">
              <span className="text-[#FF8A00]">{companiesTracked}K+</span>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[160px] leading-relaxed">
              Global assets and companies actively monitored.
            </p>
          </div>
        </div>
      </div>

      {/* Right Content — Interactive / Responsive Bento Grid */}
      <div className="relative z-10 h-[400px] lg:h-[500px] w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
        {/* Orange Illustration Card */}
        <div className="absolute top-0 right-0 w-48 h-64 rounded-3xl bg-gradient-to-br from-[#FF8A00] to-[#e07800] overflow-hidden shadow-2xl animate-float">
          <div className="w-full h-full flex flex-col items-center justify-end pb-6">
            <div className="w-32 h-40 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-inner">
              <User size={64} strokeWidth={1.5} className="text-white opacity-90" />
            </div>
          </div>
        </div>

        {/* Dollar icon card */}
        <div className="absolute top-12 right-[220px] w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00B341] to-[#009a38] flex items-center justify-center shadow-xl hover:scale-110 transition-transform cursor-pointer z-20">
          <DollarSign size={32} className="text-white" />
        </div>

        {/* Data viz card */}
        <div className="absolute bottom-12 right-[200px] w-52 bg-white/80 dark:bg-[#111]/80 backdrop-blur-2xl rounded-3xl p-5 shadow-2xl border border-white/50 dark:border-gray-800 z-30">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 size={16} className="text-[#FFC224]" />
            <p className="text-sm font-black text-gray-900 dark:text-white">Data Insights</p>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
            Reports and insights to stabilize your finances.
          </p>
          {/* Mini bars */}
          <div className="flex items-end gap-1.5 h-12 w-full">
            {[60, 80, 50, 90, 70, 85, 55].map((h, i) => (
              <div key={i} className="flex-1 rounded-sm bg-[#FFC224] hover:bg-[#e6b020] transition-colors" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>

        {/* Person photo card */}
        <div className="absolute bottom-0 right-0 w-40 h-40 rounded-3xl bg-gray-100 dark:bg-gray-800 border border-white/50 dark:border-gray-700 shadow-xl flex items-center justify-center overflow-hidden animate-float" style={{ animationDelay: "1s" }}>
          <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <Briefcase size={40} className="text-gray-400 dark:text-gray-500" />
          </div>
        </div>

        {/* Floating decorative elements */}
        <ShieldCheck size={24} className="absolute top-8 left-8 text-[#FF8A00] animate-pulse-soft" />
        <Globe size={20} className="absolute bottom-32 left-12 text-[#00B341]" />
        <TrendingUp size={28} className="absolute top-40 left-16 text-[#FFC224] animate-float" />
        
        {/* Dashed border decoration */}
        <div className="absolute top-0 left-0 w-40 h-40 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl -z-10 opacity-50" />
      </div>
    </section>
  );
}

// ── Partners ──────────────────────────────────────────────────────────────────
function Partners() {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 py-10 border-y border-gray-200 dark:border-gray-800">
      <p className="text-center text-sm font-semibold text-gray-400 uppercase tracking-widest mb-8">We cooperate with financial companies worldwide</p>
      <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16">
        {PARTNERS.map(p => (
          <span key={p} className="text-lg font-black text-gray-400 dark:text-gray-600 hover:text-black dark:hover:text-white transition-colors cursor-pointer">
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
    <section className="relative z-10 max-w-6xl mx-auto px-6 py-20 lg:py-32">
      <div className="text-center mb-16">
        <h2 className="text-4xl sm:text-5xl font-black text-black dark:text-white mb-6 tracking-tight">
          We are ready to{" "}
          <span className="relative inline-block">
            <span className="relative z-10 italic pr-2">serve</span>
            <span className="absolute bottom-2 left-0 w-full h-3 bg-[#FFC224] opacity-40 -z-0 rounded-sm" />
          </span>{" "}
          your needs
        </h2>
        <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Our customer service always provides good service to help you solve financial problems efficiently.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {SERVICES.map(s => (
          <div key={s.num} className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-3xl p-8 hover:border-black dark:hover:border-white shadow-xl shadow-transparent hover:shadow-black/5 dark:hover:shadow-white/5 transition-all duration-300 group hover:-translate-y-1 cursor-pointer">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg mb-6 shadow-lg transition-transform group-hover:scale-110"
              style={{ backgroundColor: s.color, boxShadow: `0 8px 24px ${s.color}40` }}
            >
              {s.num}
            </div>
            <h3 className="text-xl font-black text-black dark:text-white mb-4 leading-tight">{s.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-8">{s.desc}</p>
            <button className="flex items-center gap-2 text-sm font-bold text-black dark:text-white group-hover:gap-3 transition-all">
              Learn More <ArrowRight size={16} />
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
    <section className="relative z-10 max-w-6xl mx-auto px-6 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Left — try to join */}
        <div className="bg-white/80 dark:bg-[#111]/80 backdrop-blur-2xl border border-gray-200 dark:border-gray-800 rounded-3xl p-8 lg:p-12 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00B341] animate-pulse-soft" />
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Join us</p>
          </div>
          <h3 className="text-3xl sm:text-4xl font-black text-black dark:text-white mb-4 leading-tight tracking-tight">
            Try to join us<br className="hidden sm:block" /> and get{" "}
            <span className="italic text-[#FF8A00]">benefits</span>
          </h3>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            There have been many customers who join our company to increase and maintain expenses and some more investments. As a new customer, you get maximum benefits when registering.
          </p>

          <div className="space-y-4">
            {BENEFITS.map((b, i) => (
              <button
                key={i}
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-black dark:hover:border-white transition-all text-left bg-gray-50 dark:bg-gray-900/50"
              >
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 pr-4">{b}</span>
                <span className="text-gray-400 shrink-0"><ChevronLeft size={18} className={`transition-transform duration-300 ${openIdx === i ? "-rotate-90" : ""}`} /></span>
              </button>
            ))}
          </div>
        </div>

        {/* Right — goal section */}
        <div className="bg-[#0A0A0A] rounded-3xl p-8 lg:p-12 flex flex-col justify-between shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#00B341]/20 blur-[100px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00B341]" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Our Vision</p>
            </div>
            <h3 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-6 tracking-tight">
              Ensure you have the money you need for your business, so it can{" "}
              <span className="text-[#00B341] italic">grow</span> and{" "}
              <span className="text-[#FFC224] italic">prosper.</span>
            </h3>
            <p className="text-sm sm:text-base text-gray-400 leading-relaxed mb-10">
              We provide the best service for those of you who have difficulties in managing finances. Here we stand to solve problems that allow you to be better with a trusted system.
            </p>
          </div>

          {/* Photo grid - Illustration replacement */}
          <div className="grid grid-cols-3 gap-4 relative z-10">
            {[{ i: Activity, c: "bg-blue-500/10 text-blue-500" }, { i: Briefcase, c: "bg-purple-500/10 text-purple-500" }, { i: BarChart2, c: "bg-orange-500/10 text-orange-500" }].map(({ i: Icon, c }, i) => (
              <div key={i} className={`aspect-square rounded-2xl flex items-center justify-center ${c} border border-white/5`}>
                <Icon size={32} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── What makes us stand out ───────────────────────────────────────────────────
function StandOut({ onGetStarted, appData }) {
  const healthyAssets = appData?.portfolioStats?.healthy || 740;
  const sectors = appData?.latestSectorHealth?.length || 730;
  const models = appData?.latestMl?.length || 960;

  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 py-12">
      <div className="bg-[#0A0A0A] rounded-3xl p-8 lg:p-12 flex flex-col sm:flex-row items-center justify-between gap-10 shadow-2xl border border-gray-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black to-[#FFC224]/10 pointer-events-none" />
        <div className="relative z-10 w-full">
          <h3 className="text-3xl sm:text-4xl font-black text-white mb-8 tracking-tight">
            What makes us stand out<br className="hidden sm:block" /> from the rest?
          </h3>
          <div className="flex flex-wrap items-center gap-12">
            {[
              { val: `${models}+`, label: "Risk Models" },
              { val: `${sectors}+`, label: "Sectors Monitored" },
              { val: `${healthyAssets}+`, label: "Healthy Assets" },
            ].map(({ val, label }) => (
              <div key={label}>
                <p className="text-3xl font-black text-white tracking-tight mb-1">{val}</p>
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onGetStarted}
          className="relative z-10 w-20 h-20 rounded-full bg-[#FFC224] flex items-center justify-center shadow-[0_0_40px_rgba(255,194,36,0.3)] hover:scale-110 hover:shadow-[0_0_60px_rgba(255,194,36,0.5)] transition-all shrink-0"
        >
          <ArrowRight size={32} className="text-black" />
        </button>
      </div>
    </section>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────────
function Testimonials() {
  const [idx, setIdx] = useState(0);

  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 py-20 lg:py-32">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-6">
        <h2 className="text-4xl sm:text-5xl font-black text-black dark:text-white tracking-tight">
          What our{" "}
          <span className="relative inline-block">
            <span className="relative z-10 italic pr-2">customers</span>
            <span className="absolute bottom-2 left-0 w-full h-3 bg-[#FFC224] opacity-40 -z-0 rounded-sm" />
          </span>{" "}
          say
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIdx(Math.max(0, idx - 1))}
            className="w-12 h-12 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-black flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors shadow-sm"
          >
            <ChevronLeft size={20} className="text-black dark:text-white" />
          </button>
          <button
            onClick={() => setIdx(Math.min(TESTIMONIALS.length - 1, idx + 1))}
            className="w-12 h-12 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-black flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors shadow-sm"
          >
            <ChevronRight size={20} className="text-black dark:text-white" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TESTIMONIALS.map((t, i) => (
          <div
            key={i}
            className={`rounded-3xl p-8 transition-all duration-500 bg-white dark:bg-[#111] border ${
              i === idx
                ? "border-[#FFC224] shadow-[0_16px_40px_rgba(255,194,36,0.15)] -translate-y-2"
                : "border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            <div className="flex gap-1 mb-6">
              {[...Array(t.rating)].map((_, j) => (
                <Star key={j} size={16} className="text-[#FFC224] fill-[#FFC224]" />
              ))}
            </div>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed mb-8 font-medium">"{t.text}"</p>
            <div className="flex items-center gap-4 mt-auto">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF8A00] to-[#FFC224] flex items-center justify-center text-white font-black text-lg shadow-lg">
                {t.name[0]}
              </div>
              <div>
                <p className="text-base font-black text-black dark:text-white">{t.name}</p>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-0.5">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Footer CTA ────────────────────────────────────────────────────────────────
function FooterCTA({ onGetStarted }) {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 py-20 pb-32">
      <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#111] dark:to-black border border-gray-200 dark:border-gray-800 rounded-[40px] p-12 lg:p-20 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-64 bg-[#FFC224]/10 blur-[100px] rounded-full pointer-events-none" />
        <h3 className="relative z-10 text-4xl sm:text-5xl lg:text-6xl font-black text-black dark:text-white mb-6 tracking-tight leading-tight">
          We know that you're going to have<br className="hidden lg:block" /> a lot of questions, and we're here to help!
        </h3>
        <button
          onClick={onGetStarted}
          className="relative z-10 mt-8 px-10 py-5 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-bold text-lg hover:scale-105 hover:shadow-2xl transition-all"
        >
          Get Started Free
        </button>
      </div>
    </section>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function LandingPage({ onGetStarted, appData }) {
  return (
    <div className="bg-[#FDFBF7] dark:bg-[#050505] min-h-screen relative overflow-hidden font-sans">
      <Navbar onGetStarted={onGetStarted} />
      <Hero onGetStarted={onGetStarted} appData={appData} />
      <Partners />
      <ServicesSection />
      <BenefitsSection onGetStarted={onGetStarted} />
      <StandOut onGetStarted={onGetStarted} appData={appData} />
      <Testimonials />
      <FooterCTA onGetStarted={onGetStarted} />
    </div>
  );
}
