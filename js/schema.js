/**
 * SPECTRUM TRACKER — Data Schemas & Seed Templates
 * Generic placeholder data for Categories, Events, Participating Schools, Point Rules, and Fest Settings.
 */

export const DEFAULT_FEST_SETTINGS = {
  festName: "SPECTRUM 2026",
  tagline: "Annual Inter-School Tech & Cultural Championship",
  masterPin: "2026",
  pointRules: {
    firstPlace: 10,
    secondPlace: 7,
    thirdPlace: 5,
    participation: 0
  }
};

export const DEFAULT_CATEGORIES = [
  { id: "tech", name: "Technical", icon: "💻", pin: "1001", color: "#38bdf8" },
  { id: "cultural", name: "Cultural & Arts", icon: "🎭", pin: "1002", color: "#f472b6" },
  { id: "literary", name: "Literary & Debate", icon: "📜", pin: "1003", color: "#fbbf24" },
  { id: "gaming", name: "Gaming & Esports", icon: "🎮", pin: "1004", color: "#4ade80" }
];

export const DEFAULT_SCHOOLS = [
  { id: "sch-1", name: "St. Xavier's Senior Secondary School", shortCode: "SXSS", city: "Mumbai", bonusPoints: 0, penaltyPoints: 0 },
  { id: "sch-2", name: "Delhi Public Global Academy", shortCode: "DPGA", city: "New Delhi", bonusPoints: 0, penaltyPoints: 0 },
  { id: "sch-3", name: "The Cathedral & John Connon School", shortCode: "CJCS", city: "Mumbai", bonusPoints: 0, penaltyPoints: 0 },
  { id: "sch-4", name: "National Public Academy", shortCode: "NPAC", city: "Bengaluru", bonusPoints: 0, penaltyPoints: 0 },
  { id: "sch-5", name: "Modern Vidya Niketan", shortCode: "MVNK", city: "Pune", bonusPoints: 0, penaltyPoints: 0 },
  { id: "sch-6", name: "Oakridge International Collegiate", shortCode: "OIC", city: "Hyderabad", bonusPoints: 0, penaltyPoints: 0 }
];

