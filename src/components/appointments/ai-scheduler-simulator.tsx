"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Bot, User, Mic, MicOff, Send, Volume2, Sparkles } from "lucide-react";
import type { TimeSlot } from "@/types";

interface Message {
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  isVoice?: boolean;
}

export function AiSchedulerSimulator() {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "ai",
      text: "Hi there! I am the Settlement Sense AI Voice Scheduler. How can I help you manage your medical appointments today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    async function loadReferences() {
      try {
        const docRes = await fetch("/api/doctors");
        if (docRes.ok) { const d = await docRes.json(); setDoctors(d.doctors || []); }
        const patRes = await fetch("/api/patients");
        if (patRes.ok) { const p = await patRes.json(); setPatients(p.patients || []); }
      } catch (err) { console.error("Simulator: Error loading directories:", err); }
    }
    loadReferences();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSpeaking]);

  const presetScripts = [
    { label: "Book Appointment", text: "I'd like to book an appointment with Dr. Doctor User on Monday at 09:00 AM" },
    { label: "Check Slots", text: "Are there any slots available for Dr. Doctor User on Wednesday?" },
    { label: "Reschedule Appt", text: "I need to reschedule my appointment to next Monday at 10:00 AM" },
    { label: "Cancel Appt", text: "Please cancel my appointment for tomorrow" },
  ];

  const speakAIResponse = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [...prev, { sender: "user", text: textToSend, timestamp, isVoice: isVoiceMode }]);
    setInputText("");
    setLoading(true);

    try {
      const lower = textToSend.toLowerCase();
      let responseText = "I'm not sure what you'd like to do. Try saying 'book', 'check slots', 'reschedule', or 'cancel'.";

      const matchedDoctor = doctors.find((d) => lower.includes(d.displayName?.toLowerCase()));

      const getDateFromText = (text: string): string => {
        const today = new Date();
        const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        for (let i = 0; i < days.length; i++) {
          if (text.includes(days[i])) {
            const diff = (i - today.getDay() + 7) % 7 || 7;
            const target = new Date(today);
            target.setDate(today.getDate() + diff);
            return target.toISOString().split("T")[0];
          }
        }
        if (text.includes("tomorrow")) {
          const tmr = new Date(today);
          tmr.setDate(today.getDate() + 1);
          return tmr.toISOString().split("T")[0];
        }
        return today.toISOString().split("T")[0];
      };

      const timeMatch = textToSend.match(/\d{1,2}:\d{2}\s*(AM|PM)/i);
      const mentionedTime = timeMatch ? timeMatch[0].toUpperCase() : null;
      const mentionedDate = getDateFromText(lower);

      if (lower.includes("slot") || lower.includes("available") || lower.includes("free")) {
        if (!matchedDoctor) {
          responseText = "I couldn't find that doctor. Please mention the doctor's full name.";
        } else {
          const res = await fetch(`/api/availability?doctorId=${matchedDoctor.uid}&date=${mentionedDate}`);
          const data = await res.json();
          const freeSlots = (data.slots || []).filter((s: any) => s.available).slice(0, 5);
          responseText = freeSlots.length === 0
            ? `No available slots for ${matchedDoctor.displayName} on ${mentionedDate}.`
            : `${matchedDoctor.displayName} has these open slots on ${mentionedDate}: ${freeSlots.map((s: any) => s.startTime).join(", ")}. Would you like to book one?`;
        }
      } else if (lower.includes("book") || lower.includes("schedule") || lower.includes("reserve")) {
        if (!matchedDoctor || !mentionedTime) {
          responseText = "To book, please mention the doctor's name and a time (e.g. '09:00 AM').";
        } else {
          const patient = patients[0];
          if (!patient) {
            responseText = "No patient found to book for. Please use the form for manual bookings.";
          } else {
            const availRes = await fetch(`/api/availability?doctorId=${matchedDoctor.uid}&date=${mentionedDate}`);
            const availData = await availRes.json();
            const slot = (availData.slots || []).find((s: any) => s.startTime === mentionedTime && s.available);
            if (!slot) {
              responseText = `The slot at ${mentionedTime} is not available for ${matchedDoctor.displayName} on ${mentionedDate}.`;
            } else {
              const res = await fetch("/api/appointments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ patientId: patient.id, doctorId: matchedDoctor.uid, appointmentDate: mentionedDate, startTime: slot.startTime, endTime: slot.endTime, source: "whatsapp" }),
              });
              const data = await res.json();
              responseText = res.ok
                ? `Appointment booked for ${patient.firstName} ${patient.lastName} with ${matchedDoctor.displayName} on ${mentionedDate} at ${mentionedTime}. Status: ${data.status}.`
                : `Booking failed: ${data.error}`;
            }
          }
        }
      } else if (lower.includes("cancel")) {
        responseText = "To cancel a specific appointment, please use the appointments list and click Cancel on the relevant entry.";
      } else if (lower.includes("reschedule")) {
        responseText = "To reschedule, please use the appointments list and click Reschedule on the relevant entry.";
      }

      setMessages((prev) => [...prev, { sender: "ai", text: responseText, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
      if (isVoiceMode) speakAIResponse(responseText);
    } catch (err) {
      console.error("Simulator response error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* ── Left: Voice Console ─────────────────────────────────────────── */}
      <div className="lg:col-span-1 rounded-3xl border border-slate-200/60 dark:border-white/6 bg-white dark:bg-[#131f2e] flex flex-col justify-between p-6 shadow-sm">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">AI Voice Sandbox</h3>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
            Toggle Voice Mode to interact with the scheduling engine via text-to-speech. Voice accuracy metrics will show in the KPIs tab.
          </p>
        </div>

        {/* Sound wave visualiser */}
        <div className="h-32 flex items-center justify-center bg-slate-50 dark:bg-[#0d1421] rounded-2xl border border-slate-100 dark:border-white/6 my-4 relative overflow-hidden">
          {isSpeaking ? (
            <div className="flex items-end gap-1.5 h-12">
              <span className="w-1.5 bg-blue-500 rounded-full animate-bounce [animation-duration:0.6s] h-10" />
              <span className="w-1.5 bg-blue-500 rounded-full animate-bounce [animation-duration:0.8s] h-6" />
              <span className="w-1.5 bg-blue-500 rounded-full animate-bounce [animation-duration:0.5s] h-12" />
              <span className="w-1.5 bg-blue-500 rounded-full animate-bounce [animation-duration:0.7s] h-8" />
              <span className="w-1.5 bg-blue-500 rounded-full animate-bounce [animation-duration:0.9s] h-4" />
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-2 bg-slate-300 dark:bg-slate-600 rounded-full" />
              <span className="w-1.5 h-3 bg-slate-300 dark:bg-slate-600 rounded-full" />
              <span className="w-1.5 h-2 bg-slate-300 dark:bg-slate-600 rounded-full" />
            </div>
          )}
          <span className="absolute bottom-2 text-[9px] font-bold text-slate-400 dark:text-slate-500">
            {isSpeaking ? "AI Speaking…" : "Simulator Idle"}
          </span>
        </div>

        <Button
          onClick={() => {
            const newMode = !isVoiceMode;
            setIsVoiceMode(newMode);
            if (!newMode && window.speechSynthesis) { window.speechSynthesis.cancel(); setIsSpeaking(false); }
          }}
          className={`w-full h-11 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            isVoiceMode
              ? "bg-rose-500/10 dark:bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-400/30 hover:bg-rose-500/20"
              : "gradient-primary text-white border-0 hover:brightness-105 shadow-md"
          }`}
        >
          {isVoiceMode ? <><MicOff className="h-4 w-4" /> Mute AI Voice</> : <><Mic className="h-4 w-4" /> Enable AI Voice</>}
        </Button>
      </div>

      {/* ── Right: Chat Thread ──────────────────────────────────────────── */}
      <div className="lg:col-span-2 rounded-3xl border border-slate-200/60 dark:border-white/6 bg-white dark:bg-[#131f2e] flex flex-col h-[500px] shadow-sm overflow-hidden">

        {/* Chat header */}
        <div className="border-b border-slate-100 dark:border-white/6 px-6 py-4 flex items-center justify-between bg-slate-50/50 dark:bg-[#0f1a28] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-blue-600/10 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center">
              <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">Omni-Channel Voice &amp; Text Chat</h3>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">Simulating Patients WhatsApp/Call Feed</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
            <Volume2 className={`h-4 w-4 ${isVoiceMode ? "text-blue-500 dark:text-blue-400 animate-pulse" : "text-slate-400 dark:text-slate-500"}`} />
            <span>Audio {isVoiceMode ? "ON" : "OFF"}</span>
          </div>
        </div>

        {/* Preset buttons */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-white/5 flex flex-wrap gap-2 flex-shrink-0 bg-white dark:bg-[#131f2e]">
          {presetScripts.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(s.text)}
              className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/8 rounded-xl px-3 py-1.5 flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="h-3 w-3 text-blue-500 dark:text-blue-400" /> {s.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/30 dark:bg-[#0d1421]">
          {messages.map((m, idx) => {
            const isAI = m.sender === "ai";
            return (
              <div key={idx} className={`flex items-end gap-2.5 ${!isAI && "flex-row-reverse"}`}>
                <div className={`h-7 w-7 rounded-full flex items-center justify-center border flex-shrink-0 ${
                  isAI
                    ? "bg-blue-50 dark:bg-blue-500/15 border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400"
                    : "bg-slate-100 dark:bg-white/8 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
                }`}>
                  {isAI ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                </div>

                <div className="space-y-1 max-w-[72%]">
                  <div className={`px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed ${
                    isAI
                      ? "bg-white dark:bg-[#1e2d40] text-slate-700 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-white/8 shadow-sm"
                      : "bg-blue-600 text-white rounded-br-none shadow-sm"
                  }`}>
                    {m.text}
                  </div>
                  <p className={`text-[9px] text-slate-400 dark:text-slate-500 font-semibold px-1 ${!isAI && "text-right"}`}>
                    {m.timestamp}{m.isVoice && " · Voice Input"}
                  </p>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-end gap-2.5">
              <div className="h-7 w-7 rounded-full bg-blue-50 dark:bg-blue-500/15 border border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="bg-white dark:bg-[#1e2d40] px-4 py-3 rounded-2xl rounded-bl-none border border-slate-100 dark:border-white/8 shadow-sm flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce [animation-delay:0.2s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-100 dark:border-white/6 bg-white dark:bg-[#131f2e] flex-shrink-0">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputText); }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="Type instructions to AI Agent (e.g. book, check slots, cancel)..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="h-11 flex-1 rounded-xl border border-slate-200 dark:border-white/8 bg-white dark:bg-[#0d1827] px-4 text-xs font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-colors"
            />
            <Button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="gradient-primary h-11 w-11 rounded-xl p-0 flex items-center justify-center text-white hover:brightness-105 btn-scale-active disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
