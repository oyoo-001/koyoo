import React from "react";
import { Car } from "lucide-react";

export default function KoyooLogo({ size = "md" }) {
  const sizes = {
    sm: { icon: 18, text: "text-lg" },
    md: { icon: 24, text: "text-2xl" },
    lg: { icon: 36, text: "text-4xl" },
    xl: { icon: 48, text: "text-5xl" },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div className="flex items-center gap-2">
      <div className="bg-primary rounded-xl p-2 flex items-center justify-center">
        <Car size={s.icon} className="text-primary-foreground" />
      </div>
      <span className={`font-display font-bold tracking-tight ${s.text}`}>
        koyoo
      </span>
    </div>
  );
}