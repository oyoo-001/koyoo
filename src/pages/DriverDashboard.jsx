import React, { useState, useEffect } from "react";
import { api } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import RideMap from "@/components/koyoo/RideMap";
import BottomSheet from "@/components/koyoo/BottomSheet";
import NavBar from "@/components/koyoo/NavBar";
import StarRating from "@/components/koyoo/StarRating";
import KoyooLogo from "@/components/koyoo/KoyooLogo";
import { Check, X, Play, Flag, Loader2, MessageCircle, Phone, PhoneOff, PhoneIncoming } from "lucide-react";
import ChatPanel, { useVoiceCall } from "@/components/koyoo/ChatPanel";
import CallPanel from "@/components/koyoo/CallPanel";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import DriverOnboarding from "@/pages/DriverOnboarding";

function getRegion(lat, lng) {
  const inNairobi = lat >= -1.45 && lat <= -1.1 && lng >= 36.6 && lng <= 37.1;
  const inMuranga = lat >= -0.9 && lat <= -0.4 && lng >= 36.8 && lng <= 37.5;
  const inKirinyaga = lat >= -0.6 && lat <= -0.3 && lng >= 37.1 && lng <= 37.6;
  if (inNairobi) return 'nairobi';
  if (inMuranga) return 'muranga';
  if (inKirinyaga) return 'kirinyaga';
  return 'other';
}

