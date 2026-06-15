import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import KoyooLogo from "@/components/koyoo/KoyooLogo";
import { ArrowRight } from "lucide-react";

export default function DriverSetup() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    vehicle_make: "",
    vehicle_model: "",
    vehicle_color: "",
    license_plate: "",
    vehicle_type: "economy",
    phone: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.auth.me().then(setUser);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    await api.entities.DriverProfile.create({
      ...form,
      user_id: user.id,
      full_name: user.full_name || "Driver",
    });
    navigate("/driver", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <KoyooLogo size="md" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-heading font-bold">Driver Setup</h1>
          <p className="text-sm text-muted-foreground mt-1">Tell us about your vehicle</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Phone number"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="h-11 bg-secondary border-0"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Vehicle make"
              required
              value={form.vehicle_make}
              onChange={(e) => setForm({ ...form, vehicle_make: e.target.value })}
              className="h-11 bg-secondary border-0"
            />
            <Input
              placeholder="Vehicle model"
              required
              value={form.vehicle_model}
              onChange={(e) => setForm({ ...form, vehicle_model: e.target.value })}
              className="h-11 bg-secondary border-0"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Color"
              value={form.vehicle_color}
              onChange={(e) => setForm({ ...form, vehicle_color: e.target.value })}
              className="h-11 bg-secondary border-0"
            />
            <Input
              placeholder="License plate"
              required
              value={form.license_plate}
              onChange={(e) => setForm({ ...form, license_plate: e.target.value })}
              className="h-11 bg-secondary border-0"
            />
          </div>
          <Select
            value={form.vehicle_type}
            onValueChange={(v) => setForm({ ...form, vehicle_type: v })}
          >
            <SelectTrigger className="h-11 bg-secondary border-0">
              <SelectValue placeholder="Vehicle type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="economy">Economy</SelectItem>
              <SelectItem value="comfort">Comfort</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" className="w-full h-12 rounded-2xl font-semibold gap-2" disabled={saving}>
            {saving ? "Setting up..." : "Start Driving"}
            <ArrowRight size={18} />
          </Button>
        </form>
      </div>
    </div>
  );
}