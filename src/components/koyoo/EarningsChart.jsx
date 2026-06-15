import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import moment from "moment";

function calcCommission(amount) {
  return Math.round(Number(amount || 0) * 0.65 * 100) / 100;
}

function buildWeekData(rides) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = moment().subtract(6 - i, "days");
    return { label: d.format("ddd"), date: d.format("YYYY-MM-DD"), earnings: 0 };
  });
  rides.forEach((r) => {
    const d = moment(r.created_at).format("YYYY-MM-DD");
    const day = days.find((x) => x.date === d);
    if (day) day.earnings += calcCommission(r.final_fare || r.estimated_fare || 0);
  });
  return days;
}

function buildMonthData(rides) {
  const weeks = Array.from({ length: 4 }, (_, i) => ({
    label: `W${i + 1}`,
    start: moment().startOf("month").add(i * 7, "days"),
    end: moment().startOf("month").add((i + 1) * 7 - 1, "days"),
    earnings: 0,
  }));
  rides.forEach((r) => {
    const d = moment(r.created_at);
    const week = weeks.find((w) => d.isBetween(w.start, w.end, "day", "[]"));
    if (week) week.earnings += calcCommission(r.final_fare || r.estimated_fare || 0);
  });
  return weeks.map(({ label, earnings }) => ({ label, earnings }));
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
        <p className="text-muted-foreground">{label}</p>
        <p className="font-bold text-primary">KSh {Number(payload[0]?.value || 0).toFixed(2)}</p>
      </div>
    );
  }
  return null;
};

export default function EarningsChart({ rides }) {
  const [view, setView] = useState("week");
  const completedRides = rides.filter((r) => r.status === "completed");

  const weekRides = completedRides.filter((r) =>
    moment(r.created_at).isAfter(moment().subtract(7, "days"))
  );
  const monthRides = completedRides.filter((r) =>
    moment(r.created_at).isAfter(moment().startOf("month"))
  );

  const weekTotal = weekRides.reduce((s, r) => s + calcCommission(r.final_fare || r.estimated_fare || 0), 0);
  const monthTotal = monthRides.reduce((s, r) => s + calcCommission(r.final_fare || r.estimated_fare || 0), 0);

  const data = view === "week" ? buildWeekData(weekRides) : buildMonthData(monthRides);
  const total = view === "week" ? weekTotal : monthTotal;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {view === "week" ? "This Week (65%)" : "This Month (65%)"}
            </p>
            <p className="text-lg font-heading font-bold text-primary">KSh {Number(total).toFixed(2)}</p>
          </div>
        </div>
        <div className="flex bg-secondary rounded-xl overflow-hidden">
          {["week", "month"].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
                view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
          <Bar dataKey="earnings" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}