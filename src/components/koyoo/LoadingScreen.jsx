import React from "react";
import { Car, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <div className="space-y-8 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15, stiffness: 100 }}
        >
          <div className="bg-primary rounded-2xl p-6 flex items-center justify-center mx-auto w-24 h-24 shadow-2xl">
            <Car size={48} className="text-primary-foreground" />
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", damping: 20, stiffness: 100 }}
        >
          <h1 className="font-display font-bold tracking-tight text-5xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            koyoo
          </h1>
          <p className="mt-2 text-lg text-muted-foreground font-medium">Your ride, your way</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-center gap-3">
            <Loader2 size={24} className="text-primary animate-spin" />
            <span className="text-sm text-muted-foreground font-medium">Loading...</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, type: "spring", damping: 20, stiffness: 100 }}
        >
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground/60">
            <span className="flex items-center gap-1">
              <Car size={12} />
              Riders
            </span>
            <span className="flex items-center gap-1">
              <Loader2 size={12} />
              Drivers
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.8, type: "spring", damping: 20, stiffness: 100 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2"
        >
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
            <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoadingScreen;