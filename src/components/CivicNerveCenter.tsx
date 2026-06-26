import React, { useState, useEffect, useRef } from "react";
import { 
  Upload, Activity, MapPin, AlertTriangle, CheckCircle2, Clock, 
  TrendingUp, TrendingDown, Send, FileText, MessageSquare, Mail, 
  Share2, Map, Plus, Search, Building2, ShieldAlert, Sparkles, 
  RefreshCw, SlidersHorizontal, Eye, HeartHandshake, ThumbsUp, 
  Check, Copy, ChevronRight, X, Sparkle, Shield, Users, Award, Trophy, BrainCircuit, Link,
  Database, Trash2, Lock, Unlock
} from "lucide-react";
import { Issue, Sector, ComplaintKit, CitizenProfile, LeaderboardEntry } from "../types";
import { SECTORS_DATA } from "../sectorsData";
import { FadeIn, AnimatedHeading } from "./Animations";
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";

const GOOGLE_MAPS_API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";
const hasValidGoogleMapsKey = Boolean(GOOGLE_MAPS_API_KEY) && GOOGLE_MAPS_API_KEY !== "YOUR_API_KEY" && GOOGLE_MAPS_API_KEY !== "";

interface CivicNerveCenterProps {
  userName?: string | null;
  userEmail?: string | null;
  isAuthenticated?: boolean;
  onTriggerLogin?: () => void;
}

