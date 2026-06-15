import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/api/apiClient";
import { useAuth } from "@/lib/AuthContext";
import NavBar from "@/components/koyoo/NavBar";
import KoyooLogo from "@/components/koyoo/KoyooLogo";
import RideCard from "@/components/koyoo/RideCard";
import { motion } from "framer-motion";
import {
  Navigation, Car, Clock, DollarSign, ChevronRight,
  MapPin, Star, Bike, CarFront, Crown, Loader2
} from "lucide-react";

export default function AuthenticatedHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recentRides, setRecentRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, totalSpent: 0, avgRating: 0 });

  const pollRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const all = await api.entities.Ride.filter({ rider_id: user.id }, "-created_at", 5);
        setRecentRides(all);

        const allRides = await api.entities.Ride.filter({ rider_id: user.id }, "-created_at", 100);
        const completed = allRides.filter((r) => r.status === "completed");
        const totalSpent = completed.reduce((s, r) => s + Number(r.final_fare || r.estimated_fare || 0), 0);
        const ratings = completed.filter((r) => r.driver_rating);
        const avgRating = ratings.length
          ? ratings.reduce((s, r) => s + Number(r.driver_rating), 0) / ratings.length
          : 0;

        setStats({
          total: completed.length,
          totalSpent,
          avgRating,
        });
      } catch {}
      setLoading(false);
    };
    load();

    // Poll for real-time updates every 10 seconds
    pollRef.current = setInterval(load, 10000);
    return () => clearInterval(pollRef.current);
  }, [user]);

  const quickLinks = [
    { path: "/ride", icon: Navigation, label: "Book a Ride", desc: "Set pickup & destination", color: "bg-primary/10 text-primary" },
    { path: "/ride", icon: MapPin, label: "Request Ride", desc: "Quick ride request", color: "bg-blue-500/10 text-blue-500" },
    { path: "/history", icon: Clock, label: "My History", desc: "View past rides", color: "bg-orange-500/10 text-orange-500" },
    { path: "/profile", icon: Star, label: "My Profile", desc: "Manage your account", color: "bg-purple-500/10 text-purple-500" },
  ];

  const vehicleIcons = { motorbike: Bike, tuktuk: CarFront, standard: Car, luxury: Crown };

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Top bar */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-border">
        <KoyooLogo size="sm" />
        <div className="flex items-center gap-2">
          {user?.full_name && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              Hi, {user.full_name.split(" ")[0]}
            </span>
          )}
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
            {user?.full_name?.split(" ").map((n) => n[0]).join("") || "U"}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

          {/* Welcome */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }}>
            <h1 className="text-2xl font-heading font-bold">
              Where are you going today?
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.total > 0
                ? `You've taken ${stats.total} rides with us so far.`
                : "Book your first ride with Koyoo."}
            </p>
          </motion.div>

          {/* Book Ride CTA */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Link to="/ride">
              <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-secondary border border-border rounded-3xl p-6 flex items-center justify-between hover:border-primary/30 transition-all group cursor-pointer">
                <div>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">Book a Ride</p>
                  <p className="text-lg font-heading font-bold mt-1">Tap to start</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Set pickup & destination</p>
                </div>
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Navigation size={26} className="text-primary" />
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="grid grid-cols-2 gap-3"
          >
            {quickLinks.map((link) => (
              <Link key={link.label} to={link.path}>
                <div className="bg-card border border-border rounded-2xl p-4 hover:border-primary/30 transition-all h-full">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${link.color}`}>
                    <link.icon size={20} />
                  </div>
                  <p className="font-semibold text-sm">{link.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{link.desc}</p>
                </div>
              </Link>
            ))}
          </motion.div>

          {/* Stats */}
          {!loading && stats.total > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="grid grid-cols-3 gap-3"
            >
              {[
                { icon: Car, label: "Rides", value: stats.total, color: "text-primary" },
                { icon: DollarSign, label: "Total Spent", value: `KSh ${Number(stats.totalSpent).toFixed(0)}`, color: "text-green-500" },
                { icon: Star, label: "Avg Rating", value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—", color: "text-yellow-500" },
              ].map((s) => (
                <div key={s.label} className="bg-card border border-border rounded-2xl p-4 text-center">
                  <s.icon size={18} className={`mx-auto mb-1.5 ${s.color}`} />
                  <p className="text-lg font-heading font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </motion.div>
          )}

          {/* Vehicle Types */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.35 }}
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Available Vehicles</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: Bike, label: "Motorbike" },
                { icon: CarFront, label: "Tuktuk" },
                { icon: Car, label: "Standard" },
                { icon: Crown, label: "Luxury" },
              ].map((v) => (
                <div key={v.label} className="bg-secondary rounded-xl py-3 text-center">
                  <v.icon size={18} className="mx-auto text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground mt-1 font-medium">{v.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recent Rides */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Rides</p>
              {recentRides.length > 0 && (
                <Link to="/history" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  See all <ChevronRight size={12} />
                </Link>
              )}
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-muted-foreground" size={20} />
              </div>
            ) : recentRides.length === 0 ? (
              <div className="bg-secondary rounded-2xl p-6 text-center">
                <Car size={32} className="mx-auto text-muted-foreground mb-2" />
                <p className="font-semibold text-sm">No rides yet</p>
                <p className="text-xs text-muted-foreground mt-1">Book your first ride to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentRides.map((ride) => (
                  <RideCard key={ride.id} ride={ride} />
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <NavBar />
    </div>
  );
}
