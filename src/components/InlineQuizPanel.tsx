"use client";

import React, { useEffect, useState } from "react";

export interface InlineQuizOption {
  optionIndex: number;
  optionText: string;
}

export interface InlineQuizQuestion {
  id: string;
  questionText: string;
  replayTimestampSeconds: number;
  correctOptionIndex: number;
  explanation: string;
  options: InlineQuizOption[];
}

interface InlineQuizPanelProps {
  lessonId: string;
  lessonTitle?: string;
  startSeconds: number;
  durationSeconds: number;
  questions: InlineQuizQuestion[];
  initialAnswers?: Record<string, number>;
  loading?: boolean;
  isModal?: boolean;
  onClose?: () => void;
  onAnswersChange?: (answers: Record<string, number>) => void;
  onReplayMoment: (relativeSeconds: number, absoluteSeconds: number) => void;
  onQuizPassed?: () => void;
}

export function resolveReplaySeconds(
  rawReplaySeconds: number | null | undefined,
  startSeconds: number,
  durationSeconds: number
): { relativeSeconds: number; absoluteSeconds: number } {
  const start = Math.max(0, Math.floor(startSeconds || 0));
  const dur = Math.max(60, Math.floor(durationSeconds || 60));
  const end = start + dur;
  const raw = Math.max(0, Math.floor(Number(rawReplaySeconds || 0)));

  if (raw >= start && raw <= end) {
    return {
      absoluteSeconds: raw,
      relativeSeconds: raw - start,
    };
  }

  if (start > 0 && raw < start && raw <= dur) {
    return {
      relativeSeconds: raw,
      absoluteSeconds: start + raw,
    };
  }

  const clampedAbs = Math.max(start, Math.min(end, raw));
  return {
    absoluteSeconds: clampedAbs,
    relativeSeconds: Math.max(0, clampedAbs - start),
  };
}

