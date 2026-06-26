export interface Comment {
  id: string;
  user: string;
  text: string;
  time: string;
}

export interface TimelineEvent {
  date: string;
  status: string;
  description: string;
}

export interface Issue {
  id: string;
  title: string;
  category: "pothole" | "water_leakage" | "streetlight" | "waste" | "other";
  severity: "low" | "medium" | "high" | "critical";
  urgencyScore: number;
  location: string;
  latitude: number;
  longitude: number;
  description: string;
  imageUrl: string;
  createdAt: string;
  status: "reported" | "verified" | "resolved";
  estimatedAge: string;
  spreadPrediction: string;
  spreadRisk: "low" | "medium" | "high";
  suggestedAuthority: string;
  verifications: number;
  rejectedVotes: number;
  comments: Comment[];
  timeline: TimelineEvent[];
  
  // Advanced Resolution fields
  reportedResolutionCost?: number;
  estimatedResolutionCost?: number;
  resolutionEvidenceImageUrl?: string;
  resolutionRemarks?: string;
  resolutionQualityScore?: number;
  workmanshipRating?: string;
  remainingRiskLevel?: string;
  citizenVisibleImprovement?: string;
  auditSummary?: string;
  resolutionDate?: string;
  citizenVotesFixed?: number;
  citizenVotesNotFixed?: number;
  votedUsers?: string[];
}

export interface NeighborhoodStats {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  summary: string;
  topProblem: string;
  trend: "improving" | "stable" | "declining";
}

export interface Sector {
  id: string;
  name: string;
  center: [number, number]; // [latitude, longitude]
  totalIssues: number;
  resolvedIssues: number;
  avgResolutionDays: number;
  criticalUnresolved: number;
  stats: NeighborhoodStats;
  predictions: string[];
}

export interface ComplaintKit {
  formalLetter: string;
  whatsappMessage: string;
  emailSubject: string;
  emailBody: string;
  socialPost: string;
}

export interface CitizenProfile {
  id: string;
  name: string;
  avatarUrl?: string;
  trustScore: number; // 0 to 100 representing contribution verification reliability
  points: number;
  reportsSubmitted: number;
  verifiedReports: number;
  falseReports: number;
  badge: "Bronze Civic Hero" | "Silver Civic Hero" | "Gold Civic Hero" | "Guardian of Community";
  impactScore: number;
  citizensHelped: number;
}

export interface LeaderboardEntry {
  name: string;
  points: number;
  trustScore: number;
  badge: string;
  avatarUrl: string;
}

