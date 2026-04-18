'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScoreBadge } from '@/components/shared/score-badge'
import { Evaluation } from '@/types/database'
import { AIBestAnswer } from '@/types/ai'
import { BookmarkCheck, BookmarkPlus, ChevronDown, ChevronUp, CheckCircle2, XCircle, Info, Lightbulb } from 'lucide-react'

interface EvaluationCardProps {
  evaluation: Evaluation
  bestAnswer: AIBestAnswer
  isSaved?: boolean
  onSave?: () => void
}

export function EvaluationCard({ evaluation, bestAnswer, isSaved, onSave }: EvaluationCardProps) {
  const [showBestAnswer, setShowBestAnswer] = useState(false)

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            AI Evaluation
          </CardTitle>
          <ScoreBadge score={evaluation.score ?? 0} size="md" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {evaluation.strengths.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-emerald-700 mb-1.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Strengths
            </p>
            <ul className="space-y-1">
              {evaluation.strengths.map((s, i) => (
                <li key={i} className="text-sm text-foreground flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-0.5">•</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {evaluation.weaknesses.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-rose-700 mb-1.5 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> Needs Improvement
            </p>
            <ul className="space-y-1">
              {evaluation.weaknesses.map((w, i) => (
                <li key={i} className="text-sm text-foreground flex items-start gap-1.5">
                  <span className="text-rose-400 mt-0.5">•</span> {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {evaluation.english_feedback && (
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> English Feedback
            </p>
            <p className="text-sm text-blue-900">{evaluation.english_feedback}</p>
          </div>
        )}

        <div>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1"
            onClick={() => setShowBestAnswer((v) => !v)}
          >
            <Lightbulb className="w-4 h-4" />
            {showBestAnswer ? 'Hide' : 'Show'} Suggested Best Answer
            {showBestAnswer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>

          {showBestAnswer && (
            <div className="mt-3 space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-amber-700 mb-2">Suggested Best Answer</p>
                <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">
                  {bestAnswer.best_answer}
                </p>
              </div>

              {bestAnswer.key_points.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Key points in this answer:</p>
                  <ul className="space-y-1">
                    {bestAnswer.key_points.map((kp, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <span className="text-amber-500 mt-0.5 font-bold">{i + 1}.</span> {kp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {onSave && (
                <Button
                  variant={isSaved ? 'secondary' : 'outline'}
                  size="sm"
                  className="w-full gap-1"
                  onClick={onSave}
                  disabled={isSaved}
                >
                  {isSaved ? (
                    <><BookmarkCheck className="w-4 h-4" /> Saved to Library</>
                  ) : (
                    <><BookmarkPlus className="w-4 h-4" /> Save to Library</>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
