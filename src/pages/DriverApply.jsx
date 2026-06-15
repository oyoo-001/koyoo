import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import KoyooLogo from "@/components/koyoo/KoyooLogo";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle, Car, ArrowLeft } from "lucide-react";

export default function DriverApply() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const token = searchParams.get("token");
  const appId = searchParams.get("id");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [appData, setAppData] = useState(null);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    vehicle_type: "standard",
    vehicle_make: "",
    vehicle_model: "",
    vehicle_year: "",
    license_plate: "",
  });

  useEffect(() => {
    if (!token || !appId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const data = await api.request(`/driver-applications/form/${token}`);
        setAppData(data);
        setForm((f) => ({
          ...f,
          full_name: data.full_name || "",
          phone: data.phone || "",
          vehicle_type: data.vehicle_type || "standard",
          vehicle_make: data.vehicle_make || "",
          vehicle_model: data.vehicle_model || "",
          vehicle_year: data.vehicle_year || "",
          license_plate: data.license_plate || "",
        }));
      } catch {
        toast({ title: "Invalid link", description: "This application link is invalid or expired.", variant: "destructive" });
      }
      setLoading(false);
    };
    load();
  }, [token, appId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!appId) return;
    setSaving(true);
    try {
      await api.request(`/driver-applications/${appId}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setDone(true);
      toast({ title: "Application submitted!", description: "We'll review and get back to you via email." });
    } catch {
      toast({ title: "Error", description: "Could not save your application. Try again.", variant: "destructive" });
    }
    setSaving(false);
  };

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  if (!token || !appId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <Car size={48} className="mx-auto text-muted-foreground" />
          <h1 className="text-xl font-heading font-bold">Invalid Link</h1>
          <p className="text-sm text-muted-foreground">This application link is missing required information. Please check your email for the correct link.</p>
          <Link to="/">
            <Button variant="outline" className="rounded-xl">Go to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  if (!appData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <Car size={48} className="mx-auto text-muted-foreground" />
          <h1 className="text-xl font-heading font-bold">Application Not Found</h1>
          <p className="text-sm text-muted-foreground">This application link is invalid or has expired.</p>
          <Link to="/">
            <Button variant="outline" className="rounded-xl">Go to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (appData.status !== "pending") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <CheckCircle size={48} className="mx-auto text-green-500" />
          <h1 className="text-xl font-heading font-bold">Already {appData.status === "approved" ? "Approved" : "Processed"}</h1>
          <p className="text-sm text-muted-foreground">
            {appData.status === "approved"
              ? "Your application has been approved! Check your email for login credentials."
              : "This application has already been processed."}
          </p>
          <Link to="/">
            <Button variant="outline" className="rounded-xl">Go to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <CheckCircle size={48} className="mx-auto text-green-500" />
          <h1 className="text-xl font-heading font-bold">Application Submitted!</h1>
          <p className="text-sm text-muted-foreground">Thank you! We'll review your application and get back to you at <strong>{appData.email}</strong>.</p>
          <Link to="/">
            <Button variant="outline" className="rounded-xl">Go to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <KoyooLogo size="sm" />
        </div>

        <h1 className="text-2xl font-heading font-bold mb-2">Driver Application</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Complete your application for <strong>{appData.email}</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Full Name</label>
            <Input
              placeholder="John Doe"
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
              className="rounded-xl"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
            <Input
              placeholder="+254 7XX XXX XXX"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="rounded-xl"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Vehicle Type</label>
            <Select value={form.vehicle_type} onValueChange={(v) => update("vehicle_type", v)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard Car</SelectItem>
                <SelectItem value="luxury">Luxury Car</SelectItem>
                <SelectItem value="tuktuk">Tuktuk</SelectItem>
                <SelectItem value="motorbike">Motorbike</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Vehicle Make</label>
              <Input
                placeholder="Toyota"
                value={form.vehicle_make}
                onChange={(e) => update("vehicle_make", e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Vehicle Model</label>
              <Input
                placeholder="Corolla"
                value={form.vehicle_model}
                onChange={(e) => update("vehicle_model", e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Year</label>
              <Input
                type="number"
                placeholder="2020"
                value={form.vehicle_year}
                onChange={(e) => update("vehicle_year", e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">License Plate</label>
              <Input
                placeholder="KCA 123T"
                value={form.license_plate}
                onChange={(e) => update("license_plate", e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={saving || !form.full_name || !form.phone}
            className="w-full h-12 rounded-xl gap-2"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : null}
            {saving ? "Submitting..." : "Submit Application"}
          </Button>
        </form>
      </div>
    </div>
  );
}
