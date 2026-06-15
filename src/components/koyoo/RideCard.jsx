import React from "react";
import { Navigation, Clock, DollarSign } from "lucide-react";

export default function RideCard({ ride }) {
  const statusColors = {
    completed: "bg-green-500/10 text-green-500 border-green-500/20",
    cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
    requested: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    accepted: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    in_progress: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  };

  const fare = Number(ride.final_fare || ride.estimated_fare || 0);
  const dist = Number(ride.distance_km) || 0;
  const dur = Number(ride.duration_min) || 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColors[ride.status] || "bg-secondary text-muted-foreground"}`}>
          {ride.status?.replace("_", " ")}
        </span>
        <span className="text-sm font-bold text-primary">KSh {fare.toFixed(2)}</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <div className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
          <span className="text-sm line-clamp-1">{ride.pickup_address}</span>
        </div>
        <div className="flex items-start gap-2">
          <div className="mt-1.5 w-2 h-2 rounded-full bg-destructive shrink-0" />
          <span className="text-sm line-clamp-1">{ride.destination_address}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border">
        {dist > 0 && (
          <span className="flex items-center gap-1">
            <Navigation size={12} />
            {dist.toFixed(1)} km
          </span>
        )}
        {dur > 0 && (
          <span className="flex items-center gap-1">
            <Clock size={12} />
            ~{Math.round(dur)} min
          </span>
        )}
        <span className="flex items-center gap-1">
          <DollarSign size={12} />
          {ride.payment_method}
        </span>
      </div>

      {ride.driver_name && (
        <p className="text-xs text-muted-foreground">
          Driver: {ride.driver_name}
        </p>
      )}
    </div>
  );
}
