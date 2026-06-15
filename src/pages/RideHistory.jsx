import React, { useState, useEffect, useRef } from "react";
import { api } from "@/api/apiClient";
import RideCard from "@/components/koyoo/RideCard";
import NavBar from "@/components/koyoo/NavBar";
import { Clock } from "lucide-react";

export default function RideHistory() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const pollRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const me = await api.auth.me();
      setUser(me);
      const all = await api.entities.Ride.filter({ rider_id: me.id }, "-created_at", 50);
      setRides(all);
      setLoading(false);
    };
    load();

    // Poll for real-time updates every 10 seconds
    pollRef.current = setInterval(load, 10000);
    return () => clearInterval(pollRef.current);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-5 space-y-6 max-w-lg mx-auto">
        <div className="flex items-center justify-between pt-2">
          <div>
            <h1 className="font-heading font-bold text-xl">Ride History</h1>
            <p className="text-sm text-muted-foreground">{rides.length} rides</p>
          </div>
          <Clock size={20} className="text-muted-foreground" />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rides.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto">
              <Clock size={28} className="text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No rides yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rides.map((ride) => (
              <RideCard key={ride.id} ride={ride} />
            ))}
          </div>
        )}
      </div>
      <NavBar />
    </div>
  );
}