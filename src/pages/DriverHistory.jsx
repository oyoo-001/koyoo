import React, { useState, useEffect, useRef } from "react";
import { api } from "@/api/apiClient";
import RideCard from "@/components/koyoo/RideCard";
import EarningsChart from "@/components/koyoo/EarningsChart";
import NavBar from "@/components/koyoo/NavBar";
import { Clock, Wallet, TrendingUp } from "lucide-react";

export default function DriverHistory() {
  const [rides, setRides] = useState([]);
  const [earningsData, setEarningsData] = useState({ available_balance: 0, total_earned: 0, earnings: [] });
  const [loading, setLoading] = useState(true);

  const pollRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const me = await api.auth.me();
      const [all, e] = await Promise.all([
        api.entities.Ride.filter({ driver_id: me.id }, "-created_at", 50),
        api.entities.Withdrawal.getEarnings().catch(() => ({ available_balance: 0, total_earned: 0, earnings: [] })),
      ]);
      setRides(all);
      setEarningsData(e);
      setLoading(false);
    };
    load();

    pollRef.current = setInterval(load, 10000);
    return () => clearInterval(pollRef.current);
  }, []);

  const completedRides = rides.filter((r) => r.status === "completed");

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-5 space-y-6 max-w-lg mx-auto">
        <div className="pt-2">
          <h1 className="font-heading font-bold text-xl">Earnings</h1>
          <p className="text-sm text-muted-foreground">{completedRides.length} trips completed</p>
        </div>

        {/* Earnings cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 text-center">
            <Wallet size={20} className="mx-auto text-primary mb-1" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Available</p>
            <p className="text-2xl font-heading font-bold text-primary mt-1">KSh {Number(earningsData.available_balance || 0).toFixed(2)}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 text-center">
            <TrendingUp size={20} className="mx-auto text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Earned</p>
            <p className="text-2xl font-heading font-bold mt-1">KSh {Number(earningsData.total_earned || 0).toFixed(2)}</p>
          </div>
        </div>

        {/* 65% Commission info */}
        <div className="bg-secondary rounded-xl p-3 text-center text-xs text-muted-foreground">
          You earn <span className="font-bold text-primary">65% commission</span> on every completed ride.
          Withdraw your available balance via M-Pesa or Bank from the Driver Dashboard.
        </div>

        {/* Earnings Chart */}
        <EarningsChart rides={rides} />

        {/* Ride History */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rides.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto">
              <Clock size={28} className="text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No trips yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rides.map((ride) => (
              <RideCard key={ride.id} ride={ride} />
            ))}
          </div>
        )}
      </div>
      <NavBar isDriver />
    </div>
  );
}