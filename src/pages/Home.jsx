import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import RideMap from "@/components/koyoo/RideMap";
import LocationSearch from "@/components/koyoo/LocationSearch";
import BottomSheet from "@/components/koyoo/BottomSheet";
import NavBar from "@/components/koyoo/NavBar";
import StarRating from "@/components/koyoo/StarRating";
import KoyooLogo from "@/components/koyoo/KoyooLogo";
import ChatPanel, { useVoiceCall } from "@/components/koyoo/ChatPanel";
import CallPanel from "@/components/koyoo/CallPanel";
import { Navigation, MapPin, Loader2, Zap, LocateFixed, MessageCircle, Phone, PhoneOff, PhoneIncoming, CreditCard, Banknote, Bike, CarFront, Car, Crown, Users } from "lucide-react";
import LoadingScreen from "@/components/koyoo/LoadingScreen";
import { Textarea } from "@/components/ui/textarea";
import { AnimatePresence } from "framer-motion";

function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeBearing(fromLat, fromLng, toLat, toLng) {
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const lat1 = (fromLat * Math.PI) / 180;
  const lat2 = (toLat * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const vehicleIcons = {
  motorbike: Bike,
  tuktuk: CarFront,
  standard: Car,
  luxury: Crown,
};

const VEHICLE_DISPLAY = {
  motorbike: { label: "Motorbike", icon: Bike, desc: "Quick & nimble", multiplier: 0.6 },
  tuktuk: { label: "Tuktuk", icon: CarFront, desc: "Budget friendly", multiplier: 0.8 },
  standard: { label: "Standard", icon: Car, desc: "Everyday rides", multiplier: 1 },
  luxury: { label: "Luxury", icon: Crown, desc: "Premium comfort", multiplier: 2.2 },
};

// Map DB vehicle types to frontend types
const DB_TO_FRONTEND = {
  boda: "motorbike",
  standard: "standard",
  premium: "luxury",
  xl: "standard",
};

const BASE_RATE = 150;
const PER_KM = 60;
const DRIVER_AVG_SPEED = 30; // km/h for ETA estimation

export default function Home() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [step, setStep] = useState("search");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [activeRide, setActiveRide] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [ready, setReady] = useState(false);
  const [surgeMultiplier, setSurgeMultiplier] = useState(1);
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(true);
  const [driverLocation, setDriverLocation] = useState(null);
  const [driverHeading, setDriverHeading] = useState(0);
  const driverPosRef = useRef(null);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [availableDriverTypes, setAvailableDriverTypes] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [showCall, setShowCall] = useState(false);
  const [paying, setPaying] = useState(false);
  const [triedCompute, setTriedCompute] = useState(false);
  const [modalCollapsed, setModalCollapsed] = useState(false);
  const [discount, setDiscount] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}`
          );
          const data = await res.json();
          if (data.display_name) {
            setPickup({ name: data.display_name, lat: loc.lat, lng: loc.lng });
          }
        } catch {}
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    const init = async () => {
      const me = await api.auth.me();
      setUser(me);
      const profiles = await api.entities.RiderProfile.filter({ user_id: me.id });
      if (profiles.length === 0) {
        navigate("/role-select", { replace: true });
        return;
      }
      const p = profiles[0];
      if (Number(p.discount_percent) > 0 && Number(p.rides_since_discount) >= Number(p.discount_eligible_rides)) {
        setDiscount({ percent: Number(p.discount_percent), multiplier: 1 - Number(p.discount_percent) / 100 });
      }
      setReady(true);
    };
    init();
  }, [navigate]);

  // Poll for nearby drivers
  useEffect(() => {
    const load = async () => {
      try {
        const drivers = await api.entities.DriverProfile.filter({ is_online: true, documents_verified: true });
        setNearbyDrivers(drivers.filter((d) => d.current_lat && d.current_lng));
      } catch {}
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  // When both pickup/destination set, auto-advance to routing
  useEffect(() => {
    if (pickup && destination && step === "search") {
      setStep("routing");
      setRouteInfo(null);
      setSelectedVehicle(null);
      setSelectedPayment(null);
      setTriedCompute(false);
      setModalCollapsed(false);
    }
  }, [pickup, destination, step]);

  // When route data arrives and we're in routing step, compute available drivers
  useEffect(() => {
    if (step === "routing" && routeInfo) {
      if (nearbyDrivers.length > 0) {
        computeAvailableDrivers();
      } else {
        setAvailableDriverTypes([]);
        setStep("drivers");
      }
    }
  }, [routeInfo, nearbyDrivers, step, pickup]);

  // Recompute when drivers refresh while on drivers step with empty results (only once)
  useEffect(() => {
    if (step === "drivers" && availableDriverTypes.length === 0 && nearbyDrivers.length > 0 && !triedCompute) {
      setTriedCompute(true);
      computeAvailableDrivers();
    }
  }, [nearbyDrivers, step, availableDriverTypes.length, triedCompute]);

  const computeAvailableDrivers = useCallback(() => {
    if (!pickup) return;
    const types = {};
    const pickupLat = pickup.lat;
    const pickupLng = pickup.lng;
    const MAX_DIST_KM = 2;

    for (const driver of nearbyDrivers) {
      const dist = calcDistance(pickupLat, pickupLng, Number(driver.current_lat), Number(driver.current_lng));
      // Skip drivers farther than MAX_DIST_KM
      if (dist > MAX_DIST_KM) continue;

      const dbType = driver.vehicle_type || "standard";
      const frontendType = DB_TO_FRONTEND[dbType] || "standard";
      const eta = Math.round((dist / DRIVER_AVG_SPEED) * 60);

      if (!types[frontendType] || eta < types[frontendType].minEta) {
        types[frontendType] = {
          type: frontendType,
          count: (types[frontendType]?.count || 0) + 1,
          minEta: types[frontendType] ? Math.min(types[frontendType].minEta, eta) : eta,
        };
      } else {
        types[frontendType].count += 1;
      }
    }

    setAvailableDriverTypes(Object.values(types).sort((a, b) => a.minEta - b.minEta));
    setStep("drivers");
  }, [nearbyDrivers, pickup]);

  // Poll for surge pricing
  useEffect(() => {
    const checkSurge = async () => {
      try {
        const requested = await api.entities.Ride.filter({ status: "requested" });
        const count = requested.length;
        if (count >= 8) setSurgeMultiplier(2.0);
        else if (count >= 5) setSurgeMultiplier(1.6);
        else if (count >= 3) setSurgeMultiplier(1.3);
        else setSurgeMultiplier(1);
      } catch {}
    };
    checkSurge();
    const interval = setInterval(checkSurge, 15000);
    return () => clearInterval(interval);
  }, []);

  // Poll for active ride
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const load = async () => {
      try {
        const rides = await api.entities.Ride.filter({ rider_id: user.id, status: "requested" });
        const accepted = await api.entities.Ride.filter({ rider_id: user.id, status: "accepted" });
        const inProgress = await api.entities.Ride.filter({ rider_id: user.id, status: "in_progress" });
        if (!mounted) return;
        const active = [...rides, ...accepted, ...inProgress];
        if (active.length > 0) setActiveRide(active[0]);
      } catch {}
    };
    load();
    const interval = setInterval(load, 5000);
    return () => { mounted = false; clearInterval(interval); };
  }, [user]);

  // Poll driver location when ride is accepted/in_progress
  useEffect(() => {
    if (!activeRide || !activeRide.driver_id) return;
    if (!["accepted", "in_progress"].includes(activeRide.status)) {
      setDriverLocation(null);
      return;
    }
    const poll = async () => {
      try {
        const profiles = await api.entities.DriverProfile.filter({ user_id: activeRide.driver_id });
        if (profiles.length > 0 && profiles[0].current_lat && profiles[0].current_lng) {
          const newLoc = { lat: profiles[0].current_lat, lng: profiles[0].current_lng };
          if (driverPosRef.current) {
            const heading = computeBearing(
              Number(driverPosRef.current.lat), Number(driverPosRef.current.lng),
              Number(newLoc.lat), Number(newLoc.lng)
            );
            setDriverHeading(heading);
          }
          driverPosRef.current = newLoc;
          setDriverLocation(newLoc);
        }
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [activeRide]);

  // Send rider location to server during active ride
  useEffect(() => {
    if (!activeRide || !["accepted", "in_progress"].includes(activeRide.status)) return;
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        try {
          await api.entities.Ride.update(activeRide.id, {
            rider_lat: loc.lat,
            rider_lng: loc.lng,
          });
        } catch {}
      },
      (err) => {
        console.warn("Rider location watch error:", err);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeRide, activeRide?.status]);

  // Subscribe to ride updates
  useEffect(() => {
    const unsub = api.entities.Ride.subscribe(async (event) => {
      if (event.type === "update" && activeRide && event.data.id === activeRide.id) {
        const prev = activeRide.status;
        const next = event.data.status;
        setActiveRide(event.data);

        // Driver arrived at pickup
        if (prev === "accepted" && next === "in_progress") {
          const v = event.data;
          const vehicleStr = [v.driver_vehicle_color, v.driver_vehicle_make, v.driver_vehicle_model].filter(Boolean).join(" ");
          const plateStr = v.driver_vehicle_plate || "";
          toast({
            title: "🚗 Driver has arrived!",
            description: `${v.driver_name || "Your driver"} is here${vehicleStr ? ` in a ${vehicleStr}` : ""}${plateStr ? ` · ${plateStr}` : ""}`,
          });
        }

        if (next === "completed" && event.data.rider_email) {
          const ride = event.data;
          const fare = Number(ride.final_fare || ride.estimated_fare || 0).toFixed(2);
          api.integrations.Core.SendEmail({
            to: ride.rider_email,
            template: "ride-receipt",
            templateData: {
              riderName: ride.rider_name,
              pickup: ride.pickup_address,
              destination: ride.destination_address,
              driverName: ride.driver_name,
              distanceKm: Number(ride.distance_km || 0).toFixed(1),
              durationMin: Math.round(Number(ride.duration_min || 0)).toString(),
              fare,
            },
          });
        }
      }
    });
    return unsub;
  }, [activeRide]);

  // Voice call
  const voiceCall = useVoiceCall({
    ride: activeRide,
    userId: user?.id,
    onStatusChange: (s) => {
      if (s === "calling") toast({ title: "Calling driver..." });
      else if (s === "connected") toast({ title: "Call connected" });
    },
  });

  // Auto-show call panel on incoming call
  useEffect(() => {
    if (voiceCall.callState === "ringing") setShowCall(true);
  }, [voiceCall.callState]);

  // Paystack payment
  const processPayment = () => {
    if (!activeRide || !window.PaystackPop) {
      toast({ title: "Paystack not loaded", description: "Payment service unavailable", variant: "destructive" });
      return;
    }
    setPaying(true);
    const fare = Number(activeRide.final_fare || activeRide.estimated_fare || 0).toFixed(2);
    const handler = window.PaystackPop.setup({
      key: "pk_test_placeholderdemo",
      email: activeRide.rider_email || user?.email,
      amount: Math.round(parseFloat(fare) * 100),
      currency: "KES",
      ref: `koyoo_${activeRide.id}_${Date.now()}`,
      label: "Koyoo Ride",
      onSuccess: async (res) => {
        await api.entities.Ride.update(activeRide.id, {
          payment_status: "paid",
          paystack_reference: res.reference,
        });
        toast({ title: "Payment successful!", description: `KSh ${fare} paid via Paystack` });
        setPaying(false);
      },
      onClose: () => setPaying(false),
    });
    handler.openIframe();
  };

  const routeDistance = Number(routeInfo?.distance) || (pickup && destination ? calcDistance(pickup.lat, pickup.lng, destination.lat, destination.lng) : 0);
  const routeDuration = Number(routeInfo?.duration) || (routeDistance > 0 ? (routeDistance / 40) * 60 : 0);

  const handleRouteReady = (info) => {
    setRouteInfo(info);
  };

  const handleSelectDriver = (type) => {
    setSelectedVehicle(type);
    setStep("payment");
  };

  const handleSelectPayment = async (method) => {
    setSelectedPayment(method);
    if (method === "cash") {
      await requestRide("cash");
    } else {
      // Pay first, then dispatch ride
      const vConfig = VEHICLE_DISPLAY[selectedVehicle] || VEHICLE_DISPLAY.standard;
      const baseFare = Math.max(0, (BASE_RATE + routeDistance * PER_KM) * vConfig.multiplier * (surgeMultiplier || 1));
      const fare = discount ? baseFare * discount.multiplier : baseFare;
      if (!window.PaystackPop) {
        toast({ title: "Paystack not loaded", description: "Payment service unavailable", variant: "destructive" });
        return;
      }
      setPaying(true);
      const ref = `koyoo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const handler = window.PaystackPop.setup({
        key: "pk_test_placeholderdemo",
        email: user?.email,
        amount: Math.round(fare * 100),
        currency: "KES",
        ref,
        label: "Koyoo Ride",
        onSuccess: async (res) => {
          await requestRide("card", res.reference);
          setPaying(false);
        },
        onClose: () => {
          setPaying(false);
          setSelectedPayment(null);
        },
      });
      handler.openIframe();
    }
  };

  const requestRide = async (paymentMethod, paystackReference) => {
    if (!pickup || !destination || !user || !selectedVehicle) return;
    setRequesting(true);
    const vConfig = VEHICLE_DISPLAY[selectedVehicle] || VEHICLE_DISPLAY.standard;
    try {
      const rideData = {
        rider_id: user.id,
        rider_name: user.full_name || "Rider",
        rider_email: user.email,
        pickup_address: pickup.name,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        destination_address: destination.name,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        estimated_fare: Math.max(0, Number(((BASE_RATE + routeDistance * PER_KM) * vConfig.multiplier * (surgeMultiplier || 1) * (discount ? discount.multiplier : 1)).toFixed(2))),
        distance_km: parseFloat(routeDistance.toFixed(2)),
        duration_min: parseFloat(routeDuration.toFixed(1)),
        vehicle_type: selectedVehicle,
        payment_method: paymentMethod,
        surge_multiplier: surgeMultiplier,
      };
      if (paystackReference) {
        rideData.payment_status = "paid";
        rideData.paystack_reference = paystackReference;
      }
      const ride = await api.entities.Ride.create(rideData);
      setActiveRide(ride);
      setStep("active");
      toast({
        title: "Ride requested!",
        description: paystackReference ? "Payment received. Finding a driver..." : "Looking for a driver nearby...",
      });
    } catch (e) {
      toast({ title: "Error", description: e?.message || "Could not request ride", variant: "destructive" });
    }
    setRequesting(false);
  };

  const cancelRide = async () => {
    if (!activeRide) return;
    await api.entities.Ride.update(activeRide.id, { status: "cancelled" });
    setActiveRide(null);
    setStep("search");
    setPickup(null);
    setDestination(null);
    setRouteInfo(null);
    setSelectedVehicle(null);
    setSelectedPayment(null);
    toast({ title: "Ride cancelled" });
  };

  const rateDriver = async () => {
    if (!activeRide || !rating) return;
    await api.entities.Ride.update(activeRide.id, { driver_rating: rating, rider_comment: comment });
    setActiveRide(null);
    setRating(0);
    setComment("");
    setPickup(null);
    setDestination(null);
    setRouteInfo(null);
    setSelectedVehicle(null);
    setSelectedPayment(null);
    setStep("search");
    toast({ title: "Thanks for rating!" });
  };

  const mapPickup = pickup ? [pickup.lat, pickup.lng] : null;
  const mapDest = destination ? [destination.lat, destination.lng] : null;
  const mapUserLoc = userLocation ? [userLocation.lat, userLocation.lng] : null;
  const mapDriverLoc = driverLocation ? [driverLocation.lat, driverLocation.lng] : null;

  const setPickupToCurrent = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}`);
          const data = await res.json();
          if (data.display_name) setPickup({ name: data.display_name, lat: loc.lat, lng: loc.lng });
        } catch {}
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast({ title: "Couldn't get location", description: "Please allow location access", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const resetToSearch = () => {
    setStep("search");
    setDestination(null);
    setRouteInfo(null);
    setSelectedVehicle(null);
    setSelectedPayment(null);
    setModalCollapsed(false);
  };

  if (!ready) {
    return <LoadingScreen />;
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
        <KoyooLogo size="sm" />
      </div>

      {/* Map */}
      <div className="flex-1">
        <RideMap
          pickup={mapPickup}
          destination={mapDest}
          userLocation={mapUserLoc}
          driverLocation={mapDriverLoc}
          nearbyDrivers={!activeRide ? nearbyDrivers : []}
          onRoute={handleRouteReady}
          driverHeading={driverHeading}
          onClick={step === "search" ? (loc) => setDestination({ name: `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`, lat: loc.lat, lng: loc.lng }) : undefined}
        />

        {/* Chat + Call buttons for active ride */}
        {activeRide && ["accepted", "in_progress"].includes(activeRide.status) && (
          <div className="absolute bottom-4 left-4 z-20 flex gap-2">
            <button
              onClick={() => setShowChat(!showChat)}
              className={`rounded-full p-3 shadow-lg border transition-colors ${
                showChat ? "bg-primary text-primary-foreground border-primary" : "bg-card/90 backdrop-blur-xl border-border"
              }`}
            >
              <MessageCircle size={20} />
            </button>
            <button
              onClick={() => setShowCall(!showCall)}
              className={`rounded-full p-3 shadow-lg border transition-colors ${
                showCall || voiceCall.callState !== "idle" ? "bg-destructive text-destructive-foreground border-destructive" : "bg-card/90 backdrop-blur-xl border-border"
              }`}
            >
              {voiceCall.callState === "ringing" ? <PhoneIncoming size={20} /> : voiceCall.callState !== "idle" ? <PhoneOff size={20} /> : <Phone size={20} />}
            </button>
          </div>
        )}

        {/* Call panel overlay */}
        {(showCall || voiceCall.callState !== "idle") && activeRide && (
          <div className="absolute bottom-20 left-4 right-4 z-30 max-w-sm">
            <CallPanel
              callState={voiceCall.callState}
              startCall={voiceCall.startCall}
              acceptCall={voiceCall.acceptCall}
              rejectCall={voiceCall.rejectCall}
              endCall={voiceCall.endCall}
              muted={voiceCall.muted}
              toggleMute={voiceCall.toggleMute}
              otherName={activeRide.driver_name || "Driver"}
              onClose={() => setShowCall(false)}
            />
          </div>
        )}

        {/* Chat overlay */}
        {showChat && activeRide && (
          <div className="absolute bottom-20 left-4 right-4 z-20 bg-card rounded-2xl shadow-2xl border border-border h-80 flex flex-col overflow-hidden">
            <ChatPanel
              rideId={activeRide.id}
              userId={user?.id}
              userName={user?.full_name || "Rider"}
              role="rider"
              onClose={() => setShowChat(false)}
            />
          </div>
        )}
      </div>

      {/* Bottom Sheets */}
      <AnimatePresence mode="wait">
        {activeRide && activeRide.status === "completed" ? (
          /* ——— RATE ——— */
          <BottomSheet key="rate" collapsed={modalCollapsed} onToggle={() => setModalCollapsed(v => !v)} collapsedLabel="Show rating">
            <div className="space-y-4 text-center">
              <h3 className="font-heading font-bold text-lg">Ride Complete!</h3>
              <p className="text-sm text-muted-foreground">
                KSh {Number(activeRide.final_fare || activeRide.estimated_fare || 0).toFixed(2)} • {Number(activeRide.distance_km || 0).toFixed(1)} km
              </p>

              {activeRide.payment_method === "cash" || activeRide.payment_status !== "paid" ? (
                <div className="bg-secondary rounded-xl p-4 space-y-2">
                  <p className="text-sm font-medium">
                    {activeRide.payment_method === "cash" ? "Pay with Cash" : "Pay via Paystack (M-Pesa / Card)"}
                  </p>
                  {activeRide.payment_method === "card" && (
                    <Button onClick={processPayment} disabled={paying} className="w-full h-11 rounded-xl gap-2">
                      {paying ? <Loader2 className="animate-spin" size={16} /> : <CreditCard size={16} />}
                      {paying ? "Processing..." : `Pay KSh ${Number(activeRide.final_fare || activeRide.estimated_fare || 0).toFixed(2)}`}
                    </Button>
                  )}
                  {activeRide.payment_method === "cash" && (
                    <p className="text-xs text-muted-foreground">Pay the driver with cash at the end of your trip</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-green-500 font-medium">✓ Payment confirmed (paid via M-Pesa / Card)</p>
              )}

              <div className="flex justify-center">
                <StarRating rating={rating} onRate={setRating} size={32} />
              </div>
              <Textarea
                placeholder="Leave a comment (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="bg-secondary border-0 resize-none text-sm h-20"
              />
              <Button onClick={rateDriver} className="w-full h-12 rounded-2xl font-semibold" disabled={!rating}>
                Rate & Finish
              </Button>
            </div>
          </BottomSheet>
        ) : activeRide ? (
          /* ——— ACTIVE RIDE ——— */
          <BottomSheet key="active" collapsed={modalCollapsed} onToggle={() => setModalCollapsed(v => !v)} collapsedLabel={activeRide.status === "accepted" ? "Driver on the way" : activeRide.status === "in_progress" ? "Trip in progress" : "Finding driver"}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    {activeRide.status === "requested" && "Finding your driver..."}
                    {activeRide.status === "accepted" && "Driver on the way"}
                    {activeRide.status === "in_progress" && "Heading to destination"}
                  </p>
                  <h3 className="font-heading font-bold text-lg mt-1">
                    {activeRide.status === "requested" && "Searching..."}
                    {activeRide.status === "accepted" && (activeRide.driver_name || "Driver")}
                    {activeRide.status === "in_progress" && "Enjoy your ride"}
                  </h3>
                </div>
                {activeRide.status === "requested" && (
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                )}
              </div>

              <div className="bg-secondary rounded-xl p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                  <span className="text-sm line-clamp-1">{activeRide.pickup_address}</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-1.5 w-2 h-2 rounded-full bg-destructive shrink-0" />
                  <span className="text-sm line-clamp-1">{activeRide.destination_address}</span>
                </div>
              </div>

              {/* Vehicle info */}
              {activeRide.driver_vehicle_make && ["accepted", "in_progress"].includes(activeRide.status) && (
                <div className="bg-primary/10 rounded-xl p-3 text-sm text-center">
                  <span className="text-muted-foreground text-xs">Your driver's vehicle</span>
                  <p className="font-semibold capitalize">
                    {activeRide.driver_vehicle_color} {activeRide.driver_vehicle_make} {activeRide.driver_vehicle_model}
                    {activeRide.driver_vehicle_plate && <span> · {activeRide.driver_vehicle_plate}</span>}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{Number(activeRide.distance_km || 0).toFixed(1)} km • ~{Math.round(Number(activeRide.duration_min || 0))} min</span>
                <span className="text-primary font-bold text-lg">KSh {Number(activeRide.estimated_fare || 0).toFixed(2)}</span>
              </div>

              {/* Communication controls — visible when driver accepted or trip in progress */}
              {["accepted", "in_progress"].includes(activeRide.status) && (
                <div className="bg-secondary/50 rounded-xl p-3 space-y-3 border border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Driver</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowChat(!showChat)}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                        showChat ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80"
                      }`}
                    >
                      <MessageCircle size={16} />
                      <span>{showChat ? "Close Chat" : "Chat"}</span>
                    </button>
                    <button
                      onClick={() => setShowCall(!showCall)}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                        showCall || voiceCall.callState !== "idle" ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80"
                      }`}
                    >
                      {voiceCall.callState !== "idle" ? <PhoneOff size={16} /> : <Phone size={16} />}
                      <span>{voiceCall.callState !== "idle" ? "In Call" : "Call"}</span>
                    </button>
                  </div>
                </div>
              )}

              {(activeRide.status === "requested" || activeRide.status === "accepted") && (
                <Button variant="outline" onClick={cancelRide} className="w-full h-11 rounded-2xl border-destructive text-destructive hover:bg-destructive/10">
                  Cancel Ride
                </Button>
              )}
            </div>
          </BottomSheet>
        ) : step === "payment" ? (
          /* ——— SELECT PAYMENT METHOD ——— */
          <BottomSheet key="payment" collapsed={modalCollapsed} onToggle={() => setModalCollapsed(v => !v)} collapsedLabel="Show payment">
            <div className="space-y-4">
              <h3 className="font-heading font-bold text-lg">Payment Method</h3>
              <p className="text-sm text-muted-foreground">
                How would you like to pay for this trip?
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => handleSelectPayment("cash")}
                  disabled={requesting}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border bg-card hover:border-primary/40 transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                    <Banknote size={24} className="text-primary" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-base">Cash</p>
                    <p className="text-xs text-muted-foreground">Pay the driver with cash</p>
                  </div>
                </button>
                <button
                  onClick={() => handleSelectPayment("card")}
                  disabled={requesting}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border bg-card hover:border-primary/40 transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                    <CreditCard size={24} className="text-primary" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-base">M-Pesa / Card</p>
                    <p className="text-xs text-muted-foreground">Pay with M-Pesa or card via Paystack</p>
                  </div>
                </button>
              </div>
              {requesting && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="animate-spin" size={16} />
                  Requesting ride...
                </div>
              )}
            </div>
          </BottomSheet>
        ) : step === "drivers" ? (
          /* ——— SELECT DRIVER TYPE ——— */
          <BottomSheet key="drivers" collapsed={modalCollapsed} onToggle={() => setModalCollapsed(v => !v)} collapsedLabel="Show drivers">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-lg">Choose your ride</h3>
                <button onClick={resetToSearch} className="text-xs text-primary hover:underline flex items-center gap-1">
                  Change route
                </button>
              </div>

              {routeDistance > 0 && (
                <div className="flex items-center justify-between text-sm bg-secondary rounded-xl px-3 py-2">
                  <span className="text-muted-foreground">{routeDistance.toFixed(1)} km • ~{Math.round(routeDuration)} min</span>
                  {surgeMultiplier > 1 && (
                    <span className="bg-orange-500/20 text-orange-500 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Zap size={10} /> Surge x{surgeMultiplier}
                    </span>
                  )}
                </div>
              )}

              {availableDriverTypes.length === 0 ? (
                <div className="bg-secondary rounded-2xl p-8 text-center space-y-3">
                  <Users size={40} className="text-muted-foreground mx-auto" />
                  <p className="font-semibold text-base">No available drivers</p>
                  <p className="text-sm text-muted-foreground">
                    Seems all are busy right now. Please try again shortly.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableDriverTypes.map((dt) => {
                    const config = VEHICLE_DISPLAY[dt.type] || VEHICLE_DISPLAY.standard;
                    const Icon = config.icon;
                    const baseFare = Math.max(0, (BASE_RATE + routeDistance * PER_KM) * config.multiplier * (surgeMultiplier || 1));
                    const fare = baseFare.toFixed(2);
                    const discountedFare = discount ? (baseFare * discount.multiplier).toFixed(2) : null;
                    return (
                      <button
                        key={dt.type}
                        onClick={() => handleSelectDriver(dt.type)}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border bg-card hover:border-primary/50 transition-all"
                      >
                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <Icon size={24} className="text-primary" />
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <p className="font-semibold">{config.label}</p>
                          <p className="text-xs text-muted-foreground">{dt.count} available • ~{dt.minEta} min away</p>
                        </div>
                        <div className="text-right shrink-0">
                          {discountedFare ? (
                            <>
                              <span className="text-xs text-muted-foreground line-through">KSh {fare}</span>
                              <div className="text-purple-400 font-bold text-base">KSh {discountedFare}</div>
                            </>
                          ) : (
                            <span className="text-primary font-bold text-base">KSh {fare}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </BottomSheet>
        ) : step === "search" ? (
          /* ——— SEARCH (pickup / destination) ——— */
          <BottomSheet key="search" collapsed={modalCollapsed} onToggle={() => setModalCollapsed(v => !v)} collapsedLabel="Show search">
            <div className="space-y-4">
              <h3 className="font-heading font-bold text-lg">Where to?</h3>
              {discount && (
                <div className="bg-purple-600/20 border border-purple-500/40 rounded-xl p-3 flex items-center gap-2">
                  <Zap size={16} className="text-purple-400 shrink-0" />
                  <p className="text-xs font-semibold text-purple-300">
                    You have a {discount.percent}% discount on this ride!
                  </p>
                </div>
              )}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">PICKUP</span>
                  <button
                    onClick={setPickupToCurrent}
                    disabled={locating}
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
                  >
                    {locating ? <Loader2 size={12} className="animate-spin" /> : <LocateFixed size={12} />}
                    Use current
                  </button>
                </div>
                <LocationSearch
                  label=""
                  icon={MapPin}
                  placeholder="Enter pickup location"
                  value={pickup?.name || ""}
                  onSelect={(loc) => setPickup(loc)}
                />
              </div>
              <LocationSearch
                label="DESTINATION"
                icon={Navigation}
                placeholder="Where are you going?"
                value={destination?.name || ""}
                onSelect={(loc) => setDestination(loc)}
              />
            </div>
          </BottomSheet>
        ) : null}
      </AnimatePresence>

      <NavBar />
    </div>
  );
}
