import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import KoyooLogo from "@/components/koyoo/KoyooLogo";
import { api } from "@/api/apiClient";
import { useToast } from "@/components/ui/use-toast";
import {
  Car,
  Shield,
  Clock,
  MapPin,
  Smartphone,
  TrendingUp,
  ArrowRight,
  Star,
  CheckCircle,
  ChevronRight,
  Loader2,
  Bike,
  CarFront,
  Crown,
  Users,
  Phone,
  Mail,
  Navigation,
} from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  initial: { y: 30, opacity: 0 },
  whileInView: { y: 0, opacity: 1 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5 },
};

const stagger = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.1 } },
  viewport: { once: true, margin: "-60px" },
};

export default function LandingPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [appEmail, setAppEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeAds, setActiveAds] = useState([]);

  useEffect(() => {
    api.entities.Ad.getActive()
      .then(setActiveAds)
      .catch(() => {});
  }, []);

  const handleDriverApply = async (e) => {
    e.preventDefault();
    if (!appEmail) return;
    setSubmitting(true);
    try {
      await api.request("/driver-applications", {
        method: "POST",
        body: JSON.stringify({ email: appEmail }),
      });
      toast({
        title: "Application submitted!",
        description: "Check your email for the application form link.",
      });
      setAppEmail("");
    } catch {
      toast({
        title: "Error",
        description: "Could not submit application. Try again.",
        variant: "destructive",
      });
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen text-foreground overflow-x-hidden">
      {/* ─── Top Nav ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <KoyooLogo size="sm" />
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="rounded-xl">
                Log in
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="rounded-xl">
                Sign up
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/hero-bg.jpg)" }}
        />
        <div className="absolute inset-0 bg-black/70 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-6">
              <Shield size={12} /> Safe & Reliable Rides
            </span>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold leading-tight mb-6">
              Your Ride,{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Your Way
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Book tuktuks, motorbikes, standard cars, or luxury rides across
              Nairobi and Muranga. Fast, safe, and affordable — with real-time
              tracking and cash or M-Pesa / card payment.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register">
                <Button
                  size="lg"
                  className="rounded-2xl text-base h-14 px-8 gap-2 font-semibold"
                >
                  Get Started <ArrowRight size={18} />
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-2xl text-base h-14 px-8 gap-2"
                >
                  I'm a driver <Car size={18} />
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-3xl mx-auto"
          >
            {[
              { label: "Active Riders", value: "10,000+" },
              { label: "Registered Drivers", value: "500+" },
              { label: "Cities Covered", value: "2" },
              { label: "Rides Completed", value: "50,000+" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl md:text-3xl font-heading font-bold text-primary">
                  {s.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/street-bg.jpg)" }}
        />
        <div className="absolute inset-0 bg-black/70 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <motion.div className="text-center mb-14" {...fadeUp}>
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">
              How It Works
            </span>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mt-2">
              Ride in 3 Simple Steps
            </h2>
          </motion.div>
          <motion.div className="grid md:grid-cols-3 gap-8" {...stagger}>
            {[
              {
                step: "01",
                icon: MapPin,
                title: "Set Your Route",
                desc: "Enter your pickup location and destination. Our map calculates the best route in real-time.",
              },
              {
                step: "02",
                icon: Users,
                title: "Choose Your Ride",
                desc: "Pick from nearby motorbikes, tuktuks, standard cars, or luxury vehicles — see fare and ETA before booking.",
              },
              {
                step: "03",
                icon: Smartphone,
                title: "Track & Pay",
                desc: "Follow your driver live on the map. Pay with cash or M-Pesa / card via Paystack.",
              },
            ].map((item) => (
              <motion.div
                key={item.step}
                className="bg-card border border-border rounded-3xl p-6 md:p-8 text-center hover:border-primary/30 transition-colors"
                {...fadeUp}
              >
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <item.icon size={28} className="text-primary" />
                </div>
                <span className="text-xs font-bold text-primary/60">
                  {item.step}
                </span>
                <h3 className="text-lg font-heading font-bold mt-1 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Vehicle Types (Mini Advert) ─── */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/people-bg.jpg)" }}
        />
        <div className="absolute inset-0 bg-black/70 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <motion.div className="text-center mb-14" {...fadeUp}>
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">
              Fleet
            </span>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mt-2">
              Choose Your Ride
            </h2>
          </motion.div>
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
            {...stagger}
          >
            {[
              {
                icon: Bike,
                label: "Motorbike",
                desc: "Quick & nimble",
                price: "From KSh 100",
              },
              {
                icon: CarFront,
                label: "Tuktuk",
                desc: "Budget friendly",
                price: "From KSh 150",
              },
              {
                icon: Car,
                label: "Standard",
                desc: "Everyday rides",
                price: "From KSh 200",
              },
              {
                icon: Crown,
                label: "Luxury",
                desc: "Premium comfort",
                price: "From KSh 400",
              },
            ].map((v) => (
              <motion.div
                key={v.label}
                className="bg-card border border-border rounded-2xl p-5 text-center hover:border-primary/40 hover:-translate-y-1 transition-all"
                {...fadeUp}
              >
                <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mx-auto mb-3">
                  <v.icon size={24} className="text-primary" />
                </div>
                <p className="font-semibold text-sm">{v.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{v.desc}</p>
                <p className="text-xs font-bold text-primary mt-2">{v.price}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Advert Banners ─── */}
      {activeAds.length > 0 && (
        <section className="py-10">
          <div className="max-w-6xl mx-auto px-4 space-y-4">
            {activeAds.map((ad, i) => (
              <motion.div
                key={ad.id}
                className="bg-gradient-to-r from-primary/20 via-primary/10 to-secondary border border-border rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6"
                {...fadeUp}
              >
                <div className="flex items-center gap-4">
                  {ad.image_url && (
                    <img
                      src={ad.image_url}
                      alt={ad.title}
                      className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover shrink-0"
                    />
                  )}
                  <div>
                    <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">
                      {i === 0 ? "Sponsored" : "Advertisement"}
                    </p>
                    <h3 className="text-xl md:text-2xl font-heading font-bold">
                      {ad.title}
                    </h3>
                    {ad.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {ad.description}
                      </p>
                    )}
                  </div>
                </div>
                {ad.link_url && (
                  <a
                    href={ad.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="rounded-2xl shrink-0 gap-2" size="lg">
                      Learn More <ArrowRight size={16} />
                    </Button>
                  </a>
                )}
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Testimonials ─── */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/city-bg.jpg)" }}
        />
        <div className="absolute inset-0 bg-black/70 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <motion.div className="text-center mb-14" {...fadeUp}>
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">
              Testimonials
            </span>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mt-2">
              What Our Riders Say
            </h2>
          </motion.div>
          <motion.div className="grid md:grid-cols-3 gap-6" {...stagger}>
            {[
              {
                name: "Grace M.",
                role: "Regular Rider",
                text: "Koyoo has been a lifesaver for my daily commute between Muranga and Nairobi. The drivers are always on time and polite.",
              },
              {
                name: "John K.",
                role: "Business Traveler",
                text: "I love the luxury option for airport transfers. Professional drivers, clean cars, and seamless M-Pesa / card payment via Paystack.",
              },
              {
                name: "Faith W.",
                role: "Student",
                text: "The motorbike option is super affordable and fast. I use it almost every day to get to campus. Highly recommend!",
              },
            ].map((t) => (
              <motion.div
                key={t.name}
                className="bg-card border border-border rounded-2xl p-6"
                {...fadeUp}
              >
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      size={14}
                      className="fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  "{t.text}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {t.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Driver Application ─── */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            className="bg-gradient-to-br from-primary/10 via-primary/5 to-secondary border border-border rounded-3xl p-8 md:p-14 text-center"
            {...fadeUp}
          >
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">
              Drive With Us
            </span>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mt-2 mb-4">
              Earn Money Driving With Koyoo
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
              Sign up to become a Koyoo driver. Enter your email below and we'll
              send you the application form. Once approved, you'll receive your
              login credentials and can start earning immediately.
            </p>
            <form
              onSubmit={handleDriverApply}
              className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto"
            >
              <div className="relative flex-1 w-full">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={appEmail}
                  onChange={(e) => setAppEmail(e.target.value)}
                  className="pl-10 h-12 rounded-xl bg-background"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={submitting || !appEmail}
                className="rounded-xl h-12 px-6 gap-2 w-full sm:w-auto"
              >
                {submitting ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : null}
                {submitting ? "Sending..." : "Apply Now"}
              </Button>
            </form>
            <div className="flex items-center justify-center gap-6 mt-8 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle size={12} className="text-primary" /> Free to apply
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle size={12} className="text-primary" /> Flexible
                hours
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle size={12} className="text-primary" /> Weekly
                payouts
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/sunset-bg.jpg)" }}
        />
        <div className="absolute inset-0 bg-black/70 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <motion.div className="text-center mb-14" {...fadeUp}>
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">
              Why Koyoo
            </span>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mt-2">
              Built for Kenya
            </h2>
          </motion.div>
          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            {...stagger}
          >
            {[
              {
                icon: MapPin,
                title: "Nairobi & Muranga",
                desc: "Focused service area covering Nairobi county, Muranga county, and the A2 main road corridor.",
              },
              {
                icon: Shield,
                title: "Verified Drivers",
                desc: "Every driver goes through document verification and background checks for your safety.",
              },
              {
                icon: Clock,
                title: "Real-Time Tracking",
                desc: "Track your ride live on the map. Know exactly when your driver will arrive.",
              },
              {
                icon: TrendingUp,
                title: "Fair Pricing",
                desc: "Transparent fares with no hidden charges. Surge pricing only during peak demand.",
              },
              {
                icon: Phone,
                title: "In-App Chat & Call",
                desc: "Reach your driver directly via in-app chat or voice call when you need to.",
              },
              {
                icon: Navigation,
                title: "OSRM Routing",
                desc: "Optimized routes powered by OpenStreetMap for the fastest path to your destination.",
              },
            ].map((f) => (
              <motion.div
                key={f.title}
                className="bg-card border border-border rounded-2xl p-5 flex gap-4"
                {...fadeUp}
              >
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <f.icon size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{f.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative py-20 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/road-bg.jpg)" }}
        />
        <div className="absolute inset-0 bg-black/70 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 text-center relative z-10">
          <motion.div {...fadeUp}>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Ready to Ride?
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8">
              Join thousands of happy riders across Nairobi and Muranga.
              Download Koyoo and book your first ride today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register">
                <Button
                  size="lg"
                  className="rounded-2xl text-base h-14 px-10 gap-2 font-semibold"
                >
                  Create Account <ChevronRight size={18} />
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-2xl text-base h-14 px-10"
                >
                  I already have an account
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border py-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <KoyooLogo size="sm" />
            <p className="text-xs text-muted-foreground text-center">
              &copy; {new Date().getFullYear()} Koyoo Taxi. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
