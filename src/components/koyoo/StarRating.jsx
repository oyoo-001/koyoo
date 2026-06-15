import React from "react";
import { Star } from "lucide-react";

export default function StarRating({ rating, onRate, size = 20, readonly = false }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          disabled={readonly}
          onClick={() => !readonly && onRate?.(star)}
          className={`transition-transform ${!readonly ? "hover:scale-110 cursor-pointer" : "cursor-default"}`}
        >
          <Star
            size={size}
            className={
              star <= (rating || 0)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            }
          />
        </button>
      ))}
    </div>
  );
}