import React from "react";
import StarRating from "./StarRating";
import { MessageSquare } from "lucide-react";
import moment from "moment";

export default function RatingsSection({ rides, ratingField, commentField, title = "Recent Reviews" }) {
  const ratedRides = rides.filter((r) => r[ratingField] && r[commentField]);
  const allRatings = rides.filter((r) => r[ratingField]);
  const avg = allRatings.length
    ? allRatings.reduce((s, r) => s + r[ratingField], 0) / allRatings.length
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
        {avg && (
          <div className="flex items-center gap-1.5">
            <StarRating rating={Math.round(avg)} readonly size={14} />
            <span className="text-sm font-bold">{avg.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({allRatings.length})</span>
          </div>
        )}
      </div>

      {ratedRides.length === 0 ? (
        <div className="bg-secondary rounded-xl p-4 text-center">
          <MessageSquare size={20} className="text-muted-foreground mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">No reviews yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ratedRides.slice(0, 5).map((ride) => (
            <div key={ride.id} className="bg-card border border-border rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <StarRating rating={ride[ratingField]} readonly size={14} />
                <span className="text-xs text-muted-foreground">{moment(ride.created_at).fromNow()}</span>
              </div>
              <p className="text-sm">{ride[commentField]}</p>
              <p className="text-xs text-muted-foreground">
                {ride.pickup_address?.split(",")[0]} → {ride.destination_address?.split(",")[0]}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}