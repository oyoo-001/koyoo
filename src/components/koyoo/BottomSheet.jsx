import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function BottomSheet({ children, className = "", collapsed = false, onToggle, collapsedLabel = "Show details" }) {
  return (
    <AnimatePresence mode="wait">
      {collapsed ? (
        <motion.div
          key="collapsed"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="absolute bottom-16 left-0 right-0 z-10 flex justify-center"
        >
          <button
            onClick={onToggle}
            className="bg-card border border-border shadow-lg rounded-full px-5 py-2.5 flex items-center gap-2 text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            <ChevronUp size={16} />
            {collapsedLabel}
          </button>
        </motion.div>
      ) : (
        <motion.div
          key="expanded"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={`absolute bottom-16 left-0 right-0 z-10 bg-card rounded-t-3xl shadow-2xl border-t border-border max-h-[70vh] overflow-y-auto ${className}`}
        >
          {onToggle && (
            <>
              <button
                onClick={onToggle}
                className="w-full flex justify-center pt-3 pb-1 sticky top-0 bg-card z-10"
              >
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto hover:bg-muted-foreground/50 transition-colors" />
              </button>
              <button
                onClick={onToggle}
                className="absolute top-3 right-4 z-20 p-1 rounded-full hover:bg-secondary transition-colors text-muted-foreground"
              >
                <ChevronDown size={18} />
              </button>
            </>
          )}
          <div className="p-5 pt-2">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}