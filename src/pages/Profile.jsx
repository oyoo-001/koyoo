import React, { useState, useEffect } from "react";
import { api } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import NavBar from "@/components/koyoo/NavBar";
import RatingsSection from "@/components/koyoo/RatingsSection";
import ModeSwitcher from "@/components/koyoo/ModeSwitcher";
import { User, Phone, LogOut, Star, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Profile() {
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
      const profiles = await api.entities.RiderProfile.filter({ user_id: me.id });
      if (profiles.length > 0) {
        setProfile(profiles[0]);
        setPhone(profiles[0].phone || "");
      }
      const riderRides = await api.entities.Ride.filter({ rider_id: me.id }, "-created_at", 100);
      setRides(riderRides);
    };
    load();
  }, []);

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    await api.entities.RiderProfile.update(profile.id, { phone });
    toast({ title: "Profile saved!" });
    setSaving(false);
  };

  const handleLogout = () => api.auth.logout("/login");

  const completedRides = rides.filter((r) => r.status === "completed");
  const avgRating = completedRides.filter((r) => r.rider_rating).length
    ? completedRides.filter((r) => r.rider_rating).reduce((s, r) => s + r.rider_rating, 0) /
      completedRides.filter((r) => r.rider_rating).length
    : profile?.average_rating || 5;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-5 space-y-6 max-w-lg mx-auto">
        <div className="pt-2">
          <h1 className="font-heading font-bold text-xl">Profile</h1>
        </div>

        {/* Avatar & name */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
            <User size={28} className="text-primary" />
          </div>
          <div>
            <p className="font-heading font-bold text-lg">{user?.full_name || "Rider"}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold font-heading">{completedRides.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Rides</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <Star size={18} className="fill-yellow-400 text-yellow-400" />
              <span className="text-2xl font-bold font-heading">{avgRating.toFixed(1)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Your Rating</p>
          </div>
        </div>

        {/* Mode Switcher for admin users */}
        {user?.role === "admin" && (
          <ModeSwitcher currentMode="rider" modes={["rider", "admin"]} />
        )}

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

        {/* Ratings & Comments from drivers */}
        <RatingsSection
          rides={rides}
          ratingField="rider_rating"
          commentField="driver_comment"
          title="Driver Reviews"
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
      <NavBar />
    </div>
  );
}