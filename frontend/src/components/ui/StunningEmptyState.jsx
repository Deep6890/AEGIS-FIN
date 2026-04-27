import React from "react";
import { TrendingUp, BarChart3, PieChart, Target, Zap, Shield, Globe, Building2, Users, Activity } from "lucide-react";

const FLOATING_ICONS = [
  { Icon: TrendingUp, delay: 0, duration: 3 },
  { Icon: BarChart3, delay: 0.5, duration: 4 },
  { Icon: PieChart, delay: 1, duration: 3.5 },
  { Icon: Target, delay: 1.5, duration: 4.5 },
  { Icon: Zap, delay: 2, duration: 3 },
  { Icon: Shield, delay: 2.5, duration: 4 },
];

function FloatingIcon({ Icon, delay, duration, className = "" }) {
  return (
    <div 
      className={`absolute opacity-10 dark:opacity-5 ${className}`}
      style={{
        animation: `float ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`
      }}
    >
      <Icon size={24} />
    </div>
  );
}

function GradientOrb({ className = "", size = "w-32 h-32" }) {
  return (
    <div className={`${size} rounded-full blur-3xl opacity-20 ${className}`} />
  );
}

export default function StunningEmptyState({ 
  title, 
  subtitle, 
  description, 
  primaryAction,
  secondaryAction,
  icon: MainIcon = Building2,
  theme = "default" // default, analytics, intelligence, correlation
}) {
  const themes = {
    default: {
      gradient: "from-blue-500/20 via-purple-500/20 to-pink-500/20",
      iconBg: "bg-gradient-to-br from-blue-500 to-purple-600",
      primaryBtn: "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700",
      orb1: "bg-gradient-to-br from-blue-400 to-purple-500",
      orb2: "bg-gradient-to-br from-purple-400 to-pink-500",
      orb3: "bg-gradient-to-br from-pink-400 to-red-500"
    },
    analytics: {
      gradient: "from-orange-500/20 via-red-500/20 to-pink-500/20",
      iconBg: "bg-gradient-to-br from-orange-500 to-red-600",
      primaryBtn: "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700",
      orb1: "bg-gradient-to-br from-orange-400 to-red-500",
      orb2: "bg-gradient-to-br from-red-400 to-pink-500",
      orb3: "bg-gradient-to-br from-pink-400 to-purple-500"
    },
    intelligence: {
      gradient: "from-emerald-500/20 via-teal-500/20 to-cyan-500/20",
      iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600",
      primaryBtn: "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700",
      orb1: "bg-gradient-to-br from-emerald-400 to-teal-500",
      orb2: "bg-gradient-to-br from-teal-400 to-cyan-500",
      orb3: "bg-gradient-to-br from-cyan-400 to-blue-500"
    },
    correlation: {
      gradient: "from-violet-500/20 via-purple-500/20 to-indigo-500/20",
      iconBg: "bg-gradient-to-br from-violet-500 to-purple-600",
      primaryBtn: "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700",
      orb1: "bg-gradient-to-br from-violet-400 to-purple-500",
      orb2: "bg-gradient-to-br from-purple-400 to-indigo-500",
      orb3: "bg-gradient-to-br from-indigo-400 to-blue-500"
    }
  };

  const currentTheme = themes[theme] || themes.default;

  return (
    <div className="relative min-h-[600px] flex items-center justify-center p-8 overflow-hidden">
      {/* Animated Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${currentTheme.gradient} opacity-50`} />
      
      {/* Floating Orbs */}
      <GradientOrb className={`absolute top-10 left-10 ${currentTheme.orb1} animate-pulse`} size="w-20 h-20" />
      <GradientOrb className={`absolute top-20 right-20 ${currentTheme.orb2} animate-pulse`} size="w-32 h-32" />
      <GradientOrb className={`absolute bottom-20 left-20 ${currentTheme.orb3} animate-pulse`} size="w-24 h-24" />
      <GradientOrb className={`absolute bottom-10 right-10 ${currentTheme.orb1} animate-pulse`} size="w-16 h-16" />
      
      {/* Floating Icons */}
      {FLOATING_ICONS.map((item, idx) => (
        <FloatingIcon
          key={idx}
          Icon={item.Icon}
          delay={item.delay}
          duration={item.duration}
          className={`
            ${idx === 0 ? 'top-16 left-16' : ''}
            ${idx === 1 ? 'top-32 right-24' : ''}
            ${idx === 2 ? 'bottom-32 left-24' : ''}
            ${idx === 3 ? 'bottom-16 right-16' : ''}
            ${idx === 4 ? 'top-1/2 left-8' : ''}
            ${idx === 5 ? 'top-1/2 right-8' : ''}
          `}
        />
      ))}
      
      {/* Main Content */}
      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Main Icon */}
        <div className="relative mb-8">
          <div className={`w-24 h-24 mx-auto rounded-3xl ${currentTheme.iconBg} flex items-center justify-center shadow-2xl transform hover:scale-110 transition-all duration-300`}>
            <MainIcon size={40} className="text-white" />
          </div>
          
          {/* Pulse Ring */}
          <div className="absolute inset-0 w-24 h-24 mx-auto rounded-3xl border-4 border-white/30 animate-ping" />
          <div className="absolute inset-0 w-24 h-24 mx-auto rounded-3xl border-2 border-white/20 animate-pulse" />
        </div>
        
        {/* Text Content */}
        <div className="space-y-6">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-200 dark:to-white bg-clip-text text-transparent mb-4">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xl text-gray-600 dark:text-gray-300 font-medium">
                {subtitle}
              </p>
            )}
          </div>
          
          {description && (
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed max-w-lg mx-auto">
              {description}
            </p>
          )}
          
          {/* Action Buttons */}
          {(primaryAction || secondaryAction) && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              {primaryAction && (
                <button
                  onClick={primaryAction.onClick}
                  className={`px-8 py-4 rounded-2xl text-white font-semibold shadow-lg transform hover:scale-105 transition-all duration-200 ${currentTheme.primaryBtn}`}
                >
                  {primaryAction.label}
                </button>
              )}
              
              {secondaryAction && (
                <button
                  onClick={secondaryAction.onClick}
                  className="px-8 py-4 rounded-2xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transform hover:scale-105 transition-all duration-200"
                >
                  {secondaryAction.label}
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {[
            { icon: Activity, title: "Real-time Analytics", desc: "Live market data processing" },
            { icon: Shield, title: "Risk Intelligence", desc: "Advanced risk assessment" },
            { icon: Globe, title: "Market Intelligence", desc: "Comprehensive market insights" }
          ].map((feature, idx) => (
            <div key={idx} className="group">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-300 transform group-hover:scale-105">
                <feature.icon size={24} className="text-gray-600 dark:text-gray-400 mb-3 mx-auto" />
                <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">{feature.title}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* CSS for animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
      `}</style>
    </div>
  );
}