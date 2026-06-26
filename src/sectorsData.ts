import { Sector } from "./types";

export const SECTORS_DATA: Sector[] = [
  {
    id: "sec-1",
    name: "Whitefield Tech Corridor",
    center: [12.9842, 77.7472],
    totalIssues: 18,
    resolvedIssues: 12,
    avgResolutionDays: 14.5,
    criticalUnresolved: 3,
    stats: {
      score: 58,
      grade: "D",
      summary: "Critical structural wear on service corridors with rising subgrade liquefaction warnings near high-traffic IT hubs.",
      topProblem: "Road Infrastructure & Pavements",
      trend: "declining"
    },
    predictions: [
      "Hydro-Fracture Risk: Active water leakage cluster near ITPL main gate is softening pavement aggregate. 2 secondary pothole collapses projected within 10 days.",
      "Vulnerability Index Spike: Average resolution latency has risen to 14.5 days, increasing pedestrian night safety risk by 25%.",
      "Sewer Siltation: Construction rubble runoff is clogging the secondary drainage channels, projecting heavy street water-logging in upcoming rainfall."
    ]
  },
  {
    id: "sec-2",
    name: "Koramangala Commercial Hub",
    center: [12.9345, 77.6256],
    totalIssues: 24,
    resolvedIssues: 19,
    avgResolutionDays: 8.2,
    criticalUnresolved: 1,
    stats: {
      score: 76,
      grade: "C",
      summary: "Moderate health. Rapid resident verification rates are driving faster municipal escalation, but drainage infrastructure is strained.",
      topProblem: "Drainage & Water Supply",
      trend: "stable"
    },
    predictions: [
      "Micro-Fracturing Chain: Pavement stress on 80 Feet Road projects crack propagation along the commercial strip.",
      "Grid Restoration Warning: Scattered streetlight outages suggest localized circuit overloading under monsoon humidity.",
      "Erosion Buffer: Substrate erosion near Sector 4 intersection is stable but remains under a 4-day warning threshold."
    ]
  },
  {
    id: "sec-3",
    name: "Indiranagar Residential Ring",
    center: [12.9647, 77.6389],
    totalIssues: 15,
    resolvedIssues: 13,
    avgResolutionDays: 5.1,
    criticalUnresolved: 0,
    stats: {
      score: 89,
      grade: "B",
      summary: "High municipal responsiveness. Most electrical and streetlight failures are resolved under 48 hours. Sidewalk access is healthy.",
      topProblem: "Streetlighting & Electrical",
      trend: "improving"
    },
    predictions: [
      "Optimal Safety Clearance: General night safety index remains high. Minor wiring adjustments predicted near 12th Main.",
      "Asphalt Health: Pavement stress is minimal. Zero significant sub-base failure indicators detected in the past 14 days."
    ]
  },
  {
    id: "sec-4",
    name: "HSR Layout Sector 3",
    center: [12.9112, 77.6432],
    totalIssues: 21,
    resolvedIssues: 17,
    avgResolutionDays: 9.8,
    criticalUnresolved: 2,
    stats: {
      score: 81,
      grade: "B",
      summary: "Good health. Solid waste management responses are active, but illegal debris dumping remains a persistent seasonal black spot.",
      topProblem: "Unsanctioned Dumping & Solid Waste",
      trend: "stable"
    },
    predictions: [
      "Debris Multiplication: Unresolved secondary concrete piles near Ring Road project a 30% increase in secondary waste accumulation.",
      "Blockage Potential: Pedestrian sidewalk detour patterns are pushing foot-traffic into heavy transit corridors."
    ]
  }
];