export default function DriverDashboard() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [driverProfile, setDriverProfile] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [pendingRides, setPendingRides] = useState([]);
  const [currentRide, setCurrentRide] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [showCall, setShowCall] = useState(false);
  const [driverPos, setDriverPos] = useState(null);
  const [modalCollapsed, setModalCollapsed] = useState(false);
  const [driverHeading, setDriverHeading] = useState(0);
  const [riderLocation, setRiderLocation] = useState(null);

  useEffect(() => {
    const load = async () => {
      const me = await api.auth.me();
      setUser(me);
      const profiles = await api.entities.DriverProfile.filter({ user_id: me.id });
      if (profiles.length > 0) {
        setDriverProfile(profiles[0]);
        setIsOnline(profiles[0].is_online || false);
      }
    };
    load();
  }, []);

  // Broadcast driver location via geolocation + track locally
  useEffect(() => {
    if (!driverProfile || !isOnline) return;
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (pos.coords.heading != null) setDriverHeading(pos.coords.heading);
        setDriverPos(loc);
        await api.entities.DriverProfile.update(driverProfile.id, {
          current_lat: loc.lat,
          current_lng: loc.lng,
          current_heading: pos.coords.heading,
        });
      },
      null,
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [driverProfile, isOnline]);

  // Poll for ride requests and current ride
  useEffect(() => {
    if (!user || !isOnline) return;
    let mounted = true;
    const poll = async () => {
      try {
        // Check for accepted/in_progress rides first
        const accepted = await api.entities.Ride.filter({ driver_id: user.id, status: "accepted" });
        const inProgress = await api.entities.Ride.filter({ driver_id: user.id, status: "in_progress" });
        if (!mounted) return;
        const active = [...accepted, ...inProgress];
        if (active.length > 0) {
          setCurrentRide(active[0]);
          setPendingRides([]);
          return;
        }
        setCurrentRide(null);
        // Fetch pending rides matching vehicle type, then filter by region
        const vehicleType = driverProfile?.vehicle_type || "standard";
        const requested = await api.entities.Ride.filter({ status: "requested", vehicle_type: vehicleType }, "-created_at", 20);
        if (!mounted) return;
        // Filter by region if driver location available
        const driverRegion = driverPos ? getRegion(driverPos.lat, driverPos.lng) : null;
        const nearby = driverRegion
          ? requested.filter(r => r.pickup_region === driverRegion)
          : requested;
        setPendingRides(nearby.slice(0, 10));
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 4000);
    return () => { mounted = false; clearInterval(interval); };
  }, [user, isOnline, driverProfile, driverPos]);

  // Voice call
  const voiceCall = useVoiceCall({
    ride: currentRide,
    userId: user?.id,
    onStatusChange: (s) => {
      if (s === "calling") toast({ title: "Calling rider..." });
      else if (s === "connected") toast({ title: "Call connected" });
      else if (s === "ended") toast({ title: "Call ended" });
    },
  });

  // Auto-show call panel on incoming call
  useEffect(() => {
    if (voiceCall.callState === "ringing") setShowCall(true);
  }, [voiceCall.callState]);

  // Subscribe to ride updates
  useEffect(() => {
    const unsub = api.entities.Ride.subscribe((event) => {
      if (event.type === "update" && currentRide && event.data.id === currentRide.id) {
        if (event.data.status === "cancelled") {
          setCurrentRide(null);
          setRiderLocation(null);
          toast({ title: "Ride cancelled by rider", description: "The rider cancelled this trip" });
        } else {
          setCurrentRide(event.data);
          // Extract rider location from SSE update
          if (event.data.rider_lat && event.data.rider_lng) {
            setRiderLocation({ lat: event.data.rider_lat, lng: event.data.rider_lng });
          }
        }
      }
    });
    return unsub;
  }, [currentRide, toast]);

  // Reset rider location when ride changes
  useEffect(() => {
    if (!currentRide) {
      setRiderLocation(null);
    }
  }, [currentRide]);

  const toggleOnline = async () => {
    if (!driverProfile) return;
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    await api.entities.DriverProfile.update(driverProfile.id, { is_online: newStatus });
    toast({ title: newStatus ? "You're online!" : "You're offline", description: newStatus ? "Waiting for ride requests..." : "You won't receive ride requests" });
  };

  const acceptRide = async (ride) => {
    const vehicleInfo = driverProfile ? {
      driver_vehicle_make: driverProfile.vehicle_make,
      driver_vehicle_model: driverProfile.vehicle_model,
      driver_vehicle_color: driverProfile.vehicle_color,
      driver_vehicle_plate: driverProfile.license_plate,
      driver_vehicle_type: driverProfile.vehicle_type,
    } : {};
    await api.entities.Ride.update(ride.id, {
      status: "accepted",
      ...vehicleInfo,
    });
    setCurrentRide({ ...ride, status: "accepted", driver_id: user.id, driver_name: user.full_name, ...vehicleInfo });
    setPendingRides([]);
    toast({ title: "Ride accepted!", description: "Navigate to pickup location" });
  };

  const declineRide = (ride) => {
    setPendingRides((prev) => prev.filter((r) => r.id !== ride.id));
  };

  const cancelRide = async (rideId) => {
    if (!currentRide) return;
    await api.entities.Ride.update(rideId, { status: "cancelled" });
    setCurrentRide(null);
    toast({ title: "Ride cancelled", description: "You can go back online for new requests" });
  };

  const startTrip = async () => {
    if (!currentRide) return;
    await api.entities.Ride.update(currentRide.id, { status: "in_progress" });
    setCurrentRide({ ...currentRide, status: "in_progress" });
  };

  const completeTrip = async () => {
    if (!currentRide) return;
    await api.entities.Ride.update(currentRide.id, {
      status: "completed",
      final_fare: Number(currentRide.estimated_fare || 0),
    });
    setCurrentRide({ ...currentRide, status: "completed" });
  };

  const rateRider = async () => {
    if (!currentRide || !rating) return;
    await api.entities.Ride.update(currentRide.id, { rider_rating: rating, driver_comment: comment });
    // Update driver stats
    if (driverProfile) {
      await api.entities.DriverProfile.update(driverProfile.id, {
        total_rides: (driverProfile.total_rides || 0) + 1,
      });
    }
    setCurrentRide(null);
    setRating(0);
    setComment("");
    toast({ title: "Ride complete!" });
  };

  // For "accepted" status, route from driver → pickup; for "in_progress", route pickup → destination
  const isEnRoute = currentRide?.status === "accepted";
  const mapPickup = currentRide ? [currentRide.pickup_lat, currentRide.pickup_lng] : null;
  const mapDest = currentRide ? [currentRide.destination_lat, currentRide.destination_lng] : null;
  const mapRouteOrigin = isEnRoute && driverPos ? [driverPos.lat, driverPos.lng] : null;
  const mapDriverLoc = driverPos ? [driverPos.lat, driverPos.lng] : null;

  // Show onboarding if documents not yet uploaded or not verified
  if (driverProfile && (!driverProfile.license_url || !driverProfile.insurance_url || !driverProfile.documents_verified)) {
    return <DriverOnboarding profile={driverProfile} />;
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
        <KoyooLogo size="sm" />
        <div className="flex items-center gap-3 bg-card/90 backdrop-blur-xl rounded-full px-4 py-2 border border-border">
          <span className="text-xs font-medium">{isOnline ? "Online" : "Offline"}</span>
          <Switch checked={isOnline} onCheckedChange={toggleOnline} />
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <RideMap
          pickup={mapPickup}
          destination={mapDest}
          driverLocation={mapDriverLoc}
          routeOrigin={mapRouteOrigin}
          showRoute={!!currentRide}
          riderLocation={riderLocation}
          driverHeading={driverHeading}
        />

        {/* Chat + Call buttons */}
        {currentRide && ["accepted", "in_progress"].includes(currentRide.status) && (
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
        {(showCall || voiceCall.callState !== "idle") && currentRide && (
          <div className="absolute bottom-20 left-4 right-4 z-30 max-w-sm">
            <CallPanel
              callState={voiceCall.callState}
              startCall={voiceCall.startCall}
              acceptCall={voiceCall.acceptCall}
              rejectCall={voiceCall.rejectCall}
              endCall={voiceCall.endCall}
              muted={voiceCall.muted}
              toggleMute={voiceCall.toggleMute}
              otherName={currentRide.rider_name || "Rider"}
              onClose={() => setShowCall(false)}
            />
          </div>
        )}

        {/* Chat overlay */}
        {showChat && currentRide && (
          <div className="absolute bottom-20 left-4 right-4 z-20 bg-card rounded-2xl shadow-2xl border border-border h-80 flex flex-col overflow-hidden">
            <ChatPanel
              rideId={currentRide.id}
              userId={user?.id}
              userName={user?.full_name || "Driver"}
              role="driver"
              onClose={() => setShowChat(false)}
            />
          </div>
        )}
      </div>

      {/* Bottom Sheet */}
      <AnimatePresence mode="wait">
        {!isOnline ? (
          <BottomSheet key="offline" collapsed={modalCollapsed} onToggle={() => setModalCollapsed(v => !v)} collapsedLabel="Go online">
            <div className="text-center space-y-3 py-4">
              <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mx-auto">
                <X size={28} className="text-muted-foreground" />
              </div>
              <h3 className="font-heading font-bold">You're Offline</h3>
              <p className="text-sm text-muted-foreground">Go online to start receiving ride requests</p>
              <Button onClick={toggleOnline} className="w-full h-12 rounded-2xl font-semibold">
                Go Online
              </Button>
            </div>
          </BottomSheet>
        ) : currentRide && currentRide.status === "completed" ? (
          <BottomSheet key="rate-rider" collapsed={modalCollapsed} onToggle={() => setModalCollapsed(v => !v)} collapsedLabel="Rate rider">
            <div className="space-y-4 text-center">
              <h3 className="font-heading font-bold text-lg">Trip Complete!</h3>
              <p className="text-primary font-bold text-2xl">KSh {Number(currentRide.final_fare || currentRide.estimated_fare || 0).toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Rate your rider</p>
              <div className="flex justify-center">
                <StarRating rating={rating} onRate={setRating} size={32} />
              </div>
              <Textarea
                placeholder="Leave a comment (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="bg-secondary border-0 resize-none text-sm h-20"
              />
              <Button onClick={rateRider} className="w-full h-12 rounded-2xl font-semibold" disabled={!rating}>
                Submit Rating
              </Button>
            </div>
          </BottomSheet>
        ) : currentRide ? (
          <BottomSheet key="active-ride" collapsed={modalCollapsed} onToggle={() => setModalCollapsed(v => !v)} collapsedLabel={currentRide.status === "accepted" ? "Navigate to pickup" : "Trip in progress"}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    {currentRide.status === "accepted" ? "Navigate to pickup" : "Trip in progress"}
                  </p>
                  <h3 className="font-heading font-bold text-lg">{currentRide.rider_name || "Rider"}</h3>
                </div>
                <span className="text-primary font-bold text-xl">KSh {Number(currentRide.estimated_fare || 0).toFixed(2)}</span>
              </div>

              <div className="bg-secondary rounded-xl p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                  <span className="text-sm line-clamp-1">{currentRide.pickup_address}</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-1.5 w-2 h-2 rounded-full bg-destructive shrink-0" />
                  <span className="text-sm line-clamp-1">{currentRide.destination_address}</span>
                </div>
              </div>

              {/* Vehicle info — shown after accepting */}
              {currentRide.driver_vehicle_make && (
                <div className="bg-secondary/60 rounded-xl p-3 text-sm text-center">
                  <span className="text-muted-foreground">Your vehicle</span>
                  <p className="font-semibold capitalize">
                    {currentRide.driver_vehicle_color} {currentRide.driver_vehicle_make} {currentRide.driver_vehicle_model}
                    {currentRide.driver_vehicle_plate && <span> · {currentRide.driver_vehicle_plate}</span>}
                  </p>
                </div>
              )}

              <p className="text-sm text-muted-foreground text-center">
                {Number(currentRide.distance_km || 0).toFixed(1)} km • ~{Math.round(Number(currentRide.duration_min || 0))} min
              </p>

              {/* Communication controls — visible when rider accepted or trip in progress */}
              {["accepted", "in_progress"].includes(currentRide.status) && (
                <div className="bg-secondary/50 rounded-xl p-3 space-y-3 border border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Rider</p>
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

              {currentRide.status === "accepted" ? (
                <div className="space-y-2">
                  <Button onClick={startTrip} className="w-full h-12 rounded-2xl font-semibold gap-2">
                    <Play size={18} />
                    I've Arrived — Alert Rider
                  </Button>
                  <Button
                    onClick={() => cancelRide(currentRide.id)}
                    variant="destructive"
                    className="w-full h-11 rounded-xl gap-2 border-destructive text-destructive hover:bg-destructive/10"
                  >
                    <X size={16} />
                    Cancel Ride
                  </Button>
                </div>
              ) : (
                <Button onClick={completeTrip} className="w-full h-12 rounded-2xl font-semibold gap-2">
                  <Flag size={18} />
                  Complete Trip
                </Button>
              )}
            </div>
          </BottomSheet>
        ) : pendingRides.length > 0 ? (
          <BottomSheet key="pending" collapsed={modalCollapsed} onToggle={() => setModalCollapsed(v => !v)} collapsedLabel="Show requests">
            <div className="space-y-3">
              <h3 className="font-heading font-bold text-lg">Ride Requests</h3>
              {pendingRides.map((ride) => (
                <motion.div
                  key={ride.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-secondary rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{ride.rider_name || "Rider"}</span>
                    <span className="text-primary font-bold">KSh {Number(ride.estimated_fare || 0).toFixed(2)}</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <div className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                      <span className="text-sm line-clamp-1">{ride.pickup_address}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="mt-1.5 w-2 h-2 rounded-full bg-destructive shrink-0" />
                      <span className="text-sm line-clamp-1">{ride.destination_address}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{Number(ride.distance_km || 0).toFixed(1)} km</span>
                    <span>~{Math.round(Number(ride.duration_min || 0))} min</span>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => declineRide(ride)} variant="outline" className="flex-1 h-11 rounded-xl gap-2 border-destructive text-destructive hover:bg-destructive/10">
                      <X size={16} />
                      Decline
                    </Button>
                    <Button onClick={() => acceptRide(ride)} className="flex-1 h-11 rounded-xl gap-2">
                      <Check size={16} />
                      Accept
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </BottomSheet>
        ) : (
          <BottomSheet key="waiting" collapsed={modalCollapsed} onToggle={() => setModalCollapsed(v => !v)} collapsedLabel="Waiting for rides">
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                <h3 className="font-heading font-bold">Waiting for rides</h3>
                <p className="text-sm text-muted-foreground">You'll be notified when a rider is nearby</p>
              </div>
            </div>
          </BottomSheet>
        )}
      </AnimatePresence>

      <NavBar isDriver />
    </div>
  );
}