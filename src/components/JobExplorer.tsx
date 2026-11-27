
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import "./JobExplorer.css";

import { useDebounce } from "../hooks/useDebounce";
import { fetchSoftwareDevJobs } from "../services/jobService";

import type {
  Application,
  JobListing,
  MatchLevel,
  MatchResult,
} from "../types/magang";

/* =========================================
   DEFAULT SKILLS
========================================= */

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
  onSaveJobAsApplication: (
    job: JobListing,
    match: MatchResult,
  ) => void;
}

/* =========================================
   HELPER FUNCTIONS
========================================= */

function normalizeSkill(value: string): string {
  return value.trim().toLowerCase();
}

/* =========================================
   SKILL MATCH ENGINE
========================================= */

export function calculateJobMatch(
  job: JobListing,
  skills: string[],
): MatchResult {
  const cleanedSkills = Array.from(
    new Set(
      skills
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 0),
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
    job.company_name,
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

    if (token && haystack.includes(token)) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }

  const score = Math.round(
    (matchedSkills.length / cleanedSkills.length) * 100,
  );

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

/* =========================================
   DUPLICATE CHECK
========================================= */

function isJobAlreadySaved(
  job: JobListing,
  applications: Application[],
): boolean {
  const targetCompany = normalizeSkill(job.company_name);
  const targetRole = normalizeSkill(job.title);

  return applications.some(
    (application) =>
      normalizeSkill(application.company) === targetCompany &&
      normalizeSkill(application.role) === targetRole,
  );
}

/* =========================================
   MATCH BADGE
========================================= */

function getMatchClass(level: MatchLevel): string {
  switch (level) {
    case "Tinggi":
      return "match-high";

    case "Sedang":
      return "match-medium";

    default:
      return "match-low";
  }
}

/* =========================================
   MAIN COMPONENT
========================================= */

export function JobExplorer({
  kaptenSkills,
  onChangeKaptenSkills,
  applications,
  onSaveJobAsApplication,
}: JobExplorerProps) {
  /* JOB DATA */

  const [jobs, setJobs] = useState<JobListing[]>([]);

  const [dataSource, setDataSource] = useState<
    "remotive" | "fallback" | null
  >(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  /* SKILL PROFILE */

  const [newSkillInput, setNewSkillInput] = useState("");
  const [skillError, setSkillError] = useState<string | null>(null);

  /* SEARCH AND FILTER */

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce<string>(searchQuery, 400);

  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const [sortMode, setSortMode] = useState<SortMode>("match-desc");

  /* =========================================
     FETCH JOB DATA
  ========================================= */

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
      .catch((error: unknown) => {
        if (!active) return;

        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat lowongan.";

        setErrorMessage(message);
        setIsLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [retryNonce]);

  /* =========================================
     RETRY FETCH
  ========================================= */

  const handleRetry = useCallback(() => {
    setRetryNonce((previous) => previous + 1);
  }, []);

  /* =========================================
     ADD SKILL
  ========================================= */

  const handleAddSkill = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmed = newSkillInput.trim();

      if (!trimmed) {
        setSkillError("Nama skill tidak boleh kosong.");
        return;
      }

      const exists = kaptenSkills.some(
        (skill) => normalizeSkill(skill) === normalizeSkill(trimmed),
      );

      if (exists) {
        setSkillError(`Skill "${trimmed}" sudah terdaftar.`);
        return;
      }

      onChangeKaptenSkills([...kaptenSkills, trimmed]);

      setNewSkillInput("");
      setSkillError(null);
    },
    [kaptenSkills, newSkillInput, onChangeKaptenSkills],
  );

  /* =========================================
     REMOVE SKILL
  ========================================= */

  const handleRemoveSkill = useCallback(
    (skillToRemove: string) => {
      onChangeKaptenSkills(
        kaptenSkills.filter((skill) => skill !== skillToRemove),
      );
    },
    [kaptenSkills, onChangeKaptenSkills],
  );

  /* =========================================
     CATEGORY OPTIONS
  ========================================= */

  const categories = useMemo(() => {
    const unique = new Set<string>();

    for (const job of jobs) {
      if (job.category.trim()) {
        unique.add(job.category.trim());
      }
    }

    return [
      "ALL",
      ...Array.from(unique).sort((a, b) => a.localeCompare(b)),
    ];
  }, [jobs]);

  /* =========================================
     FILTER AND RANK JOBS
  ========================================= */

  const rankedJobs = useMemo(() => {
    const normalizedQuery = debouncedSearch.trim().toLowerCase();

    const filtered = jobs.filter((job) => {
      const matchesCategory =
        selectedCategory === "ALL" ||
        job.category === selectedCategory;

      if (!matchesCategory) return false;

      if (!normalizedQuery) return true;

      const searchable = [
        job.title,
        job.company_name,
        job.category,
        job.job_type ?? "",
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
        return (
          b.match.score - a.match.score ||
          a.job.title.localeCompare(b.job.title)
        );
      }

      if (sortMode === "match-asc") {
        return (
          a.match.score - b.match.score ||
          a.job.title.localeCompare(b.job.title)
        );
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

  /* =========================================
     RENDER
  ========================================= */

  return (
    <section
      className="job-explorer"
      aria-label="Profil Skill dan Eksplorasi Lowongan"
    >
      {/* PAGE HEADER */}

      <header className="explorer-heading">
        <div className="explorer-heading-content">
          <span className="explorer-eyebrow">
            CAREER OPPORTUNITIES
          </span>

          <h1>Eksplorasi Lowongan</h1>

          <p>
            Temukan peluang magang yang sesuai dengan kemampuan
            dan potensi Kapten.
          </p>
        </div>

        <div
          className={`source-pill ${
            dataSource === "remotive"
              ? "source-live"
              : dataSource === "fallback"
                ? "source-fallback"
                : "source-pending"
          }`}
        >
          <span className="source-dot" />

          {dataSource === "remotive"
            ? "Remotive API"
            : dataSource === "fallback"
              ? "Fallback Lokal"
              : "Memuat sumber data"}
        </div>
      </header>

      {/* SKILL PROFILE */}

      <section className="skills-panel">
        <div className="section-heading">
          <div>
            <span className="explorer-eyebrow">
              YOUR PROFILE
            </span>

            <h2>Profil Skill Kapten</h2>

            <p>
              Tambahkan kemampuan yang kamu miliki untuk
              menghitung tingkat kecocokan lowongan.
            </p>
          </div>

          <span className="skill-count">
            {kaptenSkills.length} Skills
          </span>
        </div>

        <form className="skill-form" onSubmit={handleAddSkill}>
          <input
            id="kapten-skill-input"
            type="text"
            value={newSkillInput}
            onChange={(event) => {
              setNewSkillInput(event.target.value);

              if (skillError) {
                setSkillError(null);
              }
            }}
            placeholder="Contoh: TypeScript, Docker, Python..."
          />

          <button type="submit" className="primary-button">
            + Tambah Skill
          </button>
        </form>

        {skillError && (
          <p className="inline-error" role="alert">
            {skillError}
          </p>
        )}

        <div className="skill-chips">
          {kaptenSkills.length === 0 ? (
            <p className="empty-inline">
              Belum ada skill. Silakan tambahkan skill terlebih dahulu.
            </p>
          ) : (
            kaptenSkills.map((skill) => (
              <span className="skill-chip" key={skill}>
                {skill}

                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  aria-label={`Hapus skill ${skill}`}
                  title={`Hapus ${skill}`}
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
      </section>

      {/* JOB EXPLORER */}

      <section className="explorer-results">
        <div className="section-heading results-heading">
          <div>
            <span className="explorer-eyebrow">
              JOB DISCOVERY
            </span>

            <h2>Daftar Lowongan</h2>

            <p>
              Bandingkan peluang kerja berdasarkan kecocokan skill.
            </p>
          </div>

          <span className="results-count">
            {rankedJobs.length} lowongan ditemukan
          </span>
        </div>

        {/* SEARCH AND FILTER */}

        <div className="filter-panel">
          <div className="filter-field search-field">
            <label htmlFor="job-search-input">
              Cari Lowongan
            </label>

            <input
              id="job-search-input"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Judul, perusahaan, atau skill..."
            />

            <small>Debounce pencarian: 400 ms</small>
          </div>

          <div className="filter-field">
            <label htmlFor="job-category-select">
              Kategori
            </label>

            <select
              id="job-category-select"
              value={selectedCategory}
              onChange={(event) =>
                setSelectedCategory(event.target.value)
              }
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === "ALL"
                    ? "Semua Kategori"
                    : category}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label htmlFor="job-sort-select">
              Urutkan
            </label>

            <select
              id="job-sort-select"
              value={sortMode}
              onChange={(event) =>
                setSortMode(event.target.value as SortMode)
              }
            >
              <option value="match-desc">
                Match Score Tertinggi
              </option>

              <option value="match-asc">
                Match Score Terendah
              </option>

              <option value="title-asc">
                Judul A–Z
              </option>
            </select>
          </div>
        </div>

        {/* LOADING */}

        {isLoading && (
          <div className="explorer-message">
            <div className="loading-spinner" />

            <h3>Memuat daftar lowongan</h3>

            <p>
              Sedang mengambil peluang kerja untuk Kapten...
            </p>
          </div>
        )}

        {/* ERROR */}

        {!isLoading && errorMessage && (
          <div className="explorer-message error-message" role="alert">
            <div className="message-icon">!</div>

            <h3>Gagal memuat lowongan</h3>

            <p>{errorMessage}</p>

            <button
              type="button"
              className="primary-button"
              onClick={handleRetry}
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* EMPTY RESULT */}

        {!isLoading &&
          !errorMessage &&
          rankedJobs.length === 0 && (
            <div className="explorer-message">
              <div className="message-icon">⌕</div>

              <h3>Lowongan tidak ditemukan</h3>

              <p>
                Coba ubah kata pencarian atau pilih kategori lainnya.
              </p>
            </div>
          )}

        {/* JOB CARDS */}

        {!isLoading &&
          !errorMessage &&
          rankedJobs.length > 0 && (
            <div className="job-grid">
              {rankedJobs.map(
                ({ job, match, alreadySaved }) => (
                  <article className="job-card" key={job.id}>
                    {/* CARD HEADER */}

                    <div className="job-card-top">
                      <div className="company-icon">
                        {job.company_name
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <span
                        className={`match-badge ${getMatchClass(
                          match.level,
                        )}`}
                      >
                        {match.score}% Match
                      </span>
                    </div>

                    {/* JOB TITLE */}

                    <h3 className="job-title">
                      {job.title}
                    </h3>

                    <div className="job-company">
                      <strong>{job.company_name}</strong>

                      <span>•</span>

                      <span>{job.category}</span>
                    </div>

                    {job.candidate_required_location && (
                      <p className="job-location">
                        <span>⌖</span>
                        {job.candidate_required_location}
                      </p>
                    )}

                    {job.job_type && (
                      <span className="job-type">
                        {job.job_type}
                      </span>
                    )}

                    {job.salary && (
                      <p className="job-salary">
                        {job.salary}
                      </p>
                    )}

                    {/* MATCH SCORE */}

                    <div className="match-section">
                      <div className="match-description">
                        <span>Tingkat kecocokan skill</span>

                        <strong>{match.level}</strong>
                      </div>

                      <div
                        className="match-progress-track"
                        role="progressbar"
                        aria-label="Match Score"
                        aria-valuenow={match.score}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className={`match-progress-fill ${getMatchClass(
                            match.level,
                          )}`}
                          style={{
                            width: `${match.score}%`,
                          }}
                        />
                      </div>

                      <small>
                        {match.matchedSkills.length} dari{" "}
                        {kaptenSkills.length} skill cocok
                      </small>
                    </div>

                    {/* MATCHED SKILLS */}

                    <div className="job-skills">
                      <strong>Skill yang cocok</strong>

                      {match.matchedSkills.length > 0 ? (
                        <div className="job-tags">
                          {match.matchedSkills.map((skill) => (
                            <span
                              className="job-tag matched-tag"
                              key={skill}
                            >
                              ✓ {skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="empty-inline">
                          Belum ada skill yang cocok.
                        </p>
                      )}
                    </div>

                    {/* MISSING SKILLS */}

                    {match.missingSkills.length > 0 && (
                      <div className="job-skills">
                        <strong>
                          Skill yang belum cocok
                        </strong>

                        <div className="job-tags">
                          {match.missingSkills.map((skill) => (
                            <span
                              className="job-tag missing-tag"
                              key={skill}
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* JOB TAGS */}

                    {job.tags.length > 0 && (
                      <div className="job-skills">
                        <strong>Tags Lowongan</strong>

                        <div className="job-tags">
                          {job.tags.map((tag, index) => (
                            <span
                              className="job-tag"
                              key={`${job.id}-${tag}-${index}`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CARD FOOTER */}

                    <div className="job-card-footer">
                      {job.url ? (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noreferrer"
                          className="job-link"
                        >
                          Lihat Detail ↗
                        </a>
                      ) : (
                        <span className="job-link-placeholder">
                          Detail lowongan
                        </span>
                      )}

                      <button
                        type="button"
                        className={
                          alreadySaved
                            ? "save-job-button saved"
                            : "save-job-button"
                        }
                        disabled={alreadySaved}
                        onClick={() =>
                          onSaveJobAsApplication(job, match)
                        }
                      >
                        {alreadySaved
                          ? "✓ Tersimpan"
                          : "+ Simpan Lamaran"}
                      </button>
                    </div>
                  </article>
                ),
              )}
            </div>
          )}
      </section>
    </section>
  );
}