export default function CivicNerveCenter({ userName, userEmail, isAuthenticated = false, onTriggerLogin }: CivicNerveCenterProps) {
  // --- STATE ---
  const [issues, setIssues] = useState<Issue[]>([]);
  const [sectors, setSectors] = useState<Sector[]>(SECTORS_DATA);
  const [selectedSector, setSelectedSector] = useState<Sector>(SECTORS_DATA[0]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  
  // Tab states
  const [activeView, setActiveView] = useState<"map" | "report" | "sectors" | "reputation" | "oracle">("map");
  const [mapFilter, setMapFilter] = useState<string>("all");
  const [escalationTab, setEscalationTab] = useState<"letter" | "whatsapp" | "email" | "social">("letter");

  // Map settings
  const [mapType, setMapType] = useState<"google" | "schematic">("google");

  // Conversational Chat state
  const [chatMessages, setChatMessages] = useState<Array<{role: "user" | "model", content: string}>>([
    {
      role: "model",
      content: "Welcome, citizen! I am the CivicPulse AI Oracle, a multi-agent coordinator trained in smart city mechanics, municipal jurisdiction boundaries, and civil engineering logic. Ask me anything about active failures, campaign escalation, or local urban guidelines."
    }
  ]);
  const [currentChatInput, setCurrentChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);

  const handleSendChatMessage = async (presetText?: string) => {
    const textToSend = presetText || currentChatInput;
    if (!textToSend.trim() || isSendingChat) return;

    const updatedMsgs = [...chatMessages, { role: "user" as const, content: textToSend }];
    setChatMessages(updatedMsgs);
    setCurrentChatInput("");
    setIsSendingChat(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMsgs })
      });
      const result = await response.json();
      if (result.status === "success" && result.reply) {
        setChatMessages(prev => [...prev, { role: "model" as const, content: result.reply }]);
      } else {
        setChatMessages(prev => [...prev, { role: "model" as const, content: "My operational link was interrupted. Please verify your connection or secret configurations." }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages(prev => [...prev, { role: "model" as const, content: "Failed to transmit coordinates to the server. Please check local daemon logs." }]);
    } finally {
      setIsSendingChat(false);
    }
  };

  // Civic Reputation Profile State (Pre-seeded with dynamic multipliers)
  const [citizenProfile, setCitizenProfile] = useState<CitizenProfile>({
    id: "user-jagannatha",
    name: "Jagannatha",
    trustScore: 87,
    points: 340,
    reportsSubmitted: 14,
    verifiedReports: 12,
    falseReports: 0,
    badge: "Gold Civic Hero",
    impactScore: 89,
    citizensHelped: 1700,
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
  });

  const awardReputationPoints = (pts: number, extraFields: Partial<CitizenProfile> = {}) => {
    setCitizenProfile(prev => {
      const nextPoints = prev.points + pts;
      let badge: CitizenProfile["badge"] = prev.badge;
      if (nextPoints >= 1000) {
        badge = "Guardian of Community";
      } else if (nextPoints >= 500) {
        badge = "Gold Civic Hero";
      } else if (nextPoints >= 250) {
        badge = "Silver Civic Hero";
      } else if (nextPoints >= 100) {
        badge = "Bronze Civic Hero";
      }

      const reportsSubmitted = prev.reportsSubmitted + (extraFields.reportsSubmitted || 0);
      const verifiedReports = prev.verifiedReports + (extraFields.verifiedReports || 0);
      const falseReports = prev.falseReports + (extraFields.falseReports || 0);

      // Trust calculation based on verification fidelity
      const baseTrust = 50 + (verifiedReports * 4) - (falseReports * 20);
      const trustScore = Math.max(0, Math.min(100, baseTrust));
      const citizensHelped = prev.citizensHelped + (pts * 5);
      const impactScore = reportsSubmitted > 0 ? Math.min(100, Math.round((verifiedReports / reportsSubmitted) * 100)) : 50;

      return {
        ...prev,
        ...extraFields,
        points: nextPoints,
        badge,
        trustScore,
        citizensHelped,
        impactScore
      };
    });
  };
  
  // Smart Reporter Form State
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>("");
  const [customTextHint, setCustomTextHint] = useState("");
  const [manualLocation, setManualLocation] = useState("Whitefield Main Road, Bengaluru");
  const [selectedFormSector, setSelectedFormSector] = useState<string>("sec-1");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  
  // Geolocation & Auto-Ward Detection State
  const [detectedCoords, setDetectedCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Escalation / Campaign State
  const [generatingCampaign, setGeneratingCampaign] = useState(false);
  const [campaignKit, setCampaignKit] = useState<ComplaintKit | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // New Comment state
  const [commentText, setCommentText] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("");

  // AI Resolution Evidence & Voting States
  const [isSubmitResolutionOpen, setIsSubmitResolutionOpen] = useState(false);
  const [resolutionCost, setResolutionCost] = useState("");
  const [resolutionRemarks, setResolutionRemarks] = useState("");
  const [resolutionImage, setResolutionImage] = useState("");
  const [submittingResolution, setSubmittingResolution] = useState(false);
  const [citizenVoteUser, setCitizenVoteUser] = useState("");
  const [citizenVotingIssueId, setCitizenVotingIssueId] = useState<string | null>(null);
  const [votingInProgress, setVotingInProgress] = useState(false);

  // Sector Predictions recalculation state
  const [recalculatingSectorId, setRecalculatingSectorId] = useState<string | null>(null);

  // AI Explainability & Pipeline states
  const [showAIExplanationId, setShowAIExplanationId] = useState<string | null>(null);
  const [showDemoPipeline, setShowDemoPipeline] = useState<boolean>(false);

  // Database Management states (honoring "remove all mock data")
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [databaseActionMessage, setDatabaseActionMessage] = useState<string | null>(null);

  // --- FETCH INITIAL ISSUES ---
  const fetchIssues = async () => {
    try {
      const response = await fetch("/api/issues");
      const result = await response.json();
      if (result.status === "success") {
        setIssues(result.data);
        // Default to the first issue for detailed panels
        if (result.data.length > 0 && !selectedIssue) {
          setSelectedIssue(result.data[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch issues:", error);
    }
  };

  const handleClearDatabase = async () => {
    try {
      const response = await fetch("/api/issues/clear-all", { method: "POST" });
      const result = await response.json();
      if (result.status === "success") {
        setIssues([]);
        setSelectedIssue(null);
        setShowConfirmClear(false);
        setDatabaseActionMessage("All mock data has been deleted! The board is completely fresh.");
        setTimeout(() => setDatabaseActionMessage(null), 5000);
      }
    } catch (error) {
      console.error("Failed to clear database:", error);
      setDatabaseActionMessage("Failed to clear database.");
      setTimeout(() => setDatabaseActionMessage(null), 5000);
    }
  };

  const handleSeedMockData = async () => {
    try {
      const response = await fetch("/api/issues/seed-mock", { method: "POST" });
      const result = await response.json();
      if (result.status === "success") {
        setIssues(result.data);
        if (result.data.length > 0) {
          setSelectedIssue(result.data[0]);
        }
        setDatabaseActionMessage("Mock reports successfully loaded for demonstration.");
        setTimeout(() => setDatabaseActionMessage(null), 5000);
      }
    } catch (error) {
      console.error("Failed to seed database:", error);
      setDatabaseActionMessage("Failed to restore mock data.");
      setTimeout(() => setDatabaseActionMessage(null), 5000);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  useEffect(() => {
    if (userName) {
      setCitizenProfile(prev => ({
        ...prev,
        name: userName,
        id: userEmail || prev.id
      }));
    }
  }, [userName, userEmail]);

  // --- HANDLERS ---
  
  // 1. One-click preset reporter (usability winner)
  const handlePresetSelect = (presetType: "pothole" | "water" | "streetlight") => {
    let base64 = "";
    let hint = "";
    let loc = "";
    let title = "";
    let sectorId = "sec-1";

    if (presetType === "pothole") {
      base64 = "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=800&q=80";
      hint = "asphalt failure pothole on whitefield main road";
      loc = "Whitefield Main Road, opposite ITPL Main Gate";
      title = "Asphalt Aggregate Shear Failures";
      sectorId = "sec-1";
    } else if (presetType === "water") {
      base64 = "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&w=800&q=80";
      hint = "water leakage pressure burst road erosion";
      loc = "Koramangala 80 Feet Road, near 4th Block Intersection";
      title = "Mainpipe Rupture Substrate Flooding";
      sectorId = "sec-2";
    } else if (presetType === "streetlight") {
      base64 = "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80";
      hint = "dark street lights non functional electrical failure";
      loc = "Indiranagar 100 Feet Road, 12th Main Crossing";
      title = "Circuit Breakage Streetlamp Blackout Corridor";
      sectorId = "sec-3";
    }

    setUploadedImage(base64);
    setImageFileName(`preset_${presetType}.jpg`);
    setCustomTextHint(hint);
    setManualLocation(loc);
    setSelectedFormSector(sectorId);
    setCustomTitle(title);
    setAnalysisResult(null);
  };

  // File drag & drop
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        setImageFileName(file.name);
        setAnalysisResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger AI Vision analysis
  const runAIVisionAnalysis = async () => {
    if (!uploadedImage) return;

    setAnalyzing(true);
    setAnalysisProgress([]);
    setAnalysisResult(null);

    const steps = [
      "Decompressing uploaded matrix coordinates...",
      "Matching spatial landmarks near Bengaluru corridors...",
      "Analyzing depth of aggregate disintegration...",
      "Querying local moisture indexes & precipitation history...",
      "Calculating estimated deterioration age coefficient...",
      "Generating high-priority municipal resolving suggestions..."
    ];

    // Simulate animated logs for high-quality product experience
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 300));
      setAnalysisProgress(prev => [...prev, steps[i]]);
    }

    try {
      const response = await fetch("/api/analyze-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: uploadedImage,
          textHint: customTextHint || "general civic issue"
        })
      });

      const result = await response.json();
      if (result.status === "success" && result.data) {
        setAnalysisResult(result.data);
        if (!customTitle) {
          const capitalizedType = result.data.issue_type.replace("_", " ").toUpperCase();
          setCustomTitle(`AI Detected: ${capitalizedType}`);
        }
      }
    } catch (err) {
      console.error("AI Analysis failed:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  // Auto-Detect GPS Location & Automatically Route to Closest Ward
  const handleAutoDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    setIsDetectingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setDetectedCoords({ lat: latitude, lng: longitude });

        // Find the closest ward sector in our SECTORS_DATA list based on GPS coordinates
        let closestSector = sectors[0];
        let minDistance = Infinity;

        sectors.forEach(sec => {
          const dist = Math.sqrt(
            Math.pow(latitude - sec.center[0], 2) + 
            Math.pow(longitude - sec.center[1], 2)
          );
          if (dist < minDistance) {
            minDistance = dist;
            closestSector = sec;
          }
        });

        // Automatically select the nearest ward
        setSelectedFormSector(closestSector.id);

        let precisionAddress = "";
        if (closestSector.id === "sec-1") {
          precisionAddress = `ITPL Main Road, Whitefield (GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;
        } else if (closestSector.id === "sec-2") {
          precisionAddress = `80 Feet Road, Koramangala (GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;
        } else if (closestSector.id === "sec-3") {
          precisionAddress = `100 Feet Road, Indiranagar (GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;
        } else {
          precisionAddress = `HSR Sector 3 Ring Road (GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;
        }

        setManualLocation(precisionAddress);
        setIsDetectingLocation(false);
      },
      (error) => {
        console.error("Geolocation error, running precision ward simulation:", error);
        
        // Premium fallback simulated detection
        setLocationError("GPS signal timeout. Activating high-precision localized ward routing...");
        
        setTimeout(() => {
          const randomSectorIdx = Math.floor(Math.random() * sectors.length);
          const simulatedSector = sectors[randomSectorIdx];
          const simulatedLat = simulatedSector.center[0] + (Math.random() - 0.5) * 0.005;
          const simulatedLng = simulatedSector.center[1] + (Math.random() - 0.5) * 0.005;

          setDetectedCoords({ lat: simulatedLat, lng: simulatedLng });
          setSelectedFormSector(simulatedSector.id);

          let precisionAddress = "";
          if (simulatedSector.id === "sec-1") {
            precisionAddress = `Outer Ring Road near Shantiniketan, Whitefield (GPS Simulated: ${simulatedLat.toFixed(5)}, ${simulatedLng.toFixed(5)})`;
          } else if (simulatedSector.id === "sec-2") {
            precisionAddress = `Koramangala 4th Block Crossroads (GPS Simulated: ${simulatedLat.toFixed(5)}, ${simulatedLng.toFixed(5)})`;
          } else if (simulatedSector.id === "sec-3") {
            precisionAddress = `Indiranagar Metro Station Overpass, 100 Feet Rd (GPS Simulated: ${simulatedLat.toFixed(5)}, ${simulatedLng.toFixed(5)})`;
          } else {
            precisionAddress = `HSR Layout Sector 3 Main Boulevard (GPS Simulated: ${simulatedLat.toFixed(5)}, ${simulatedLng.toFixed(5)})`;
          }

          setManualLocation(precisionAddress);
          setIsDetectingLocation(false);
          setLocationError(null);
        }, 1500);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  // Submit analyzed issue to memory
  const handleDeployIssue = async () => {
    if (!analysisResult || !uploadedImage) return;

    const chosenSector = sectors.find(s => s.id === selectedFormSector);
    const baseLat = chosenSector ? chosenSector.center[0] : 12.9345;
    const baseLng = chosenSector ? chosenSector.center[1] : 77.6256;

    const finalLat = detectedCoords ? detectedCoords.lat : (baseLat + (Math.random() - 0.5) * 0.015);
    const finalLng = detectedCoords ? detectedCoords.lng : (baseLng + (Math.random() - 0.5) * 0.015);

    const payload = {
      title: customTitle || `Reported ${analysisResult.issue_type}`,
      category: analysisResult.issue_type,
      severity: analysisResult.severity,
      urgencyScore: analysisResult.civic_urgency_score,
      location: manualLocation || "Bengaluru Street Corridor",
      latitude: finalLat,
      longitude: finalLng,
      description: customDesc || analysisResult.ai_summary,
      imageUrl: uploadedImage,
      estimatedAge: `${analysisResult.estimated_age_days} days`,
      spreadPrediction: analysisResult.spread_prediction,
      spreadRisk: analysisResult.spread_risk,
      suggestedAuthority: analysisResult.suggested_authority
    };

    try {
      const response = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.status === "success" && result.data) {
        setIssues(prev => [result.data, ...prev]);
        setSelectedIssue(result.data);
        
        // Update sector issue count
        setSectors(prev => prev.map(s => {
          if (s.id === selectedFormSector) {
            return {
              ...s,
              totalIssues: s.totalIssues + 1,
              stats: {
                ...s.stats,
                score: Math.max(10, s.stats.score - 2) // adding issue decreases health
              }
            };
          }
          return s;
        }));

        // Award reputation points: +20 points for a new valid issue, +10 points for uploading a high quality image
        awardReputationPoints(30, { reportsSubmitted: 1, verifiedReports: 1 });

        // Reset form
        setUploadedImage(null);
        setAnalysisResult(null);
        setCustomTitle("");
        setCustomDesc("");
        setImageFileName("");
        setDetectedCoords(null);
        
        // Return to map view to see new issue
        setActiveView("map");
      }
    } catch (err) {
      console.error("Failed to deploy issue:", err);
    }
  };

  // 2. Upvote / Verify
  const handleVerify = async (issueId: string, type: "confirm" | "reject") => {
    try {
      const response = await fetch(`/api/issues/${issueId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type })
      });
      const result = await response.json();
      if (result.status === "success" && result.data) {
        setIssues(prev => prev.map(i => i.id === issueId ? result.data : i));
        setSelectedIssue(result.data);
        
        // Award community verification reputation points
        awardReputationPoints(5);
      }
    } catch (err) {
      console.error("Verification failed:", err);
    }
  };

  // 3. Comment
  const handleAddComment = async (issueId: string) => {
    if (!commentText.trim()) return;

    try {
      const response = await fetch(`/api/issues/${issueId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: commentAuthor.trim() || "Active Citizen",
          text: commentText
        })
      });
      const result = await response.json();
      if (result.status === "success" && result.data) {
        setIssues(prev => prev.map(i => i.id === issueId ? result.data : i));
        setSelectedIssue(result.data);
        setCommentText("");

        // Award comment contribution points
        awardReputationPoints(3);
      }
    } catch (err) {
      console.error("Comment failed:", err);
    }
  };

  // 4. Submit AI Resolution Audit & Evidence
  const handleSubmitResolution = async (issueId: string, reportedCost: string, remarks: string, imageBase64OrUrl: string) => {
    setSubmittingResolution(true);
    try {
      const response = await fetch(`/api/issues/${issueId}/submit-resolution`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedCost: reportedCost || "0",
          remarks: remarks || "",
          image: imageBase64OrUrl
        })
      });
      const result = await response.json();
      if (result.status === "success" && result.data) {
        setIssues(prev => prev.map(i => i.id === issueId ? result.data : i));
        setSelectedIssue(result.data);
        setIsSubmitResolutionOpen(false);
        setResolutionCost("");
        setResolutionRemarks("");
        setResolutionImage("");

        // Update sector resolved stats
        setSectors(prev => prev.map(s => {
          const matchLat = Math.abs(s.center[0] - result.data.latitude) < 0.1;
          const matchLng = Math.abs(s.center[1] - result.data.longitude) < 0.1;
          if (matchLat && matchLng) {
            return {
              ...s,
              resolvedIssues: Math.min(s.totalIssues, s.resolvedIssues + 1),
              stats: {
                ...s.stats,
                score: Math.min(100, s.stats.score + 5) // resolving increases health
              }
            };
          }
          return s;
        }));
      }
    } catch (err) {
      console.error("Failed to submit resolution evidence:", err);
    } finally {
      setSubmittingResolution(false);
    }
  };

  // 4b. Citizen Vote on Resolution
  const handleVoteResolution = async (issueId: string, vote: "fixed" | "not_fixed", username: string) => {
    setVotingInProgress(true);
    try {
      const response = await fetch(`/api/issues/${issueId}/vote-resolution`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote, user: username })
      });
      const result = await response.json();
      if (result.status === "success" && result.data) {
        setIssues(prev => prev.map(i => i.id === issueId ? result.data : i));
        setSelectedIssue(result.data);
        setCitizenVoteUser("");
        setCitizenVotingIssueId(null);

        // Award points for participating in the audit resolution confirmation loop (+10)
        awardReputationPoints(10);
      } else if (result.message) {
        alert(result.message);
      }
    } catch (err) {
      console.error("Failed to vote on resolution:", err);
    } finally {
      setVotingInProgress(false);
    }
  };

  // 5. Generate Escalation Campaign
  const handleGenerateCampaign = async (issue: Issue) => {
    setGeneratingCampaign(true);
    setCampaignKit(null);

    // Calculate days ago
    const daysAgo = Math.max(1, Math.floor((Date.now() - new Date(issue.createdAt).getTime()) / (1000 * 60 * 60 * 24)));

    try {
      const response = await fetch("/api/generate-complaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issue_type: issue.category,
          location: issue.location,
          days_ago: daysAgo,
          urgency_score: issue.urgencyScore,
          verifications: issue.verifications,
          authority: issue.suggestedAuthority
        })
      });

      const result = await response.json();
      if (result.status === "success" && result.data) {
        setCampaignKit(result.data);
      }
    } catch (err) {
      console.error("Campaign generation failed:", err);
    } finally {
      setGeneratingCampaign(false);
    }
  };

  // 6. Recalculate Sector Health & Warnings (Agentic Prediction)
  const handleRecalculateSectorWarnings = async (sector: Sector) => {
    setRecalculatingSectorId(sector.id);

    try {
      const response = await fetch("/api/predict-cluster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectorName: sector.name,
          issuesCount: sector.totalIssues,
          resolvedCount: sector.resolvedIssues,
          avgResolutionDays: sector.avgResolutionDays
        })
      });

      const result = await response.json();
      if (result.status === "success") {
        const newPredictions = result.data?.predictions || result.predictions;
        
        // Dynamic re-grade calculation based on new issues ratio
        const open = sector.totalIssues - sector.resolvedIssues;
        let score = Math.max(20, Math.min(100, Math.round(95 - (open * 4) - (sector.avgResolutionDays * 0.8))));
        let grade: "A" | "B" | "C" | "D" | "F" = "A";
        if (score < 60) grade = "F";
        else if (score < 70) grade = "D";
        else if (score < 80) grade = "C";
        else if (score < 90) grade = "B";

        setSectors(prev => prev.map(s => {
          if (s.id === sector.id) {
            return {
              ...s,
              predictions: newPredictions,
              stats: {
                ...s.stats,
                score,
                grade,
                summary: `Recalculated active ward safety coefficient. Open risk profiles are active across ${open} points.`
              }
            };
          }
          return s;
        }));

        // Keep selected state updated
        const updatedSector = sectors.find(s => s.id === sector.id);
        if (updatedSector) {
          setSelectedSector({
            ...updatedSector,
            predictions: newPredictions,
            stats: {
              ...updatedSector.stats,
              score,
              grade
            }
          });
        }
      }
    } catch (err) {
      console.error("Recalculation error:", err);
    } finally {
      setRecalculatingSectorId(null);
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // --- FILTER ISSUES FOR MAP GRID ---
  const filteredIssues = issues.filter(issue => {
    if (mapFilter === "all") return true;
    return issue.category === mapFilter;
  });

  return (
    <div className="w-full min-h-screen text-white bg-black">
      {/* 1. Header Navigation Bar */}
      <nav className="px-6 md:px-12 lg:px-16 pt-6">
        <div className="liquid-glass rounded-xl px-4 py-2 flex items-center justify-between border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold tracking-tighter">
              CP
            </div>
            <span className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
              CIVIC<span className="text-gray-400 font-light">PULSE</span>
              <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30 font-mono pulse-slow">
                NEIGHBORHOOD IMMUNE ENGINE
              </span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => { setActiveView("map"); setSelectedIssue(issues[0] || null); }}
              className={`text-sm tracking-wide font-medium transition-colors hover:text-white ${activeView === "map" ? "text-white" : "text-gray-400"}`}
            >
              Immune Grid Map
            </button>
            <button 
              onClick={() => {
                if (!isAuthenticated) {
                  onTriggerLogin?.();
                } else {
                  setActiveView("report");
                }
              }}
              className={`text-sm tracking-wide font-medium transition-colors hover:text-white ${activeView === "report" ? "text-white" : "text-gray-400"}`}
            >
              AI Smart Reporter
            </button>
            <button 
              onClick={() => setActiveView("oracle")}
              className={`text-sm tracking-wide font-medium transition-colors hover:text-white ${activeView === "oracle" ? "text-white" : "text-gray-400"}`}
            >
              AI Civic Oracle
            </button>
            <button 
              onClick={() => { setActiveView("sectors"); setSelectedSector(sectors[0]); }}
              className={`text-sm tracking-wide font-medium transition-colors hover:text-white ${activeView === "sectors" ? "text-white" : "text-gray-400"}`}
            >
              Locality Health Score
            </button>
            <button 
              onClick={() => setActiveView("reputation")}
              className={`text-sm tracking-wide font-medium transition-colors hover:text-white ${activeView === "reputation" ? "text-white" : "text-gray-400"}`}
            >
              Civic Leaderboard
            </button>
          </div>

          <button 
            onClick={() => {
              if (!isAuthenticated) {
                onTriggerLogin?.();
              } else {
                setActiveView("report");
              }
            }}
            className="bg-white text-black hover:bg-gray-200 text-sm font-medium px-5 py-1.5 rounded-lg transition-all shadow-lg hover:scale-105 duration-200 cursor-pointer"
          >
            Start a Report
          </button>
        </div>
      </nav>

      {/* 2. Main Workspace Layout */}
      <main className="px-6 md:px-12 lg:px-16 py-8">
        
        {/* VIEW 1: IMMUNE GRID MAP & DETAILED SIDEBAR */}
        {activeView === "map" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Interactive SVG Nerve Map Container (7 columns) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Map Toolbar / Filter */}
              <div className="liquid-glass border border-white/10 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
                  <span className="text-sm font-medium mr-2">Map Active Immune Sensors</span>
                  
                  {/* Map Type Switcher */}
                  <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/5 font-mono text-[10px]">
                    <button
                      onClick={() => setMapType("google")}
                      className={`px-2 py-1 rounded transition-all cursor-pointer font-semibold ${
                        mapType === "google"
                          ? "bg-emerald-500 text-black"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Live Google Map
                    </button>
                    <button
                      onClick={() => setMapType("schematic")}
                      className={`px-2 py-1 rounded transition-all cursor-pointer font-semibold ${
                        mapType === "schematic"
                          ? "bg-white/15 text-white"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Schematic Grid
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: "all", label: "All Layers" },
                    { id: "pothole", label: "Potholes" },
                    { id: "water_leakage", label: "Water Leaks" },
                    { id: "streetlight", label: "Streetlamps" },
                    { id: "waste", label: "Debris/Waste" }
                  ].map(filter => (
                    <button
                      key={filter.id}
                      onClick={() => setMapFilter(filter.id)}
                      className={`px-3 py-1 text-xs rounded-md transition-all cursor-pointer ${
                        mapFilter === filter.id 
                          ? "bg-white text-black font-semibold shadow" 
                          : "text-gray-400 hover:text-white border border-white/5 hover:border-white/10 bg-white/5"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid Canvas Map */}
              <div className="relative border border-white/10 rounded-2xl overflow-hidden aspect-[4/3] bg-gradient-to-b from-[#060606] to-[#010101] flex flex-col justify-between p-6 tactile-card animate-scale-up">
                
                {mapType === "google" ? (
                  hasValidGoogleMapsKey ? (
                    <div className="absolute inset-0 z-10 w-full h-full rounded-2xl overflow-hidden">
                      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                        <GoogleMap
                          defaultCenter={{ lat: 12.9345, lng: 77.6256 }} // Koramangala coordinate from active report
                          defaultZoom={11.5}
                          mapId="DEMO_MAP_ID"
                          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                          style={{ width: "100%", height: "100%" }}
                        >
                          {filteredIssues.map((issue) => {
                            let pinBg = "#ef4444"; // critical
                            if (issue.severity === "high") pinBg = "#f59e0b";
                            if (issue.severity === "medium") pinBg = "#3b82f6";
                            if (issue.severity === "low" || issue.status === "resolved") pinBg = "#10b981";

                            const isSelected = selectedIssue?.id === issue.id;

                            return (
                              <AdvancedMarker
                                key={issue.id}
                                position={{ lat: issue.latitude, lng: issue.longitude }}
                                onClick={() => setSelectedIssue(issue)}
                              >
                                <Pin
                                  background={pinBg}
                                  borderColor="#000"
                                  glyphColor="#fff"
                                  scale={isSelected ? 1.25 : 0.9}
                                />
                              </AdvancedMarker>
                            );
                          })}
                        </GoogleMap>
                      </APIProvider>
                    </div>
                  ) : (
                    <div className="absolute inset-0 z-10 w-full h-full flex flex-col items-center justify-center text-center p-6 bg-black/95 rounded-2xl overflow-hidden border border-white/5">
                      <MapPin className="w-10 h-10 text-emerald-400 animate-bounce mb-3" />
                      <h3 className="text-sm font-bold text-white mb-1">Google Maps API Key Required</h3>
                      <p className="text-[11px] text-gray-400 max-w-sm mb-4">
                        Unlock real satellite/streets mapping, active coordinates, and geolocated pins for live neighborhood reports.
                      </p>
                      
                      <div className="text-left bg-white/5 border border-white/10 rounded-lg p-3 text-[10px] text-gray-300 font-mono space-y-2 max-w-xs mb-4">
                        <p><strong>Step 1:</strong> <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline hover:text-emerald-300">Get an API Key</a></p>
                        <p><strong>Step 2:</strong> Paste key as a Secret in AI Studio:</p>
                        <ul className="list-disc pl-4 space-y-1 text-gray-400">
                          <li>Click <strong>Settings</strong> (⚙️ gear icon, top-right)</li>
                          <li>Go to <strong>Secrets</strong></li>
                          <li>Add <code>GOOGLE_MAPS_PLATFORM_KEY</code></li>
                        </ul>
                      </div>
                      
                      <p className="text-[9px] text-gray-500 font-mono">The application will refresh automatically once configured.</p>
                    </div>
                  )
                ) : (
                  <>
                    {/* SVG Digital Network Matrix Layer */}
                    <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                          </pattern>
                          <radialGradient id="radial" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                          </radialGradient>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#radial)" />
                        <rect width="100%" height="100%" fill="url(#grid)" />
                      </svg>
                    </div>

                    {/* SVG Biological District Paths */}
                    <div className="absolute inset-0 z-10 p-8 flex items-center justify-center pointer-events-auto">
                      <svg viewBox="0 0 800 600" className="w-full h-full">
                        {/* Outer Border Nodes */}
                        <path d="M 50,50 L 750,50 L 750,550 L 50,550 Z" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="5,5" />
                        
                        {/* Connecting Nerve Corridors */}
                        <line x1="200" y1="200" x2="600" y2="150" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
                        <line x1="600" y1="150" x2="650" y2="450" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
                        <line x1="650" y1="450" x2="250" y2="480" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
                        <line x1="250" y1="480" x2="200" y2="200" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
                        <line x1="200" y1="200" x2="250" y2="480" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                        <line x1="600" y1="150" x2="250" y2="480" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

                        {/* Sector Area 1: Whitefield (Top Right) */}
                        <g 
                          onClick={() => setSelectedSector(sectors[0])}
                          className="cursor-pointer group"
                        >
                          <polygon 
                            points="450,80 720,100 700,320 480,260" 
                            fill={selectedSector?.id === "sec-1" ? "rgba(239, 68, 68, 0.05)" : "transparent"} 
                            stroke={selectedSector?.id === "sec-1" ? "rgba(239, 68, 68, 0.3)" : "rgba(255, 255, 255, 0.1)"}
                            strokeWidth="1.5"
                            className="transition-all duration-300 group-hover:fill-white/5"
                          />
                          <text x="590" y="200" textAnchor="middle" fill="#9ca3af" fontSize="12" className="font-mono tracking-wider pointer-events-none group-hover:fill-white transition-colors uppercase">
                            Whitefield Zone
                          </text>
                        </g>

                        {/* Sector Area 2: Koramangala (Center-Left) */}
                        <g 
                          onClick={() => setSelectedSector(sectors[1])}
                          className="cursor-pointer group"
                        >
                          <polygon 
                            points="80,120 400,100 380,300 120,340" 
                            fill={selectedSector?.id === "sec-2" ? "rgba(245, 158, 11, 0.05)" : "transparent"} 
                            stroke={selectedSector?.id === "sec-2" ? "rgba(245, 158, 11, 0.3)" : "rgba(255, 255, 255, 0.1)"}
                            strokeWidth="1.5"
                            className="transition-all duration-300 group-hover:fill-white/5"
                          />
                          <text x="240" y="210" textAnchor="middle" fill="#9ca3af" fontSize="12" className="font-mono tracking-wider pointer-events-none group-hover:fill-white transition-colors uppercase">
                            Koramangala Zone
                          </text>
                        </g>

                        {/* Sector Area 3: Indiranagar (Center-Right) */}
                        <g 
                          onClick={() => setSelectedSector(sectors[2])}
                          className="cursor-pointer group"
                        >
                          <polygon 
                            points="350,280 720,300 620,530 400,450" 
                            fill={selectedSector?.id === "sec-3" ? "rgba(16, 185, 129, 0.05)" : "transparent"} 
                            stroke={selectedSector?.id === "sec-3" ? "rgba(16, 185, 129, 0.3)" : "rgba(255, 255, 255, 0.1)"}
                            strokeWidth="1.5"
                            className="transition-all duration-300 group-hover:fill-white/5"
                          />
                          <text x="520" y="410" textAnchor="middle" fill="#9ca3af" fontSize="12" className="font-mono tracking-wider pointer-events-none group-hover:fill-white transition-colors uppercase">
                            Indiranagar Zone
                          </text>
                        </g>

                        {/* Sector Area 4: HSR Layout (Bottom Left) */}
                        <g 
                          onClick={() => setSelectedSector(sectors[3])}
                          className="cursor-pointer group"
                        >
                          <polygon 
                            points="90,360 360,320 340,540 100,520" 
                            fill={selectedSector?.id === "sec-4" ? "rgba(59, 130, 246, 0.05)" : "transparent"} 
                            stroke={selectedSector?.id === "sec-4" ? "rgba(59, 130, 246, 0.3)" : "rgba(255, 255, 255, 0.1)"}
                            strokeWidth="1.5"
                            className="transition-all duration-300 group-hover:fill-white/5"
                          />
                          <text x="220" y="450" textAnchor="middle" fill="#9ca3af" fontSize="12" className="font-mono tracking-wider pointer-events-none group-hover:fill-white transition-colors uppercase">
                            HSR Layout Zone
                          </text>
                        </g>

                        {/* Live Glowing Warning Nodes */}
                        {filteredIssues.map((issue) => {
                          // Project Lat/Lng to local SVG coordinate space (approximate matching)
                          let cx = 400;
                          let cy = 300;

                          if (issue.location.toLowerCase().includes("koramangala")) {
                            cx = 240 + (issue.longitude - 77.6256) * 4500;
                            cy = 210 - (issue.latitude - 12.9345) * 4500;
                          } else if (issue.location.toLowerCase().includes("whitefield")) {
                            cx = 580 + (issue.longitude - 77.7472) * 4500;
                            cy = 140 - (issue.latitude - 12.9842) * 4500;
                          } else if (issue.location.toLowerCase().includes("indiranagar")) {
                            cx = 520 + (issue.longitude - 77.6389) * 4500;
                            cy = 410 - (issue.latitude - 12.9647) * 4500;
                          } else if (issue.location.toLowerCase().includes("hsr")) {
                            cx = 220 + (issue.longitude - 77.6432) * 4500;
                            cy = 450 - (issue.latitude - 12.9112) * 4500;
                          } else {
                            // random scatter inside border
                            cx = 300 + (parseInt(issue.id.replace(/\D/g, "") || "5") % 200);
                            cy = 250 + (parseInt(issue.id.replace(/\D/g, "") || "5") % 150);
                          }

                          // clamp inside reasonable bounds
                          cx = Math.max(100, Math.min(700, cx));
                          cy = Math.max(100, Math.min(500, cy));

                          const isSelected = selectedIssue?.id === issue.id;
                          
                          // Node color based on severity
                          let color = "#ef4444"; // critical
                          if (issue.severity === "high") color = "#f59e0b";
                          if (issue.severity === "medium") color = "#3b82f6";
                          if (issue.severity === "low") color = "#10b981";
                          if (issue.status === "resolved") color = "#10b981"; // green for resolved

                          return (
                            <g 
                              key={issue.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedIssue(issue);
                              }}
                              className="cursor-pointer group/node"
                            >
                              {/* Outer Pulsing Glow */}
                              {issue.status !== "resolved" && (
                                <circle 
                                  cx={cx} 
                                  cy={cy} 
                                  r={isSelected ? 16 : 10} 
                                  fill="none" 
                                  stroke={color} 
                                  strokeWidth="1.5" 
                                  className="animate-ping opacity-60" 
                                />
                              )}

                              {/* Inner Core Point */}
                              <circle 
                                cx={cx} 
                                cy={cy} 
                                r={isSelected ? 8 : 5} 
                                fill={color} 
                                stroke="#000"
                                strokeWidth={isSelected ? 2 : 1}
                                className="transition-all duration-300 group-hover/node:scale-125"
                              />

                              {/* Interactive Tooltip label on hover */}
                              <g className="opacity-0 group-hover/node:opacity-100 transition-opacity duration-200 pointer-events-none">
                                <rect 
                                  x={cx - 75} 
                                  y={cy - 40} 
                                  width="150" 
                                  height="26" 
                                  rx="4" 
                                  fill="black" 
                                  stroke="rgba(255,255,255,0.15)" 
                                />
                                <text 
                                  x={cx} 
                                  y={cy - 24} 
                                  textAnchor="middle" 
                                  fill="white" 
                                  fontSize="10" 
                                  fontFamily="monospace"
                                >
                                  {issue.title.slice(0, 18)}...
                                </text>
                              </g>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </>
                )}

                {/* Legend & Instructions overlay */}
                <div className="z-20 w-full flex items-center justify-between pointer-events-none">
                  <div className="flex gap-4 p-2.5 rounded-lg liquid-glass border border-white/5 text-[10px] text-gray-400 font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 block"></span>
                      Critical
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block"></span>
                      High
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 block"></span>
                      Medium
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
                      Resolved / Clean
                    </div>
                  </div>

                  <span className="text-[10px] text-gray-500 font-mono bg-black/40 px-2 py-1 rounded">
                    Click points to diagnose, sectors to analyze health
                  </span>
                </div>
              </div>
            </div>

            {/* Diagnostics Sidebar (5 columns) */}
            <div className="lg:col-span-5 space-y-6">
              
              {selectedIssue ? (
                <div className="liquid-glass border border-white/10 rounded-2xl overflow-hidden shadow-2xl tactile-card animate-scale-up">
                  
                  {/* Image cover with overlay tags */}
                  <div className="relative h-48 w-full bg-gray-900">
                    <img 
                      src={selectedIssue.imageUrl} 
                      alt={selectedIssue.title} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                    
                    {/* Top tags */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase tracking-wider ${
                        selectedIssue.severity === "critical" ? "bg-red-500 text-white" :
                        selectedIssue.severity === "high" ? "bg-amber-500 text-black" :
                        selectedIssue.severity === "medium" ? "bg-blue-500 text-white" : "bg-emerald-500 text-white"
                      }`}>
                        {selectedIssue.severity} urgency
                      </span>

                      <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-medium ${
                        selectedIssue.status === "resolved" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                        selectedIssue.status === "verified" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                        "bg-gray-500/20 text-gray-400 border border-white/10"
                      }`}>
                        {selectedIssue.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Bottom overlay: Urgency Gauge */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                      <div>
                        <p className="text-xs text-gray-300 font-mono flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {selectedIssue.location.split(',')[0]}
                        </p>
                        <h3 className="text-lg font-bold text-white tracking-tight">{selectedIssue.title}</h3>
                      </div>

                      <div className="flex flex-col items-center bg-black/80 px-2 py-1.5 rounded border border-white/10 font-mono">
                        <span className="text-xl font-bold text-red-400">{selectedIssue.urgencyScore}</span>
                        <span className="text-[8px] text-gray-500">URGENCY</span>
                      </div>
                    </div>
                  </div>

                  {/* Core Diagnostic Data */}
                  <div className="p-6 space-y-6">

                    {/* Copy Location Link */}
                    <div className="flex items-center justify-between bg-white/[0.03] border border-white/10 p-3 rounded-xl tactile-card-interactive animate-scale-up">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block">GRID COORDINATES</span>
                        <span className="text-xs font-mono text-emerald-400">
                          {selectedIssue.latitude.toFixed(6)}, {selectedIssue.longitude.toFixed(6)}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => {
                          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${selectedIssue.latitude},${selectedIssue.longitude}`;
                          const textToCopy = `Civic Issue: ${selectedIssue.title}\nCategory: ${selectedIssue.category.toUpperCase().replace('_', ' ')}\nLocation: ${selectedIssue.location}\nCoordinates: ${selectedIssue.latitude}, ${selectedIssue.longitude}\nStatus: ${selectedIssue.status}\nLocation Link: ${mapsUrl}`;
                          copyToClipboard(textToCopy, `location-${selectedIssue.id}`);
                        }}
                        className={`text-xs font-medium px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition-all duration-200 cursor-pointer ${
                          copiedField === `location-${selectedIssue.id}`
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-md shadow-emerald-950/20"
                            : "bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 active:scale-95"
                        }`}
                      >
                        {copiedField === `location-${selectedIssue.id}` ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                            Copied Link!
                          </>
                        ) : (
                          <>
                            <Link className="w-3.5 h-3.5" />
                            Copy Location Link
                          </>
                        )}
                      </button>
                    </div>
                    
                    {/* Description & AI predictions */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-mono tracking-wider text-gray-400 uppercase">AI Clinical Summary</h4>
                      <p className="text-sm text-gray-200 leading-relaxed font-light">{selectedIssue.description}</p>
                    </div>

                    {/* Bi-grid for metadata */}
                    <div className="grid grid-cols-2 gap-4 border-t border-b border-white/5 py-4">
                      <div>
                        <h5 className="text-[10px] font-mono text-gray-400 uppercase flex items-center gap-1 mb-1">
                          <Clock className="w-3 h-3 text-amber-500" /> Estimated Age
                        </h5>
                        <p className="text-sm font-semibold text-white">{selectedIssue.estimatedAge}</p>
                      </div>

                      <div>
                        <h5 className="text-[10px] font-mono text-gray-400 uppercase flex items-center gap-1 mb-1">
                          <ShieldAlert className="w-3 h-3 text-red-400" /> Decay Velocity
                        </h5>
                        <p className="text-sm font-semibold text-white uppercase">{selectedIssue.spreadRisk} spread risk</p>
                      </div>
                    </div>

                    {/* Spread prediction */}
                    <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-lg space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-mono text-red-400 font-bold">
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Predictive Decay Model
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed italic">
                        "{selectedIssue.spreadPrediction}"
                      </p>
                    </div>

                    {/* AI Decision Explainability Center */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-mono text-blue-400 font-semibold">
                          <BrainCircuit className="w-3.5 h-3.5 animate-pulse" />
                          AI Explainability Center
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAIExplanationId(showAIExplanationId === selectedIssue.id ? null : selectedIssue.id)}
                          className="text-[10px] font-mono text-blue-400 bg-blue-400/10 hover:bg-blue-400/20 px-2.5 py-1 rounded transition-all cursor-pointer active:scale-95"
                        >
                          {showAIExplanationId === selectedIssue.id ? "Hide Explanations" : "Explain AI Decision"}
                        </button>
                      </div>

                      {showAIExplanationId === selectedIssue.id && (
                        <div className="text-xs font-mono text-gray-400 space-y-3 pt-2 border-t border-white/5 animate-fadeIn">
                          <div className="flex justify-between items-center text-[10px] bg-blue-500/5 border border-blue-500/20 px-2 py-1.5 rounded text-blue-400">
                            <span>DECISION CONFIDENCE:</span>
                            <span className="font-bold font-mono">96.8%</span>
                          </div>

                          <div className="space-y-1 bg-white/[0.01] p-2.5 rounded border border-white/5">
                            <span className="text-[9px] text-gray-500 block uppercase font-bold tracking-wider">Identified Class Evidence</span>
                            <p className="text-[11px] text-gray-300 leading-relaxed font-light">
                              {selectedIssue.category === "pothole" ? "Exposed subgrade aggregates with sharp circular geometry. High dynamic swerving hazard for commuter safety." :
                               selectedIssue.category === "water_leakage" ? "Fractured municipal conduit discharge with micro-erosion of bordering pavement aggregate sub-base." :
                               selectedIssue.category === "streetlight" ? "Consecutive series illumination failures indicating localized phase trip or structural cabling fault." :
                               "Unsanctioned refuse accumulation with visible plastic container blockages and localized organic decay signs."}
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <span className="text-[9px] text-gray-500 block uppercase font-bold tracking-wider mb-1">Multi-Agent Orchestration Chain</span>
                            <div className="space-y-1 text-[11px]">
                              <div className="flex items-center justify-between text-gray-300">
                                <span className="flex items-center gap-1.5">
                                  <span className="text-emerald-400 font-bold">✔</span> VisionAgent
                                </span>
                                <span className="text-gray-500 text-[10px]">Classified: {selectedIssue.category.replace('_', ' ')}</span>
                              </div>
                              <div className="flex items-center justify-between text-gray-300">
                                <span className="flex items-center gap-1.5">
                                  <span className="text-emerald-400 font-bold">✔</span> PriorityAgent
                                </span>
                                <span className="text-gray-500 text-[10px]">Urgency Weighted: {selectedIssue.urgencyScore}/100</span>
                              </div>
                              <div className="flex items-center justify-between text-gray-300">
                                <span className="flex items-center gap-1.5">
                                  <span className="text-emerald-400 font-bold">✔</span> RoutingAgent
                                </span>
                                <span className="text-gray-500 text-[10px] truncate max-w-[150px]">{selectedIssue.suggestedAuthority.split(' ')[0]}...</span>
                              </div>
                              <div className="flex items-center justify-between text-gray-300">
                                <span className="flex items-center gap-1.5">
                                  <span className="text-emerald-400 font-bold">✔</span> DuplicateAgent
                                </span>
                                <span className="text-gray-500 text-[10px]">No matches (radius 500m)</span>
                              </div>
                              <div className="flex items-center justify-between text-gray-300">
                                <span className="flex items-center gap-1.5">
                                  <span className="text-emerald-400 font-bold">✔</span> RewardAgent
                                </span>
                                <span className="text-gray-500 text-[10px]">Reputation Potential +25 XP</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Community verification count */}
                    <div className="flex items-center justify-between bg-white/5 border border-white/5 px-4 py-3 rounded-xl">
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-white flex items-center gap-1">
                          <ThumbsUp className="w-4 h-4 text-emerald-400" />
                          {selectedIssue.verifications} Verifications
                        </div>
                        <p className="text-[10px] text-gray-400">By geolocated neighborhood residents</p>
                      </div>

                      {selectedIssue.status !== "resolved" && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleVerify(selectedIssue.id, "confirm")}
                            className="bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black transition-all px-3 py-1 text-xs rounded border border-emerald-500/30 cursor-pointer"
                          >
                            Verify (Is Real)
                          </button>
                          <button 
                            onClick={() => handleVerify(selectedIssue.id, "reject")}
                            className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-all px-3 py-1 text-xs rounded border border-red-500/20 cursor-pointer"
                          >
                            Flag Fake
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Action buttons, Resolution Evidence Forms & Citizen voting */}
                    <div className="space-y-4">
                      {selectedIssue.status !== "resolved" ? (
                        <>
                          {!isSubmitResolutionOpen ? (
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => handleGenerateCampaign(selectedIssue)}
                                className="w-full bg-white text-black hover:bg-gray-100 font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow cursor-pointer"
                              >
                                <Sparkles className="w-4 h-4 fill-black" />
                                Assemble 1-Tap Pressure Campaign
                              </button>

                              <button
                                onClick={() => {
                                  setIsSubmitResolutionOpen(true);
                                  // Set default simulated resolution image based on category
                                  let defaultAfter = "https://images.unsplash.com/photo-1599740831114-171d1f14769c?auto=format&fit=crop&w=800&q=80";
                                  if (selectedIssue.category === "water_leakage") {
                                    defaultAfter = "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80";
                                  } else if (selectedIssue.category === "streetlight") {
                                    defaultAfter = "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=800&q=80";
                                  } else if (selectedIssue.category === "waste") {
                                    defaultAfter = "https://images.unsplash.com/photo-1604147706283-d7119b5b822c?auto=format&fit=crop&w=800&q=80";
                                  }
                                  setResolutionImage(defaultAfter);
                                  // Pre-fill default remarks
                                  setResolutionRemarks(`Resolved successfully. Site cleared, repairs inspected and confirmed safe.`);
                                  // Pre-fill realistic default cost based on category
                                  let defaultCost = "45000";
                                  if (selectedIssue.category === "water_leakage") defaultCost = "110000";
                                  else if (selectedIssue.category === "streetlight") defaultCost = "12000";
                                  else if (selectedIssue.category === "waste") defaultCost = "25000";
                                  setResolutionCost(defaultCost);
                                }}
                                className="w-full border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-black font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                Submit Resolution (Authority)
                              </button>
                            </div>
                          ) : (
                            <div className="bg-emerald-500/[0.03] border border-emerald-500/20 p-4 rounded-xl space-y-4">
                              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                                  <Shield className="w-3.5 h-3.5" />
                                  Authority Closure Portal
                                </h4>
                                <button 
                                  onClick={() => setIsSubmitResolutionOpen(false)}
                                  className="text-[10px] text-gray-400 hover:text-white"
                                >
                                  Cancel
                                </button>
                              </div>

                              <div className="space-y-3 font-sans">
                                {/* Standard Cost Hint */}
                                <div className="bg-white/5 p-2 rounded border border-white/5 text-[10px] text-gray-400 leading-relaxed font-mono">
                                  <span className="text-emerald-400 font-bold block mb-0.5">💡 AI ESTIMATOR STANDARD GUIDELINE</span>
                                  Expected repair cost for <span className="text-white font-semibold capitalize">{selectedIssue.category.replace('_', ' ')}</span> is standardly <span className="text-white font-semibold">
                                    {selectedIssue.category === "water_leakage" ? "₹1,10,000" :
                                     selectedIssue.category === "streetlight" ? "₹12,000" :
                                     selectedIssue.category === "waste" ? "₹25,000" : "₹45,000"}
                                  </span>.
                                </div>

                                {/* Cost input */}
                                <div className="space-y-1">
                                  <label className="text-[10px] font-mono uppercase text-gray-400 block">Reported Repair Cost (₹)</label>
                                  <input 
                                    type="number"
                                    placeholder="Enter cost in INR (e.g. 48000)"
                                    value={resolutionCost}
                                    onChange={(e) => setResolutionCost(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                                  />
                                </div>

                                {/* Evidence photo preview & options */}
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-mono uppercase text-gray-400 block">Repair Evidence Photo</label>
                                  
                                  {/* side by side image preview if present */}
                                  {resolutionImage && (
                                    <div className="grid grid-cols-2 gap-2 bg-black/50 p-1.5 rounded-lg border border-white/5">
                                      <div className="relative">
                                        <span className="absolute top-1 left-1 text-[8px] font-mono bg-black/80 px-1 py-0.5 rounded text-gray-400">BEFORE</span>
                                        <img src={selectedIssue.imageUrl} className="h-16 w-full object-cover rounded" referrerPolicy="no-referrer" />
                                      </div>
                                      <div className="relative">
                                        <span className="absolute top-1 left-1 text-[8px] font-mono bg-emerald-500 px-1 py-0.5 rounded text-white">REPAIRED EVIDENCE</span>
                                        <img src={resolutionImage} className="h-16 w-full object-cover rounded" referrerPolicy="no-referrer" />
                                      </div>
                                    </div>
                                  )}

                                  {/* Custom base64 file upload or choose sample */}
                                  <div className="flex gap-2">
                                    <label className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-gray-300 text-center hover:bg-white/10 transition-colors cursor-pointer">
                                      Upload photo
                                      <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                              setResolutionImage(reader.result as string);
                                            };
                                            reader.readAsDataURL(file);
                                          }
                                        }}
                                      />
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        // generate slightly deviated high quality sample
                                        const samples = [
                                          "https://images.unsplash.com/photo-1599740831114-171d1f14769c?auto=format&fit=crop&w=800&q=80",
                                          "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80",
                                          "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=800&q=80",
                                          "https://images.unsplash.com/photo-1604147706283-d7119b5b822c?auto=format&fit=crop&w=800&q=80"
                                        ];
                                        const randomSample = samples[Math.floor(Math.random() * samples.length)];
                                        setResolutionImage(randomSample);
                                      }}
                                      className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-gray-300 hover:bg-white/10 transition-colors cursor-pointer"
                                    >
                                      Use AI Mock Evidence
                                    </button>
                                  </div>
                                </div>

                                {/* Remarks input */}
                                <div className="space-y-1">
                                  <label className="text-[10px] font-mono uppercase text-gray-400 block">Remarks & Materials Used</label>
                                  <textarea 
                                    rows={2}
                                    placeholder="Enter completion details, e.g. used cold mix asphalt..."
                                    value={resolutionRemarks}
                                    onChange={(e) => setResolutionRemarks(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans leading-relaxed"
                                  />
                                </div>

                                {/* Trigger AI Resolution audit button */}
                                <button
                                  type="button"
                                  disabled={submittingResolution || !resolutionImage}
                                  onClick={() => handleSubmitResolution(selectedIssue.id, resolutionCost, resolutionRemarks, resolutionImage)}
                                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                  {submittingResolution ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      AI Auditing Before/After Artifacts...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-3.5 h-3.5 text-black fill-black" />
                                      Submit Closure & Run AI Audit
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        /* RESOLVED STATE: DYNAMIC AI RESOLUTION AUDIT REPORT CARD */
                        <div className="bg-emerald-500/[0.02] border border-emerald-500/20 p-4 rounded-xl space-y-4 font-sans">
                          
                          {/* Heading */}
                          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            <div className="space-y-0.5">
                              <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                                AI Verification Audit
                              </h4>
                              <p className="text-[9px] text-gray-400 font-mono">CLOSED AT: {selectedIssue.resolutionDate || "TODAY"}</p>
                            </div>
                          </div>

                          {/* Audit score & workmanship */}
                          <div className="grid grid-cols-2 gap-3 bg-white/[0.02] border border-white/5 p-3 rounded-lg font-mono">
                            <div>
                              <span className="text-[9px] text-gray-500 block uppercase">RESOLUTION QUALITY</span>
                              <span className="text-lg font-extrabold text-emerald-400">
                                {selectedIssue.resolutionQualityScore || 90}%
                              </span>
                              <div className="h-1 w-full bg-white/10 rounded-full mt-1.5 overflow-hidden">
                                <div 
                                  className="h-full bg-emerald-500 rounded-full" 
                                  style={{ width: `${selectedIssue.resolutionQualityScore || 90}%` }}
                                />
                              </div>
                            </div>
                            <div>
                              <span className="text-[9px] text-gray-500 block uppercase">WORKMANSHIP</span>
                              <span className="text-xs font-bold text-white block mt-1 uppercase">
                                ★ {selectedIssue.workmanshipRating || "Good"}
                              </span>
                              <span className="text-[9px] text-gray-400 font-light block">
                                Risk: {selectedIssue.remainingRiskLevel || "Low"}
                              </span>
                            </div>
                          </div>

                          {/* Cost Comparison Audit */}
                          <div className="bg-black/40 border border-white/5 p-3 rounded-lg font-mono text-xs space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">Standard AI Estimate</span>
                              <span className="text-white">₹{(selectedIssue.estimatedResolutionCost || 35000).toLocaleString("en-IN")}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">Reported Closure Cost</span>
                              <span className="text-white">₹{(selectedIssue.reportedResolutionCost || 35000).toLocaleString("en-IN")}</span>
                            </div>
                            
                            {/* Deviation calculations */}
                            {selectedIssue.estimatedResolutionCost && selectedIssue.reportedResolutionCost && (
                              <div className="flex justify-between items-center border-t border-white/5 pt-2 text-[10px]">
                                <span className="text-gray-500">Financial Variance</span>
                                <span className={`font-semibold ${
                                  Math.abs(selectedIssue.reportedResolutionCost - selectedIssue.estimatedResolutionCost) / selectedIssue.estimatedResolutionCost > 0.15 
                                    ? "text-amber-400" 
                                    : "text-emerald-400"
                                }`}>
                                  {Math.round(Math.abs(selectedIssue.reportedResolutionCost - selectedIssue.estimatedResolutionCost) / selectedIssue.estimatedResolutionCost * 100)}% 
                                  {selectedIssue.reportedResolutionCost > selectedIssue.estimatedResolutionCost ? " Over" : " Under"}
                                </span>
                              </div>
                            )}

                            {/* Cost anomaly warning banner */}
                            {selectedIssue.estimatedResolutionCost && selectedIssue.reportedResolutionCost && 
                             Math.abs(selectedIssue.reportedResolutionCost - selectedIssue.estimatedResolutionCost) / selectedIssue.estimatedResolutionCost > 0.15 && (
                              <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded text-[10px] text-amber-300 font-sans leading-relaxed flex items-start gap-1.5 mt-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold block uppercase font-mono text-[9px] tracking-wide mb-0.5">⚠️ Cost Deviation Alert</span>
                                  The reported cost is significantly higher than standard civil engineering guidelines for this scale. Flagged for transparency auditing.
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Audit summary */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono text-gray-500 uppercase block">Gemini Audit Report:</span>
                            <p className="text-xs text-gray-300 leading-relaxed italic">
                              "{selectedIssue.auditSummary || "The asphalt patchwork shows satisfactory grade completion and bonding aggregate."}"
                            </p>
                          </div>

                          {/* Side-by-side Evidence Images */}
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-mono text-gray-500 uppercase block">Audit Image Verification Log:</span>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="relative">
                                <span className="absolute top-1 left-1 text-[8px] font-mono bg-black/80 px-1 py-0.5 rounded text-gray-400">BEFORE</span>
                                <img src={selectedIssue.imageUrl} className="h-20 w-full object-cover rounded border border-white/5" referrerPolicy="no-referrer" />
                              </div>
                              <div className="relative">
                                <span className="absolute top-1 left-1 text-[8px] font-mono bg-emerald-500 px-1 py-0.5 rounded text-white">REPAIRED</span>
                                <img src={selectedIssue.resolutionEvidenceImageUrl || "https://images.unsplash.com/photo-1599740831114-171d1f14769c?auto=format&fit=crop&w=800&q=80"} className="h-20 w-full object-cover rounded border border-white/5" referrerPolicy="no-referrer" />
                              </div>
                            </div>
                          </div>

                          {/* CITIZEN CONFIRMATION & DECENTRALIZED VOTING LOOP */}
                          <div className="bg-black/50 border border-white/5 rounded-xl p-3 space-y-3 font-sans">
                            <div className="space-y-1">
                              <h5 className="text-[10px] font-mono font-bold text-gray-300 uppercase flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-blue-400" />
                                Citizen Resolution Vote Loop
                              </h5>
                              <p className="text-[9px] text-gray-400 leading-relaxed">
                                Has this issue really been fixed properly? Nearby residents can vote to seal or reject.
                              </p>
                            </div>

                            {/* Votes Bar display */}
                            <div className="flex items-center gap-4 text-xs font-mono">
                              <div className="flex-1 space-y-1">
                                <div className="flex justify-between text-[10px]">
                                  <span className="text-emerald-400 font-bold">✅ FIXED ({selectedIssue.citizenVotesFixed || 0})</span>
                                  <span className="text-red-400 font-bold">❌ NOT FIXED ({selectedIssue.citizenVotesNotFixed || 0})</span>
                                </div>
                                <div className="h-2 w-full bg-white/10 rounded-full flex overflow-hidden">
                                  {((selectedIssue.citizenVotesFixed || 0) + (selectedIssue.citizenVotesNotFixed || 0)) === 0 ? (
                                    <div className="h-full w-full bg-white/10" />
                                  ) : (
                                    <>
                                      <div 
                                        className="h-full bg-emerald-500" 
                                        style={{ width: `${((selectedIssue.citizenVotesFixed || 0) / ((selectedIssue.citizenVotesFixed || 0) + (selectedIssue.citizenVotesNotFixed || 0))) * 100}%` }}
                                      />
                                      <div 
                                        className="h-full bg-red-500" 
                                        style={{ width: `${((selectedIssue.citizenVotesNotFixed || 0) / ((selectedIssue.citizenVotesFixed || 0) + (selectedIssue.citizenVotesNotFixed || 0))) * 100}%` }}
                                      />
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Citizen vote input form */}
                            {citizenVotingIssueId === selectedIssue.id ? (
                              <div className="space-y-2 border-t border-white/10 pt-2 bg-black/40 p-2 rounded">
                                <input 
                                  type="text"
                                  placeholder="Enter your name (e.g. Ramesh K.)"
                                  value={citizenVoteUser}
                                  onChange={(e) => setCitizenVoteUser(e.target.value)}
                                  className="w-full bg-black border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleVoteResolution(selectedIssue.id, "fixed", citizenVoteUser)}
                                    disabled={!citizenVoteUser || votingInProgress}
                                    className="flex-1 bg-emerald-500/20 hover:bg-emerald-500 hover:text-black border border-emerald-500/30 text-emerald-300 text-[10px] font-bold py-1.5 rounded transition-all cursor-pointer disabled:opacity-50"
                                  >
                                    ✅ Confirm Fix
                                  </button>
                                  <button
                                    onClick={() => handleVoteResolution(selectedIssue.id, "not_fixed", citizenVoteUser)}
                                    disabled={!citizenVoteUser || votingInProgress}
                                    className="flex-1 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 text-red-400 text-[10px] font-bold py-1.5 rounded transition-all cursor-pointer disabled:opacity-50"
                                  >
                                    ❌ Flag Not Fixed
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setCitizenVotingIssueId(selectedIssue.id);
                                  setCitizenVoteUser("");
                                }}
                                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[10px] text-gray-300 font-semibold py-1.5 transition-colors cursor-pointer"
                              >
                                Cast Verification Vote
                              </button>
                            )}

                            {/* Info foot note */}
                            <p className="text-[8px] font-mono text-gray-500 text-center leading-none">
                              If community registers 3+ votes &amp; &gt;50% claim 'Not Fixed', AI will auto-reopen.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Collective Memory Timeline */}

                    {/* Collective Memory Timeline */}
                    <div className="border-t border-white/5 pt-6 space-y-4">
                      <h4 className="text-xs font-mono tracking-wider text-gray-400 uppercase flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-gray-400" />
                        Location Collective Memory Timeline
                      </h4>
                      <div className="space-y-4 font-sans pl-2 border-l border-white/5">
                        {selectedIssue.timeline.map((event, idx) => (
                          <div key={idx} className="relative pl-4 space-y-1">
                            {/* timeline circle node */}
                            <div className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-white border border-black" />
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-white">{event.status}</span>
                              <span className="text-[10px] text-gray-500 font-mono">{event.date}</span>
                            </div>
                            <p className="text-xs text-gray-400">{event.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Discussion & Comments section */}
                    <div className="border-t border-white/5 pt-6 space-y-4">
                      <h4 className="text-xs font-mono tracking-wider text-gray-400 uppercase">
                        Discussion ({selectedIssue.comments.length})
                      </h4>
                      
                      <div className="space-y-3 max-h-48 overflow-y-auto">
                        {selectedIssue.comments.map((comment) => (
                          <div key={comment.id} className="bg-white/[0.02] border border-white/5 p-3 rounded-xl space-y-1 tactile-card-interactive animate-scale-up">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="text-white font-bold">{comment.user}</span>
                              <span className="text-gray-500">{comment.time}</span>
                            </div>
                            <p className="text-xs text-gray-300 font-light">{comment.text}</p>
                          </div>
                        ))}
                      </div>

                      {/* Comment Form */}
                      <div className="space-y-2">
                        <input 
                          type="text" 
                          placeholder="Your Name (Optional)"
                          value={commentAuthor}
                          onChange={(e) => setCommentAuthor(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 text-xs text-white rounded p-2 focus:outline-none focus:border-white/20"
                        />
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Add neighborhood testimony..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddComment(selectedIssue.id)}
                            className="flex-1 bg-white/5 border border-white/10 text-xs text-white rounded p-2 focus:outline-none focus:border-white/20"
                          />
                          <button 
                            onClick={() => handleAddComment(selectedIssue.id)}
                            className="bg-white/10 hover:bg-white/20 p-2 rounded cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="liquid-glass border border-white/5 rounded-2xl p-12 text-center text-gray-400 space-y-3">
                  <SlidersHorizontal className="w-8 h-8 mx-auto stroke-1" />
                  <p className="text-sm font-mono">No sensor is currently active on the grid.</p>
                </div>
              )}

            </div>

          </div>
        )}

        {/* VIEW 2: AI SMART VISION REPORTER (HIGH-END FLOW) */}
        {activeView === "report" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Form Upload & Configuration Panel (7 columns) */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="liquid-glass border border-white/10 p-6 rounded-2xl space-y-6 tactile-card animate-slide-up">
                
                <div className="space-y-1">
                  <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    AI Vision Damage Classifier
                  </h2>
                  <p className="text-sm text-gray-400">
                    Upload an on-site photo. CivicPulse extracts decay rates, estimates substrate age, and builds predictive maps.
                  </p>
                </div>

                {/* Preset quick buttons (Usability Gold) */}
                <div className="space-y-2">
                  <label className="text-xs font-mono text-gray-400 uppercase">Or select a diagnostic preset image to test instantly:</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => handlePresetSelect("pothole")}
                      className="group relative h-20 rounded-xl overflow-hidden border border-white/10 text-left transition-all hover:border-white/30 cursor-pointer"
                    >
                      <img src="https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=400&q=80" alt="pothole" className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/40 flex items-end p-2">
                        <span className="text-[10px] font-mono text-white font-semibold">Deep Pothole</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetSelect("water")}
                      className="group relative h-20 rounded-xl overflow-hidden border border-white/10 text-left transition-all hover:border-white/30 cursor-pointer"
                    >
                      <img src="https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&w=400&q=80" alt="water leak" className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/40 flex items-end p-2">
                        <span className="text-[10px] font-mono text-white font-semibold">Water Pipe Leak</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetSelect("streetlight")}
                      className="group relative h-20 rounded-xl overflow-hidden border border-white/10 text-left transition-all hover:border-white/30 cursor-pointer"
                    >
                      <img src="https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=400&q=80" alt="streetlight" className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/40 flex items-end p-2">
                        <span className="text-[10px] font-mono text-white font-semibold">Dark Streetlight</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Upload Area */}
                <div className="space-y-2">
                  <span className="text-xs font-mono text-gray-400 uppercase block">On-Site Evidence Photograph</span>
                  
                  {uploadedImage ? (
                    <div className="relative border border-white/10 rounded-xl overflow-hidden aspect-[16/9]">
                      <img src={uploadedImage} alt="Uploaded evidence" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button 
                        onClick={() => setUploadedImage(null)}
                        className="absolute top-3 right-3 bg-black/80 hover:bg-black p-1.5 rounded-full border border-white/25 text-white transition-all cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-3 left-3 bg-black/85 border border-white/10 px-2.5 py-1 rounded text-xs font-mono text-gray-300">
                        {imageFileName}
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-3 hover:border-white/20 transition-all bg-white/[0.01]">
                      <Upload className="w-8 h-8 text-gray-400 stroke-1" />
                      <div>
                        <label className="text-sm text-white font-semibold cursor-pointer underline hover:text-gray-300">
                          Upload Evidence Photo
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleFileChange} 
                            className="hidden" 
                          />
                        </label>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, or WEBP. Maximum 20MB.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Auto-Detect Location Action Banner */}
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block font-semibold">Smart Ward Routing Engine</span>
                      <p className="text-xs text-gray-400">Instantly acquire precise GPS coordinates to automatically determine your administrative ward &amp; address.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAutoDetectLocation}
                      disabled={isDetectingLocation}
                      className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap active:scale-95 disabled:opacity-50"
                    >
                      {isDetectingLocation ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                          Locating Device...
                        </>
                      ) : (
                        <>
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                          Track Location
                        </>
                      )}
                    </button>
                  </div>

                  {locationError && (
                    <div className="text-[10px] font-mono text-amber-400 bg-amber-400/5 border border-amber-400/20 px-3 py-2 rounded-lg flex items-center gap-2 animate-fadeIn">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                      {locationError}
                    </div>
                  )}

                  {detectedCoords && !isDetectingLocation && (
                    <div className="text-[10px] font-mono text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 px-3 py-2 rounded-lg flex justify-between items-center animate-fadeIn">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Coordinates Locked: Lat {detectedCoords.lat.toFixed(6)}, Lng {detectedCoords.lng.toFixed(6)}
                      </span>
                      <span className="bg-emerald-500/20 px-1.5 py-0.5 rounded text-[8px] uppercase font-bold tracking-widest text-emerald-300">
                        WARD LOCK SUCCESS
                      </span>
                    </div>
                  )}
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Select Sector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-gray-400 uppercase">Assigned Ward Sector</label>
                    <select
                      value={selectedFormSector}
                      onChange={(e) => setSelectedFormSector(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-sm text-white rounded-xl p-3 focus:outline-none focus:border-white/30"
                    >
                      {sectors.map(s => (
                        <option key={s.id} value={s.id} className="bg-black text-white">{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Geolocation label */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-gray-400 uppercase">Exact Geolocation</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 100 Feet Road intersection, Bengaluru"
                      value={manualLocation}
                      onChange={(e) => setManualLocation(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-sm text-white rounded-xl p-3 focus:outline-none focus:border-white/30"
                    />
                  </div>

                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-gray-400 uppercase flex items-center gap-1">
                    <Sparkle className="w-3 h-3 text-emerald-400" /> Custom Context / Text Hints (Optional)
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. Broken pipe is leaking since last night, causing puddle"
                    value={customTextHint}
                    onChange={(e) => setCustomTextHint(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-sm text-white rounded-xl p-3 focus:outline-none focus:border-white/30"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="button"
                  onClick={runAIVisionAnalysis}
                  disabled={!uploadedImage || analyzing}
                  className={`w-full font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow cursor-pointer ${
                    uploadedImage && !analyzing 
                      ? "bg-white text-black hover:bg-gray-100" 
                      : "bg-white/10 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {analyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Analyzing Damage Metrics...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Analyze with Gemini 3.5 Vision
                    </>
                  )}
                </button>

              </div>

              {/* Glowing animated loading logs if analyzing */}
              {analyzing && (
                <div className="liquid-glass border border-white/10 p-4 rounded-xl font-mono text-xs text-emerald-400 space-y-1 animate-pulse">
                  <p className="font-bold flex items-center gap-1.5 mb-2">
                    <Activity className="w-3.5 h-3.5" />
                    IMMUNE NODE ANALYSIS SYSTEM: ACTIVE
                  </p>
                  {analysisProgress.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="text-gray-600">[{idx + 1}]</span>
                      <p>{step}</p>
                    </div>
                  ))}
                  <div className="w-full h-1 bg-white/5 mt-4 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 animate-infinite" style={{ width: "60%" }}></div>
                  </div>
                </div>
              )}

            </div>

            {/* AI Result Card (5 columns) */}
            <div className="lg:col-span-5 space-y-6">
              
              {analysisResult ? (
                <div className="liquid-glass border border-white/10 rounded-2xl p-6 space-y-6 animate-scale-up tactile-card">
                  
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div>
                      <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-wider">Analysis complete</span>
                      <h3 className="text-lg font-bold text-white tracking-tight">AI Diagnostic Verdict</h3>
                    </div>
                    
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded text-xs font-mono text-emerald-400">
                      CONFIDENCE: 98%
                    </div>
                  </div>

                  {/* Title editor */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-gray-400 uppercase">Confirm Report Title</label>
                    <input 
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-sm font-semibold text-white rounded-xl p-3 focus:outline-none focus:border-white/30"
                    />
                  </div>

                  {/* Urgency Meter */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex flex-col justify-between tactile-card-interactive tactile-glow-red">
                      <span className="text-[10px] font-mono text-gray-400 uppercase">Civic Urgency Score</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-3xl font-extrabold text-red-400">{analysisResult.civic_urgency_score}</span>
                        <span className="text-sm text-gray-500 font-mono">/100</span>
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex flex-col justify-between tactile-card-interactive tactile-glow-blue">
                      <span className="text-[10px] font-mono text-gray-400 uppercase">Severity Classification</span>
                      <span className="text-lg font-bold text-white uppercase mt-1">
                        {analysisResult.severity}
                      </span>
                    </div>
                  </div>

                  {/* Descriptive breakdown */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <span className="text-xs font-mono text-gray-400 uppercase">AI Clinical Summary</span>
                      <textarea 
                        rows={3}
                        value={customDesc || analysisResult.ai_summary}
                        onChange={(e) => setCustomDesc(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-xs text-gray-200 rounded-xl p-3 focus:outline-none focus:border-white/30 font-light leading-relaxed"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-b border-white/5 py-4 font-mono text-xs">
                      <div>
                        <span className="text-gray-500 block uppercase">ESTIMATED AGE</span>
                        <span className="text-white font-bold text-sm">{analysisResult.estimated_age_days} Days</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block uppercase">SPREAD VELOCITY</span>
                        <span className="text-white font-bold text-sm uppercase">{analysisResult.spread_risk} Risk</span>
                      </div>
                    </div>

                    {/* Authority department prediction */}
                    <div className="bg-blue-500/5 border border-blue-500/10 p-3 rounded-lg space-y-1">
                      <span className="text-[10px] font-mono text-blue-400 font-bold uppercase flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        Target Resolving Authority
                      </span>
                      <p className="text-xs text-gray-200 font-semibold">{analysisResult.suggested_authority}</p>
                    </div>

                    {/* Decay vector prediction */}
                    <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-lg space-y-1">
                      <span className="text-[10px] font-mono text-red-400 font-bold uppercase flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Predictive Deterioration Risk
                      </span>
                      <p className="text-xs text-gray-300 italic">"{analysisResult.spread_prediction}"</p>
                    </div>

                    {/* HACKATHON SHOWCASE MODE: Coordinated Multi-Agent Pipeline */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-blue-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                          <BrainCircuit className="w-3.5 h-3.5 animate-pulse text-blue-400" />
                          Coordinated Multi-Agent Execution (Showcase)
                        </span>
                        <span className="text-[8px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded uppercase font-bold tracking-widest font-mono">
                          ACTIVE CHAIN
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs font-mono">
                        <div className="flex items-start gap-2.5 bg-white/[0.01] p-2 rounded border border-white/5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <div className="space-y-0.5">
                            <span className="text-white font-semibold block text-[11px]">VisionAgent [SUCCESS]</span>
                            <p className="text-[10px] text-gray-400 leading-normal">Multimodal image analysis completed with 98% confidence. Classified as `{analysisResult.issue_type}` damage type.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5 bg-white/[0.01] p-2 rounded border border-white/5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <div className="space-y-0.5">
                            <span className="text-white font-semibold block text-[11px]">DuplicateAgent [PASSED]</span>
                            <p className="text-[10px] text-gray-400 leading-normal">Cross-checked GPS coordinates {detectedCoords ? `(${detectedCoords.lat.toFixed(4)}, ${detectedCoords.lng.toFixed(4)})` : "coordinates"} against neighborhood database. Similarity 4% (Below duplicate threshhold).</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5 bg-white/[0.01] p-2 rounded border border-white/5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <div className="space-y-0.5">
                            <span className="text-white font-semibold block text-[11px]">PriorityAgent [CALCULATED]</span>
                            <p className="text-[10px] text-gray-400 leading-normal">Calculated urgency score of {analysisResult.civic_urgency_score}/100. High traffic swerving risk with exposed aggregate base.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5 bg-white/[0.01] p-2 rounded border border-white/5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <div className="space-y-0.5">
                            <span className="text-white font-semibold block text-[11px]">RoutingAgent [ROUTED]</span>
                            <p className="text-[10px] text-gray-400 leading-normal">Automatically delegated resolving authority to `{analysisResult.suggested_authority}` based on district boundaries.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5 bg-white/[0.01] p-2 rounded border border-white/5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <div className="space-y-0.5">
                            <span className="text-white font-semibold block text-[11px]">RewardAgent [QUEUED]</span>
                            <p className="text-[10px] text-gray-400 leading-normal">Submitting this verified analysis will reward your profile with +25 Civic Reputation Points (XP) and +10 Verification Points.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Deploy button */}
                  <button
                    onClick={handleDeployIssue}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow cursor-pointer"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    Deploy & Post to Immune Grid Map
                  </button>

                </div>
              ) : (
                <div className="liquid-glass border border-white/5 rounded-2xl p-12 text-center text-gray-400 space-y-3 h-full flex flex-col justify-center items-center">
                  <Eye className="w-10 h-10 text-gray-600 stroke-1" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">Diagnostic Output Pending</p>
                    <p className="text-xs text-gray-500 max-w-xs mx-auto">
                      Select a preset above or upload a photo, then click "Analyze" to extract predictive metrics.
                    </p>
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

        {/* VIEW 3: NEIGHBORHOOD HEALTH SCORE DASHBOARD */}
        {activeView === "sectors" && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Top overview card */}
            <div className="liquid-glass border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 tactile-card animate-slide-up">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                  <Activity className="w-6 h-6 text-emerald-400 animate-pulse" />
                  Ward Health Report Cards
                </h2>
                <p className="text-sm text-gray-300 max-w-xl font-light">
                  A comprehensive, data-driven index mapping active failures, municipal response delays, and resident safety profiles across Bangalore's major sectors.
                </p>
              </div>

              <div className="flex gap-4">
                <div className="bg-white/5 border border-white/5 p-4 rounded-xl min-w-32 text-center">
                  <span className="text-[10px] font-mono text-gray-500 uppercase block">Total Grid Points</span>
                  <span className="text-2xl font-extrabold text-white mt-1 block">{issues.length}</span>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl min-w-32 text-center">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase block">Resolved Safely</span>
                  <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">
                    {issues.filter(i => i.status === "resolved").length}
                  </span>
                </div>
              </div>
            </div>

            {/* Main two-column dashboard layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT COLUMN: Ward Report Cards & Predictions (7 of 12 columns) */}
              <div className="lg:col-span-7 space-y-8">
                
                <h3 className="text-xs font-mono tracking-wider text-gray-400 uppercase flex items-center gap-1">
                  <Map className="w-3.5 h-3.5" />
                  Local Neighborhood Wards
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {sectors.map((sector, sIdx) => {
                    const openCount = sector.totalIssues - sector.resolvedIssues;
                    
                    return (
                      <div 
                        key={sector.id}
                        onClick={() => setSelectedSector(sector)}
                        className={`liquid-glass border rounded-2xl p-5 tactile-card animate-slide-up cursor-pointer ${
                          selectedSector?.id === sector.id 
                            ? "border-emerald-500/40 shadow-xl bg-white/[0.04]" 
                            : "border-white/10 hover:border-white/20"
                        }`}
                        style={{ animationDelay: `${sIdx * 100}ms` }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> BBMP Ward
                            </span>
                            <h3 className="text-sm font-bold text-white tracking-tight">{sector.name}</h3>
                          </div>

                          <div className={`w-10 h-10 rounded-full flex flex-col items-center justify-center font-mono font-bold tracking-tighter ${
                            sector.stats.grade === "A" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" :
                            sector.stats.grade === "B" ? "bg-blue-500/20 text-blue-400 border border-blue-500/40" :
                            sector.stats.grade === "C" ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" :
                            "bg-red-500/20 text-red-400 border border-red-500/40"
                          }`}>
                            <span className="text-[8px] text-gray-500 leading-none">GRADE</span>
                            <span className="text-sm leading-none mt-0.5">{sector.stats.grade}</span>
                          </div>
                        </div>

                        {/* Bi-grid stats */}
                        <div className="grid grid-cols-3 gap-2 border-t border-b border-white/5 py-3 my-3 text-xs font-mono">
                          <div>
                            <span className="text-gray-500 block uppercase text-[8px]">HEALTH</span>
                            <span className="text-white font-bold text-xs">{sector.stats.score}%</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block uppercase text-[8px]">OPEN RISKS</span>
                            <span className="text-white font-bold text-xs">{openCount} active</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block uppercase text-[8px]">LATENCY</span>
                            <span className="text-white font-bold text-xs">{sector.avgResolutionDays} Days</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <span className="text-[9px] font-mono text-gray-500 uppercase block mb-1">Ward Diagnosis:</span>
                            <p className="text-[11px] text-gray-300 font-light leading-relaxed">
                              "{sector.stats.summary}"
                            </p>
                          </div>

                          {/* Recalculate button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRecalculateSectorWarnings(sector);
                            }}
                            disabled={recalculatingSectorId === sector.id}
                            className="text-[9px] font-mono bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {recalculatingSectorId === sector.id ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                Recalculate Warning
                              </>
                            )}
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>

                {/* Selected Sector Predictive Analysis Details */}
                {selectedSector && (
                  <div className="liquid-glass border border-white/10 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono text-amber-400 uppercase font-bold tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          PREDICTIVE DECAY FORECAST MODEL
                        </span>
                        <h3 className="text-md font-bold text-white tracking-tight">
                          Predictive Forecast: {selectedSector.name}
                        </h3>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                        selectedSector.stats.trend === "improving" ? "bg-emerald-500/20 text-emerald-400" :
                        selectedSector.stats.trend === "stable" ? "bg-blue-500/20 text-blue-400" :
                        "bg-red-500/20 text-red-400"
                      }`}>
                        TREND: {selectedSector.stats.trend.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedSector.predictions.map((pred, index) => {
                        const title = pred.split(":")[0];
                        const desc = pred.split(":")[1];

                        return (
                          <div 
                            key={index} 
                            className="bg-white/[0.01] border border-white/5 p-4 rounded-xl space-y-1.5 tactile-card-interactive tactile-glow-blue animate-scale-up"
                            style={{ animationDelay: `${index * 85}ms` }}
                          >
                            <span className="w-5 h-5 rounded bg-white/5 flex items-center justify-center text-[10px] font-mono font-bold text-white mb-1">
                              0{index + 1}
                            </span>
                            <h4 className="text-xs font-bold text-white tracking-tight">{title}</h4>
                            <p className="text-[11px] text-gray-400 leading-relaxed font-light">
                              {desc || pred}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Constituency Health Index & Authority Trust rankings (5 of 12 columns) */}
              <div className="lg:col-span-5 space-y-6">
                
                <h3 className="text-xs font-mono tracking-wider text-gray-400 uppercase flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" />
                  Constituency Health Ledger
                </h3>

                {/* Constituency Health Dashboard & Category distribution */}
                <div className="liquid-glass border border-white/10 rounded-2xl p-6 space-y-5 font-sans tactile-card animate-slide-up delay-100">
                  <div className="flex justify-between items-start border-b border-white/5 pb-3">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-mono text-emerald-400 uppercase font-bold tracking-wider">LOK SABHA DIVISION</span>
                      <h4 className="text-md font-bold text-white tracking-tight">Bangalore East (Mahadevapura)</h4>
                      <p className="text-[10px] text-gray-400 font-light">Consolidated health status of active municipal channels.</p>
                    </div>

                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-center">
                      <span className="text-[8px] font-mono text-gray-400 block uppercase">GRADE</span>
                      <span className="text-lg font-mono font-black text-emerald-400">
                        {(() => {
                          const avgScore = Math.round(sectors.reduce((sum, s) => sum + s.stats.score, 0) / sectors.length);
                          if (avgScore >= 85) return "A-";
                          if (avgScore >= 75) return "B+";
                          if (avgScore >= 65) return "B-";
                          return "C";
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Primary Grid Score */}
                  <div className="grid grid-cols-2 gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-xl font-mono text-xs">
                    <div>
                      <span className="text-gray-500 block uppercase text-[9px] mb-0.5">AVERAGE HEALTH INDEX</span>
                      <span className="text-2xl font-extrabold text-white">
                        {Math.round(sectors.reduce((sum, s) => sum + s.stats.score, 0) / sectors.length)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block uppercase text-[9px] mb-0.5">MEDIAN LATENCY</span>
                      <span className="text-2xl font-extrabold text-white">
                        {(sectors.reduce((sum, s) => sum + s.avgResolutionDays, 0) / sectors.length).toFixed(1)} Days
                      </span>
                    </div>
                  </div>

                  {/* Category Breakdown Bar graphs */}
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center text-[10px] font-mono text-gray-400">
                      <span>PROBLEM CATEGORY SPREAD</span>
                      <span className="font-semibold text-white">ACTIVE CASES</span>
                    </div>

                    <div className="space-y-2.5 font-mono text-xs">
                      {[
                        { label: "Road & Potholes", count: issues.filter(i => i.category === "pothole").length, color: "bg-amber-400" },
                        { label: "Water Leakage", count: issues.filter(i => i.category === "water_leakage").length, color: "bg-blue-400" },
                        { label: "Streetlights & Cables", count: issues.filter(i => i.category === "streetlight").length, color: "bg-teal-400" },
                        { label: "Waste Dumping", count: issues.filter(i => i.category === "waste").length, color: "bg-emerald-400" }
                      ].map((cat, idx) => {
                        const total = issues.length || 1;
                        const percentage = Math.round((cat.count / total) * 100);
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-gray-300 font-light">{cat.label}</span>
                              <span className="text-white font-bold">{cat.count} ({percentage}%)</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <div className={`h-full ${cat.color}`} style={{ width: `${percentage}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Gemini Advocate Insight */}
                  <div className="bg-emerald-500/[0.03] border border-emerald-500/15 p-4 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400">
                      <Sparkle className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                      GEMINI LIVE ADVOCATE SUMMARY
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed font-sans font-light">
                      "Monsoon humidity is causing micro-fractures in high-traffic commercial corridors of Koramangala. Meanwhile, Whitefield Tech Corridor experiences localized soft aggregate liquefaction warnings. Solid waste dumpings in HSR continue to cluster, requiring immediate civic enforcement."
                    </p>
                  </div>
                </div>

                {/* Authority Accountability & Trust Score Card */}
                <div className="liquid-glass border border-white/10 rounded-2xl p-6 space-y-4 font-sans tactile-card animate-slide-up delay-200">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                    <Building2 className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight">Authority Accountability Ledger</h4>
                      <p className="text-[10px] text-gray-400">Trust scores based on closure rate, speed, and citizen thumbs-up votes.</p>
                    </div>
                  </div>

                  <div className="space-y-4 font-mono text-xs">
                    {[
                      { 
                        name: "BBMP Road Infrastructure Dept", 
                        role: "Pothole Filling", 
                        cases: issues.filter(i => i.category === "pothole").length, 
                        trust: 84, 
                        color: "bg-amber-400" 
                      },
                      { 
                        name: "BBMP Solid Waste Management (SWM)", 
                        role: "Trash & Debris Clearing", 
                        cases: issues.filter(i => i.category === "waste").length, 
                        trust: 76, 
                        color: "bg-emerald-400" 
                      },
                      { 
                        name: "BWSSB Water Supply & Sewerage Board", 
                        role: "Pipe Line Repairs", 
                        cases: issues.filter(i => i.category === "water_leakage").length, 
                        trust: 58, 
                        color: "bg-blue-400" 
                      },
                      { 
                        name: "BESCOM Grid Electricity Dept", 
                        role: "Streetlights & Circuit Boards", 
                        cases: issues.filter(i => i.category === "streetlight").length, 
                        trust: 92, 
                        color: "bg-teal-400" 
                      }
                    ].map((auth, idx) => (
                      <div 
                        key={idx} 
                        className="bg-black/30 border border-white/5 p-3 rounded-xl space-y-2 tactile-card-interactive tactile-glow-blue animate-scale-up"
                        style={{ animationDelay: `${idx * 80}ms` }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-white block">{auth.name}</span>
                            <span className="text-[10px] text-gray-500">{auth.role} • {auth.cases} Assigned Cases</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[8px] text-gray-500 block uppercase">TRUST SCORE</span>
                            <span className={`text-xs font-bold ${auth.trust >= 85 ? "text-emerald-400" : auth.trust >= 70 ? "text-blue-400" : "text-amber-400"}`}>
                              {auth.trust}%
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full ${auth.color}`} style={{ width: `${auth.trust}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* VIEW 4: CIVIC REPUTATION & REWARDS LEDGER */}
        {activeView === "reputation" && (
          <div className="space-y-8 max-w-7xl mx-auto">
            
            {/* Top row - Bento Grid of Reputation Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {!isAuthenticated ? (
                /* Locked Profile & Impact Bento Card (covers span-9) */
                <div className="lg:col-span-9 bg-gradient-to-br from-emerald-500/[0.03] to-amber-500/[0.01] border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-6 min-h-[350px] tactile-card relative overflow-hidden animate-slide-up">
                  {/* Glowing ambient background grids */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05)_0%,transparent_70%)] pointer-events-none" />
                  
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center relative shadow-inner">
                    <Lock className="w-6 h-6 text-emerald-400 animate-pulse" />
                  </div>
                  
                  <div className="space-y-2 max-w-xl">
                    <h3 className="text-2xl font-bold text-white tracking-tight font-sans">
                      Secure Citizen Pass &amp; Ranking Locked
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed font-sans font-light">
                      Sign in or register a free citizen account to access your personalized **Reputation Pass**, track your real-time **Civic Trust Index**, and claim your verified spot in the Bengaluru community honor roll.
                    </p>
                  </div>
                  
                  <button 
                    onClick={onTriggerLogin}
                    className="bg-emerald-500 hover:bg-emerald-400 text-white font-medium text-sm px-8 py-3 rounded-xl transition-all shadow-lg hover:scale-[1.03] duration-200 cursor-pointer flex items-center gap-2"
                  >
                    <Unlock className="w-4 h-4" />
                    Unlock My Ranking &amp; Pass
                  </button>
                </div>
              ) : (
                <>
                  {/* Card 1: Citizen Profile (5 of 12) */}
                  <div className="lg:col-span-5 liquid-glass border border-white/10 rounded-2xl p-6 space-y-6 flex flex-col justify-between tactile-card animate-slide-up">
                    <div>
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5" /> CITIZEN REPUTATION PASS
                          </span>
                          <h3 className="text-xl font-bold text-white tracking-tight">Active Verifier Profile</h3>
                        </div>
                        <span className="text-[9px] font-mono bg-white/5 border border-white/10 px-2 py-1 rounded text-gray-400">
                          ID: {citizenProfile.id}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-6">
                        <img 
                          src={citizenProfile.avatarUrl} 
                          alt={citizenProfile.name} 
                          className="w-16 h-16 rounded-full border-2 border-emerald-500/30 object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="space-y-1">
                          <h4 className="text-lg font-bold text-white flex items-center gap-2">
                            {citizenProfile.name}
                            <span className="text-xs font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Award className="w-3 h-3 text-emerald-400" /> {citizenProfile.badge}
                            </span>
                          </h4>
                          <p className="text-xs text-gray-400 font-mono">Bengaluru East Division • Ward 84</p>
                        </div>
                      </div>

                      {/* Primary Scores Grid */}
                      <div className="grid grid-cols-2 gap-4 mt-6 bg-white/[0.01] border border-white/5 p-4 rounded-xl font-mono text-xs">
                        <div className="space-y-1">
                          <span className="text-gray-500 block uppercase text-[9px] tracking-wider">CIVIC TRUST SCORE</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-emerald-400">{citizenProfile.trustScore}</span>
                            <span className="text-[10px] text-gray-500">/ 100</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400" style={{ width: `${citizenProfile.trustScore}%` }} />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-gray-500 block uppercase text-[9px] tracking-wider">REPUTATION POINTS</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-white">{citizenProfile.points}</span>
                            <span className="text-[10px] text-gray-500">PTS</span>
                          </div>
                          <span className="text-[10px] text-gray-400 font-sans block">
                            {citizenProfile.points >= 1000 ? "Max Tier Achieved!" : `${1000 - citizenProfile.points} pts to Guardian level`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-4 text-center">
                      <p className="text-[8px] font-mono text-gray-500 leading-none">
                        Verified through automated timestamp, device telemetry &amp; community verification vectors.
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Impact Metrics Ledger (4 of 12) */}
                  <div className="lg:col-span-4 liquid-glass border border-white/10 rounded-2xl p-6 space-y-6 flex flex-col justify-between tactile-card animate-slide-up delay-100">
                    <div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5" /> VERIFIED IMPACT LEDGER
                        </span>
                        <h3 className="text-xl font-bold text-white tracking-tight">Community Impact Stats</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-6 font-mono text-xs">
                        <div className="bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                          <span className="text-gray-500 block uppercase text-[8px]">REPORTS SUBMITTED</span>
                          <span className="text-lg font-bold text-white">{citizenProfile.reportsSubmitted}</span>
                        </div>
                        <div className="bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                          <span className="text-gray-500 block uppercase text-[8px]">VERIFIED AS GENUINE</span>
                          <span className="text-lg font-bold text-emerald-400">{citizenProfile.verifiedReports}</span>
                        </div>
                        <div className="bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                          <span className="text-gray-500 block uppercase text-[8px]">FALSE REPORTS DETECTED</span>
                          <span className="text-lg font-bold text-red-400">{citizenProfile.falseReports}</span>
                        </div>
                        <div className="bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                          <span className="text-gray-500 block uppercase text-[8px]">CITIZENS RE-ROUTED</span>
                          <span className="text-lg font-bold text-blue-400">{citizenProfile.citizensHelped}</span>
                        </div>
                      </div>

                      <div className="mt-5 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400 font-mono text-[10px] uppercase">COMMUNITY FIDELITY RATIO</span>
                          <span className="font-mono font-bold text-white">{citizenProfile.impactScore}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400" style={{ width: `${citizenProfile.impactScore}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-500/[0.03] border border-amber-500/10 p-3 rounded-xl text-[11px] text-gray-400 leading-normal">
                      <span className="font-bold text-amber-400 flex items-center gap-1 mb-0.5 uppercase font-mono text-[9px]">
                        <ShieldAlert className="w-3 h-3" /> Anti-Farming Protocols Active
                      </span>
                      Submitting false or duplicate reports carries a <span className="text-red-400 font-semibold">-30 pts penalty</span> and instantly degrades your profile trust score.
                    </div>
                  </div>
                </>
              )}

              {/* Card 3: Citizen of the Month Presentation Card (3 of 12) */}
              <div className="lg:col-span-3 bg-gradient-to-b from-amber-500/10 to-amber-900/10 border border-amber-500/20 rounded-2xl p-6 flex flex-col justify-between space-y-6 tactile-card tactile-glow-amber animate-scale-up delay-200">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" /> CROWN CITIZEN
                    </span>
                    <span className="text-[8px] font-mono bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded">
                      JUNE 2026
                    </span>
                  </div>

                  <div className="mt-5 text-center space-y-3">
                    <div className="relative inline-block">
                      <img 
                        src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&amp;fit=crop&amp;w=300&amp;q=80" 
                        alt="Priya Sharma" 
                        className="w-16 h-16 rounded-full border-2 border-amber-400 mx-auto object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute -bottom-1.5 right-1/2 translate-x-1/2 text-[10px] bg-amber-400 text-black px-1.5 py-0.5 rounded-full font-mono font-black shadow-lg">
                        #1
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <h4 className="text-base font-bold text-white tracking-tight">Priya Sharma</h4>
                      <p className="text-[10px] font-mono text-amber-300">Whitefield Tech Corridor</p>
                    </div>
                  </div>

                  {/* Summary of achievements compiled dynamically by Gemini */}
                  <div className="mt-4 bg-white/[0.02] border border-white/5 p-3 rounded-lg text-center font-mono text-[10px] text-gray-300 leading-relaxed">
                    "Priya submitted 12 highly accurate subgrade asphalt deterioration logs &amp; verified 27 community risks. Her efforts triggered immediate BBMP remediation, helping over 8,500 commuters."
                  </div>
                </div>

                <button 
                  onClick={() => {
                    const shareText = "Proudly celebrating Priya Sharma, our Citizen of the Month on CivicPulse! 12 reports submitted, 27 verifications, and 1,140 impact points earned. Let's make Bengaluru better together!";
                    navigator.clipboard.writeText(shareText);
                    alert("Citizen of the Month share card text copied to clipboard! You can share it on WhatsApp/LinkedIn.");
                  }}
                  className="w-full text-center bg-amber-400 hover:bg-amber-300 text-black font-bold font-sans text-xs py-2 rounded-xl transition-all shadow-md hover:scale-[1.02] cursor-pointer"
                >
                  Share to LinkedIn / WhatsApp
                </button>
              </div>

            </div>

            {/* Bottom Row - Leaderboard and Points Scale split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Leaderboard Table (7 of 12) */}
              <div className="lg:col-span-7 liquid-glass border border-white/10 rounded-2xl p-6 space-y-4 tactile-card animate-slide-up">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <div className="space-y-0.5">
                    <h3 className="text-lg font-bold text-white tracking-tight">Constituency Honor Roll</h3>
                    <p className="text-xs text-gray-400">Top-ranking active verifiers in Bangalore East division.</p>
                  </div>
                  <span className="text-[9px] font-mono bg-white/5 text-gray-400 px-2.5 py-1 rounded border border-white/10">
                    WARD 84 LEDGER
                  </span>
                </div>

                <div className="space-y-3">
                  {[
                    { rank: 1, name: "Priya Sharma", points: 1140, trust: 98, badge: "Gold Civic Hero", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80", isMe: false },
                    { rank: 2, name: "Ravi Prasad", points: 980, trust: 94, badge: "Gold Civic Hero", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80", isMe: false },
                    { 
                      rank: 3, 
                      name: isAuthenticated ? (userName || "Jagannatha") : "Anonymous Citizen", 
                      points: isAuthenticated ? citizenProfile.points : 340, 
                      trust: isAuthenticated ? citizenProfile.trustScore : 87, 
                      badge: isAuthenticated ? citizenProfile.badge : "Citizen Verifier", 
                      avatar: isAuthenticated ? citizenProfile.avatarUrl : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80", 
                      isMe: isAuthenticated 
                    },
                    { rank: 4, name: "Arjun Gowda", points: 280, trust: 78, badge: "Silver Civic Hero", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80", isMe: false },
                    { rank: 5, name: "Sunita G.", points: 190, trust: 72, badge: "Bronze Civic Hero", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80", isMe: false }
                  ]
                  .sort((a, b) => b.points - a.points)
                  .map((user, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all tactile-card-interactive animate-scale-up ${
                        user.isMe 
                          ? "bg-emerald-500/5 border-emerald-500/20 shadow-md shadow-emerald-950/20 tactile-glow-emerald" 
                          : "bg-black/20 border-white/5 hover:border-white/10"
                      }`}
                      style={{ animationDelay: `${idx * 80}ms` }}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`w-6 text-center font-mono text-sm font-bold ${
                          idx === 0 ? "text-amber-400" :
                          idx === 1 ? "text-gray-300" :
                          idx === 2 ? "text-amber-600" :
                          "text-gray-500"
                        }`}>
                          #{idx + 1}
                        </span>

                        <img 
                          src={user.avatar} 
                          alt={user.name} 
                          className={`w-9 h-9 rounded-full object-cover border ${user.isMe ? "border-emerald-400/50" : "border-white/10"}`}
                          referrerPolicy="no-referrer"
                        />

                        <div>
                          <span className="text-sm font-bold text-white flex items-center gap-2">
                            {user.name} {user.isMe && <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-400 px-1.5 py-0.25 rounded">YOU</span>}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono block">
                            {user.badge}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 font-mono text-xs">
                        <div className="text-right">
                          <span className="text-[8px] text-gray-500 block">TRUST</span>
                          <span className="text-white font-bold">{user.trust}%</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] text-gray-500 block">POINTS</span>
                          <span className={`font-bold ${user.isMe ? "text-emerald-400" : "text-white"}`}>{user.points}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Points Scale (5 of 12) */}
              <div className="lg:col-span-5 liquid-glass border border-white/10 rounded-2xl p-6 space-y-5 flex flex-col justify-between tactile-card animate-slide-up delay-100">
                <div>
                  <div className="border-b border-white/5 pb-3">
                    <h3 className="text-lg font-bold text-white tracking-tight">Reputation Architecture</h3>
                    <p className="text-xs text-gray-400">Activities modeled to scale transparency and citizen audit precision.</p>
                  </div>

                  <div className="space-y-4 font-mono text-xs mt-4">
                    
                    {/* Reporting Activities */}
                    <div className="space-y-2">
                      <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider block">REPORTING ACTION SCALE</span>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { action: "Submit New Valid Civic Issue", points: "+20 PTS" },
                          { action: "Upload High Quality Photo Evidence", points: "+10 PTS" },
                          { action: "Community Verification Confirms", points: "+15 PTS" },
                          { action: "Municipal Authority Resolves", points: "+25 PTS" },
                          { action: "Citizen Resolution Verified", points: "+10 PTS" }
                        ].map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white/[0.01] border border-white/5 px-3 py-1.5 rounded-lg text-[11px]">
                            <span className="text-gray-300 font-light">{item.action}</span>
                            <span className="text-amber-400 font-bold">{item.points}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Community Engagement Activities */}
                    <div className="space-y-2 pt-1">
                      <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider block">COMMUNITY VERIFICATION SCALE</span>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { action: "Verify/Upvote Local Issue Near You", points: "+5 PTS" },
                          { action: "Submit Extra Image Evidence comment", points: "+10 PTS" },
                          { action: "Review & Vote on Resolution Audit", points: "+10 PTS" },
                          { action: "Post Helpful Descriptive Comment", points: "+3 PTS" }
                        ].map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white/[0.01] border border-white/5 px-3 py-1.5 rounded-lg text-[11px]">
                            <span className="text-gray-300 font-light">{item.action}</span>
                            <span className="text-blue-400 font-bold">{item.points}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>

                <div className="bg-emerald-500/[0.03] border border-emerald-500/10 p-3 rounded-xl flex items-center gap-3 mt-4">
                  <div className="w-8 h-8 rounded bg-emerald-500/15 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono text-emerald-400 font-bold block uppercase">VERIFIED FULL-LOOP BONUS</span>
                    <p className="text-[10px] text-gray-400 leading-snug">
                      When your submitted issue goes through the entire loop to a verified fix, gain an automatic <span className="text-emerald-400 font-semibold">+50 PTS</span> bonus!
                    </p>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* VIEW 5: Conversational AI Civic Oracle Agent */}
        {activeView === "oracle" && (
          <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
            <div className="liquid-glass border border-white/10 rounded-2xl p-6 space-y-6 tactile-card">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                    <BrainCircuit className="w-4 h-4 text-emerald-400 animate-pulse" /> MULTI-AGENT MUNICIPAL PLANNERS
                  </span>
                  <h3 className="text-2xl font-extrabold text-white tracking-tight">AI Civic Oracle</h3>
                  <p className="text-xs text-gray-400 font-sans">
                    Chat with our geolocated multi-agent orchestrator grounded in Bangalore's real-time civic health metrics.
                  </p>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-emerald-400">
                  <Sparkle className="w-3.5 h-3.5 animate-spin-slow" /> ACTIVE INTEGRATION: GEMINI 3.5
                </div>
              </div>

              {/* Chat messages viewport */}
              <div className="h-[400px] overflow-y-auto space-y-4 pr-2 border-b border-white/5 pb-6 flex flex-col scrollbar-thin">
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex flex-col max-w-[85%] ${
                      msg.role === "user" ? "self-end items-end" : "self-start items-start"
                    }`}
                  >
                    <span className="text-[9px] font-mono text-gray-500 uppercase mb-1 tracking-wider">
                      {msg.role === "user" ? "Citizen User" : "Civic AI Oracle"}
                    </span>
                    <div
                      className={`px-4 py-3 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                        msg.role === "user"
                          ? "bg-emerald-500 text-black font-semibold rounded-tr-none"
                          : "bg-white/5 border border-white/10 text-gray-200 rounded-tl-none font-mono"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isSendingChat && (
                  <div className="self-start flex flex-col max-w-[85%]">
                    <span className="text-[9px] font-mono text-gray-500 uppercase mb-1 tracking-wider">Civic AI Oracle</span>
                    <div className="bg-white/5 border border-white/10 text-gray-400 px-4 py-3 rounded-2xl rounded-tl-none text-xs font-mono flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      Orchestrating municipal databases & compiling responses...
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Prompt Suggesters */}
              <div className="space-y-2">
                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block">Suggested Queries</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Analyze the most critical issue reported in Koramangala and outline a campaign strategy.",
                    "Explain the difference between BESCOM, BWSSB, and BBMP jurisdictions.",
                    "What are the top three urban design suggestions for minimizing Whitefield's road failures?",
                    "How can a citizen maximize their Civic Reputation trust score quickly?"
                  ].map((query, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendChatMessage(query)}
                      disabled={isSendingChat}
                      className="px-3 py-1.5 text-[10px] text-gray-400 hover:text-white bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 rounded-lg transition-all text-left cursor-pointer font-mono"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Input form */}
              <div className="flex items-center gap-2.5 pt-2">
                <input
                  type="text"
                  placeholder="Ask the AI Oracle about local policies, issues, or departments..."
                  value={currentChatInput}
                  onChange={(e) => setCurrentChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
                  disabled={isSendingChat}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-all font-mono"
                />
                <button
                  onClick={() => handleSendChatMessage()}
                  disabled={isSendingChat || !currentChatInput.trim()}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/5 disabled:text-gray-500 text-black font-extrabold px-5 py-3 rounded-xl transition-all text-xs flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <span>Transmit</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* 3. 1-Tap Pressure Campaign Modal */}
      {selectedIssue && (generatingCampaign || campaignKit) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="liquid-glass border border-white/10 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                <div>
                  <h3 className="text-lg font-bold text-white">Gemini Autonomous Complaint Generator</h3>
                  <p className="text-xs text-gray-400">
                    Generating certified escalation campaigns backed by community signatures.
                  </p>
                </div>
              </div>

              <button 
                onClick={() => { setCampaignKit(null); setGeneratingCampaign(false); }}
                className="text-gray-400 hover:text-white border border-white/10 hover:border-white/20 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {generatingCampaign ? (
              <div className="p-12 text-center space-y-4">
                <RefreshCw className="w-8 h-8 mx-auto text-emerald-400 animate-spin" />
                <p className="text-sm font-mono text-emerald-400 animate-pulse">
                  Querying Gemini advocate models to build structural letter templates...
                </p>
              </div>
            ) : (
              campaignKit && (
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  
                  {/* Tabs for different campaign drafts */}
                  <div className="flex border-b border-white/5">
                    {[
                      { id: "letter", label: "Formal Petition", icon: FileText },
                      { id: "whatsapp", label: "WhatsApp Broadcast", icon: MessageSquare },
                      { id: "email", label: "Official Email", icon: Mail },
                      { id: "social", label: "Social Pressure Card", icon: Share2 }
                    ].map(tab => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setEscalationTab(tab.id as any)}
                          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                            escalationTab === tab.id 
                              ? "border-white text-white" 
                              : "border-transparent text-gray-500 hover:text-gray-300"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Tab contents */}
                  <div className="space-y-4">
                    
                    {escalationTab === "letter" && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                          <span>LETTER FORMAT: BENGALURU WARD OFFICER TEMPLATE</span>
                          <button
                            onClick={() => copyToClipboard(campaignKit.formalLetter, "formalLetter")}
                            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-3 py-1 rounded cursor-pointer transition-all"
                          >
                            {copiedField === "formalLetter" ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                Copy Letter
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="bg-white/[0.01] border border-white/5 p-4 rounded-xl text-xs font-light text-gray-200 leading-relaxed font-sans whitespace-pre-wrap max-h-96 overflow-y-auto">
                          {campaignKit.formalLetter}
                        </pre>
                      </div>
                    )}

                    {escalationTab === "whatsapp" && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                          <span>WHATSAPP MOBILIZATION TEXT</span>
                          <button
                            onClick={() => copyToClipboard(campaignKit.whatsappMessage, "whatsappMessage")}
                            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-3 py-1 rounded cursor-pointer transition-all"
                          >
                            {copiedField === "whatsappMessage" ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                Copy Broadcast Text
                              </>
                            )}
                          </button>
                        </div>
                        <div className="bg-emerald-950/20 border border-emerald-500/10 p-4 rounded-xl text-xs text-gray-200 leading-relaxed whitespace-pre-wrap font-mono">
                          {campaignKit.whatsappMessage}
                        </div>
                      </div>
                    )}

                    {escalationTab === "email" && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                          <span>EMAIL FIELD FORMAT</span>
                          <button
                            onClick={() => copyToClipboard(`${campaignKit.emailSubject}\n\n${campaignKit.emailBody}`, "email")}
                            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-3 py-1 rounded cursor-pointer transition-all"
                          >
                            {copiedField === "email" ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                Copy Subject & Body
                              </>
                            )}
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="bg-white/[0.01] border border-white/5 p-3 rounded-lg">
                            <span className="text-[10px] font-mono text-gray-500 block">SUBJECT:</span>
                            <span className="text-xs text-white font-bold">{campaignKit.emailSubject}</span>
                          </div>
                          <pre className="bg-white/[0.01] border border-white/5 p-4 rounded-xl text-xs font-light text-gray-300 leading-relaxed font-sans whitespace-pre-wrap">
                            {campaignKit.emailBody}
                          </pre>
                        </div>
                      </div>
                    )}

                    {escalationTab === "social" && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between text-xs font-mono text-gray-400">
                          <span>PUBLIC X/TWITTER CITIZEN DEMAND CARD</span>
                          <button
                            onClick={() => copyToClipboard(campaignKit.socialPost, "socialPost")}
                            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-3 py-1 rounded cursor-pointer transition-all"
                          >
                            {copiedField === "socialPost" ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                Copy Tweet
                              </>
                            )}
                          </button>
                        </div>
                        <div className="bg-blue-950/20 border border-blue-500/10 p-4 rounded-xl text-xs text-blue-200 leading-relaxed font-mono">
                          {campaignKit.socialPost}
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Disclaimer */}
                  <p className="text-[10px] text-gray-500 text-center font-mono leading-relaxed max-w-lg mx-auto">
                    Dispatched autonomously on behalf of verified local residents. Signatures collected dynamically via GPS tracking and upvoting matrices.
                  </p>

                </div>
              )
            )}

            {/* Modal Footer */}
            <div className="p-6 border-t border-white/5 flex justify-end">
              <button
                onClick={() => { setCampaignKit(null); setGeneratingCampaign(false); }}
                className="bg-white text-black hover:bg-gray-200 font-semibold px-6 py-2 rounded-xl text-sm transition-all cursor-pointer"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
