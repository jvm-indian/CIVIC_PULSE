import { useRef, useState, useEffect } from "react";
import { Sparkles, SlidersHorizontal, ArrowDown, Activity, Globe, Flame, LogOut, User, LogIn } from "lucide-react";
import { AnimatedHeading, FadeIn } from "./components/Animations";
import CivicNerveCenter from "./components/CivicNerveCenter";
import LoginGate from "./components/LoginGate";
import { auth, onAuthStateChanged, signOut } from "./firebase";

export default function App() {
  const dashboardRef = useRef<HTMLDivElement>(null);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("civic_auth_status") === "true";
  });
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return localStorage.getItem("civic_auth_email");
  });
  const [userName, setUserName] = useState<string | null>(() => {
    return localStorage.getItem("civic_auth_name");
  });
  const [authChecking, setAuthChecking] = useState(true);
  const [showLoginScreen, setShowLoginScreen] = useState(false);

  useEffect(() => {
    // Listen to Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        setUserEmail(user.email);
        setUserName(user.displayName || "Active Citizen");
        localStorage.setItem("civic_auth_status", "true");
        localStorage.setItem("civic_auth_email", user.email || "");
        localStorage.setItem("civic_auth_name", user.displayName || "Active Citizen");
      }
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (email: string, name: string) => {
    setIsAuthenticated(true);
    setUserEmail(email);
    setUserName(name);
    localStorage.setItem("civic_auth_status", "true");
    localStorage.setItem("civic_auth_email", email);
    localStorage.setItem("civic_auth_name", name);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Sign out error", e);
    }
    setIsAuthenticated(false);
    setUserEmail(null);
    setUserName(null);
    localStorage.removeItem("civic_auth_status");
    localStorage.removeItem("civic_auth_email");
    localStorage.removeItem("civic_auth_name");
  };

  const scrollToDashboard = () => {
    dashboardRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (showLoginScreen) {
    return (
      <LoginGate 
        onLoginSuccess={(email, name) => {
          handleLoginSuccess(email, name);
          setShowLoginScreen(false);
        }} 
        onCancel={() => setShowLoginScreen(false)} 
      />
    );
  }

  return (
    <div className="w-full atmospheric-bg min-h-screen text-white relative select-none">
      
      {/* SECTION 1: SPECIFICATION-COMPLIANT FULLSCREEN HERO WITH RAW VIDEO BACKGROUND */}
      <section className="relative h-screen w-full flex flex-col justify-between overflow-hidden">
        
        {/* Full-screen background video - RAW, with immersive opacity to allow the atmospheric gradient to show through */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0 opacity-40"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260403_050628_c4e32401-fab4-4a27-b7a8-6e9291cd5959.mp4"
        />

        {/* Navbar Layer (px-6 md:px-12 lg:px-16 with pt-6) */}
        <header className="px-6 md:px-12 lg:px-16 pt-6 z-10 w-full">
          <div className="liquid-glass rounded-xl px-4 py-2 flex items-center justify-between border border-white/10">
            {/* Left: Logo */}
            <span className="text-2xl font-semibold tracking-tight text-white font-sans flex items-center gap-1.5">
              CIVIC<span className="text-gray-300 font-light">PULSE</span>
            </span>

            {/* Center: Hidden on mobile, visible md+ */}
            <nav className="hidden md:flex items-center gap-8 text-sm">
              <span className="text-gray-400 font-mono text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30 pulse-slow">
                CIVIC HEALTH ORACLE
              </span>
              <button 
                onClick={scrollToDashboard}
                className="text-gray-300 hover:text-white transition-colors duration-200 cursor-pointer"
              >
                Immune Grid Map
              </button>
              <button 
                onClick={scrollToDashboard}
                className="text-gray-300 hover:text-white transition-colors duration-200 cursor-pointer"
              >
                AI Smart Reporter
              </button>
              <button 
                onClick={scrollToDashboard}
                className="text-gray-300 hover:text-white transition-colors duration-200 cursor-pointer"
              >
                Locality Report Cards
              </button>
            </nav>

            {/* Right: Dynamic Authorized User & Sign Out */}
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                      <User className="w-3 h-3 text-emerald-400" />
                    </div>
                    <span className="text-xs font-mono text-gray-300 tracking-tight">
                      {userName || "JVM Update"}
                    </span>
                  </div>
                  
                  <button 
                    onClick={handleLogout}
                    className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5 text-gray-400" />
                    Sign Out
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setShowLoginScreen(true)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-white border border-emerald-500/10 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5 text-white/80" />
                  Sign In
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Hero Content (Pushed to bottom, px-6 md:px-12 lg:px-16, pb-12 lg:pb-16) */}
        <div className="px-6 md:px-12 lg:px-16 pb-12 lg:pb-16 z-10 w-full flex-1 flex flex-col justify-end">
          <div className="grid grid-cols-1 lg:grid-cols-2 lg:items-end gap-8">
            
            {/* Left Column: Heading, Subheading, Buttons */}
            <div className="space-y-6 max-w-2xl">
              
              {/* Neighborhood Health Badge from Atmospheric Design theme */}
              <FadeIn delay={100} duration={800}>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider font-mono">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Neighborhood Health: 62% Stable
                </div>
              </FadeIn>

              {/* Animated Heading (Character-by-character, delayed transition) */}
              <AnimatedHeading
                text={"Healing neighborhoods\nwith vision and action."}
                className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-normal leading-tight text-white font-sans"
                style={{ letterSpacing: "-0.04em" }}
                delay={200}
                charDelay={30}
                duration={500}
              />

              {/* Subheading (800ms delay fade-in) */}
              <FadeIn delay={800} duration={1000}>
                <p className="text-base md:text-lg text-gray-300 font-sans font-light leading-relaxed">
                  We back visionaries and craft citizen-led networks to diagnose municipal decay, predict failures, and escalate resolution.
                </p>
              </FadeIn>

              {/* Buttons Row (1200ms delay fade-in) */}
              <FadeIn delay={1200} duration={1000}>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={scrollToDashboard}
                    className="bg-white text-black px-8 py-3 rounded-lg font-medium text-sm hover:bg-gray-100 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    Scan Issue
                    <Sparkles className="w-4 h-4 fill-black text-black" />
                  </button>
                  <button
                    onClick={scrollToDashboard}
                    className="liquid-glass border border-white/20 text-white px-8 py-3 rounded-lg font-medium text-sm hover:bg-white hover:text-black transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    Explore Grid Map
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              </FadeIn>

            </div>

            {/* Right Column: Dynamic Atmospheric Glass Card */}
            <div className="flex items-end justify-start lg:justify-end">
              <FadeIn delay={1400} duration={1000}>
                <div className="liquid-glass border border-white/20 px-8 py-6 rounded-2xl flex flex-col gap-2 w-full max-w-sm">
                  <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold font-mono">Current Status</div>
                  <div className="text-xl md:text-2xl font-light text-white font-sans tracking-tight">
                    Predictive. Agentic. Collective.
                  </div>
                  <div className="mt-4 flex flex-col gap-3 font-mono">
                    <div className="flex justify-between items-center text-xs text-gray-400 border-t border-white/10 pt-3">
                      <span>Active Sensors</span>
                      <span className="text-white font-semibold">1,248</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>Urgency Peak</span>
                      <span className="text-red-400 font-semibold">84/100</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>Locality Focus</span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Activity className="w-3 h-3 animate-pulse" /> BENGALURU
                      </span>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>

          </div>
        </div>

      </section>

      {/* SECTION 2: INTERACTIVE CIVICPULSE IMMUNE NERVE CENTER */}
      <div id="nerve-center" ref={dashboardRef} className="relative z-10 border-t border-white/10 bg-black pt-4">
        
        {/* Dynamic decorative line linking sections */}
        <div className="w-full flex justify-center py-4">
          <div className="h-8 w-[1px] bg-gradient-to-b from-white/20 to-transparent"></div>
        </div>

        <CivicNerveCenter 
          userName={userName} 
          userEmail={userEmail} 
          isAuthenticated={isAuthenticated}
          onTriggerLogin={() => setShowLoginScreen(true)}
        />
      </div>

    </div>
  );
}
