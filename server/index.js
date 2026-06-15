import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { EventEmitter } from "events";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

import { configurePassport } from "./src/config/passport.js";
configurePassport();
import passport from "passport";

import authRoutes from "./src/routes/auth.js";
import riderProfileRoutes from "./src/routes/riderProfiles.js";
import driverProfileRoutes from "./src/routes/driverProfiles.js";
import rideRoutes from "./src/routes/rides.js";
import messageRoutes from "./src/routes/messages.js";
import integrationRoutes from "./src/routes/integrations.js";
import userRoutes from "./src/routes/users.js";
import publicSettingsRoutes from "./src/routes/publicSettings.js";
import driverApplicationRoutes from "./src/routes/driverApplications.js";
import adRoutes from "./src/routes/ads.js";
import withdrawalRoutes from "./src/routes/withdrawals.js";
import mapsRoutes from "./src/routes/maps.js";
import pool from "./src/config/db.js";
import { verifyTransporter } from "./src/utils/email.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Event emitters for SSE
const rideEmitter = new EventEmitter();
const messageEmitter = new EventEmitter();
app.set("rideEmitter", rideEmitter);
app.set("messageEmitter", messageEmitter);

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "https://philologic-debi-unsophisticatedly.ngrok-free.dev",
].filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/rider-profiles", riderProfileRoutes);
app.use("/api/driver-profiles", driverProfileRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/public-settings", publicSettingsRoutes);
app.use("/api/driver-applications", driverApplicationRoutes);
app.use("/api/ads", adRoutes);
app.use("/api/withdrawals", withdrawalRoutes);
app.use("/api/maps", mapsRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// In production, serve the built frontend
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "..", "dist");
  app.use(express.static(distPath));
  // SPA fallback — all non-API GET requests serve index.html
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// 404 for unknown API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({ message: "API route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

;(async () => {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log("✅ Database connected successfully");
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  }

  try {
    if ((process.env.SMTP_EMAIL || process.env.SMTP_USER) && (process.env.SMTP_PASSWORD || process.env.SMTP_PASS)) {
      const ok = await verifyTransporter();
      if (ok) {
        console.log("✅ Email service working successfully");
      } else {
        console.warn("⚠️  Email service configured but connection failed — check SMTP credentials");
      }
    } else {
      console.log("ℹ️  Email service not configured — skipping verification");
    }
  } catch {
    console.warn("⚠️  Email service check failed");
  }

  app.listen(PORT, () => {
    const mode =
      process.env.NODE_ENV === "production" ? "production" : "development";
    console.log(
      `Koyoo Taxi server running in ${mode} mode on http://localhost:${PORT}`,
    );
    if (mode === "development") {
      console.log(`Frontend: http://localhost:5173 (Vite dev server)`);
    } else {
      console.log(`Frontend served from: ${path.join(__dirname, "..", "dist")}`);
    }
  });
})();

export default app;
