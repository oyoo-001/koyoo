import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Clock, User, Car, Wallet } from "lucide-react";

export default function NavBar({ isDriver = false }) {
  const location = useLocation();

  const riderNav = [
    { path: "/home", icon: Home, label: "Home" },
    { path: "/ride", icon: Car, label: "Ride" },
    { path: "/history", icon: Clock, label: "History" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  const driverNav = [
    { path: "/driver", icon: Car, label: "Dashboard" },
    { path: "/driver/finance", icon: Wallet, label: "Finance" },
    { path: "/driver/history", icon: Clock, label: "History" },
    { path: "/driver/profile", icon: User, label: "Profile" },
  ];

  const items = isDriver ? driverNav : riderNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around py-2 px-4 max-w-md mx-auto">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}