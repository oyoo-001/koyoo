import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import NavBar from "@/components/koyoo/NavBar";
import RatingsSection from "@/components/koyoo/RatingsSection";
import EarningsChart from "@/components/koyoo/EarningsChart";
import ModeSwitcher from "@/components/koyoo/ModeSwitcher";
import { Phone, LogOut, Star, Car, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function DriverProfilePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [rides, setRides] = useState([]);

  useEffect(() => {
    const load = async () => {
      const me = await api.auth.me();
      setUser(me);
      const profiles = await api.entities.DriverProfile.filter({ user_id: me.id });
      if (profiles.length > 0) {
        setProfile(profiles[0]);
        setPhone(profiles[0].phone || "");
      }
      const driverRides = await api.entities.Ride.filter({ driver_id: me.id }, "-created_at", 100);
      setRides(driverRides);
    };
    load();
  }, []);

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    await api.entities.DriverProfile.update(profile.id, { phone });
    toast({ title: "Profile saved!" });
    setSaving(false);
  };

  const handleLogout = () => api.auth.logout("/login");

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-5 space-y-6 max-w-lg mx-auto">
        <div className="pt-2">
          <h1 className="font-heading font-bold text-xl">Driver Profile</h1>
        </div>

        {/* Avatar & name */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Car size={28} className="text-primary" />
          </div>
          <div>
            <p className="font-heading font-bold text-lg">{user?.full_name || "Driver"}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Stats */}
        {profile && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold font-heading">{profile.total_rides || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Trips</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <Star size={18} className="fill-yellow-400 text-yellow-400" />
                <span className="text-2xl font-bold font-heading">{Number(profile.average_rating || 5).toFixed(1)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Rating</p>
            </div>
          </div>
        )}

        {/* Earnings Chart */}
        <EarningsChart rides={rides} />

        {/* Vehicle info */}
        {profile && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vehicle</p>
            <p className="font-semibold">
              {profile.vehicle_color} {profile.vehicle_make} {profile.vehicle_model}
            </p>
            <p className="text-sm text-muted-foreground">Plate: {profile.license_plate}</p>
            <p className="text-sm text-muted-foreground capitalize">Type: {profile.vehicle_type}</p>
          </div>
        )}

        {/* Mode Switcher */}
        <ModeSwitcher currentMode="driver" modes={["driver", "rider"]} />

        {/* Phone */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Enter phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-9 h-11 bg-secondary border-0"
              />
            </div>
            <Button onClick={saveProfile} disabled={saving} size="icon" className="h-11 w-11 rounded-xl">
              <Save size={16} />
            </Button>
          </div>
        </div>

        {/* Ratings & Comments from riders */}
        <RatingsSection
          rides={rides}
          ratingField="driver_rating"
          commentField="rider_comment"
          title="Rider Reviews"
        />

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full h-12 rounded-2xl justify-start gap-3 font-medium text-destructive hover:text-destructive"
          >
            <LogOut size={18} />
            Log Out
          </Button>
        </div>
      </div>
      <NavBar isDriver />
    </div>
  );
}