function formatMoment(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem < 10 ? "0" : ""}${rem}`;
}

export function InlineQuizPanel({
  lessonId,
  lessonTitle,
  startSeconds,
  durationSeconds,
  questions,
  initialAnswers,
  loading,
  isModal = false,
  onClose,
  onAnswersChange,
  onReplayMoment,
  onQuizPassed,
}: InlineQuizPanelProps) {
  const [answers, setAnswers] = useState<Record<string, number>>(() =>
    initialAnswers ? { ...initialAnswers } : {}
  );
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const [scoreNotice, setScoreNotice] = useState<string | null>(null);

  useEffect(() => {
    setScoreNotice(null);
  }, [lessonId]);

  // Rehydrate persisted per-question answers whenever lesson or initialAnswers change
  useEffect(() => {
    setAnswers(initialAnswers ? { ...initialAnswers } : {});
  }, [lessonId, initialAnswers]);

  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;
  const correctCount = questions.filter(
    (q) => answers[q.id] !== undefined && answers[q.id] === q.correctOptionIndex
  ).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  const syncAggregateAttempt = async (nextAnswers: Record<string, number>) => {
    try {
      const res = await fetch(`/api/lessons/${lessonId}/quiz/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: nextAnswers }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.scorePercentage === "number") {
          setScoreNotice(`Score saved: ${data.scorePercentage}% (${data.correctCount}/${data.totalQuestions})`);
        }
        if (data.passed) {
          onQuizPassed?.();
        }
      }
    } catch {}
  };

  const handleSelectOption = async (question: InlineQuizQuestion, optionIndex: number) => {
    const nextAnswers = { ...answers, [question.id]: optionIndex };
    setAnswers(nextAnswers);
    onAnswersChange?.(nextAnswers);
    setSavingQuestionId(question.id);

    try {
      await fetch(`/api/lessons/${lessonId}/quiz/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          selectedOptionIndex: optionIndex,
        }),
      });

      if (questions.length > 0 && questions.every((q) => nextAnswers[q.id] !== undefined)) {
        await syncAggregateAttempt(nextAnswers);
      }
    } catch {
      // Keep UI responsive; initialAnswers stays in sync on next saved click
    } finally {
      setSavingQuestionId((prev) => (prev === question.id ? null : prev));
    }
  };

  const handleTryAgain = async (questionId: string) => {
    const nextAnswers = { ...answers };
    delete nextAnswers[questionId];
    setAnswers(nextAnswers);
    onAnswersChange?.(nextAnswers);
    setScoreNotice(null);
    setSavingQuestionId(questionId);

    try {
      await fetch(`/api/lessons/${lessonId}/quiz/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          clear: true,
        }),
      });
    } catch {} finally {
      setSavingQuestionId((prev) => (prev === questionId ? null : prev));
    }
  };

  return (
    <section
      id="inline-quiz-panel"
      aria-label="Lesson quiz"
      className={
        isModal
          ? "bg-surface dark:bg-[#0c120e] rounded-3xl border border-line dark:border-white/10 shadow-2xl text-ink flex flex-col max-h-[88vh] overflow-hidden"
          : "bg-surface dark:bg-[#0c120e] rounded-3xl border border-line dark:border-white/10 p-5 sm:p-6 shadow-sm space-y-5 text-ink"
      }
    >
      <div
        className={
          isModal
            ? "flex items-start sm:items-center justify-between gap-3 px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-line dark:border-white/10 shrink-0"
            : "flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line dark:border-white/10"
        }
      >
        <div className="min-w-0">
          <span className="text-[0.68rem] font-bold uppercase tracking-widest text-moss dark:text-[#b8c460] font-mono">
            Quick Check · Quiz
          </span>
          <h3 className="text-base sm:text-lg font-display font-bold text-ink mt-0.5 leading-snug">
            {lessonTitle ? `Check your understanding: ${lessonTitle}` : "Lesson Quiz"}
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {questions.length > 0 && (
            <span className="px-3 py-1 rounded-full bg-lime-soft dark:bg-[#182315] border border-line dark:border-[#2b3d1f] text-xs font-semibold text-moss dark:text-[#b8c460]">
              {correctCount}/{questions.length} correct
            </span>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close quiz"
              className="w-8 h-8 rounded-full border border-line dark:border-white/15 flex items-center justify-center text-xs text-ink-soft hover:text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className={isModal ? "flex-1 overflow-y-auto px-5 sm:px-6 py-5" : ""}>
        {loading && questions.length === 0 ? (
          <p className="text-xs sm:text-sm text-ink-soft py-4">Loading lesson quiz...</p>
        ) : questions.length === 0 ? (
          <p className="text-xs sm:text-sm text-ink-soft py-4">
            No quiz questions available for this lesson yet.
          </p>
        ) : (
          <div className="space-y-4">
            {questions.map((q, qIdx) => {
            const selectedIndex = answers[q.id];
            const hasAnswered = selectedIndex !== undefined;
            const isCorrect = hasAnswered && selectedIndex === q.correctOptionIndex;
            const isSavingThis = savingQuestionId === q.id;
            const { relativeSeconds, absoluteSeconds } = resolveReplaySeconds(
              q.replayTimestampSeconds,
              startSeconds,
              durationSeconds
            );

            return (
              <div
                key={q.id}
                className="p-4 sm:p-5 rounded-2xl bg-paper dark:bg-[#121914] border border-line dark:border-white/10 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs sm:text-sm font-semibold text-ink leading-snug">
                    <span className="font-mono text-moss dark:text-[#b8c460] mr-1.5">
                      {qIdx + 1}.
                    </span>
                    {q.questionText}
                  </p>
                  {isSavingThis && (
                    <span className="text-[0.65rem] text-ink-soft font-mono shrink-0">Saving…</span>
                  )}
                </div>

                <div className="space-y-2">
                  {q.options?.map((opt) => {
                    const isSelected = selectedIndex === opt.optionIndex;
                    const optionLetter = String.fromCharCode(65 + opt.optionIndex);

                    let optionStyle =
                      "bg-surface dark:bg-[#0c120e] border-line dark:border-white/10 text-ink hover:border-moss/50 hover:bg-black/[0.02] dark:hover:bg-white/[0.04]";
                    if (isSelected && isCorrect) {
                      optionStyle =
                        "bg-[#e4ecc5] dark:bg-[#253818] border-[#7b9433] dark:border-[#486b2a] text-[#2a3b0f] dark:text-[#c0d86e] font-medium";
                    } else if (isSelected && !isCorrect) {
                      optionStyle =
                        "bg-red-50 dark:bg-[#3e1e1b] border-red-300 dark:border-[#6b2a24] text-red-800 dark:text-[#f2a79e] font-medium";
                    }

                    return (
                      <button
                        key={opt.optionIndex}
                        type="button"
                        onClick={() => handleSelectOption(q, opt.optionIndex)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between gap-3 cursor-pointer ${optionStyle}`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="font-mono text-[0.7rem] font-bold opacity-70 mt-0.5 shrink-0">
                            {optionLetter}
                          </span>
                          <span className="leading-snug">{opt.optionText}</span>
                        </div>
                        {isSelected && (
                          <span className="text-xs font-bold shrink-0">
                            {isCorrect ? "✓" : "✕"}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Instant Per-Question Feedback */}
                {hasAnswered && isCorrect && (
                  <div className="p-3 rounded-xl bg-[#e4ecc5]/60 dark:bg-[#1a2713] border border-[#b8c460]/50 dark:border-[#395522] text-xs text-[#2a3b0f] dark:text-[#c7dc80] space-y-1">
                    <p className="font-semibold">Correct.</p>
                    {q.explanation && <p className="opacity-90 leading-relaxed">{q.explanation}</p>}
                  </div>
                )}

                {hasAnswered && !isCorrect && (
                  <div className="p-3.5 rounded-xl bg-red-50/80 dark:bg-[#2a1514] border border-red-200 dark:border-[#5a2622] text-xs text-red-900 dark:text-[#f4b6af] space-y-2.5">
                    <p className="leading-relaxed">
                      <strong className="font-bold">Not quite.</strong>{" "}
                      {q.explanation || "Revisit this concept in the video and try another option."}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onReplayMoment(relativeSeconds, absoluteSeconds)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface dark:bg-[#161e18] border border-line dark:border-white/15 text-ink font-semibold text-xs hover:border-moss transition-colors cursor-pointer"
                      >
                        <span>▶</span>
                        <span>Replay the moment · {formatMoment(relativeSeconds)}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTryAgain(q.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-red-300 dark:border-[#6b2a24] text-red-800 dark:text-[#f2a79e] font-semibold text-xs hover:bg-red-100/70 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>

      {questions.length > 0 && (
        <div
          className={
            isModal
              ? "px-5 sm:px-6 py-4 border-t border-line dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft shrink-0 bg-surface dark:bg-[#0c120e]"
              : "pt-2 border-t border-line dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft"
          }
        >
          <span>
            {scoreNotice ||
              (allAnswered
                ? `${correctCount} of ${questions.length} answered correctly.`
                : `${answeredCount} of ${questions.length} answered — selections save automatically.`)}
          </span>
          {allAnswered && (
            <button
              type="button"
              onClick={() => syncAggregateAttempt(answers)}
              className="px-4 py-1.5 rounded-full bg-[#b8c460] text-[#0f1611] font-semibold text-xs hover:bg-[#a6b350] transition-colors cursor-pointer"
            >
              Save quiz score
            </button>
          )}
        </div>
      )}
    </section>
  );
}

