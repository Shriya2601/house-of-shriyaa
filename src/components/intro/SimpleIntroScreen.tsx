import React, { useEffect, useRef, useState } from "react";
import { Crown, ArrowRight } from "lucide-react";

interface SimpleIntroScreenProps {
  onComplete: () => void;
}

export default function SimpleIntroScreen({ onComplete }: SimpleIntroScreenProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const chime1NodesRef = useRef<{
    oscillators: OscillatorNode[];
    gainNodes: GainNode[];
    masterGain: GainNode;
  } | null>(null);
  const hasExitedRef = useRef(false);

  // Initialize or get Web Audio Context
  const getAudioContext = (): AudioContext | null => {
    if (typeof window === "undefined") return null;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          audioCtxRef.current = new AudioCtx();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  };

  // Play the first soft chime when website opens
  const playOpeningChime = () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const startTime = ctx.currentTime;
      const duration = 2.2;
      const fundamental = 587.33; // D5 warm crystalline chime

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2800, startTime);
      filter.Q.setValueAtTime(0.8, startTime);

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.0001, startTime);
      masterGain.gain.exponentialRampToValueAtTime(0.14, startTime + 0.02);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      filter.connect(ctx.destination);
      masterGain.connect(filter);

      // Fundamental oscillator
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(fundamental, startTime);
      gain1.gain.setValueAtTime(0.7, startTime);
      gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(startTime);
      osc1.stop(startTime + duration + 0.05);

      // Soft harmonic overtone
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(fundamental * 2, startTime);
      gain2.gain.setValueAtTime(0.18, startTime);
      gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.7);
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(startTime);
      osc2.stop(startTime + duration * 0.7 + 0.05);

      chime1NodesRef.current = {
        oscillators: [osc1, osc2],
        gainNodes: [gain1, gain2],
        masterGain,
      };
    } catch (e) {
      console.warn("Opening chime notice:", e);
    }
  };

  // Immediately stop the first chime to prevent any overlapping sounds
  const stopOpeningChimeImmediately = () => {
    if (chime1NodesRef.current) {
      const { oscillators, masterGain } = chime1NodesRef.current;
      const ctx = audioCtxRef.current;
      if (ctx) {
        try {
          const now = ctx.currentTime;
          masterGain.gain.cancelScheduledValues(now);
          masterGain.gain.setValueAtTime(masterGain.gain.value, now);
          masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);
          setTimeout(() => {
            oscillators.forEach((osc) => {
              try {
                osc.stop();
                osc.disconnect();
              } catch {
                // already stopped
              }
            });
          }, 20);
        } catch {
          // ignore
        }
      }
      chime1NodesRef.current = null;
    }
  };

  // Play the second soft chime ONLY when "ENTER STORE" is clicked
  const playEnterStoreChime = () => {
    // 1. Strictly stop any remaining audio from chime 1 first (no overlapping sounds)
    stopOpeningChimeImmediately();

    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const startTime = ctx.currentTime;
      const duration = 1.6;
      const fundamental = 880.0; // A5 uplifting bright bell chime

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(3400, startTime);

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.0001, startTime);
      masterGain.gain.exponentialRampToValueAtTime(0.16, startTime + 0.015);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      filter.connect(ctx.destination);
      masterGain.connect(filter);

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(fundamental, startTime);
      gain1.gain.setValueAtTime(0.65, startTime);
      gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(startTime);
      osc1.stop(startTime + duration + 0.05);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(fundamental * 1.5, startTime); // E6 harmonic fifth
      gain2.gain.setValueAtTime(0.15, startTime);
      gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.6);
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(startTime);
      osc2.stop(startTime + duration * 0.6 + 0.05);
    } catch (e) {
      console.warn("Enter store chime notice:", e);
    }
  };

  // Trigger smooth transition out
  const triggerExit = () => {
    if (hasExitedRef.current) return;
    hasExitedRef.current = true;
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 600); // 600ms smooth fade transition
  };

  // Handle user clicking "ENTER STORE"
  const handleEnterStore = () => {
    playEnterStoreChime();
    triggerExit();
  };

  useEffect(() => {
    // 1. Play one soft chime when website opens
    playOpeningChime();

    // Browser autoplay policy handler: ensure audio plays on first user touch if blocked initially
    const handleFirstGesture = () => {
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().then(() => {
          if (!hasExitedRef.current && !chime1NodesRef.current) {
            playOpeningChime();
          }
        });
      }
    };
    window.addEventListener("pointerdown", handleFirstGesture, { once: true });

    // 2. 5-second intro timer with smooth progress
    const startTime = Date.now();
    const duration = 5000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(100, (elapsed / duration) * 100);
      setProgress(p);

      if (elapsed >= duration) {
        clearInterval(interval);
        triggerExit();
      }
    }, 50);

    return () => {
      clearInterval(interval);
      window.removeEventListener("pointerdown", handleFirstGesture);
      stopOpeningChimeImmediately();
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col justify-between bg-[#080d0b] text-[#faf8f5] transition-opacity duration-700 ease-out select-none ${
        isExiting ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        backgroundImage:
          "radial-gradient(ellipse 90% 70% at 50% 50%, rgba(18, 30, 24, 0.65), #060907)",
      }}
    >
      {/* Subtle top ambient spacer */}
      <div className="h-16" />

      {/* Main Intro Content */}
      <div className="w-full max-w-6xl mx-auto px-6 sm:px-10 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
        {/* Left Side: Small Logo & Brand Name */}
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full p-[1.5px] bg-gradient-to-br from-[#faf3e0] via-[#d4af37] to-[#8c6d37] shadow-[0_0_20px_rgba(212,175,55,0.3)] flex items-center justify-center flex-shrink-0">
            <div className="w-full h-full rounded-full bg-[#080e0c] flex items-center justify-center border border-[#d4af37]/30">
              <Crown size={16} strokeWidth={1.8} className="text-[#d4af37]" />
            </div>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-[#faf6ee] tracking-[0.2em] uppercase font-normal">
            House of Shriya
          </h1>
        </div>

        {/* Right Side: ENTER STORE Button */}
        <div>
          <button
            type="button"
            onClick={handleEnterStore}
            className="group inline-flex items-center gap-3 px-6 sm:px-8 py-3.5 rounded-full border border-[#d4af37]/50 hover:border-[#d4af37] bg-[#121c17]/90 hover:bg-[#192720] text-[#f7e7c4] hover:text-white font-sans text-xs sm:text-sm tracking-[0.22em] font-semibold uppercase transition-all duration-300 shadow-[0_4px_25px_rgba(212,175,55,0.15)] hover:shadow-[0_6px_30px_rgba(212,175,55,0.28)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <span>ENTER STORE</span>
            <ArrowRight
              size={15}
              className="text-[#d4af37] transition-transform duration-300 group-hover:translate-x-1"
            />
          </button>
        </div>
      </div>

      {/* 5-second progress bar at the bottom */}
      <div className="w-full">
        <div className="w-full h-[2px] bg-white/5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#8c6d37] via-[#d4af37] to-[#faf3e0]"
            style={{
              width: `${progress}%`,
              transition: "width 50ms linear",
            }}
          />
        </div>
      </div>
    </div>
  );
}
