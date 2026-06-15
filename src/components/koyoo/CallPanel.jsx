import React from "react";
import { Phone, PhoneOff, PhoneIncoming, Mic, MicOff, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const pulseRing = {
  animate: {
    boxShadow: [
      "0 0 0 0 rgba(34, 197, 94, 0.4)",
      "0 0 0 12px rgba(34, 197, 94, 0)",
    ],
  },
};

export default function CallPanel({ callState, startCall, acceptCall, rejectCall, endCall, muted, toggleMute, otherName, onClose }) {
  return (
    <AnimatePresence>
      {callState !== "idle" && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className={`px-5 py-4 flex items-center justify-between ${
              callState === "connected" ? "bg-green-600/10" : callState === "ringing" ? "bg-primary/10" : "bg-muted/50"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  callState === "connected" ? "bg-green-500" : "bg-primary"
                }`}>
                  {callState === "calling" ? (
                    <Loader2 size={20} className="animate-spin text-white" />
                  ) : (
                    <Phone size={20} className="text-white" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm">{otherName || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">
                    {callState === "calling" && "Calling..."}
                    {callState === "ringing" && "Incoming call..."}
                    {callState === "connected" && "Call connected"}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-secondary/80 transition-colors text-muted-foreground"
              >
                <X size={16} />
              </button>
            </div>

            {/* Controls */}
            <div className="px-5 py-4 space-y-3">
              {/* Incoming call — Accept / Decline */}
              {callState === "ringing" && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex gap-3"
                >
                  <button
                    onClick={acceptCall}
                    className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-green-500 text-white font-semibold text-sm hover:bg-green-600 transition-colors"
                  >
                    <PhoneIncoming size={18} />
                    Accept
                  </button>
                  <button
                    onClick={rejectCall}
                    className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm hover:bg-destructive/90 transition-colors"
                  >
                    <PhoneOff size={18} />
                    Decline
                  </button>
                </motion.div>
              )}

              {/* Connected / Calling — Mute + End */}
              {(callState === "connected" || callState === "calling") && (
                <div className="space-y-3">
                  <div className="flex justify-center gap-6">
                    <button
                      onClick={toggleMute}
                      className={`flex flex-col items-center gap-1.5 transition-colors ${
                        muted ? "text-destructive" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        muted ? "bg-destructive/20" : "bg-secondary"
                      }`}>
                        {muted ? <MicOff size={20} /> : <Mic size={20} />}
                      </div>
                      <span className="text-xs font-medium">{muted ? "Unmute" : "Mute"}</span>
                    </button>
                  </div>

                  <button
                    onClick={endCall}
                    className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm hover:bg-destructive/90 transition-colors"
                  >
                    <PhoneOff size={18} />
                    Hang Up
                  </button>
                </div>
              )}

              {/* Call duration for connected calls */}
              {callState === "connected" && (
                <p className="text-center text-xs text-muted-foreground">
                  <ConnectedTimer />
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ConnectedTimer() {
  const [seconds, setSeconds] = React.useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return <>{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</>;
}
