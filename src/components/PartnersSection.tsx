import React from "react";
import { useTranslation } from "react-i18next";
import { Handshake } from "lucide-react";

export const PartnersSection: React.FC = () => {
  const { i18n } = useTranslation();

  const isRw = i18n.language?.startsWith("rw");
  const isFr = i18n.language?.startsWith("fr");

  return (
    <section className="py-12 bg-white dark:bg-slate-900 border-t border-b border-gray-150 dark:border-slate-800 px-6 relative overflow-hidden">
      <div className="max-w-5xl mx-auto text-center relative z-10">
        {/* Header Badge & Title */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold uppercase tracking-widest font-mono mb-2">
          <Handshake className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          {isRw ? "Abafatanyabikorwa" : isFr ? "Nos Partenaires" : "Partners"}
        </div>

        <h2 className="text-xl md:text-2xl font-black font-display text-gray-950 dark:text-white uppercase tracking-tight">
          {isRw ? "Abafatanyabikorwa Betu" : isFr ? "Nos Partenaires" : "Our Partners"}
        </h2>

        {/* Partners Grid (4 cards: RCA, RDB, MTN MoMo, Airtel Money) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6 mt-8 max-w-4xl mx-auto">
          
          {/* Partner 1: RCA (Rwanda Cooperative Agency) */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center justify-between shadow-2xs hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all duration-200">
            <div className="h-14 w-full flex items-center justify-center py-1">
              {/* RCA Official Logo Recreation */}
              <div className="flex items-center gap-2">
                <div className="relative h-11 w-11 rounded-full bg-white dark:bg-slate-800 p-0.5 border border-sky-300 shadow-xs flex items-center justify-center shrink-0 overflow-hidden">
                  <svg viewBox="0 0 100 100" className="h-full w-full">
                    <circle cx="50" cy="50" r="48" fill="#0095D9" />
                    <rect x="2" y="45" width="96" height="22" fill="#FCD116" />
                    <rect x="2" y="67" width="96" height="25" fill="#00A859" />
                    <circle cx="75" cy="25" r="10" fill="#FCD116" />
                    <text x="50" y="61" textAnchor="middle" fill="#00A859" fontSize="18" fontWeight="900" fontFamily="sans-serif">RCA</text>
                    <path d="M 12,88 Q 30,70 50,88 Q 70,70 88,88 Q 50,98 12,88 Z" fill="#7C3A13" />
                  </svg>
                </div>
                <div className="flex flex-col text-left leading-none">
                  <span className="text-[10px] font-black tracking-tight text-[#0072CE] dark:text-sky-400 font-display">
                    Rwanda
                  </span>
                  <span className="text-[9px] font-bold text-[#0072CE] dark:text-sky-400">
                    Cooperative
                  </span>
                  <span className="text-[9px] font-bold text-[#0072CE] dark:text-sky-400">
                    Agency
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 w-full">
              <span className="block text-[11px] font-extrabold text-gray-900 dark:text-white font-display">RCA</span>
              <span className="block text-[9px] text-gray-500 dark:text-slate-400 font-medium leading-tight mt-0.5">
                Cooperative Agency
              </span>
            </div>
          </div>

          {/* Partner 2: RDB (Rwanda Development Board) */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center justify-between shadow-2xs hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all duration-200">
            <div className="h-14 w-full flex items-center justify-center py-1">
              {/* RDB Official Logo Recreation */}
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-3.5 rounded-xs overflow-hidden shrink-0 shadow-2xs">
                  <div className="w-1/3 bg-[#0072CE] h-full" />
                  <div className="w-1/3 bg-[#FCD116] h-full" />
                  <div className="w-1/3 bg-[#00A859] h-full" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black tracking-tighter text-[#0072CE] dark:text-sky-400 font-display leading-none">
                    RDB
                  </span>
                  <div className="h-7 w-[1.5px] bg-[#0072CE]/60 dark:bg-sky-400/60" />
                  <div className="flex flex-col text-left leading-[1.05]">
                    <span className="text-[7.5px] font-black tracking-wider text-[#0072CE] dark:text-sky-400 uppercase">
                      Rwanda
                    </span>
                    <span className="text-[7px] font-bold tracking-tight text-[#0072CE] dark:text-sky-400 uppercase">
                      Development
                    </span>
                    <span className="text-[7px] font-bold tracking-tight text-[#0072CE] dark:text-sky-400 uppercase">
                      Board
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 w-full">
              <span className="block text-[11px] font-extrabold text-gray-900 dark:text-white font-display">RDB</span>
              <span className="block text-[9px] text-gray-500 dark:text-slate-400 font-medium leading-tight mt-0.5">
                Development Board
              </span>
            </div>
          </div>

          {/* Partner 3: MTN Mobile Money */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center justify-between shadow-2xs hover:border-amber-500/50 dark:hover:border-amber-500/50 transition-all duration-200">
            <div className="h-14 w-full flex items-center justify-center py-1">
              <div className="bg-[#FFCC00] text-black px-3 py-1.5 rounded-xl font-black text-xs tracking-tight flex items-center gap-1.5 shadow-xs border border-amber-300 font-display">
                <span className="bg-black text-[#FFCC00] text-[8px] px-1 py-0.5 rounded-md font-black">MTN</span>
                <span>MoMo</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 w-full">
              <span className="block text-[11px] font-extrabold text-gray-900 dark:text-white font-display">MTN MoMo</span>
              <span className="block text-[9px] text-gray-500 dark:text-slate-400 font-medium leading-tight mt-0.5">
                Payment Integration
              </span>
            </div>
          </div>

          {/* Partner 4: Airtel Money */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center justify-between shadow-2xs hover:border-red-500/50 dark:hover:border-red-500/50 transition-all duration-200">
            <div className="h-14 w-full flex items-center justify-center py-1">
              <div className="bg-[#E60000] text-white px-3 py-1.5 rounded-xl font-bold text-xs tracking-tight flex items-center gap-1 shadow-xs border border-red-600 font-sans">
                <span className="font-extrabold italic">airtel</span>
                <span className="text-[9px] font-semibold opacity-90">money</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 w-full">
              <span className="block text-[11px] font-extrabold text-gray-900 dark:text-white font-display">Airtel Money</span>
              <span className="block text-[9px] text-gray-500 dark:text-slate-400 font-medium leading-tight mt-0.5">
                Digital Wallet
              </span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
