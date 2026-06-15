import React, { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, X } from "lucide-react";
import ReactMarkdown from "react-markdown";

function MessageBubble({ msg, isMine }) {
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-2`}>
      <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
        isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary rounded-bl-md"
      }`}>
        {!isMine && <p className="text-xs font-semibold text-primary mb-0.5">{msg.sender_name}</p>}
        <ReactMarkdown className="prose prose-sm max-w-none [&>p]:m-0">{msg.content}</ReactMarkdown>
      </div>
    </div>
  );
}

export default function ChatPanel({ rideId, userId, userName, role, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const msgs = await api.entities.Message.filter({ ride_id: rideId }, "-created_at", 100);
      setMessages(msgs);
    };
    load();
    const unsub = api.entities.Message.subscribe((event) => {
      if (event.type === "create" && event.data.ride_id === rideId) {
        setMessages((prev) => [...prev, event.data]);
      }
    });
    return unsub;
  }, [rideId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    setSending(true);
    await api.entities.Message.create({
      ride_id: rideId,
      sender_id: userId,
      sender_name: userName,
      sender_role: role,
      content: input.trim(),
      type: "text",
    });
    setInput("");
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h4 className="font-semibold text-sm">Chat</h4>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} isMine={msg.sender_id === userId} />
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-border flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
          className="bg-secondary border-0 h-10 text-sm rounded-xl"
        />
        <Button size="icon" onClick={sendMessage} disabled={sending || !input.trim()} className="rounded-xl shrink-0">
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
}

// Voice Call Hook — handles both initiating and receiving calls
export function useVoiceCall({ ride, userId, onStatusChange }) {
  const [callState, setCallState] = useState("idle"); // idle, calling, ringing, connected
  const [muted, setMuted] = useState(false);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

  // Helper to clean up
  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current = null;
    setMuted(false);
  }, []);

  // Listen for incoming call offers on this ride
  useEffect(() => {
    if (!ride) return;
    const unsub = api.entities.Ride.subscribe(async (event) => {
      if (event.type !== "update" || event.data.id !== ride.id) return;
      const data = event.data;

      // Incoming call: other party created an offer
      if (data.call_offer && !data.call_answer && callState === "idle") {
        setCallState("ringing");
        onStatusChange?.("ringing");
      }

      // Other party answered our call
      if (data.call_answer && callState === "calling" && pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(
            new RTCSessionDescription(JSON.parse(data.call_answer))
          );
          setCallState("connected");
          onStatusChange?.("connected");
        } catch (e) {
          console.error("Failed to set remote description:", e);
        }
      }

      // Other party ended the call
      if (!data.call_active && (callState === "connected" || callState === "calling")) {
        cleanup();
        setCallState("idle");
        onStatusChange?.("ended");
      }
    });
    return () => unsub();
  }, [ride, callState, cleanup, onStatusChange]);

  const startCall = async () => {
    if (!ride) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          api.entities.Ride.update(ride.id, { call_ice_candidates: JSON.stringify([e.candidate]) });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          cleanup();
          setCallState("idle");
          onStatusChange?.("ended");
        }
      };

      await api.entities.Ride.update(ride.id, {
        call_active: true,
        call_offer: JSON.stringify(offer),
      });

      setCallState("calling");
      onStatusChange?.("calling");
    } catch (err) {
      console.error("Start call failed:", err);
      cleanup();
      setCallState("idle");
    }
  };

  const acceptCall = async () => {
    if (!ride?.call_offer) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(
        new RTCSessionDescription(JSON.parse(ride.call_offer))
      );

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          api.entities.Ride.update(ride.id, { call_ice_candidates: JSON.stringify([e.candidate]) });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          cleanup();
          setCallState("idle");
          onStatusChange?.("ended");
        }
      };

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await api.entities.Ride.update(ride.id, {
        call_answer: JSON.stringify(answer),
      });

      setCallState("connected");
      onStatusChange?.("connected");
    } catch (err) {
      console.error("Accept call failed:", err);
      cleanup();
      setCallState("idle");
    }
  };

  const rejectCall = async () => {
    if (!ride) return;
    cleanup();
    setCallState("idle");
    await api.entities.Ride.update(ride.id, {
      call_active: false,
      call_offer: "",
      call_answer: "",
    });
    onStatusChange?.("ended");
  };

  const endCall = () => {
    cleanup();
    setCallState("idle");
    setMuted(false);
    if (ride) {
      api.entities.Ride.update(ride.id, {
        call_active: false,
        call_offer: "",
        call_answer: "",
      });
    }
    onStatusChange?.("ended");
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMuted(!audioTrack.enabled);
      }
    }
  };

  return { callState, startCall, acceptCall, rejectCall, endCall, muted, toggleMute };
}
