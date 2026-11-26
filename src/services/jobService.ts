import type { JobListing } from "../types/magang";

const REMOTIVE_URL =
  "https://remotive.com/api/remote-jobs?category=software-dev&limit=30";
const FALLBACK_URL = "/magang-fallback.json";

interface RemotiveApiResponse {
  jobs?: unknown;
}

export interface FetchJobsResult {
  jobs: JobListing[];
  source: "remotive" | "fallback";
}

function normalizeJobItem(raw: unknown, index: number): JobListing | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const item = raw as Record<string, unknown>;
  const title =
    typeof item.title === "string" && item.title.trim().length > 0
      ? item.title.trim()
      : null;
  const companyName =
    typeof item.company_name === "string" && item.company_name.trim().length > 0
      ? item.company_name.trim()
      : null;

  if (!title || !companyName) {
    return null;
  }

  const rawId = item.id;
  const id =
    typeof rawId === "string" || typeof rawId === "number"
      ? String(rawId)
      : `job-${index + 1}`;

  const category =
    typeof item.category === "string" && item.category.trim().length > 0
      ? item.category.trim()
      : "Software Development";

  const tags = Array.isArray(item.tags)
    ? item.tags.filter(
        (tag): tag is string =>
          typeof tag === "string" && tag.trim().length > 0,
      )
    : [];

  return {
    id,
    title,
    company_name: companyName,
    category,
    job_type: typeof item.job_type === "string" ? item.job_type : undefined,
    candidate_required_location:
      typeof item.candidate_required_location === "string"
        ? item.candidate_required_location
        : undefined,
    salary: typeof item.salary === "string" ? item.salary : undefined,
    publication_date:
      typeof item.publication_date === "string"
        ? item.publication_date
        : undefined,
    url: typeof item.url === "string" ? item.url : undefined,
    tags,
  };
}

function parseJobsArray(data: unknown): JobListing[] {
  const rawList = Array.isArray(data)
    ? data
    : data && typeof data === "object"
      ? (data as RemotiveApiResponse).jobs
      : null;

  if (!Array.isArray(rawList)) {
    return [];
  }

  return rawList
    .map((entry, idx) => normalizeJobItem(entry, idx))
    .filter((job): job is JobListing => job !== null);
}

async function fetchFallbackJobs(signal?: AbortSignal): Promise<JobListing[]> {
  const response = await fetch(FALLBACK_URL, { signal });
  if (!response.ok) {
    throw new Error(`Fallback HTTP ${response.status}`);
  }

  const json: unknown = await response.json();
  const parsed = parseJobsArray(json);
  if (parsed.length === 0) {
    throw new Error("Data fallback kosong atau tidak valid");
  }

  return parsed;
}

export async function fetchSoftwareDevJobs(
  signal?: AbortSignal,
): Promise<FetchJobsResult> {
  try {
    const response = await fetch(REMOTIVE_URL, { signal });
    if (!response.ok) {
      throw new Error(`Remotive API HTTP ${response.status}`);
    }

    const json: unknown = await response.json();
    const jobs = parseJobsArray(json);

    if (jobs.length === 0) {
      throw new Error("Daftar lowongan dari Remotive kosong");
    }

    return { jobs, source: "remotive" };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    try {
      const fallbackJobs = await fetchFallbackJobs(signal);
      return { jobs: fallbackJobs, source: "fallback" };
    } catch (fallbackError) {
      if (
        fallbackError instanceof DOMException &&
        fallbackError.name === "AbortError"
      ) {
        throw fallbackError;
      }

      const primaryMsg =
        error instanceof Error ? error.message : "Gagal mengambil data API";
      const fallbackMsg =
        fallbackError instanceof Error
          ? fallbackError.message
          : "Gagal memuat data fallback";

      throw new Error(`${primaryMsg}; ${fallbackMsg}`);
    }
  }
}