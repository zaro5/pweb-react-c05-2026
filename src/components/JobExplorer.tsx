import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebounce } from "../hooks/useDebounce";
import { fetchSoftwareDevJobs } from "../services/jobService";
import type {
  Application,
  JobListing,
  MatchLevel,
  MatchResult,
} from "../types/magang";

export const DEFAULT_KAPTEN_SKILLS: string[] = [
  "React",
  "TypeScript",
  "Tailwind CSS",
  "Node.js",
  "PostgreSQL",
  "Linux",
  "Networking",
  "Git",
];

type SortMode = "match-desc" | "match-asc" | "title-asc";

export interface JobExplorerProps {
  kaptenSkills: string[];
  onChangeKaptenSkills: (nextSkills: string[]) => void;
  applications: Application[];
  onSaveJobAsApplication: (job: JobListing, match: MatchResult) => void;
}

function normalizeSkill(value: string): string {
  return value.trim().toLowerCase();
}

export function calculateJobMatch(
  job: JobListing,
  skills: string[],
): MatchResult {
  const cleanedSkills = Array.from(
    new Set(
      skills
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    ),
  );

  if (cleanedSkills.length === 0) {
    return {
      score: 0,
      level: "Rendah",
      matchedSkills: [],
      missingSkills: [],
    };
  }

  const haystack = [
    job.title,
    job.category,
    job.job_type ?? "",
    job.candidate_required_location ?? "",
    ...job.tags,
  ]
    .join(" ")
    .toLowerCase();

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const skill of cleanedSkills) {
    const token = normalizeSkill(skill);
    if (token.length > 0 && haystack.includes(token)) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }

  const score = Math.round((matchedSkills.length / cleanedSkills.length) * 100);

  let level: MatchLevel = "Rendah";
  if (score >= 70) {
    level = "Tinggi";
  } else if (score >= 40) {
    level = "Sedang";
  }

  return {
    score,
    level,
    matchedSkills,
    missingSkills,
  };
}

function isJobAlreadySaved(job: JobListing, applications: Application[]): boolean {
  const targetCompany = normalizeSkill(job.company_name);
  const targetRole = normalizeSkill(job.title);

  return applications.some(
    (app) =>
      normalizeSkill(app.company) === targetCompany &&
      normalizeSkill(app.role) === targetRole,
  );
}

function getBadgeStyle(level: MatchLevel): {
  bg: string;
  color: string;
  border: string;
} {
  if (level === "Tinggi") {
    return {
      bg: "#dcfce7",
      color: "#166534",
      border: "#86efac",
    };
  }
  if (level === "Sedang") {
    return {
      bg: "#fef9c3",
      color: "#854d0e",
      border: "#fde047",
    };
  }
  return {
    bg: "#fee2e2",
    color: "#991b1b",
    border: "#fca5a5",
  };
}

