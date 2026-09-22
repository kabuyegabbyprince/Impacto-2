import React, { useState, useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { BarChart2, FileDown, Lock, Target, TrendingUp, Award, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Goal } from "../types";
import { Badge, Button } from "./ui";

interface GoalProgressChartsProps {
  goals: Goal[];
  isPaidGrowthOrPro: boolean;
  activeOrg?: any;
  onExportPDF?: () => void;
  canManageGoals?: boolean;
}

export const GoalProgressCharts: React.FC<GoalProgressChartsProps> = ({
  goals,
  isPaidGrowthOrPro,
  activeOrg,
  onExportPDF,
}) => {
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Compute chart data for Growth/Pro visualization
  const chartBarData = useMemo(() => {
    return goals.slice(0, 10).map((g) => ({
      name: g.title.length > 14 ? g.title.substring(0, 12) + "..." : g.title,
      fullName: g.title,
      Target: 100,
      Progress: Math.min(100, Math.max(0, g.achievement_percentage || 0)),
    }));
  }, [goals]);

  const pieStatusData = useMemo(() => {
    const completed = goals.filter(
      (g) => g.status === "completed" || (g.achievement_percentage || 0) >= 100
    ).length;
    const inProgress = goals.filter(
      (g) => (g.achievement_percentage || 0) > 0 && (g.achievement_percentage || 0) < 100
    ).length;
    const pending = goals.filter(
      (g) => !g.achievement_percentage || g.achievement_percentage === 0
    ).length;
    return [
      { name: "Completed", value: completed, color: "#10B981" },
      { name: "In Progress", value: inProgress, color: "#F59E0B" },
      { name: "Pending", value: pending, color: "#64748B" },
    ].filter((d) => d.value > 0);
  }, [goals]);

  // Aggregate stats
  const totalGoals = goals.length;
  const completedGoals = goals.filter(
    (g) => g.status === "completed" || (g.achievement_percentage || 0) >= 100
  ).length;
  const averageProgress = totalGoals > 0
    ? Math.round(
        goals.reduce((acc, g) => acc + (g.achievement_percentage || 0), 0) / totalGoals
      )
    : 0;

  // Client-side visual report PDF generator using html2canvas & jsPDF
  const handleExportPDF = async () => {
    if (isExportingPDF) return;
    setIsExportingPDF(true);

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const primaryColor = [21, 108, 69];
      const slateDark = [15, 23, 42];

      // Header Banner
      doc.setFillColor(245, 248, 246);
      doc.rect(14, 14, 182, 28, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(
        `${activeOrg?.name || "Organization"} — Strategic Goal Progress Report`,
        20,
        24
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | Plan: Growth / Pro Executive Visual Report`,
        20,
        31
      );
      doc.text(
        `Total Strategic Goals: ${totalGoals}  |  Completed: ${completedGoals}  |  Average Achievement: ${averageProgress}%`,
        20,
        37
      );

      let currentY = 48;

      // Capture the live visualization container with html2canvas
      const chartEl = document.getElementById("goal-progress-visualization-capture");
      if (chartEl) {
        try {
          const canvas = await html2canvas(chartEl, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
          });
          const imgData = canvas.toDataURL("image/png");
          const imgWidth = 182;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.text("EXECUTIVE VISUALIZATION CHARTS (RECHARTS ANALYTICS)", 14, currentY);
          currentY += 4;

          doc.addImage(imgData, "PNG", 14, currentY, imgWidth, Math.min(imgHeight, 105));
          currentY += Math.min(imgHeight, 105) + 8;
        } catch (captureErr) {
          console.warn("Could not capture chart image canvas, falling back to data table:", captureErr);
        }
      }

      // Check if we need a new page for the goal table
      if (currentY > 165) {
        doc.addPage();
        currentY = 20;
      }

      // Goals Detail Table Header
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(14, currentY, 182, 8, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text("#", 17, currentY + 5.5);
      doc.text("STRATEGIC GOAL TITLE", 26, currentY + 5.5);
      doc.text("PERIOD", 98, currentY + 5.5);
      doc.text("DEADLINE", 122, currentY + 5.5);
      doc.text("STATUS", 148, currentY + 5.5);
      doc.text("PROGRESS", 175, currentY + 5.5);

      currentY += 8;

      goals.forEach((g, idx) => {
        if (currentY > 265) {
          doc.addPage();
          currentY = 20;
        }

        const isEven = idx % 2 === 0;
        if (isEven) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, currentY, 182, 9, "F");
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        doc.text(`${idx + 1}`, 17, currentY + 6);

        const titleText = g.title.length > 34 ? g.title.substring(0, 32) + "..." : g.title;
        doc.setFont("helvetica", "bold");
        doc.text(titleText, 26, currentY + 6);

        doc.setFont("helvetica", "normal");
        const periodText = `${(g.period_type || "yr").toUpperCase()}: ${g.period_label || "-"}`;
        doc.text(periodText, 98, currentY + 6);

        const deadlineText = g.deadline ? new Date(g.deadline).toLocaleDateString() : "-";
        doc.text(deadlineText, 122, currentY + 6);

        const statusLabel = (g.status || "pending").toUpperCase();
        doc.text(statusLabel, 148, currentY + 6);

        const score = `${g.achievement_percentage || 0}%`;
        doc.setFont("helvetica", "bold");
        doc.text(score, 175, currentY + 6);

        currentY += 9;
      });

      // Verification lines
      if (currentY > 240) {
        doc.addPage();
        currentY = 25;
      } else {
        currentY += 12;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("EXECUTIVE VERIFICATION & AUDIT SIGN-OFF", 14, currentY);

      currentY += 4;
      doc.setDrawColor(203, 213, 225);
      doc.line(14, currentY + 12, 85, currentY + 12);
      doc.line(110, currentY + 12, 185, currentY + 12);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text("Executive Chairperson / President Signature", 14, currentY + 16);
      doc.text("Audit Committee / Secretary Signature", 110, currentY + 16);

      doc.save(`${activeOrg?.slug || "organization"}-goal-progress-report.pdf`);
    } catch (err) {
      console.error("Failed to generate goals PDF:", err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  // IF FREE PLAN: Render static fallback UI without interactive recharts
  if (!isPaidGrowthOrPro) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-3xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Strategic Goals Overview
                </h3>
                <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                  Static Mode (Free Plan)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Saved static target milestones for cooperative planning.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div 
              title="Download PDF is restricted to Growth and Pro plan users"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-xs font-medium cursor-not-allowed select-none"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Download PDF (Growth & Pro)</span>
            </div>
          </div>
        </div>

        {/* Static KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Strategic Goals
            </span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
              {totalGoals}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Completed Targets
            </span>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
              {completedGoals}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Average Progress
            </span>
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
              {averageProgress}%
            </span>
          </div>
        </div>

        {/* Static Progress Bars Fallback UI for Free plan */}
        <div className="space-y-3 p-4 bg-slate-50/70 dark:bg-slate-800/30 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Static Goal Progress Summary</span>
            <span className="text-[10px] text-slate-400 font-mono">Static View (Upgrade to Growth for Interactive Recharts)</span>
          </div>
          {goals.length > 0 ? (
            <div className="space-y-2.5 pt-1">
              {goals.slice(0, 5).map((g) => {
                const pct = Math.min(100, Math.max(0, g.achievement_percentage || 0));
                return (
                  <div key={g.id} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                      <span className="font-medium truncate max-w-[240px] sm:max-w-md">{g.title}</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-2">No strategic goals created yet.</p>
          )}
        </div>

        {/* Free Plan Static Mode Upgrade Notice */}
        <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 rounded-2xl flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
          <Lock className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold block">Interactive Recharts Analytics & PDF Reports Locked</span>
            <p className="text-amber-800 dark:text-amber-300 text-[11px] mt-0.5">
              Visual target vs. progress bar charts, dynamic donut distribution charts, and executive client-side PDF download reports are exclusively available on <strong>Growth</strong> and <strong>Pro</strong> plans.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // IF GROWTH / PRO (PAID TIER): Render dynamic Recharts and active Download PDF feature
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-3xs space-y-6">
      {/* Header with Title and Download PDF Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
            <BarChart2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                Goal Progress Analytics
              </h3>
              <span className="text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full">
                Growth & Pro Tier
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live visual progress charts and executive performance breakdowns
            </p>
          </div>
        </div>

        {/* Download PDF button restricted to Growth and Pro */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            icon={isExportingPDF ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <FileDown className="h-4 w-4 text-white" />}
            className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            {isExportingPDF ? "Generating PDF..." : "Download PDF"}
          </Button>
        </div>
      </div>

      {/* Capture Area for Client-Side Visualization Rendering */}
      <div id="goal-progress-visualization-capture" className="space-y-6 bg-white dark:bg-slate-900 p-2 rounded-2xl">
        {/* KPI Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
              <span>Total Goals</span>
              <Target className="h-4 w-4 text-slate-400" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
              {totalGoals}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
              <span>Completed</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1 block">
              {completedGoals}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
            <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs font-semibold">
              <span>In Progress</span>
              <TrendingUp className="h-4 w-4 text-amber-500" />
            </div>
            <span className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-1 block">
              {totalGoals - completedGoals}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
            <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 text-xs font-semibold">
              <span>Avg Achievement</span>
              <Award className="h-4 w-4 text-blue-500" />
            </div>
            <span className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1 block">
              {averageProgress}%
            </span>
          </div>
        </div>

        {/* Visual Recharts Container */}
        {goals.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-1">
            {/* Target vs Progress Bar Chart */}
            <div className="lg:col-span-8 bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800 p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Goal Achievement Rate (% of Target)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Top {chartBarData.length} Goals</span>
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartBarData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} />
                    <Tooltip
                      formatter={(value: any) => [`${value}%`, "Progress"]}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]?.payload?.fullName) {
                          return payload[0].payload.fullName;
                        }
                        return label;
                      }}
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        color: "#fff",
                        borderRadius: "8px",
                        fontSize: "11px",
                        border: "none",
                      }}
                    />
                    <Bar dataKey="Progress" fill="#10B981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status Breakdown Donut Chart */}
            <div className="lg:col-span-4 bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800 p-4 rounded-2xl flex flex-col items-center justify-between">
              <div className="w-full text-left mb-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Status Breakdown
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Portfolio Distribution</span>
              </div>
              <div className="w-full h-52 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={62}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: any) => [`${value} goals`, name]}
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        color: "#fff",
                        borderRadius: "8px",
                        fontSize: "11px",
                        border: "none",
                      }}
                    />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <Target className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No strategic goals created yet. Add goals above to populate analytics.</p>
          </div>
        )}
      </div>
    </div>
  );
};
