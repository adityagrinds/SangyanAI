import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import HeroScene from "./HeroScene";

/* ── Animated counter hook ── */
function useCountUp(end, duration = 1.8, startTrigger = false) {
  const [value, setValue] = useState(0);
  const frameRef = useRef();

  useEffect(() => {
    if (!startTrigger) return;
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * end));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [end, duration, startTrigger]);

  return value;
}

export default function LandingPage({ onEnter }) {
  const containerRef = useRef();
  const [statsVisible, setStatsVisible] = useState(false);

  const countMonitor = useCountUp(24, 1.6, statsVisible);
  const countAgents = useCountUp(3, 1.2, statsVisible);
  const countResponse = useCountUp(30, 1.4, statsVisible);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      /* ── Logo + tagline ── */
      tl.from(".lp-logo", { opacity: 0, y: -30, duration: 0.9, delay: 0.3 });
      tl.from(".lp-tagline", { opacity: 0, y: 15, duration: 0.6 }, "-=0.35");

      /* ── Eyebrow ── */
      tl.from(".lp-eyebrow", { opacity: 0, x: -30, duration: 0.5 }, "-=0.2");

      /* ── Title words stagger ── */
      tl.from(".lp-word", {
        opacity: 0,
        y: 70,
        rotationX: -30,
        duration: 0.7,
        stagger: 0.12,
        ease: "back.out(1.4)",
      }, "-=0.25");

      /* ── Subtitle ── */
      tl.from(".lp-subtitle", { opacity: 0, y: 20, duration: 0.6 }, "-=0.15");

      /* ── CTA buttons ── */
      tl.from(".lp-cta", {
        opacity: 0,
        y: 25,
        scale: 0.92,
        duration: 0.5,
        stagger: 0.12,
      }, "-=0.15");

      /* ── Side dots ── */
      tl.from(".lp-dot", {
        opacity: 0,
        x: 20,
        duration: 0.35,
        stagger: 0.08,
      }, "-=0.3");

      /* ── Bottom stats ── */
      tl.from(".lp-stat", {
        opacity: 0,
        y: 20,
        duration: 0.45,
        stagger: 0.1,
        onComplete: () => setStatsVisible(true),
      }, "-=0.25");



      /* ── Scan line sweep ── */
      gsap.fromTo(
        ".lp-scanline",
        { top: "-2px", opacity: 0.35 },
        { top: "100%", opacity: 0, duration: 3.5, repeat: -1, ease: "none" }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="landing" ref={containerRef}>
      {/* ── 3D background ── */}
      <HeroScene />

      {/* ── Overlay effects ── */}
      <div className="lp-scanline" />
      <div className="lp-grid" />
      <div className="lp-vignette" />

      {/* ── Header ── */}
      <header className="landing-header">
        <div className="lp-logo">
          <svg className="lp-shield" width="34" height="34" viewBox="0 0 32 32" fill="none">
            <path
              d="M16 2L4 8v8c0 7.5 5.1 14.5 12 16 6.9-1.5 12-8.5 12-16V8L16 2z"
              fill="url(#shG)"
              opacity="0.9"
            />
            <path
              d="M16 6L8 10v6c0 5.5 3.4 10.5 8 12 4.6-1.5 8-6.5 8-12v-6L16 6z"
              fill="url(#shI)"
              opacity="0.5"
            />
            <defs>
              <linearGradient id="shG" x1="4" y1="2" x2="28" y2="26">
                <stop stopColor="#45b5ff" />
                <stop offset="1" stopColor="#7c7bff" />
              </linearGradient>
              <linearGradient id="shI" x1="8" y1="6" x2="24" y2="22">
                <stop stopColor="#45b5ff" stopOpacity="0.5" />
                <stop offset="1" stopColor="#7c7bff" stopOpacity="0.2" />
              </linearGradient>
            </defs>
          </svg>
          <h1 className="lp-logo-text">SANGYAN AI</h1>
          <span className="lp-tagline">Predicting Crisis · Protecting Lives</span>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="landing-content">
        <p className="lp-eyebrow">
          <span className="eyebrow-bar" />
          Multi-Agent Crisis Intelligence
        </p>

        <h1 className="landing-title">
          <span className="lp-word">SANGYAN</span>
          <span className="lp-word lp-gradient">AI</span>
          <span className="lp-word">Response</span>
          <span className="lp-word">Studio</span>
        </h1>

        <p className="lp-subtitle">
          Live, factual, multi-agent disaster intelligence with breathtaking
          clarity. Monitor, analyze, and respond before the world even blinks.
        </p>

        <div className="landing-actions">
          <button className="lp-cta cta-primary-btn" onClick={onEnter}>
            <span>Let&apos;s Monitor</span>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button className="lp-cta cta-ghost-btn" onClick={onEnter}>
            Take a Tour
          </button>
        </div>
      </main>

      {/* ── Side dots ── */}
      <div className="landing-social">
        <span className="lp-dot" />
        <span className="lp-dot active" />
        <span className="lp-dot" />
      </div>

      {/* ── Bottom stats (animated counters) ── */}
      <div className="lp-stats">
        <div className="lp-stat">
          <span className="stat-val">{countMonitor}/7</span>
          <span className="stat-lbl">Monitoring</span>
        </div>
        <div className="lp-stat">
          <span className="stat-val">{countAgents}</span>
          <span className="stat-lbl">AI Agents</span>
        </div>
        <div className="lp-stat">
          <span className="stat-val">&lt;{countResponse}s</span>
          <span className="stat-lbl">Response</span>
        </div>
      </div>
    </div>
  );
}
