import { useState } from "react";
import { Star, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFeedbackCollector } from "@/lib/ai/optimization/feedback-collector";
import { cn } from "@/lib/utils";

export interface AIFeedbackWidgetProps {
  executionId: string;
  onClose?: () => void;
}

const FEEDBACK_TAGS = [
  { id: "perfect", label: "Perfecto", positive: true },
  { id: "good_hooks", label: "Buenos hooks", positive: true },
  { id: "too_long", label: "Muy largo", positive: false },
  { id: "too_short", label: "Muy corto", positive: false },
  { id: "off_brand", label: "Fuera de marca", positive: false },
  { id: "generic", label: "Muy genérico", positive: false },
];

export function AIFeedbackWidget({ executionId, onClose }: AIFeedbackWidgetProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const { recordRating } = useFeedbackCollector();

  const handleStarClick = (star: number) => {
    setRating(star);
    recordRating(executionId, star, undefined, tags);
  };

  const handleTagClick = (tagId: string) => {
    const newTags = tags.includes(tagId)
      ? tags.filter((t) => t !== tagId)
      : [...tags, tagId];
    setTags(newTags);
    if (rating !== null) {
      recordRating(executionId, rating, undefined, newTags);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 rounded-sm border bg-purple-500/10 border-purple-500/20">
      <span className="text-sm text-muted-foreground">¿Qué tal el resultado?</span>

      <div className="flex gap-0.5" role="group" aria-label="Valoración">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleStarClick(star)}
            className={cn(
              "w-7 h-7 p-0.5 transition-colors rounded hover:bg-white/10",
              rating !== null && rating >= star ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500/70"
            )}
            aria-label={`${star} estrella${star > 1 ? "s" : ""}`}
          >
            <Star
              className="w-full h-full"
              fill={rating !== null && rating >= star ? "currentColor" : "none"}
            />
          </button>
        ))}
      </div>

      {rating !== null && (
        <div className="flex gap-1 flex-wrap">
          {FEEDBACK_TAGS.map((tag) => (
            <Badge
              key={tag.id}
              variant={tags.includes(tag.id) ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => handleTagClick(tag.id)}
            >
              {tag.label}
            </Badge>
          ))}
        </div>
      )}

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="ml-auto p-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/10"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
