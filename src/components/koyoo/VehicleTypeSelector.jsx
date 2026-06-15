import React from "react";
import { Bike, CarFront, Car, Crown } from "lucide-react";

const vehicleTypes = [
  { id: "motorbike", label: "Motorbike", icon: Bike, multiplier: 0.6, desc: "Quick & nimble" },
  { id: "tuktuk", label: "Tuktuk", icon: CarFront, multiplier: 0.8, desc: "Budget friendly" },
  { id: "standard", label: "Standard", icon: Car, multiplier: 1, desc: "Everyday rides" },
  { id: "luxury", label: "Luxury", icon: Crown, multiplier: 2.2, desc: "Premium comfort" },
];

export default function VehicleTypeSelector({ selected, onSelect, baseFare }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">Vehicle Type</label>
      <div className="grid grid-cols-2 gap-2">
        {vehicleTypes.map((v) => {
          const isActive = selected === v.id;
          const fare = baseFare ? (baseFare * v.multiplier).toFixed(2) : null;
          return (
            <button
              key={v.id}
              onClick={() => onSelect(v.id)}
              className={`relative flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                isActive
                  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary hover:border-primary/40"
              }`}
            >
              <v.icon size={22} className={isActive ? "text-primary" : "text-muted-foreground"} />
              <div className="text-left">
                <span className="text-sm font-semibold block">{v.label}</span>
                <span className="text-[10px] text-muted-foreground">{v.desc}</span>
              </div>
              {fare && <span className="ml-auto text-sm text-primary font-bold">KSh {fare}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { vehicleTypes };