import { useMemo, useState } from "react";
import type {
  Application,
  ApplicationStatus,
} from "../types/magang";

import { isAtRiskOfGhosting } from "../utils/ghosting";
import { findInterviewConflicts } from "../utils/interviewConflict";
import "./WarRoom.css";

type StatusFilter = ApplicationStatus | "ALL";

type SortMode =
  | "LATEST"
  | "INTERVIEW"
  | "OFFER";

interface WarRoomProps {
  applications: Application[];
  onSimulateGhosting: (id: string) => void;
  onOpenDetail: (id: string) => void;
  onDelete: (id: string) => void;
}

const statuses: ApplicationStatus[] = [
  "DRAFT",
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "GHOSTED",
];

const statusLabels: Record<ApplicationStatus, string> = {
  DRAFT: "Draft",
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  GHOSTED: "Ghosted",
};

function formatDate(value?: string): string {
  if (!value) return "Belum dijadwalkan";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Tanggal tidak valid";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCurrency(value?: number): string {
  if (value === undefined || value === null) {
    return "Belum ada penawaran";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function WarRoom({
  applications,
  onSimulateGhosting,
  onOpenDetail,
  onDelete, // [ORANG 3] sebelumnya belum diambil dari props
}: WarRoomProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<StatusFilter>("ALL");
  const [onlyGhosting, setOnlyGhosting] =
    useState(false);
  const [sortMode, setSortMode] =
    useState<SortMode>("LATEST");

  // Bentrok dihitung dari SEMUA lamaran,
  // bukan hanya data yang sedang ditampilkan.
  const conflicts = useMemo(
    () => findInterviewConflicts(applications),
    [applications],
  );

  // Menghitung jumlah lamaran rawan ghosting.
  const ghostingCount = useMemo(
    () =>
      applications.filter((app) =>
        isAtRiskOfGhosting(app),
      ).length,
    [applications],
  );

  // Filter gabungan dan sorting.
  const filteredApplications = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    const result = applications.filter((app) => {
      const matchesSearch =
        !keyword ||
        app.company.toLowerCase().includes(keyword) ||
        app.role.toLowerCase().includes(keyword) ||
        (app.cvVersion ?? "").toLowerCase().includes(keyword);

      const matchesStatus =
        selectedStatus === "ALL" ||
        app.status === selectedStatus;

      const matchesGhosting =
        !onlyGhosting ||
        isAtRiskOfGhosting(app);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesGhosting
      );
    });

    return [...result].sort((a, b) => {
      if (sortMode === "LATEST") {
        return (
          Date.parse(b.lastUpdatedAt) -
          Date.parse(a.lastUpdatedAt)
        );
      }

      if (sortMode === "INTERVIEW") {
        const dateA = a.interviewAt
          ? Date.parse(a.interviewAt)
          : Infinity;

        const dateB = b.interviewAt
          ? Date.parse(b.interviewAt)
          : Infinity;

        return dateA - dateB;
      }

      return (
        (b.expectedSalary ?? 0) -
        (a.expectedSalary ?? 0)
      );
    });
  }, [
    applications,
    searchTerm,
    selectedStatus,
    onlyGhosting,
    sortMode,
  ]);

  return (
    <div className="war-room">
      <header className="war-room-header">
        <div>
          <p className="war-room-eyebrow">
            CAREER MANAGEMENT SYSTEM
          </p>

          <h1>War Room Pipeline</h1>

          <p>
            Pantau seluruh perjalanan lamaran magangmu
            dalam satu tempat.
          </p>
        </div>

        <div className="war-room-total">
          <span>Total Lamaran</span>
          <strong>{applications.length}</strong>
        </div>
      </header>

      {/* GLOBAL INTERVIEW CONFLICT BANNER */}
      {conflicts.length > 0 && (
        <section
          className="conflict-banner"
          role="alert"
        >
          <div className="conflict-icon">!</div>

          <div>
            <strong>
              Peringatan Bentrok Jadwal Interview!
            </strong>

            <p>
              Ditemukan {conflicts.length} pasangan
              jadwal interview yang berjarak kurang
              dari 60 menit.
            </p>

            <ul>
              {conflicts.map((conflict) => (
                <li
                  key={`${conflict.first.id}-${conflict.second.id}`}
                >
                  {conflict.first.company} dan{" "}
                  {conflict.second.company}
                  {" — "}
                  {conflict.minutesApart} menit
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* FILTER SECTION */}
      <section className="war-room-filters">
        <div className="filter-field">
          <label htmlFor="search-application">
            Cari Lamaran
          </label>

          <input
            id="search-application"
            type="search"
            placeholder="Cari perusahaan, posisi, CV..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(e.target.value)
            }
          />
        </div>

        <div className="filter-field">
          <label htmlFor="status-filter">
            Filter Status
          </label>

          <select
            id="status-filter"
            value={selectedStatus}
            onChange={(e) =>
              setSelectedStatus(
                e.target.value as StatusFilter,
              )
            }
          >
            <option value="ALL">Semua Status</option>

            {statuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label htmlFor="sort-filter">
            Urutkan
          </label>

          <select
            id="sort-filter"
            value={sortMode}
            onChange={(e) =>
              setSortMode(e.target.value as SortMode)
            }
          >
            <option value="LATEST">Terbaru</option>
            <option value="INTERVIEW">
              Jadwal Interview Terdekat
            </option>
            <option value="OFFER">
              Offer Tertinggi
            </option>
          </select>
        </div>

        <label className="ghosting-toggle">
          <input
            type="checkbox"
            checked={onlyGhosting}
            onChange={(e) =>
              setOnlyGhosting(e.target.checked)
            }
          />

          <span>Hanya Rawan Ghosting</span>
        </label>
      </section>

      {/* SUMMARY */}
      <section className="war-room-summary">
        <span>
          Menampilkan{" "}
          <strong>{filteredApplications.length}</strong>
          {" "}dari {applications.length} lamaran
        </span>

        <span className="ghosting-summary">
          {ghostingCount} Rawan Ghosting
        </span>
      </section>

      {/* APPLICATION CARDS */}
      {filteredApplications.length === 0 ? (
        <div className="war-room-empty">
          <h3>Lamaran tidak ditemukan</h3>
          <p>
            Coba ubah kata kunci atau filter pencarian.
          </p>
        </div>
      ) : (
        <section className="application-grid">
          {filteredApplications.map((app) => {
            const checklist = app.checklist ?? [];

            const completed = checklist.filter(
              (item) => item.completed,
            ).length;

            const progress =
              checklist.length > 0
                ? (completed / checklist.length) * 100
                : 0;

            const ghosting =
              isAtRiskOfGhosting(app);

            return (
              <article
                className="application-card"
                key={app.id}
              >
                <div className="application-card-top">
                  <div>
                    <span className="application-company">
                      {app.company}
                    </span>

                    <h2>{app.role}</h2>
                  </div>

                  <span
                    className={`status-badge status-${app.status.toLowerCase()}`}
                  >
                    {statusLabels[app.status]}
                  </span>
                </div>

                {ghosting && (
                  <div className="ghosting-badge">
                    ⚠ Rawan Ghosting
                  </div>
                )}

                <div className="application-info">
                  <p>
                    <span>Versi CV</span>
                    <strong>
                      {app.cvVersion || "Belum ditentukan"}
                    </strong>
                  </p>

                  <p>
                    <span>Terakhir diperbarui</span>
                    <strong>
                      {formatDate(app.lastUpdatedAt)}
                    </strong>
                  </p>

                  {app.status === "INTERVIEW" && (
                    <p>
                      <span>Jadwal Interview</span>
                      <strong>
                        {formatDate(app.interviewAt)}
                      </strong>
                    </p>
                  )}

                  {app.status === "OFFER" && (
                    <p>
                      <span>Nilai Offer</span>
                      <strong>
                        {formatCurrency(app.expectedSalary)}
                      </strong>
                    </p>
                  )}
                </div>

                <div className="application-progress">
                  <div className="progress-heading">
                    <span>Progress Checklist</span>
                    <strong>
                      {completed}/{checklist.length}
                    </strong>
                  </div>

                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="application-match">
                  <span>Skill Match</span>

                  <strong>
                    {Math.min(
                      100,
                      Math.max(0, app.matchScore ?? 0),
                    )}%
                  </strong>
                </div>

                <div className="application-actions">
                  <button
                    type="button"
                    className="detail-button"
                    onClick={() => onOpenDetail(app.id)}
                  >
                    Detail Lamaran
                  </button>

                  {(app.status === "APPLIED" ||
                    app.status === "SCREENING") && (
                    <button
                      type="button"
                      className="simulate-button"
                      onClick={() =>
                        onSimulateGhosting(app.id)
                      }
                    >
                      Simulasi +15 Hari
                    </button>
                  )}

                  {/* [ORANG 3] Tombol Hapus -> toast Undo 5 detik */}
                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => onDelete(app.id)}
                  >
                    Hapus
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}