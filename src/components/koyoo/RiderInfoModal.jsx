import React, { useState, useEffect } from "react";
import { api } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Users, Phone, Mail, Ban, CheckCircle, ShieldAlert, ShoppingCart, DollarSign, Clock, Loader2, X } from "lucide-react";

export default function RiderInfoModal({ riderId, onClose }) {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restricting, setRestricting] = useState(false);
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [discountPct, setDiscountPct] = useState("");
  const [discountRides, setDiscountRides] = useState("");
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [restrictReason, setRestrictReason] = useState("");

  useEffect(() => {
    if (!riderId) return;
    setLoading(true);
    api.users.getDetails(riderId).then(setData).catch(() => {
      toast({ title: "Failed to load rider details", variant: "destructive" });
    }).finally(() => setLoading(false));
  }, [riderId]);

  const handleRestrict = async () => {
    setRestricting(true);
    try {
      await api.users.restrict(riderId, restrictReason || "Violation of terms of service");
      const updated = await api.users.getDetails(riderId);
      setData(updated);
      toast({ title: "User restricted" });
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setRestricting(false);
  };

  const handleUnrestrict = async () => {
    setRestricting(true);
    try {
      await api.users.unrestrict(riderId);
      const updated = await api.users.getDetails(riderId);
      setData(updated);
      toast({ title: "User unrestricted" });
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setRestricting(false);
  };

  const handleSetDiscount = async () => {
    setSavingDiscount(true);
    try {
      await api.users.setDiscount(riderId, parseFloat(discountPct) || 0, parseInt(discountRides) || 5);
      const updated = await api.users.getDetails(riderId);
      setData(updated);
      setShowDiscountForm(false);
      toast({ title: "Discount updated" });
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSavingDiscount(false);
  };

  if (!riderId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-heading font-semibold flex items-center gap-2">
            <Users size={18} className="text-primary" /> Rider Details
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : data ? (
          <div className="p-5 space-y-5">
            {/* User Info */}
            <div className="bg-secondary/50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${data.user.is_restricted ? "bg-destructive/20" : "bg-primary/10"}`}>
                  <Users size={20} className={data.user.is_restricted ? "text-destructive" : "text-primary"} />
                </div>
                <div>
                  <p className="font-semibold">{data.user.full_name || "Unnamed"}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail size={12} /> {data.user.email}
                  </div>
                  {data.user.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone size={12} /> {data.user.phone}
                    </div>
                  )}
                </div>
              </div>
              {data.user.is_restricted && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 flex items-start gap-2">
                  <ShieldAlert size={16} className="text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-destructive">Restricted</p>
                    <p className="text-xs text-muted-foreground">{data.user.restriction_reason || "No reason provided"}</p>
                    {data.user.restricted_at && (
                      <p className="text-xs text-muted-foreground mt-0.5">Since {new Date(data.user.restricted_at).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Ride Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-center">
                <ShoppingCart size={14} className="mx-auto text-emerald-500 mb-1" />
                <p className="text-lg font-bold">{data.rideStats.total_rides}</p>
                <p className="text-[10px] text-muted-foreground">Total Rides</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-3 text-center">
                <DollarSign size={14} className="mx-auto text-blue-500 mb-1" />
                <p className="text-lg font-bold">KSh {Number(data.rideStats.total_spent || 0).toFixed(0)}</p>
                <p className="text-[10px] text-muted-foreground">Total Spent</p>
              </div>
              <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-center">
                <Clock size={14} className="mx-auto text-amber-500 mb-1" />
                <p className="text-lg font-bold">{data.rideStats.recent_cancellations}</p>
                <p className="text-[10px] text-muted-foreground">Cancellations (1h)</p>
              </div>
            </div>

            {/* Restrict / Unrestrict */}
            {data.user.is_restricted ? (
              <Button className="w-full h-10 rounded-xl gap-2" disabled={restricting} onClick={handleUnrestrict}>
                {restricting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                {restricting ? "Unrestricting..." : "Unrestrict User"}
              </Button>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Reason for restriction (optional)"
                  value={restrictReason}
                  onChange={(e) => setRestrictReason(e.target.value)}
                  className="h-10 bg-secondary border-0"
                />
                <Button variant="destructive" className="w-full h-10 rounded-xl gap-2" disabled={restricting} onClick={handleRestrict}>
                  {restricting ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
                  {restricting ? "Restricting..." : "Restrict User"}
                </Button>
              </div>
            )}

            {/* Discount Section */}
            <div className="border-t border-border pt-4">
              {data.profile ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Discount Settings</p>
                    <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs" onClick={() => {
                      setDiscountPct(String(data.profile.discount_percent || "0"));
                      setDiscountRides(String(data.profile.discount_eligible_rides || "5"));
                      setShowDiscountForm(!showDiscountForm);
                    }}>
                      {showDiscountForm ? "Cancel" : "Edit"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-secondary/50 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground">Discount %</p>
                      <p className="font-semibold">{Number(data.profile.discount_percent || 0)}%</p>
                    </div>
                    <div className="bg-secondary/50 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground">Eligible every</p>
                      <p className="font-semibold">{data.profile.discount_eligible_rides || 5} rides</p>
                    </div>
                    <div className="bg-secondary/50 rounded-xl p-3 col-span-2">
                      <p className="text-xs text-muted-foreground">Rides since last discount</p>
                      <p className="font-semibold">{data.profile.rides_since_discount || 0}</p>
                    </div>
                  </div>
                  {showDiscountForm && (
                    <div className="bg-secondary/30 rounded-xl p-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Discount %</label>
                          <Input type="number" min="0" max="100" step="0.5" placeholder="e.g. 10" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} className="h-9 bg-background border-0" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Eligible every N rides</label>
                          <Input type="number" min="1" placeholder="e.g. 5" value={discountRides} onChange={(e) => setDiscountRides(e.target.value)} className="h-9 bg-background border-0" />
                        </div>
                      </div>
                      <Button className="w-full h-9 rounded-xl text-xs gap-1" disabled={savingDiscount} onClick={handleSetDiscount}>
                        {savingDiscount ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                        {savingDiscount ? "Saving..." : "Save Discount"}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">No rider profile found</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">Failed to load rider details</div>
        )}
      </div>
    </div>
  );
}
