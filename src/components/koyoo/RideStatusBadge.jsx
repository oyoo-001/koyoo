import React from "react";

const statusConfig = {
  requested: { label: "Requested", color: "bg-yellow-500/20 text-yellow-400" },
  accepted: { label: "Accepted", color: "bg-blue-500/20 text-blue-400" },
  in_progress: { label: "In Progress", color: "bg-primary/20 text-primary" },
  completed: { label: "Completed", color: "bg-green-500/20 text-green-400" },
  cancelled: { label: "Cancelled", color: "bg-destructive/20 text-destructive" },
};

export default function RideStatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.requested;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${config.color}`}>
      {config.label}
    </span>
  );
}