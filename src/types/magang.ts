export type ApplicationStatus =
  | "DRAFT"
  | "APPLIED"
  | "SCREENING"
  | "INTERVIEW"
  | "OFFER"
  | "REJECTED"
  | "GHOSTED";

export type WorkMode = "Remote" | "Hybrid" | "On-site";

export type MatchLevel = "Tinggi" | "Sedang" | "Rendah";

export interface JobListing {
  id: string;
  title: string;
  company_name: string;
  category: string;
  job_type?: string;
  candidate_required_location?: string;
  salary?: string;
  publication_date?: string;
  url?: string;
  tags: string[];
}

export interface MatchResult {
  score: number; // 0 - 100
  level: MatchLevel;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  message: string;
}

export interface Application {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  cvVersion?: string;
  appliedDate?: string;
  lastUpdatedAt: string;
  interviewAt?: string;
  expectedSalary?: number;
  workMode?: WorkMode;
  matchScore?: number;
  checklist?: ChecklistItem[];
  activityLog?: ActivityLogItem[];
  notes?: string;
  requiredSkills?: string[];
}