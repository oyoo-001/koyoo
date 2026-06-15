import React from "react";
import { useNavigate } from "react-router-dom";
import { setActiveMode } from "@/lib/mode";
import { ArrowLeftRight } from "lucide-react";

const MODE_LABELS = { admin: "Admin", driver: "Driver", rider: "Rider" };
const MODE_ROUTES = { admin: "/admin", driver: "/driver", rider: "/home" };

export default function ModeSwitcher({ currentMode, modes = [], className = "" }) {
  const navigate = useNavigate();

  if (modes.length < 2) return null;

  const otherModes = modes.filter((m) => m !== currentMode);

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-xs font-medium text-muted-foreground">Switch Mode</label>
      <div className="flex items-center gap-1.5 bg-secondary/80 rounded-xl p-1">
        <span className="text-[11px] font-semibold text-muted-foreground px-2 capitalize">{currentMode}</span>
        <ArrowLeftRight size={12} className="text-muted-foreground" />
        {otherModes.map((m) => (
          <button
            key={m}
            onClick={() => { setActiveMode(m); navigate(MODE_ROUTES[m]); }}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {MODE_LABELS[m] || m}
          </button>
        ))}
      </div>
    </div>
  );
}
