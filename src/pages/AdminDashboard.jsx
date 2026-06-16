import React, { useState, useEffect, useRef } from "react";
import { api } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/components/ui/use-toast";
import KoyooLogo from "@/components/koyoo/KoyooLogo";
import RideStatusBadge from "@/components/koyoo/RideStatusBadge";
import RiderInfoModal from "@/components/koyoo/RiderInfoModal";
import ModeSwitcher from "@/components/koyoo/ModeSwitcher";
import { format } from "date-fns";

import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from "recharts";
import ConfirmDeleteDialog from "@/components/ui/confirm-dialog";
import { motion } from "framer-motion";
import moment from "moment";
import {
  Car, Users, Plus, Trash2, CheckCircle, LogOut, RefreshCw, Copy, Eye, EyeOff,
  FileCheck, ShieldCheck, ExternalLink, FileText, Loader2, X,
  Megaphone, Save, CalendarIcon, Wallet, Banknote, Landmark, TrendingUp, DollarSign,
  Activity, Clock, Star, ChevronLeft, ChevronRight, LayoutDashboard, FileSearch,
  Layers, Upload
} from "lucide-react";

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function buildChartData(rides) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = moment().subtract(6 - i, "days");
    return { label: d.format("ddd"), date: d.format("YYYY-MM-DD"), rides: 0, revenue: 0 };
  });
  rides.forEach((r) => {
    const d = moment(r.created_at).format("YYYY-MM-DD");
    const day = days.find((x) => x.date === d);
    if (day) {
      day.rides += 1;
      day.revenue += Number(r.final_fare || r.estimated_fare || 0);
    }
  });
  return days;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [rides, setRides] = useState([]);
  const [riders, setRiders] = useState([]);
  const [applications, setApplications] = useState([]);
  const [ads, setAds] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [createdCred, setCreatedCred] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [approving, setApproving] = useState({});
  const [deletingDriver, setDeletingDriver] = useState(null);
  const [verifying, setVerifying] = useState({});
  const [showAdForm, setShowAdForm] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [savingAd, setSavingAd] = useState(false);
  const [deletingAd, setDeletingAd] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("idle"); // idle | uploading | success | error
  const [localPreview, setLocalPreview] = useState(null);
  const [adForm, setAdForm] = useState({
    title: "", description: "", image_url: "", link_url: "",
    is_active: true, position: "banner", priority: 0, starts_at: "", ends_at: "",
  });
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", vehicle_make: "", vehicle_model: "",
    vehicle_color: "", license_plate: "", vehicle_type: "economy", password: generatePassword(),
  });
  const [processingWithdrawal, setProcessingWithdrawal] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedRiderId, setSelectedRiderId] = useState(null);

  const pollRef = useRef(null);

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "drivers", label: "Drivers", icon: Car, count: drivers.length },
    { id: "docs", label: "Review", icon: FileSearch, badge: drivers.filter(d => d.license_url && d.insurance_url && !d.documents_verified).length },
    { id: "rides", label: "Rides", icon: Activity, count: rides.length },
    { id: "applications", label: "Applications", icon: FileText, badge: applications.filter(a => a.status === "pending").length },
    { id: "riders", label: "Riders", icon: Users, count: riders.length },
    { id: "finance", label: "Finance", icon: Wallet, badge: withdrawals.filter(w => w.status === "pending").length },
    { id: "ads", label: "Ads", icon: Layers, count: ads.length },
  ];

  useEffect(() => {
    const load = async () => {
      const me = await api.auth.me();
      if (me.role !== "admin") {
        window.location.href = "/";
        return;
      }
      setUser(me);
      await fetchAll();
      setLoading(false);
    };
    load();
    pollRef.current = setInterval(fetchAll, 8000);
    return () => clearInterval(pollRef.current);
  }, []);

  const fetchAll = async () => {
    const [d, r, ri, a, ad, w] = await Promise.all([
      api.entities.DriverProfile.list("-created_at", 100),
      api.entities.Ride.list("-created_at", 100),
      api.entities.RiderProfile.list("-created_at", 100),
      api.entities.DriverApplication.list("-created_at", 100).catch(() => []),
      api.entities.Ad.list().catch(() => []),
      api.entities.Withdrawal.listAll().catch(() => []),
    ]);
    setDrivers(d);
    setRides(r);
    setRiders(ri);
    setApplications(a);
    setAds(ad);
    setWithdrawals(w);
  };

  const createDriver = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.users.inviteUser(form.email, "user");
      await api.entities.DriverProfile.create({
        user_id: "pending_" + Date.now(), email: form.email, full_name: form.full_name,
        phone: form.phone, vehicle_make: form.vehicle_make, vehicle_model: form.vehicle_model,
        vehicle_color: form.vehicle_color, license_plate: form.license_plate, vehicle_type: form.vehicle_type,
      });
      setCreatedCred({ email: form.email, password: form.password });
      setShowForm(false);
      setForm({ full_name: "", email: "", phone: "", vehicle_make: "", vehicle_model: "", vehicle_color: "", license_plate: "", vehicle_type: "economy", password: generatePassword() });
      await fetchAll();
      toast({ title: "Driver account created!" });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const deleteDriver = async (id) => {
    await api.entities.DriverProfile.delete(id);
    setDrivers((prev) => prev.filter((d) => d.id !== id));
    toast({ title: "Driver removed" });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!" });
  };

  const handleLogout = () => api.auth.logout("/login");

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const completedRides = rides.filter((r) => r.status === "completed");
  const totalRevenue = completedRides.reduce((s, r) => s + Number(r.final_fare || r.estimated_fare || 0), 0);
  const chartData = buildChartData(rides);
  const pendingWithdrawals = withdrawals.filter((w) => w.status === "pending");

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setUploadStatus("uploading");
    setLocalPreview(URL.createObjectURL(file));
    try {
      const result = await api.integrations.UploadFile(file);
      setAdForm({ ...adForm, image_url: result.file_url });
      setUploadStatus("success");
    } catch {
      setUploadStatus("error");
      setLocalPreview(null);
      toast({ title: "Upload failed", variant: "destructive" });
    }
    setUploadingImage(false);
  };

  const fadeUp = { initial: { y: 20, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { duration: 0.4 } };

  return (<>
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-r from-background via-card to-background backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <KoyooLogo size="sm" />
          <div className="flex items-center gap-3">
            <span className="text-xs bg-gradient-to-r from-primary/30 to-primary/10 text-primary font-semibold px-3 py-1 rounded-full border border-primary/20">Admin</span>
            <ModeSwitcher currentMode="admin" modes={["admin", "rider"]} />
            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-9 w-9">
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-6 space-y-6">
        {/* Stats Cards with gradients */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Drivers", value: drivers.length, icon: Car, gradient: "from-blue-500/20 to-blue-500/5", iconBg: "bg-blue-500/20", iconColor: "text-blue-500", border: "border-blue-500/20" },
            { label: "Total Riders", value: riders.length, icon: Users, gradient: "from-purple-500/20 to-purple-500/5", iconBg: "bg-purple-500/20", iconColor: "text-purple-500", border: "border-purple-500/20" },
            { label: "Total Rides", value: rides.length, icon: Activity, gradient: "from-emerald-500/20 to-emerald-500/5", iconBg: "bg-emerald-500/20", iconColor: "text-emerald-500", border: "border-emerald-500/20" },
            { label: "Revenue", value: `KSh ${Number(totalRevenue || 0).toFixed(0)}`, icon: DollarSign, gradient: "from-amber-500/20 to-amber-500/5", iconBg: "bg-amber-500/20", iconColor: "text-amber-500", border: "border-amber-500/20" },
          ].map((s) => (
            <motion.div
              key={s.label}
              className={`bg-gradient-to-br ${s.gradient} border ${s.border} rounded-2xl p-4 backdrop-blur`}
              {...fadeUp}
              transition={{ duration: 0.4, delay: 0.05 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 ${s.iconBg} rounded-lg flex items-center justify-center`}>
                  <s.icon size={14} className={s.iconColor} />
                </div>
              </div>
              <p className="text-2xl font-heading font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Revenue Chart */}
        <motion.div className="bg-gradient-to-br from-card to-secondary/50 border border-border rounded-2xl p-5 space-y-3" {...fadeUp} transition={{ duration: 0.4, delay: 0.1 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              <h2 className="font-heading font-semibold text-sm">Revenue Overview (7 days)</h2>
            </div>
            <span className="text-xs text-muted-foreground">{completedRides.length} completed rides</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ridesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
              />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#revenueGrad)" strokeWidth={2} name="Revenue" />
              <Area type="monotone" dataKey="rides" stroke="#3b82f6" fill="url(#ridesGrad)" strokeWidth={2} name="Rides" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Created credentials notification */}
        {createdCred && (
          <motion.div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3" {...fadeUp}>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-primary flex items-center gap-2"><CheckCircle size={16} /> Driver account created — share these credentials</p>
              <button onClick={() => setCreatedCred(null)} className="text-muted-foreground hover:text-foreground">×</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="bg-background/80 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-mono text-sm">{createdCred.email}</p>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(createdCred.email)}><Copy size={14} /></Button>
              </div>
              <div className="bg-background/80 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Temporary Password</p>
                  <p className="font-mono text-sm">{showPassword ? createdCred.password : "••••••••••"}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(createdCred.password)}><Copy size={14} /></Button>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">The driver will receive an invite email. Share the password above with them directly.</p>
          </motion.div>
        )}

        {/* Sidebar + Content */}
        <div className="flex gap-5">

          {/* Sidebar */}
          <aside className={`shrink-0 transition-all duration-300 ${sidebarOpen ? "w-48" : "w-14"}`}>
            <div className="sticky top-20 space-y-1">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors text-sm mb-2"
              >
                {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                {sidebarOpen && <span>Collapse</span>}
              </button>
              <nav className="space-y-0.5">
                {navItems.map((item) => {
                  const ItemIcon = item.icon;
                  const showBadge = item.badge > 0;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${
                        activeTab === item.id
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      }`}
                    >
                      <ItemIcon size={16} className="shrink-0" />
                      {sidebarOpen && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          {showBadge && (
                            <span className={`text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ${
                              item.id === "finance" ? "bg-amber-500 text-amber-50" : "bg-destructive text-destructive-foreground"
                            }`}>
                              {item.badge}
                            </span>
                          )}
                          {(item.count > 0 && !showBadge) && (
                            <span className="text-[10px] text-muted-foreground">{item.count}</span>
                          )}
                        </>
                      )}
                      {!sidebarOpen && showBadge && (
                        <span className={`absolute -top-1 -right-1 text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center ${
                          item.id === "finance" ? "bg-amber-500 text-amber-50" : "bg-destructive text-destructive-foreground"
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Content Area */}
          <div className="flex-1 min-w-0 space-y-4">

          {/* ─── Overview Tab ─── */}
          {activeTab === "overview" && (<>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <motion.div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-2xl p-4 text-center" {...fadeUp}>
                <Car size={20} className="mx-auto text-blue-500 mb-1" />
                <p className="text-2xl font-heading font-bold">{drivers.filter(d => d.is_online).length}</p>
                <p className="text-xs text-muted-foreground">Online Drivers</p>
              </motion.div>
              <motion.div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 text-center" {...fadeUp} transition={{ delay: 0.05 }}>
                <Activity size={20} className="mx-auto text-emerald-500 mb-1" />
                <p className="text-2xl font-heading font-bold">{completedRides.length}</p>
                <p className="text-xs text-muted-foreground">Completed Rides</p>
              </motion.div>
              <motion.div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-2xl p-4 text-center" {...fadeUp} transition={{ delay: 0.1 }}>
                <Clock size={20} className="mx-auto text-amber-500 mb-1" />
                <p className="text-2xl font-heading font-bold">{rides.filter(r => r.status === "requested" || r.status === "accepted" || r.status === "in_progress").length}</p>
                <p className="text-xs text-muted-foreground">Active Rides</p>
              </motion.div>
              <motion.div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-2xl p-4 text-center" {...fadeUp} transition={{ delay: 0.15 }}>
                <Star size={20} className="mx-auto text-purple-500 mb-1" />
                <p className="text-2xl font-heading font-bold">{pendingWithdrawals.length}</p>
                <p className="text-xs text-muted-foreground">Pending Withdrawals</p>
              </motion.div>
            </div>

            {/* Quick access cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { tab: "drivers", icon: Car, label: "Manage Drivers", desc: "Add, remove, and manage driver accounts", gradient: "from-blue-500/20 to-blue-500/5", border: "border-blue-500/20" },
                { tab: "applications", icon: Users, label: "Applications", desc: "Review pending driver applications", gradient: "from-emerald-500/20 to-emerald-500/5", border: "border-emerald-500/20" },
                { tab: "finance", icon: Wallet, label: "Finance", desc: "Manage driver withdrawals", gradient: "from-amber-500/20 to-amber-500/5", border: "border-amber-500/20" },
              ].map((item) => (
                <button
                  key={item.tab}
                  onClick={() => setActiveTab(item.tab)}
                  className={`bg-gradient-to-br ${item.gradient} border ${item.border} rounded-2xl p-4 text-left hover:scale-[1.02] transition-transform`}
                >
                  <item.icon size={20} className="text-foreground mb-2" />
                  <p className="font-semibold text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </button>
              ))}
            </div>
          </>)}

          {/* ─── Drivers Tab ─── */}
          {activeTab === "drivers" && (<>
            <div className="flex justify-between items-center">
              <h2 className="font-heading font-semibold">Drivers</h2>
              <Button onClick={() => setShowForm(!showForm)} className="rounded-xl gap-2 h-9" size="sm">
                <Plus size={16} /> Add Driver
              </Button>
            </div>

            {showForm && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-card to-secondary border border-border rounded-2xl p-5 space-y-4">
                <h3 className="font-semibold">Create Driver Account</h3>
                <form onSubmit={createDriver} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Full name *" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="h-10 bg-secondary border-0" />
                    <Input placeholder="Email *" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-10 bg-secondary border-0" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-10 bg-secondary border-0" />
                    <Select value={form.vehicle_type} onValueChange={(v) => setForm({ ...form, vehicle_type: v })}>
                      <SelectTrigger className="h-10 bg-secondary border-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="economy">Economy</SelectItem>
                        <SelectItem value="comfort">Comfort</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Vehicle make *" required value={form.vehicle_make} onChange={(e) => setForm({ ...form, vehicle_make: e.target.value })} className="h-10 bg-secondary border-0" />
                    <Input placeholder="Vehicle model *" required value={form.vehicle_model} onChange={(e) => setForm({ ...form, vehicle_model: e.target.value })} className="h-10 bg-secondary border-0" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Color" value={form.vehicle_color} onChange={(e) => setForm({ ...form, vehicle_color: e.target.value })} className="h-10 bg-secondary border-0" />
                    <Input placeholder="License plate *" required value={form.license_plate} onChange={(e) => setForm({ ...form, license_plate: e.target.value })} className="h-10 bg-secondary border-0" />
                  </div>
                  <div className="flex items-center gap-3 bg-secondary rounded-xl p-3">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Auto-generated password</p>
                      <p className="font-mono text-sm">{form.password}</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setForm({ ...form, password: generatePassword() })}><RefreshCw size={14} /></Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(form.password)}><Copy size={14} /></Button>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1 h-10 rounded-xl" disabled={creating}>
                      {creating ? "Creating..." : "Create Driver"}
                    </Button>
                    <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => setShowForm(false)}>Cancel</Button>
                  </div>
                </form>
              </motion.div>
            )}

            <div className="space-y-2">
              {drivers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No drivers yet</p>
              ) : (
                drivers.map((d, i) => (
                  <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${d.is_online ? "bg-emerald-500/20" : "bg-secondary"}`}>
                        <Car size={18} className={d.is_online ? "text-emerald-500" : "text-muted-foreground"} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{d.full_name}</p>
                        <p className="text-xs text-muted-foreground">{d.email || "—"}</p>
                        <p className="text-xs text-muted-foreground">{d.vehicle_color} {d.vehicle_make} {d.vehicle_model} · {d.license_plate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.is_online ? "bg-emerald-500/20 text-emerald-500" : "bg-secondary text-muted-foreground"}`}>
                        {d.is_online ? "Online" : "Offline"}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize hidden sm:inline">{d.vehicle_type}</span>
                      <ConfirmDeleteDialog
                        title="Remove Driver"
                        description={`Remove ${d.full_name} as a driver? This action cannot be undone.`}
                        loading={deletingDriver === d.id}
                        onConfirm={async () => { setDeletingDriver(d.id); await deleteDriver(d.id); setDeletingDriver(null); }}
                      >
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
                          {deletingDriver === d.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </Button>
                      </ConfirmDeleteDialog>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </>)}

          {/* ─── Review Tab ─── */}
          {activeTab === "docs" && (<>
            <h2 className="font-heading font-semibold">Driver Review — Verify Documents</h2>
            {drivers.filter(d => d.license_url || d.insurance_url).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No documents submitted yet</p>
            ) : (
              drivers.filter(d => d.license_url || d.insurance_url).map((d) => (
                <div key={d.id} className={`bg-card border rounded-2xl p-4 space-y-3 ${d.documents_verified ? "border-emerald-500/30" : "border-border"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{d.full_name}</p>
                      <p className="text-xs text-muted-foreground">{d.email}</p>
                      {d.phone && <p className="text-xs text-muted-foreground">{d.phone}</p>}
                    </div>
                    {d.documents_verified ? (
                      <span className="text-xs bg-emerald-500/20 text-emerald-500 font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle size={12} /> Verified
                      </span>
                    ) : (
                      <span className="text-xs bg-amber-500/20 text-amber-500 font-semibold px-3 py-1 rounded-full">
                        Pending Review
                      </span>
                    )}
                  </div>
                  {d.vehicle_make && (
                    <p className="text-xs text-muted-foreground capitalize">
                      Vehicle: {d.vehicle_color} {d.vehicle_make} {d.vehicle_model} · {d.license_plate}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <a href={d.license_url || "#"} target="_blank" rel="noopener noreferrer"
                      className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium transition-colors ${d.license_url ? "bg-secondary hover:bg-accent hover:text-accent-foreground cursor-pointer" : "bg-secondary text-muted-foreground cursor-not-allowed opacity-50"}`}>
                      <FileCheck size={16} className="text-primary shrink-0" />
                      <span className="flex-1 text-xs">Driver's License</span>
                      {d.license_url && <ExternalLink size={12} className="text-muted-foreground" />}
                    </a>
                    <a href={d.insurance_url || "#"} target="_blank" rel="noopener noreferrer"
                      className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium transition-colors ${d.insurance_url ? "bg-secondary hover:bg-accent hover:text-accent-foreground cursor-pointer" : "bg-secondary text-muted-foreground cursor-not-allowed opacity-50"}`}>
                      <ShieldCheck size={16} className="text-primary shrink-0" />
                      <span className="flex-1 text-xs">Insurance</span>
                      {d.insurance_url && <ExternalLink size={12} className="text-muted-foreground" />}
                    </a>
                  </div>
                  {!d.documents_verified && d.license_url && d.insurance_url && (
                    <Button className="w-full h-10 rounded-xl gap-2" disabled={verifying[d.id]}
                      onClick={async () => {
                        setVerifying((prev) => ({ ...prev, [d.id]: true }));
                        try { await api.entities.DriverProfile.update(d.id, { documents_verified: true }); await fetchAll(); toast({ title: `${d.full_name} verified!` }); }
                        catch { toast({ title: "Error", variant: "destructive" }); }
                        setVerifying((prev) => ({ ...prev, [d.id]: false }));
                      }}>
                      {verifying[d.id] ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                      {verifying[d.id] ? "Verifying..." : "Approve & Verify Driver"}
                    </Button>
                  )}
                  {d.documents_verified && (
                    <Button variant="outline" className="w-full h-10 rounded-xl gap-2 text-destructive border-destructive/30 hover:bg-destructive/10" disabled={verifying[d.id]}
                      onClick={async () => {
                        setVerifying((prev) => ({ ...prev, [d.id]: true }));
                        try { await api.entities.DriverProfile.update(d.id, { documents_verified: false }); await fetchAll(); toast({ title: "Verification revoked" }); }
                        catch { toast({ title: "Error", variant: "destructive" }); }
                        setVerifying((prev) => ({ ...prev, [d.id]: false }));
                      }}>
                      {verifying[d.id] ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                      {verifying[d.id] ? "Revoking..." : "Revoke Verification"}
                    </Button>
                  )}
                </div>
              ))
            )}
          </>)}

          {/* ─── Rides Tab ─── */}
          {activeTab === "rides" && (<>
            {rides.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No rides yet</p>
            ) : (
              rides.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRiderId(r.rider_id)}
                  className="w-full text-left bg-card border border-border rounded-2xl p-4 space-y-2 hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <RideStatusBadge status={r.status} />
                    <span className="text-xs text-muted-foreground">{moment(r.created_at).format("MMM D, HH:mm")}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><p className="text-xs text-muted-foreground">Rider</p><p>{r.rider_name || "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Driver</p><p>{r.driver_name || "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Pickup</p><p className="line-clamp-1">{r.pickup_address}</p></div>
                    <div><p className="text-xs text-muted-foreground">Destination</p><p className="line-clamp-1">{r.destination_address}</p></div>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>{Number(r.distance_km || 0).toFixed(1)} km</span>
                    <span className="text-primary font-semibold">KSh {Number(r.final_fare || r.estimated_fare || 0).toFixed(2)}</span>
                    <span className="capitalize">{r.vehicle_type}</span>
                  </div>
                </button>
              ))
            )}
          </>)}

          {/* ─── Applications Tab ─── */}
          {activeTab === "applications" && (<>
            <h2 className="font-heading font-semibold">Driver Applications</h2>
            {applications.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No applications yet</p>
            ) : (
              applications.map((a) => (
                <div key={a.id} className={`bg-card border rounded-2xl p-4 space-y-3 ${a.status === "approved" ? "border-emerald-500/30" : a.status === "rejected" ? "border-destructive/30" : "border-border"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{a.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{a.email}</p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${
                      a.status === "approved" ? "bg-emerald-500/20 text-emerald-500" :
                      a.status === "rejected" ? "bg-destructive/20 text-destructive" :
                      "bg-amber-500/20 text-amber-500"
                    }`}>
                      {a.status}
                    </span>
                  </div>
                  {a.phone && <p className="text-sm text-muted-foreground"><span className="text-foreground">Phone:</span> {a.phone}</p>}
                  {a.vehicle_type && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p><span className="text-muted-foreground">Vehicle:</span> {a.vehicle_make} {a.vehicle_model} ({a.vehicle_year})</p>
                        <p><span className="text-muted-foreground">Plate:</span> {a.license_plate}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Applied {moment(a.created_at).format("MMM D, YYYY")}</p>
                  {a.status === "pending" && (
                    <div className="flex gap-2">
                      <Button className="flex-1 h-10 rounded-xl gap-2" disabled={approving[a.id]}
                        onClick={async () => {
                          setApproving((prev) => ({ ...prev, [a.id]: true }));
                          try { await api.entities.DriverApplication.approve(a.id); toast({ title: "Application approved!" }); await fetchAll(); }
                          catch { toast({ title: "Error", variant: "destructive" }); }
                          setApproving((prev) => ({ ...prev, [a.id]: false }));
                        }}>
                        {approving[a.id] ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                        {approving[a.id] ? "Approving..." : "Approve"}
                      </Button>
                      <Button variant="outline" className="flex-1 h-10 rounded-xl gap-2 text-destructive border-destructive/30 hover:bg-destructive/10" disabled={approving[a.id]}
                        onClick={async () => {
                          setApproving((prev) => ({ ...prev, [a.id]: true }));
                          try { await api.entities.DriverApplication.reject(a.id); toast({ title: "Application rejected" }); await fetchAll(); }
                          catch { toast({ title: "Error", variant: "destructive" }); }
                          setApproving((prev) => ({ ...prev, [a.id]: false }));
                        }}>
                        {approving[a.id] ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        {approving[a.id] ? "Rejecting..." : "Reject"}
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </>)}

          {/* ─── Riders Tab ─── */}
          {activeTab === "riders" && (
            <div className="space-y-2">
            {riders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No riders yet</p>
            ) : (
              riders.map((r) => (
                <button key={r.id} onClick={() => setSelectedRiderId(r.user_id)} className="w-full text-left bg-card border border-border rounded-2xl p-4 flex items-center justify-between gap-3 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    {r.avatar_url ? (
                      <img src={r.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" onError={(e) => { e.target.style.display = "none" }} />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                        <Users size={16} className="text-purple-500" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{r.full_name || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.email || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.phone || r.user_phone || "No phone"}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{r.total_rides || 0} rides</p>
                    <p className="text-xs text-muted-foreground">KSh {Number(r.total_spent || 0).toFixed(0)}</p>
                  </div>
                </button>
              ))
            )}
          </div>)}

          {/* ─── Finance Tab ─── */}
          {activeTab === "finance" && (<>
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold">Driver Withdrawals</h2>
              <span className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                {pendingWithdrawals.length} pending
              </span>
            </div>

            {withdrawals.length === 0 ? (
              <div className="text-center py-12 space-y-3 bg-card border border-border rounded-2xl p-8">
                <Wallet size={40} className="mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">No withdrawal requests yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {withdrawals.map((w, i) => (
                  <motion.div
                    key={w.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={`bg-card border rounded-2xl p-4 flex items-center justify-between gap-3 ${
                      w.status === "processed" ? "border-emerald-500/20" :
                      w.status === "failed" ? "border-destructive/20" : "border-amber-500/20"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        w.method === "mpesa" ? "bg-green-500/10" : "bg-blue-500/10"
                      }`}>
                        {w.method === "mpesa" ? <Banknote size={18} className="text-green-500" /> : <Landmark size={18} className="text-blue-500" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{w.full_name || "Driver"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {w.method === "mpesa" ? w.phone : `${w.bank_name} · ${w.bank_account}`}
                        </p>
                        <p className="text-xs text-muted-foreground">{moment(w.created_at).format("MMM D, YYYY HH:mm")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-sm">KSh {Number(w.amount).toFixed(2)}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize font-medium ${
                          w.status === "processed" ? "bg-emerald-500/20 text-emerald-500" :
                          w.status === "failed" ? "bg-destructive/20 text-destructive" :
                          "bg-amber-500/20 text-amber-500"
                        }`}>
                          {w.status}
                        </span>
                      </div>
                      {w.status === "pending" && (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={async () => {
                              setProcessingWithdrawal(w.id);
                              try { await api.entities.Withdrawal.updateStatus(w.id, "processed"); await fetchAll(); toast({ title: "Withdrawal processed" }); }
                              catch { toast({ title: "Error", variant: "destructive" }); }
                              setProcessingWithdrawal(null);
                            }}
                            className="text-xs bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 px-2 py-1 rounded-lg transition-colors"
                          >
                            {processingWithdrawal === w.id ? <Loader2 size={12} className="animate-spin" /> : "Approve"}
                          </button>
                          <button
                            onClick={async () => {
                              setProcessingWithdrawal(w.id);
                              try { await api.entities.Withdrawal.updateStatus(w.id, "failed"); await fetchAll(); toast({ title: "Withdrawal marked failed" }); }
                              catch { toast({ title: "Error", variant: "destructive" }); }
                              setProcessingWithdrawal(null);
                            }}
                            className="text-xs bg-destructive/20 text-destructive hover:bg-destructive/30 px-2 py-1 rounded-lg transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
              <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-2xl p-4 text-center">
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-xl font-heading font-bold text-amber-500">{pendingWithdrawals.length}</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 text-center">
                <p className="text-xs text-muted-foreground">Processed</p>
                <p className="text-xl font-heading font-bold text-emerald-500">{withdrawals.filter(w => w.status === "processed").length}</p>
              </div>
              <div className="bg-gradient-to-br from-destructive/10 to-destructive/5 border border-destructive/20 rounded-2xl p-4 text-center">
                <p className="text-xs text-muted-foreground">Failed</p>
                <p className="text-xl font-heading font-bold text-destructive">{withdrawals.filter(w => w.status === "failed").length}</p>
              </div>
            </div>
          </>)}

          {/* ─── Ads Tab ─── */}
          {activeTab === "ads" && (<>
            <div className="flex justify-between items-center">
              <h2 className="font-heading font-semibold">Advertisement Banners</h2>
              <Button onClick={() => { setEditingAd(null); setAdForm({ title: "", description: "", image_url: "", link_url: "", is_active: true, position: "banner", priority: 0, starts_at: "", ends_at: "" }); setShowAdForm(!showAdForm); }} className="rounded-xl gap-2 h-9" size="sm">
                {showAdForm ? <X size={16} /> : <Plus size={16} />}
                {showAdForm ? "Close" : "Add Ad"}
              </Button>
            </div>

            {/* Ad Form */}
            {showAdForm && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-card to-secondary border border-border rounded-2xl p-5 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Megaphone size={16} className="text-primary" />
                  {editingAd ? "Edit Ad" : "Create New Ad"}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground mb-1 block">Ad Title *</label>
                    <Input placeholder="e.g. Koyoo Launch Promo" required value={adForm.title} onChange={(e) => setAdForm({ ...adForm, title: e.target.value })} className="h-10 bg-secondary border-0" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                    <Input placeholder="Short description of the ad" value={adForm.description} onChange={(e) => setAdForm({ ...adForm, description: e.target.value })} className="h-10 bg-secondary border-0" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground mb-1 block">Image</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://example.com/ad-image.jpg"
                        value={adForm.image_url}
                        onChange={(e) => {
                          setAdForm({ ...adForm, image_url: e.target.value });
                          setUploadStatus(e.target.value ? "success" : "idle");
                        }}
                        className="h-10 bg-secondary border-0 flex-1"
                      />
                      <label className={`h-10 rounded-xl border flex items-center gap-2 px-3 text-xs font-medium cursor-pointer transition-colors shrink-0 ${
                        uploadStatus === "uploading"
                          ? "bg-primary/10 border-primary/30 text-primary cursor-not-allowed"
                          : "bg-secondary border-border hover:bg-secondary/80"
                      }`}>
                        {uploadStatus === "uploading" ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Upload size={14} />
                        )}
                        <span className="hidden sm:inline">
                          {uploadStatus === "uploading" ? "Uploading..." : "Browse"}
                        </span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadStatus === "uploading"} />
                      </label>
                    </div>
                    <div className="relative mt-2">
                      {localPreview || adForm.image_url ? (
                        <div className="relative h-24 w-full rounded-xl border border-border overflow-hidden bg-secondary/50">
                          <img
                            src={localPreview || adForm.image_url}
                            alt="preview"
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = "none" }}
                          />
                          {uploadStatus === "uploading" && (
                            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                              <div className="flex flex-col items-center gap-1">
                                <Loader2 size={20} className="animate-spin text-primary" />
                                <span className="text-[10px] font-medium text-muted-foreground">Uploading...</span>
                              </div>
                            </div>
                          )}
                          {uploadStatus === "success" && (
                            <div className="absolute top-1 right-1 bg-green-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow">
                              <CheckCircle size={10} /> Uploaded
                            </div>
                          )}
                          {uploadStatus === "error" && (
                            <div className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow">
                              <X size={10} /> Failed
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-24 w-full rounded-xl border border-dashed border-border bg-secondary/30 flex items-center justify-center">
                          <div className="flex flex-col items-center gap-1 text-muted-foreground">
                            <Upload size={16} />
                            <span className="text-[10px]">No image selected</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <Input placeholder="Link URL (optional)" value={adForm.link_url} onChange={(e) => setAdForm({ ...adForm, link_url: e.target.value })} className="h-10 bg-secondary border-0" />
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-muted-foreground shrink-0">Active</label>
                    <input type="checkbox" checked={adForm.is_active} onChange={(e) => setAdForm({ ...adForm, is_active: e.target.checked })} className="rounded" />
                  </div>
                  <Select value={adForm.position} onValueChange={(v) => setAdForm({ ...adForm, position: v })}>
                    <SelectTrigger className="h-10 bg-secondary border-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="banner">Banner</SelectItem>
                      <SelectItem value="sidebar">Sidebar</SelectItem>
                      <SelectItem value="popup">Popup</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Priority (higher = first)" type="number" value={adForm.priority} onChange={(e) => setAdForm({ ...adForm, priority: Number(e.target.value) })} className="h-10 bg-secondary border-0" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={`h-10 bg-secondary border-0 justify-start text-left font-normal ${!adForm.starts_at ? "text-muted-foreground" : ""}`}>
                        <CalendarIcon size={14} className="mr-2" />
                        {adForm.starts_at ? format(new Date(adForm.starts_at), "PPP") : "Start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={adForm.starts_at ? new Date(adForm.starts_at) : undefined}
                        onSelect={(d) => setAdForm({ ...adForm, starts_at: d ? format(d, "yyyy-MM-dd") : "" })}
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={`h-10 bg-secondary border-0 justify-start text-left font-normal ${!adForm.ends_at ? "text-muted-foreground" : ""}`}>
                        <CalendarIcon size={14} className="mr-2" />
                        {adForm.ends_at ? format(new Date(adForm.ends_at), "PPP") : "End date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={adForm.ends_at ? new Date(adForm.ends_at) : undefined}
                        onSelect={(d) => setAdForm({ ...adForm, ends_at: d ? format(d, "yyyy-MM-dd") : "" })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 h-10 rounded-xl gap-2" disabled={savingAd || !adForm.title}
                    onClick={async () => {
                      setSavingAd(true);
                      try {
                        const data = { ...adForm, starts_at: adForm.starts_at || null, ends_at: adForm.ends_at || null };
                        if (editingAd) await api.entities.Ad.update(editingAd.id, data);
                        else await api.entities.Ad.create(data);
                        await fetchAll();
                        setShowAdForm(false);
                        setEditingAd(null);
                        toast({ title: editingAd ? "Ad updated!" : "Ad created!" });
                      } catch { toast({ title: "Error", variant: "destructive" }); }
                      setSavingAd(false);
                    }}>
                    {savingAd ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {savingAd ? "Saving..." : editingAd ? "Update" : "Create"}
                  </Button>
                  <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => { setShowAdForm(false); setEditingAd(null); }}>Cancel</Button>
                </div>
              </motion.div>
            )}

            {/* Ads List */}
            <div className="space-y-2">
              {ads.length === 0 ? (
                <div className="text-center py-12 space-y-3 bg-card border border-border rounded-2xl p-8">
                  <Megaphone size={40} className="mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">No ads yet. Click "Add Ad" to create your first advertisement.</p>
                </div>
              ) : (
                ads.map((ad, i) => (
                  <motion.div
                    key={ad.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`bg-card border rounded-2xl overflow-hidden ${ad.is_active ? "border-border" : "border-destructive/20 opacity-60"}`}
                  >
                    <div className={`h-1.5 ${ad.is_active ? "bg-gradient-to-r from-primary via-primary/60 to-primary/20" : "bg-destructive/30"}`} />
                    <div className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {ad.image_url ? (
                          <img src={ad.image_url} alt={ad.title} className="w-12 h-12 rounded-xl object-cover shrink-0" onError={(e) => { e.target.style.display = "none" }} />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Megaphone size={20} className="text-primary" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{ad.title}</p>
                          {ad.description && <p className="text-xs text-muted-foreground truncate">{ad.description}</p>}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ad.is_active ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                              {ad.is_active ? "Active" : "Inactive"}
                            </span>
                            <span className="text-[10px] text-muted-foreground capitalize">{ad.position}</span>
                            <span className="text-[10px] text-muted-foreground">Priority {ad.priority || 0}</span>
                            {ad.starts_at && <span className="text-[10px] text-muted-foreground"><CalendarIcon size={8} className="inline" /> {ad.starts_at.slice(0, 10)}</span>}
                            {ad.ends_at && <span className="text-[10px] text-muted-foreground">→ {ad.ends_at.slice(0, 10)}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingAd(ad); setAdForm({ title: ad.title, description: ad.description || "", image_url: ad.image_url || "", link_url: ad.link_url || "", is_active: Boolean(ad.is_active), position: ad.position, priority: ad.priority || 0, starts_at: ad.starts_at ? ad.starts_at.slice(0, 10) : "", ends_at: ad.ends_at ? ad.ends_at.slice(0, 10) : "" }); setShowAdForm(true); }}>
                          <FileText size={14} />
                        </Button>
                        <ConfirmDeleteDialog
                          title="Delete Ad"
                          description={`Delete "${ad.title}"? This cannot be undone.`}
                          loading={deletingAd === ad.id}
                          onConfirm={async () => { setDeletingAd(ad.id); await api.entities.Ad.delete(ad.id); setAds((prev) => prev.filter((a) => a.id !== ad.id)); setDeletingAd(null); toast({ title: "Ad deleted" }); }}
                        >
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
                            {deletingAd === ad.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </Button>
                        </ConfirmDeleteDialog>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </>)}
        </div>
      </div>
    </div>
    </div>

    {selectedRiderId && (
      <RiderInfoModal riderId={selectedRiderId} onClose={() => { setSelectedRiderId(null); fetchAll(); }} />
    )}
    </>
  );
}
