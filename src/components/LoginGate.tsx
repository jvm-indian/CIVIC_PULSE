import React, { useState, useEffect, useRef } from "react";
import { 
  Lock, 
  LogIn, 
  AlertCircle, 
  Fingerprint, 
  Sparkles, 
  User, 
  Mail, 
  X, 
  ChevronRight, 
  ShieldCheck, 
  Users, 
  Eye, 
  Flame, 
  HelpCircle 
} from "lucide-react";
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from "../firebase";

interface LoginGateProps {
  onLoginSuccess: (userEmail: string, userName: string) => void;
  onCancel?: () => void;
}

type AuthTab = "signin" | "register" | "passcode";

export default function LoginGate({ onLoginSuccess, onCancel }: LoginGateProps) {
  // State to toggle the beautiful authentication modal
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState<AuthTab>("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Credentials fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  
  // Passcode field
  const [passcode, setPasscode] = useState("");
  const bypassPasscode = "CIVIC2026";

  // Video loop properties
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoOpacity, setVideoOpacity] = useState(0);

  // Custom Video Looping with start/end fade effects via requestAnimationFrame
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let animationFrameId: number;

    const monitorVideo = () => {
      if (video.duration) {
        const current = video.currentTime;
        const total = video.duration;
        const fadeDuration = 0.5; // 0.5s fade window

        let opacity = 1;

        // Fade in over 0.5s at the start (opacity 0 to 1)
        if (current < fadeDuration) {
          opacity = current / fadeDuration;
        }
        // Fade out over 0.5s before the end (opacity 1 to 0)
        else if (total - current < fadeDuration) {
          opacity = (total - current) / fadeDuration;
        }

        setVideoOpacity(Math.max(0, Math.min(1, opacity)));
      }
      animationFrameId = requestAnimationFrame(monitorVideo);
    };

    const handleEnded = () => {
      setVideoOpacity(0);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.play().catch(err => console.log("Video reset playback interrupted:", err));
        }
      }, 100);
    };

    video.addEventListener("ended", handleEnded);

    // Monitor playback when playing
    const handlePlay = () => {
      animationFrameId = requestAnimationFrame(monitorVideo);
    };

    const handlePause = () => {
      cancelAnimationFrame(animationFrameId);
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    // Initial play trigger
    video.play().catch(err => console.log("Video auto-play blocked/interrupted:", err));

    return () => {
      cancelAnimationFrame(animationFrameId);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, []);

  // Handlers for authenticating any common citizen
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      onLoginSuccess(user.email || "citizen@civicpulse.org", user.displayName || "Active Citizen");
    } catch (err: any) {
      console.error("Google authentication failed", err);
      setError(err.message || "Google authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = result.user;
      onLoginSuccess(user.email || email, user.displayName || "Active Citizen");
    } catch (err: any) {
      console.error("Sign in failed", err);
      let friendlyError = err.message;
      if (err.code === "auth/user-not-found") {
        friendlyError = "No account found with this email. Please click Register above!";
      } else if (err.code === "auth/wrong-password") {
        friendlyError = "Incorrect password. Please verify your credentials.";
      } else if (err.code === "auth/invalid-credential") {
        friendlyError = "Invalid login credentials. Please check or register a new account!";
      }
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Please provide your full name for the citizen roster.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = result.user;
      
      // Update display name
      try {
        await updateProfile(user, { displayName: fullName.trim() });
      } catch (profileErr) {
        console.warn("Failed to set display name on auth profile", profileErr);
      }

      onLoginSuccess(user.email || email, fullName.trim());
    } catch (err: any) {
      console.error("Registration failed", err);
      let friendlyError = err.message;
      if (err.code === "auth/email-already-in-use") {
        friendlyError = "This email address is already in use. Try signing in!";
      } else if (err.code === "auth/weak-password") {
        friendlyError = "Security check: Password must be at least 6 characters.";
      }
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  const handlePasscodeSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (passcode.trim() === bypassPasscode) {
      onLoginSuccess("guest.citizen@civicpulse.org", "Civic Guest");
    } else {
      setError("Invalid security passcode. Try standard Registration or Google sign in.");
    }
  };

  const handleAnonymousBypass = () => {
    if (onCancel) {
      onCancel();
    } else {
      onLoginSuccess("anonymous.citizen@civicpulse.org", "Anonymous Citizen");
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-y-auto bg-white text-black font-sans selection:bg-black selection:text-white flex flex-col justify-between">
      
      {/* 1. Background Video Layer (z-0) with top: '300px' as specified */}
      <div 
        className="absolute left-0 right-0 bottom-0 overflow-hidden pointer-events-none"
        style={{ top: "300px", zIndex: 0 }}
      >
        <video
          ref={videoRef}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4"
          muted
          playsInline
          className="w-full h-full object-cover transition-opacity duration-150"
          style={{ opacity: videoOpacity }}
        />
        {/* Precise gradients over the video blending to background white */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white" />
      </div>

      {/* 2. Navigation Bar (z-10) */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-8 py-6 flex justify-between items-center bg-white/70 backdrop-blur-md border-b border-gray-100">
        {/* Logo */}
        <span className="text-3xl font-normal tracking-tight text-black font-serif flex items-center gap-1">
          CivicPulse<sup className="text-xs font-sans font-light text-gray-400">®</sup>
        </span>

        {/* Menu Items */}
        <nav className="hidden md:flex items-center gap-8 text-sm">
          <a href="#home" className="text-black font-medium transition-colors">Home</a>
          <a href="#registry" className="text-[#6F6F6F] hover:text-black transition-colors">Registry</a>
          <a href="#community" className="text-[#6F6F6F] hover:text-black transition-colors">Community</a>
          <a href="#leaderboard" className="text-[#6F6F6F] hover:text-black transition-colors">Leaderboard</a>
          <a href="#about" className="text-[#6F6F6F] hover:text-black transition-colors">About</a>
        </nav>

        {/* CTA Button Row */}
        <div className="flex items-center gap-4">
          {onCancel && (
            <button 
              onClick={onCancel}
              className="text-gray-500 hover:text-black text-sm font-medium transition-colors cursor-pointer mr-2"
            >
              Back to Map
            </button>
          )}
          <button 
            onClick={() => {
              setActiveTab("signin");
              setShowAuthModal(true);
            }}
            className="bg-[#000000] text-white rounded-full px-6 py-2.5 text-sm font-medium hover:scale-[1.03] transition-transform cursor-pointer shadow-sm"
          >
            Begin Journey
          </button>
        </div>
      </header>

      {/* 3. Hero Section (z-10) */}
      <section 
        className="relative z-10 w-full max-w-7xl mx-auto px-6 flex flex-col items-center justify-center text-center flex-grow"
        style={{ paddingTop: "calc(8rem - 75px)", paddingBottom: "10rem" }}
      >
        {/* Headline */}
        <h1 className="text-5xl sm:text-7xl md:text-8xl max-w-5xl font-normal leading-[0.95] tracking-[-2.46px] text-[#000000] font-serif animate-fade-rise">
          Beyond <span className="text-[#6F6F6F] italic">silence,</span> we build <span className="text-[#6F6F6F] italic">our cities.</span>
        </h1>

        {/* Description */}
        <p className="text-base sm:text-lg max-w-2xl mt-8 leading-relaxed text-[#6F6F6F] font-light animate-fade-rise-delay">
          Empowering common people with a secure, real-time decentralized hub. 
          Through the noise, we craft digital lifelines for direct action and civic resolution. 
          Register instantly to participate.
        </p>

        {/* Hero CTA Button */}
        <div className="animate-fade-rise-delay-2 flex flex-col sm:flex-row gap-4 items-center justify-center mt-12">
          <button 
            onClick={() => {
              setActiveTab("register");
              setShowAuthModal(true);
            }}
            className="bg-[#000000] text-white rounded-full px-14 py-5 text-base font-medium hover:scale-[1.03] transition-transform cursor-pointer shadow-lg"
          >
            Create Free Account
          </button>
          
          <button 
            onClick={handleAnonymousBypass}
            className="bg-transparent hover:bg-gray-50 text-gray-600 border border-gray-200 rounded-full px-8 py-5 text-base font-medium transition-colors cursor-pointer"
          >
            Browse anonymously
          </button>
        </div>
      </section>

      {/* 4. Elegant Minimalist Footer */}
      <footer className="relative z-10 border-t border-gray-100 py-6 px-8 text-center bg-white/50 backdrop-blur-sm">
        <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
          CivicPulse Node • Bengaluru Common Citizen Platform • Encrypted Endpoint
        </p>
      </footer>

      {/* 5. Sleek Authentication Lightbox Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md px-4 py-8 animate-fade-in">
          <div className="bg-white border border-gray-100 rounded-3xl w-full max-w-md p-8 relative shadow-2xl animate-scale-up text-black overflow-hidden">
            
            {/* Top Close Button */}
            <button 
              onClick={() => {
                setShowAuthModal(false);
                setError(null);
              }}
              className="absolute top-5 right-5 text-gray-400 hover:text-black transition-colors p-1 rounded-full hover:bg-gray-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Tabs */}
            <div className="flex border-b border-gray-100 mb-6 gap-2">
              <button
                onClick={() => {
                  setActiveTab("signin");
                  setError(null);
                }}
                className={`flex-1 pb-3 text-xs font-semibold uppercase tracking-wider transition-all relative ${
                  activeTab === "signin" ? "text-black" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Sign In
                {activeTab === "signin" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black"></div>
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab("register");
                  setError(null);
                }}
                className={`flex-1 pb-3 text-xs font-semibold uppercase tracking-wider transition-all relative ${
                  activeTab === "register" ? "text-black" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Register
                {activeTab === "register" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black"></div>
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab("passcode");
                  setError(null);
                }}
                className={`flex-1 pb-3 text-xs font-semibold uppercase tracking-wider transition-all relative ${
                  activeTab === "passcode" ? "text-black" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Passcode
                {activeTab === "passcode" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black"></div>
                )}
              </button>
            </div>

            {/* Auth Header */}
            <div className="text-center mb-6">
              <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-2">
                <ShieldCheck className="w-5 h-5 text-black" />
              </div>
              <h2 className="text-lg font-bold tracking-tight">
                {activeTab === "signin" && "Sign In to Your Dashboard"}
                {activeTab === "register" && "Join CivicPulse"}
                {activeTab === "passcode" && "Administrator Override"}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {activeTab === "signin" && "Unlock and manage your urban reports"}
                {activeTab === "register" && "Participate fully as a common citizen"}
                {activeTab === "passcode" && "Bypass with system key (CIVIC2026)"}
              </p>
            </div>

            {/* Error Container */}
            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Auth forms */}
            {activeTab === "signin" && (
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl h-11 px-4 text-sm text-black focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl h-11 px-4 text-sm text-black focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black text-white hover:bg-gray-900 disabled:opacity-50 h-11 rounded-xl text-xs font-semibold tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      Sign In
                      <LogIn className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            )}

            {activeTab === "register" && (
              <form onSubmit={handleEmailRegister} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rahul Kumar"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl h-11 px-4 text-sm text-black focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl h-11 px-4 text-sm text-black focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Create Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl h-11 px-4 text-sm text-black focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black text-white hover:bg-gray-900 disabled:opacity-50 h-11 rounded-xl text-xs font-semibold tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      Create Account
                      <Sparkles className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            )}

            {activeTab === "passcode" && (
              <form onSubmit={handlePasscodeSignIn} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> System Passcode
                  </label>
                  <input
                    type="password"
                    required
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter system passcode (e.g. CIVIC2026)"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl h-11 px-4 text-sm text-black focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-black text-white hover:bg-gray-900 h-11 rounded-xl text-xs font-semibold tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Verify Passcode
                  <LogIn className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            {/* Third Party OAuth Integration */}
            {activeTab !== "passcode" && (
              <div className="space-y-3 mt-5">
                <div className="flex items-center justify-between">
                  <span className="w-full h-[1px] bg-gray-100"></span>
                  <span className="text-[10px] text-gray-400 px-3 uppercase font-bold font-mono tracking-wider whitespace-nowrap">
                    or
                  </span>
                  <span className="w-full h-[1px] bg-gray-100"></span>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleSignIn}
                  className="w-full bg-white text-black hover:bg-gray-50 border border-gray-200 disabled:opacity-50 h-11 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-3.3-4.53-6.16-4.53z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </button>
              </div>
            )}

            {/* Quick Bypass link */}
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={handleAnonymousBypass}
                className="text-xs text-gray-500 hover:text-black transition-colors font-mono underline underline-offset-4 cursor-pointer"
              >
                Access immediately as Anonymous Guest
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
