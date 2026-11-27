import type { Application, WorkMode } from "../types/magang";
import { isAtRiskOfGhosting } from "./ghosting";

const MODE_SCORE: Record<WorkMode, number> = {
  Remote: 100,
  Hybrid: 75,
  "On-site": 50,
};

const SENT_STATUSES: ReadonlyArray<string> = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "GHOSTED",
];

const RESPONDED_STATUSES: ReadonlyArray<string> = [
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
];

// ---------- Skill Match ----------
export interface SkillMatch {
  percent: number;
  matched: number;
  total: number;
}

export function getSkillMatch(
  required: string[],
  kaptenSkills: string[],
): SkillMatch {
  if (required.length === 0) {
    return { percent: 0, matched: 0, total: 0 };
  }

  const owned = new Set(
    kaptenSkills.map((skill) => skill.trim().toLowerCase()),
  );

  const matched = required.filter((skill) =>
    owned.has(skill.trim().toLowerCase()),
  ).length;

  return {
    percent: Math.round((matched / required.length) * 100),
    matched,
    total: required.length,
  };
}

// ---------- Statistik (derived state) ----------
export interface DashboardStats {
  total: number;
  sent: number;
  responded: number;
  interviewed: number;
  responseRate: number;
  interviewRate: number;
  ghosting: number;
  offers: number;
}

export function calculateStats(
  applications: Application[],
): DashboardStats {
  const sentList = applications.filter((app) =>
    SENT_STATUSES.includes(app.status),
  );

  const responded = sentList.filter((app) =>
    RESPONDED_STATUSES.includes(app.status),
  ).length;

  const interviewed = sentList.filter(
    (app) =>
      app.status === "INTERVIEW" ||
      app.status === "OFFER" ||
      Boolean(app.interviewAt),
  ).length;

  const sent = sentList.length;

  return {
    total: applications.length,
    sent,
    responded,
    interviewed,
    responseRate:
      sent > 0 ? Math.round((responded / sent) * 100) : 0,
    interviewRate:
      sent > 0 ? Math.round((interviewed / sent) * 100) : 0,
    ghosting: applications.filter((app) =>
      isAtRiskOfGhosting(app),
    ).length,
    offers: applications.filter((app) => app.status === "OFFER")
      .length,
  };
}

// ---------- Offer Comparator ----------
export interface OfferScore {
  application: Application;
  salary: number;
  modeScore: number;
  skill: SkillMatch;
  salaryPoints: number; // maks 50
  modePoints: number; // maks 25
  skillPoints: number; // maks 25
  total: number; // maks 100
}

export function scoreOffers(
  offers: Application[],
  kaptenSkills: string[],
): OfferScore[] {
  const maxSalary = Math.max(
    0,
    ...offers.map((offer) => offer.expectedSalary ?? 0),
  );

  return offers.map((application) => {
    const salary = application.expectedSalary ?? 0;

    // Normalisasi gaji terhadap gaji tertinggi (skala 0-100).
    const normalizedSalary =
      maxSalary > 0 ? (salary / maxSalary) * 100 : 0;

    const modeScore = application.workMode
      ? MODE_SCORE[application.workMode]
      : 0;

    const skill = getSkillMatch(
      application.requiredSkills ?? [],
      kaptenSkills,
    );

    const salaryPoints = normalizedSalary * 0.5;
    const modePoints = modeScore * 0.25;
    const skillPoints = skill.percent * 0.25;

    return {
      application,
      salary,
      modeScore,
      skill,
      salaryPoints,
      modePoints,
      skillPoints,
      total: salaryPoints + modePoints + skillPoints,
    };
  });
}

export function formatRupiah(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}