export function JobExplorer({
  kaptenSkills,
  onChangeKaptenSkills,
  applications,
  onSaveJobAsApplication,
}: JobExplorerProps) {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [dataSource, setDataSource] = useState<"remotive" | "fallback" | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState<number>(0);

  const [newSkillInput, setNewSkillInput] = useState<string>("");
  const [skillError, setSkillError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearch = useDebounce<string>(searchQuery, 400);

  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("match-desc");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setIsLoading(true);
    setErrorMessage(null);

    fetchSoftwareDevJobs(controller.signal)
      .then((result) => {
        if (!active) return;
        setJobs(result.jobs);
        setDataSource(result.source);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const msg =
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat memuat data lowongan.";
        setErrorMessage(msg);
        setIsLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [retryNonce]);

  const handleRetry = useCallback(() => {
    setRetryNonce((prev) => prev + 1);
  }, []);

  const handleAddSkill = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = newSkillInput.trim();

      if (!trimmed) {
        setSkillError("Nama skill tidak boleh kosong.");
        return;
      }

      const exists = kaptenSkills.some(
        (item) => normalizeSkill(item) === normalizeSkill(trimmed),
      );
      if (exists) {
        setSkillError(`Skill "${trimmed}" sudah ada di profil.`);
        return;
      }

      onChangeKaptenSkills([...kaptenSkills, trimmed]);
      setNewSkillInput("");
      setSkillError(null);
    },
    [kaptenSkills, newSkillInput, onChangeKaptenSkills],
  );

  const handleRemoveSkill = useCallback(
    (skillToRemove: string) => {
      onChangeKaptenSkills(
        kaptenSkills.filter((skill) => skill !== skillToRemove),
      );
    },
    [kaptenSkills, onChangeKaptenSkills],
  );

  const categories = useMemo(() => {
    const unique = new Set<string>();
    for (const job of jobs) {
      if (job.category.trim().length > 0) {
        unique.add(job.category.trim());
      }
    }
    return ["ALL", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [jobs]);

  const rankedJobs = useMemo(() => {
    const normalizedQuery = debouncedSearch.trim().toLowerCase();

    const filtered = jobs.filter((job) => {
      const matchesCategory =
        selectedCategory === "ALL" || job.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!normalizedQuery) return true;

      const searchable = [
        job.title,
        job.company_name,
        job.category,
        job.candidate_required_location ?? "",
        ...job.tags,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });

    const withMatch = filtered.map((job) => ({
      job,
      match: calculateJobMatch(job, kaptenSkills),
      alreadySaved: isJobAlreadySaved(job, applications),
    }));

    return withMatch.sort((a, b) => {
      if (sortMode === "match-desc") {
        if (b.match.score !== a.match.score) {
          return b.match.score - a.match.score;
        }
        return a.job.title.localeCompare(b.job.title);
      }
      if (sortMode === "match-asc") {
        if (a.match.score !== b.match.score) {
          return a.match.score - b.match.score;
        }
        return a.job.title.localeCompare(b.job.title);
      }
      return a.job.title.localeCompare(b.job.title);
    });
  }, [
    jobs,
    debouncedSearch,
    selectedCategory,
    sortMode,
    kaptenSkills,
    applications,
  ]);

  return (
    <section aria-label="Fitur 1 - Profil Skill dan Eksplorasi Lowongan">
      <h2>Profil Skill Kapten</h2>
      <form onSubmit={handleAddSkill}>
        <label htmlFor="kapten-skill-input">Tambah Skill:</label>
        <input
          id="kapten-skill-input"
          type="text"
          value={newSkillInput}
          onChange={(e) => {
            setNewSkillInput(e.target.value);
            if (skillError) setSkillError(null);
          }}
          placeholder="Contoh: TypeScript, Docker, Wireshark"
        />
        <button type="submit">Tambah Skill</button>
      </form>
      {skillError && <p role="alert">{skillError}</p>}

      <div>
        {kaptenSkills.length === 0 ? (
          <p>Belum ada skill terdaftar. Tambahkan skill agar Match Score akurat.</p>
        ) : (
          kaptenSkills.map((skill) => (
            <span key={skill}>
              {skill}{" "}
              <button
                type="button"
                onClick={() => handleRemoveSkill(skill)}
                aria-label={`Hapus skill ${skill}`}
              >
                ×
              </button>{" "}
            </span>
          ))
        )}
      </div>

      <hr />

      <h2>Eksplorasi Lowongan</h2>
      <div>
        <label htmlFor="job-search-input">Cari Lowongan (debounce 400ms):</label>
        <input
          id="job-search-input"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Ketik judul, perusahaan, atau tag..."
        />

        <label htmlFor="job-category-select">Kategori:</label>
        <select
          id="job-category-select"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === "ALL" ? "Semua Kategori" : cat}
            </option>
          ))}
        </select>

        <label htmlFor="job-sort-select">Urutkan:</label>
        <select
          id="job-sort-select"
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
        >
          <option value="match-desc">Match Score Tertinggi</option>
          <option value="match-asc">Match Score Terendah</option>
          <option value="title-asc">Judul (A–Z)</option>
        </select>

        {dataSource && (
          <small>
            Sumber data: {dataSource === "remotive" ? "Remotive API" : "Fallback Lokal"}
          </small>
        )}
      </div>

      {isLoading && <p>Memuat daftar lowongan...</p>}

      {!isLoading && errorMessage && (
        <div role="alert">
          <p>Gagal memuat lowongan: {errorMessage}</p>
          <button type="button" onClick={handleRetry}>
            Retry
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && rankedJobs.length === 0 && (
        <p>
          Tidak ada lowongan yang cocok dengan pencarian atau filter saat ini.
        </p>
      )}

      {!isLoading && !errorMessage && rankedJobs.length > 0 && (
        <div>
          {rankedJobs.map(({ job, match, alreadySaved }) => {
            const badgeStyle = getBadgeStyle(match.level);

            return (
              <article key={job.id}>
                <h3>{job.title}</h3>
                <p>
                  <strong>{job.company_name}</strong> • {job.category}
                  {job.candidate_required_location
                    ? ` • ${job.candidate_required_location}`
                    : ""}
                </p>

                <span
                  style={{
                    backgroundColor: badgeStyle.bg,
                    color: badgeStyle.color,
                    border: `1px solid ${badgeStyle.border}`,
                    padding: "2px 8px",
                    borderRadius: "999px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                >
                  Match: {match.score}% ({match.level})
                </span>

                {match.matchedSkills.length > 0 && (
                  <p>
                    <small>Cocok: {match.matchedSkills.join(", ")}</small>
                  </p>
                )}

                {job.tags.length > 0 && (
                  <p>
                    <small>Tags: {job.tags.join(", ")}</small>
                  </p>
                )}

                <button
                  type="button"
                  disabled={alreadySaved}
                  onClick={() => onSaveJobAsApplication(job, match)}
                >
                  {alreadySaved ? "Sudah Tersimpan" : "Simpan ke Lamaran"}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}