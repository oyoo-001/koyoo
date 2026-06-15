import React, { useState, useEffect, useRef } from "react";
import { api } from "@/api/apiClient";
import NavBar from "@/components/koyoo/NavBar";
import EarningsChart from "@/components/koyoo/EarningsChart";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import {
  Wallet, TrendingUp, Banknote, Landmark,
  ArrowUpRight, Plus, Loader2, RefreshCw
} from "lucide-react";
import moment from "moment";

export default function DriverFinance() {
  const { toast } = useToast();
  const [earningsData, setEarningsData] = useState({ available_balance: 0, total_earned: 0, earnings: [] });
  const [withdrawals, setWithdrawals] = useState([]);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [banks, setBanks] = useState([]);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: "",
    method: "mpesa",
    phone: "",
    bank_name: "",
    bank_account: "",
    bank_code: "",
  });

  const pollRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const me = await api.auth.me();
        const [e, w, r] = await Promise.all([
          api.entities.Withdrawal.getEarnings().catch(() => ({ available_balance: 0, total_earned: 0, earnings: [] })),
          api.entities.Withdrawal.list().catch(() => []),
          api.entities.Ride.filter({ driver_id: me.id }, "-created_at", 100).catch(() => []),
        ]);
        setEarningsData(e);
        setWithdrawals(w);
        setRides(r);
      } catch {}
      setLoading(false);
    };
    load();
    pollRef.current = setInterval(load, 10000);
    return () => clearInterval(pollRef.current);
  }, []);

  const fadeUp = {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 0.4 },
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-5 space-y-6 max-w-lg mx-auto">
        {/* Header */}
        <motion.div className="pt-2" {...fadeUp}>
          <h1 className="font-heading font-bold text-xl flex items-center gap-2">
            <Wallet size={22} className="text-primary" /> Finance
          </h1>
          <p className="text-sm text-muted-foreground">Track your earnings and withdrawals</p>
        </motion.div>

        {/* Earnings summary cards */}
        <motion.div className="grid grid-cols-2 gap-3" {...fadeUp} transition={{ duration: 0.4, delay: 0.05 }}>
          <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-secondary border border-primary/20 rounded-2xl p-5 text-center">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Wallet size={20} className="text-primary" />
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Available</p>
            <p className="text-2xl font-heading font-bold text-primary mt-1">KSh {Number(earningsData.available_balance || 0).toFixed(2)}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-secondary border border-blue-500/20 rounded-2xl p-5 text-center">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
              <TrendingUp size={20} className="text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Earned</p>
            <p className="text-2xl font-heading font-bold text-blue-500 mt-1">KSh {Number(earningsData.total_earned || 0).toFixed(2)}</p>
          </div>
        </motion.div>

        {/* Commission info */}
        <motion.div className="bg-gradient-to-r from-primary/10 to-secondary border border-border rounded-2xl p-4 text-sm text-center space-y-1" {...fadeUp} transition={{ duration: 0.4, delay: 0.1 }}>
          <p className="font-semibold">65% Commission per Ride</p>
          <p className="text-xs text-muted-foreground">You earn 65% of the total fare on every completed ride. Withdraw your available balance anytime.</p>
        </motion.div>

        {/* Earnings Chart */}
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.15 }}>
          <EarningsChart rides={rides} />
        </motion.div>

        {/* Withdraw button */}
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.2 }}>
          <Button
            onClick={async () => {
              if (!showWithdraw) {
                const b = await api.entities.Withdrawal.listBanks().catch(() => []);
                setBanks(b);
              }
              setShowWithdraw(!showWithdraw);
            }}
            className="w-full h-12 rounded-2xl gap-2 font-semibold"
            disabled={Number(earningsData.available_balance || 0) <= 0}
          >
            {showWithdraw ? "Cancel" : <><ArrowUpRight size={18} /> Withdraw Funds</>}
          </Button>
        </motion.div>

        {/* Withdrawal Form */}
        {showWithdraw && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-5 space-y-4"
          >
            <h3 className="font-semibold">Withdraw Funds</h3>
            <p className="text-xs text-muted-foreground">Available balance: <span className="font-bold text-primary">KSh {Number(earningsData.available_balance || 0).toFixed(2)}</span></p>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Amount (KSh)</label>
              <input
                type="number"
                placeholder="0.00"
                value={withdrawForm.amount}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                className="w-full h-11 rounded-xl bg-secondary border-0 px-3 text-sm font-mono"
                max={earningsData.available_balance}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setWithdrawForm({ ...withdrawForm, method: "mpesa" })}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-medium transition-colors ${
                  withdrawForm.method === "mpesa"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-accent"
                }`}
              >
                <Banknote size={16} /> M-Pesa
              </button>
              <button
                onClick={() => setWithdrawForm({ ...withdrawForm, method: "bank" })}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-medium transition-colors ${
                  withdrawForm.method === "bank"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-accent"
                }`}
              >
                <Landmark size={16} /> Bank
              </button>
            </div>

            {withdrawForm.method === "mpesa" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">M-Pesa Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 0712345678"
                  value={withdrawForm.phone}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, phone: e.target.value })}
                  className="w-full h-11 rounded-xl bg-secondary border-0 px-3 text-sm"
                />
              </div>
            )}

            {withdrawForm.method === "bank" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Bank</label>
                  <select
                    value={withdrawForm.bank_code}
                    onChange={(e) => {
                      const bank = banks.find((b) => b.code === e.target.value);
                      setWithdrawForm({ ...withdrawForm, bank_code: e.target.value, bank_name: bank?.name || "" });
                    }}
                    className="w-full h-11 rounded-xl bg-secondary border-0 px-3 text-sm"
                  >
                    <option value="">Select a bank</option>
                    {banks.map((b) => (
                      <option key={b.code} value={b.code}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Account Number</label>
                  <input
                    placeholder="Account number"
                    value={withdrawForm.bank_account}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, bank_account: e.target.value })}
                    className="w-full h-11 rounded-xl bg-secondary border-0 px-3 text-sm"
                  />
                </div>
              </div>
            )}

            <Button
              className="w-full h-11 rounded-xl gap-2 font-semibold"
              disabled={withdrawing || !withdrawForm.amount || Number(withdrawForm.amount) <= 0 || Number(withdrawForm.amount) > Number(earningsData.available_balance)}
              onClick={async () => {
                setWithdrawing(true);
                try {
                  const result = await api.entities.Withdrawal.withdraw({
                    amount: Number(withdrawForm.amount),
                    method: withdrawForm.method,
                    phone: withdrawForm.phone || null,
                    bank_name: withdrawForm.bank_name || null,
                    bank_account: withdrawForm.bank_account || null,
                  });
                  toast({ title: "Withdrawal submitted!", description: "Your request is being processed." });
                  setShowWithdraw(false);
                  setWithdrawForm({ amount: "", method: "mpesa", phone: "", bank_name: "", bank_account: "", bank_code: "" });
                  const [e, w] = await Promise.all([
                    api.entities.Withdrawal.getEarnings(),
                    api.entities.Withdrawal.list(),
                  ]);
                  setEarningsData(e);
                  setWithdrawals(w);
                } catch (err) {
                  toast({ title: "Error", description: err.message || "Withdrawal failed", variant: "destructive" });
                }
                setWithdrawing(false);
              }}
            >
              {withdrawing ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {withdrawing ? "Processing..." : "Withdraw"}
            </Button>
          </motion.div>
        )}

        {/* Withdrawal History */}
        <motion.div className="space-y-3" {...fadeUp} transition={{ duration: 0.4, delay: 0.25 }}>
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold text-sm flex items-center gap-1.5">
              <RefreshCw size={14} className="text-primary" /> Withdrawal History
            </h2>
            <span className="text-xs text-muted-foreground">{withdrawals.length} requests</span>
          </div>

          {withdrawals.length === 0 ? (
            <div className="bg-secondary rounded-2xl p-8 text-center">
              <Banknote size={32} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No withdrawals yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {withdrawals.map((w, i) => (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      w.method === "mpesa" ? "bg-green-500/10" : "bg-blue-500/10"
                    }`}>
                      {w.method === "mpesa" ? <Banknote size={18} className="text-green-500" /> : <Landmark size={18} className="text-blue-500" />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm flex items-center gap-1.5">
                        {w.method === "mpesa" ? w.phone || "M-Pesa" : w.bank_name || "Bank"}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize font-medium ${
                          w.status === "processed" ? "bg-primary/20 text-primary" :
                          w.status === "failed" ? "bg-destructive/20 text-destructive" :
                          "bg-yellow-500/20 text-yellow-500"
                        }`}>
                          {w.status}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">{moment(w.created_at).format("MMM D, YYYY")}</p>
                    </div>
                  </div>
                  <p className="font-bold text-sm">-KSh {Number(w.amount).toFixed(2)}</p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <NavBar isDriver />
    </div>
  );
}
