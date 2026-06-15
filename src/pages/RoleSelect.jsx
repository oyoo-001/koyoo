import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/apiClient";
import KoyooLogo from "@/components/koyoo/KoyooLogo";
import { motion } from "framer-motion";
import { getActiveMode, setActiveMode } from "@/lib/mode";

const MODE_ROUTES = { admin: "/admin", driver: "/driver", rider: "/home" };

export default function RoleSelect() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const me = await api.auth.me();
        setUser(me);

        // 1. Check stored active mode first
        const stored = getActiveMode();
        if (stored && MODE_ROUTES[stored]) {
          navigate(MODE_ROUTES[stored], { replace: true });
          return;
        }

        // 2. Admin → go to admin dashboard
        if (me.role === "admin") {
          setActiveMode("admin");
          navigate("/admin", { replace: true });
          return;
        }

        // Check profiles
        const [riders, drivers] = await Promise.all([
          api.entities.RiderProfile.filter({ user_id: me.id }),
          api.entities.DriverProfile.filter({ user_id: me.id }),
        ]);

        const hasDriver = drivers.length > 0;
        const hasRider = riders.length > 0;

        // 3. If has both, let user pick (show a picker instead of auto-routing)
        if (hasDriver && hasRider) {
          setLoading(false);
          return;
        }

        if (hasDriver) {
          setActiveMode("driver");
          navigate("/driver", { replace: true });
          return;
        }
        if (hasRider) {
          setActiveMode("rider");
          navigate("/home", { replace: true });
          return;
        }

        // Check if admin created a driver profile for this email
        const driverByEmail = await api.entities.DriverProfile.filter({ email: me.email });
        if (driverByEmail.length > 0) {
          await api.entities.DriverProfile.update(driverByEmail[0].id, { user_id: me.id });
          setActiveMode("driver");
          navigate("/driver", { replace: true });
          return;
        }

        // No profile found — create rider profile automatically
        await api.entities.RiderProfile.create({
          user_id: me.id,
          full_name: me.full_name || "Rider",
        });
        setActiveMode("rider");
        navigate("/", { replace: true });
      } catch {
        setLoading(false);
      }
    };
    checkRole();
  }, [navigate]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <KoyooLogo size="md" />
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Setting up your account...</p>
        </div>
      </div>
    );
  }

  const pickMode = (mode) => {
    setActiveMode(mode);
    navigate(MODE_ROUTES[mode], { replace: true });
  };

  // Fallback: role picker for users with multiple profiles
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8 text-center"
      >
        <div className="flex justify-center">
          <KoyooLogo size="lg" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold">Welcome back</h1>
          <p className="text-muted-foreground mt-2">How would you like to use Koyoo today?</p>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => pickMode("rider")}
            className="w-full bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/30 rounded-2xl p-5 text-center hover:scale-[1.02] transition-transform"
          >
            <Car size={28} className="mx-auto text-purple-400 mb-2" />
            <p className="font-semibold text-lg">I need a ride</p>
            <p className="text-sm text-muted-foreground">Book a ride as a passenger</p>
          </button>
          <button
            onClick={() => pickMode("driver")}
            className="w-full bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/30 rounded-2xl p-5 text-center hover:scale-[1.02] transition-transform"
          >
            <Car size={28} className="mx-auto text-blue-400 mb-2" />
            <p className="font-semibold text-lg">I'm a driver</p>
            <p className="text-sm text-muted-foreground">Accept rides and earn money</p>
          </button>
        </div>
        {user?.role === "admin" && (
          <button
            onClick={() => pickMode("admin")}
            className="text-sm text-primary hover:underline"
          >
            Switch to Admin panel
          </button>
        )}
      </motion.div>
    </div>
  );
}