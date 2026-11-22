import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePollResponses, useVoteInPoll } from "../hooks/useImpactoData";
import { ChatMessage, PollVote } from "../types";
import { BarChart3, Users, AlertCircle } from "lucide-react";

interface PollMessageComponentProps {
  message: ChatMessage;
  currentUserId: string;
}

export const PollMessageComponent: React.FC<PollMessageComponentProps> = ({
  message,
  currentUserId,
}) => {
  const { t } = useTranslation();
  const pollId = message.file_url || "";
  const options = useMemo<string[]>(() => {
    try {
      return JSON.parse(message.file_name || "[]");
    } catch {
      return [];
    }
  }, [message.file_name]);

  // Fetch all live votes for this poll in real time
  const { data: votes = [], isLoading } = usePollResponses(pollId);
  const voteMutation = useVoteInPoll();

  const totalVotes = votes.length;

  // Find if current user has voted and which index they picked
  const myVote = votes.find((v: PollVote) => v.user_id === currentUserId);
  const myVoteIndex = myVote ? myVote.option_index : -1;

  const handleVoteClick = (optionIndex: number) => {
    if (!pollId || !currentUserId) return;

    if (myVoteIndex === optionIndex) {
      // Tapping the same option retracts the vote
      voteMutation.mutate({
        poll_id: pollId,
        user_id: currentUserId,
        option_index: optionIndex,
        retract: true,
      });
    } else {
      // Casting or changing the vote (upsert handles single-choice constraint)
      voteMutation.mutate({
        poll_id: pollId,
        user_id: currentUserId,
        option_index: optionIndex,
      });
    }
  };

  const getPercentage = (optionIndex: number) => {
    if (totalVotes === 0) return 0;
    const optionCount = votes.filter((v: PollVote) => v.option_index === optionIndex).length;
    return Math.round((optionCount / totalVotes) * 100);
  };

  const getVoteCount = (optionIndex: number) => {
    return votes.filter((v: PollVote) => v.option_index === optionIndex).length;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 w-full max-w-[340px] shadow-md select-none">
      <div className="flex items-center gap-2 mb-3 border-b pb-2 border-gray-100 dark:border-slate-800">
        <BarChart3 className="h-4 w-4 text-emerald-500 animate-pulse shrink-0" />
        <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider font-mono break-words">
          {t("poll.title", "Community Decision Poll")}
        </span>
      </div>

      <p className="text-sm font-bold text-gray-950 dark:text-white leading-snug mb-4 break-words">
        {message.text.replace(/^LIVE COMMUNITY POLL:\s*/i, "")}
      </p>

      <div className="flex flex-col gap-2.5">
        {options.map((label, index) => {
          const percentage = getPercentage(index);
          const isSelected = myVoteIndex === index;
          const voterCount = getVoteCount(index);

          return (
            <button
              key={index}
              disabled={isLoading || voteMutation.isPending}
              onClick={() => handleVoteClick(index)}
              className={`group relative w-full overflow-hidden border rounded-xl text-left transition-all duration-200 outline-none p-0 cursor-pointer ${
                isSelected
                  ? "border-emerald-500 dark:border-emerald-500 bg-emerald-50/5 dark:bg-emerald-950/10 ring-1 ring-emerald-500"
                  : "border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
              }`}
            >
              {/* Animated fill-bar in the background */}
              <div
                className={`absolute top-0 left-0 bottom-0 transition-all duration-500 ease-out z-0 ${
                  isSelected ? "bg-emerald-500/15" : "bg-gray-100 dark:bg-slate-800/60"
                }`}
                style={{ width: `${percentage}%` }}
              />

              <div className="relative z-10 flex items-center justify-between gap-2 px-3.5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-gray-300 dark:border-slate-600 bg-transparent"
                    }`}
                  >
                    {isSelected && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </span>
                  <span className="text-xs font-semibold text-gray-900 dark:text-slate-100 break-words pr-2">
                    {label}
                  </span>
                </div>

                <div className="flex flex-col items-end shrink-0 leading-none">
                  <span className="text-xs font-bold text-gray-950 dark:text-white">
                    {percentage}%
                  </span>
                  <span className="text-[9px] font-mono font-medium text-gray-400 mt-0.5">
                    {voterCount === 1
                      ? t("poll.one_vote", "{{count}} vote", { count: voterCount })
                      : t("poll.many_votes", "{{count}} votes", { count: voterCount })}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-400 dark:text-slate-500 font-mono font-medium">
        <div className="flex items-center gap-1.5">
          <Users className="h-3 w-3 shrink-0" />
          <span>{t("poll.total_votes", "{{count}} total votes", { count: totalVotes })}</span>
        </div>
        <span className="break-words">
          {myVoteIndex === -1
            ? t("poll.tap_to_vote", "Tap option to vote")
            : t("poll.tap_to_retract", "Tap again to retract vote")}
        </span>
      </div>

      {voteMutation.isError && (
        <div className="mt-3.5 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold text-[10px] uppercase tracking-wider font-mono">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="break-words">{t("poll.rls_title", "Database Policy Restriction")}</span>
          </div>
          <p className="text-[10px] text-amber-600 dark:text-amber-300 font-medium leading-normal break-words">
            {t("poll.rls_desc", "Your database policy is blocking this vote. Contact your system administrator to enable public voting.")}
          </p>
        </div>
      )}
    </div>
  );
};