export const DEFAULT_EVENTS = [
  {
    id: "evt-101",
    name: "Code Sprint (Hackathon)",
    categoryId: "tech",
    format: "Team (3-4)",
    venue: "Turing Lab 1",
    status: "Live", // Upcoming | Live | Judging | Completed | Delayed
    progress: 70,
    roundInfo: "Round 2: Prototype Evaluation",
    startTime: "09:30 AM",
    closingTime: "01:30 PM",
    duration: "4 Hours",
    judges: ["Dr. K. Raman", "Prof. S. Iyer"],
    winners: {
      first: { schoolId: "sch-1", participant: "Binary Ninjas (Aarav, Maya, Kabir)" },
      second: { schoolId: "sch-2", participant: "CodeCrafters (Rohan, Ananya)" },
      third: { schoolId: "sch-4", participant: "DevDynasty (Vikram, Priya)" }
    }
  },
  {
    id: "evt-102",
    name: "RoboMaze Autonomous Racing",
    categoryId: "tech",
    format: "Team (2)",
    venue: "Main Indoor Arena",
    status: "Live",
    progress: 45,
    roundInfo: "Heats: Track Time Trials",
    startTime: "11:00 AM",
    closingTime: "02:00 PM",
    duration: "3 Hours",
    judges: ["Er. Rajesh Nair"],
    winners: {
      first: { schoolId: "", participant: "" },
      second: { schoolId: "", participant: "" },
      third: { schoolId: "", participant: "" }
    }
  },
  {
    id: "evt-103",
    name: "Battle of the Bands",
    categoryId: "cultural",
    format: "Team (5-8)",
    venue: "Open Air Amphitheatre",
    status: "Judging",
    progress: 90,
    roundInfo: "Final Performances Complete — Score Collation",
    startTime: "10:00 AM",
    closingTime: "01:00 PM",
    duration: "3 Hours",
    judges: ["Aditi Sengupta", "Farhan Sheikh (Music Director)"],
    winners: {
      first: { schoolId: "sch-3", participant: "The Crescendos" },
      second: { schoolId: "sch-1", participant: "Sonic Waves" },
      third: { schoolId: "sch-6", participant: "Octave Shift" }
    }
  },
  {
    id: "evt-104",
    name: "Contemporary Fusion Solo Dance",
    categoryId: "cultural",
    format: "Solo",
    venue: "Auditorium Main Stage",
    status: "Completed",
    progress: 100,
    roundInfo: "Winners Declared & Stage Clear",
    startTime: "09:00 AM",
    closingTime: "11:30 AM",
    duration: "2.5 Hours",
    judges: ["Meera Deshmukh (Sangeet Natak Akademi)"],
    winners: {
      first: { schoolId: "sch-2", participant: "Rhea Sen" },
      second: { schoolId: "sch-5", participant: "Tanvi Kulkarni" },
      third: { schoolId: "sch-3", participant: "Ishaan Mehta" }
    }
  },
  {
    id: "evt-105",
    name: "Parliamentary Cross-Examination Debate",
    categoryId: "literary",
    format: "Team (3)",
    venue: "Seminar Hall B",
    status: "Live",
    progress: 60,
    roundInfo: "Semi-Final 2: Motion Defended",
    startTime: "11:30 AM",
    closingTime: "02:30 PM",
    duration: "3 Hours",
    judges: ["Adv. Siddharth Kapoor", "Dr. Shalini Menon"],
    winners: {
      first: { schoolId: "", participant: "" },
      second: { schoolId: "", participant: "" },
      third: { schoolId: "", participant: "" }
    }
  },
  {
    id: "evt-106",
    name: "Extempore Slam & Poetry",
    categoryId: "literary",
    format: "Solo",
    venue: "Library Conference Room",
    status: "Upcoming",
    progress: 0,
    roundInfo: "Registration & Lot Draw at 01:45 PM",
    startTime: "02:00 PM",
    closingTime: "04:00 PM",
    duration: "2 Hours",
    judges: ["Prof. Neil Bhattacharya"],
    winners: {
      first: { schoolId: "", participant: "" },
      second: { schoolId: "", participant: "" },
      third: { schoolId: "", participant: "" }
    }
  },
  {
    id: "evt-107",
    name: "Valorant Tactical Invitational",
    categoryId: "gaming",
    format: "Team (5)",
    venue: "Esports Lounge (Server 1)",
    status: "Live",
    progress: 80,
    roundInfo: "Grand Finals — Map 3 (Decider)",
    startTime: "10:30 AM",
    closingTime: "03:00 PM",
    duration: "4.5 Hours",
    judges: ["Arjun Rao (Referee)"],
    winners: {
      first: { schoolId: "", participant: "" },
      second: { schoolId: "", participant: "" },
      third: { schoolId: "", participant: "" }
    }
  },
  {
    id: "evt-108",
    name: "Retro Arcade Speedrun (Pac-Man & Tetris)",
    categoryId: "gaming",
    format: "Solo",
    venue: "Esports Lounge (Booth B)",
    status: "Completed",
    progress: 100,
    roundInfo: "Leaderboard Finalized",
    startTime: "09:00 AM",
    closingTime: "11:00 AM",
    duration: "2 Hours",
    judges: ["Referee Team"],
    winners: {
      first: { schoolId: "sch-5", participant: "Karan Johar (Score: 1,420,500)" },
      second: { schoolId: "sch-4", participant: "Dev Patel" },
      third: { schoolId: "sch-1", participant: "Simran Kaur" }
    }
  }
];

/**
 * Creates an empty event object with sensible defaults
 */
export function createEmptyEvent(categoryId = "tech") {
  return {
    id: `evt-${Date.now()}`,
    name: "",
    categoryId,
    format: "Solo",
    venue: "",
    status: "Upcoming",
    progress: 0,
    roundInfo: "Scheduled",
    startTime: "10:00 AM",
    closingTime: "12:00 PM",
    duration: "2 Hours",
    judges: [],
    winners: {
      first: { schoolId: "", participant: "" },
      second: { schoolId: "", participant: "" },
      third: { schoolId: "", participant: "" }
    }
  };
}

/**
 * Suggests default progress percentage based on event status
 */
export function getSuggestedProgress(status) {
  switch (status) {
    case "Upcoming":
      return 0;
    case "Delayed":
      return 15;
    case "Live":
      return 50;
    case "Judging":
      return 90;
    case "Completed":
      return 100;
    default:
      return 0;
  }
}
