import { useState } from "react";
import type {
  Application,
  ApplicationStatus,
  WorkMode,
} from "../types/magang";

import { getAvailableTransitions } from "../utils/stateMachine";
import { InterviewPrepTimer } from "./InterviewPrepTimer"; // [ORANG 3]
import "./ApplicationDetail.css";

interface ApplicationDetailProps {
  application: Application;
  onUpdate: (updatedApplication: Application) => void;
  onClose: () => void;
  onDelete: (id: string) => void; // [ORANG 3]
}

type FormErrors = {
  cvVersion?: string;
  appliedDate?: string;
  interviewAt?: string;
  salary?: string;
  workMode?: string;
};

const statusLabels: Record<ApplicationStatus, string> = {
  DRAFT: "Wishlist",
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  GHOSTED: "Ghosted",
};

export function ApplicationDetail({
  application,
  onUpdate,
  onClose,
  onDelete, // [ORANG 3]
}: ApplicationDetailProps) {
  const [targetStatus, setTargetStatus] =
    useState<ApplicationStatus | "">("");

  const [cvVersion, setCvVersion] = useState(
    application.cvVersion ?? "",
  );

  const [appliedDate, setAppliedDate] = useState(
    application.appliedDate ?? "",
  );

  const [interviewAt, setInterviewAt] = useState(
    application.interviewAt?.slice(0, 16) ?? "",
  );

  const [salary, setSalary] = useState(
    application.expectedSalary?.toString() ?? "",
  );

  const [workMode, setWorkMode] = useState<WorkMode | "">(
    application.workMode ?? "",
  );

  const [errors, setErrors] = useState<FormErrors>({});

  const [newChecklist, setNewChecklist] = useState("");
  const [noteDraft, setNoteDraft] = useState("");

  // [ORANG 3] Panel Latihan Interview (buka/tutup -> mount/unmount timer)
  const [showPrep, setShowPrep] = useState(false);

  const checklist = application.checklist ?? [];
  const activityLog = application.activityLog ?? [];

  const completedCount = checklist.filter(
    (item) => item.completed,
  ).length;

  const progress =
    checklist.length > 0
      ? (completedCount / checklist.length) * 100
      : 0;

  const availableTransitions = getAvailableTransitions(
    application.status,
  );

  // Membuat update aplikasi dan activity log secara immutable.
  function commitUpdate(
    updates: Partial<Application>,
    message: string,
  ) {
    const timestamp = new Date().toISOString();

    const newLog = {
      id: crypto.randomUUID(),
      timestamp,
      message,
    };

    const updatedApplication: Application = {
      ...application,
      ...updates,
      lastUpdatedAt: timestamp,
      activityLog: [
        ...activityLog,
        newLog,
      ],
    };

    onUpdate(updatedApplication);
  }

  // Validasi dan perpindahan status.
  function handleStatusTransition() {
    if (!targetStatus) return;

    const nextErrors: FormErrors = {};

    // Validasi transisi ke APPLIED.
    if (targetStatus === "APPLIED") {
      if (!cvVersion.trim()) {
        nextErrors.cvVersion =
          "Versi CV wajib diisi.";
      }

      if (!appliedDate) {
        nextErrors.appliedDate =
          "Tanggal melamar wajib diisi.";
      }
    }

    // Validasi transisi ke INTERVIEW.
    if (targetStatus === "INTERVIEW") {
      if (!interviewAt) {
        nextErrors.interviewAt =
          "Jadwal interview wajib diisi.";
      }
    }

    // Validasi transisi ke OFFER.
    if (targetStatus === "OFFER") {
      if (!salary || Number(salary) <= 0) {
        nextErrors.salary =
          "Nilai offer harus lebih dari Rp0.";
      }

      if (!workMode) {
        nextErrors.workMode =
          "Mode kerja wajib dipilih.";
      }
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const updates: Partial<Application> = {
      status: targetStatus,
    };

    if (targetStatus === "APPLIED") {
      updates.cvVersion = cvVersion.trim();
      updates.appliedDate = appliedDate;
    }

    if (targetStatus === "INTERVIEW") {
      updates.interviewAt = interviewAt;
    }

    if (targetStatus === "OFFER") {
      updates.expectedSalary = Number(salary);
      updates.workMode = workMode as WorkMode;
    }

    commitUpdate(
      updates,
      `Status berubah dari ${statusLabels[application.status]} menjadi ${statusLabels[targetStatus]}.`,
    );

    setTargetStatus("");
    setErrors({});
  }

  // Menambah checklist tanpa mutasi array lama.
  function handleAddChecklist() {
    const label = newChecklist.trim();

    if (!label) return;

    const newItem = {
      id: crypto.randomUUID(),
      label,
      completed: false,
    };

    commitUpdate(
      {
        checklist: [
          ...checklist,
          newItem,
        ],
      },
      `Checklist ditambahkan: ${label}`,
    );

    setNewChecklist("");
  }

  // Mengubah status checklist secara immutable.
  function handleToggleChecklist(id: string) {
    const updatedChecklist = checklist.map((item) =>
      item.id === id
        ? {
            ...item,
            completed: !item.completed,
          }
        : item,
    );

    const changedItem = checklist.find(
      (item) => item.id === id,
    );

    if (!changedItem) return;

    commitUpdate(
      {
        checklist: updatedChecklist,
      },
      `Checklist ${changedItem.label} ${
        changedItem.completed
          ? "belum selesai"
          : "selesai"
      }.`,
    );
  }

  // Menghapus checklist secara immutable.
  function handleDeleteChecklist(id: string) {
    const deletedItem = checklist.find(
      (item) => item.id === id,
    );

    if (!deletedItem) return;

    commitUpdate(
      {
        checklist: checklist.filter(
          (item) => item.id !== id,
        ),
      },
      `Checklist dihapus: ${deletedItem.label}`,
    );
  }

  // Menambahkan catatan manual ke activity log.
  function handleAddNote() {
    const note = noteDraft.trim();

    if (!note) return;

    const combinedNotes = [
      application.notes?.trim(),
      note,
    ]
      .filter(Boolean)
      .join("\n");

    commitUpdate(
      {
        notes: combinedNotes,
      },
      `Catatan Kapten: ${note}`,
    );

    setNoteDraft("");
  }

  return (
    // [ORANG 3] <main> -> <div>, karena App.tsx sudah punya <main>
    <div className="application-detail">
      <header className="detail-header">
        <div>
          <span className="detail-eyebrow">
            CAREER MANAGEMENT / DETAIL
          </span>

          <h1>{application.company}</h1>

          <p>{application.role}</p>
        </div>

        <div className="detail-header-actions">
          <button
            type="button"
            className="close-detail-button"
            onClick={onClose}
          >
            Kembali
          </button>

          {/* [ORANG 3] Hapus -> toast Undo 5 detik di App.tsx */}
          <button
            type="button"
            className="delete-button"
            onClick={() => onDelete(application.id)}
          >
            Hapus
          </button>
        </div>
      </header>

      <div className="detail-layout">
        {/* BAGIAN KIRI */}
        <section className="detail-main">

          {/* STATUS MACHINE */}
          <article className="detail-panel">
            <h2>Tahap Seleksi</h2>

            <div className="status-timeline">
              {(
                [
                  "DRAFT",
                  "APPLIED",
                  "SCREENING",
                  "INTERVIEW",
                  "OFFER",
                ] as ApplicationStatus[]
              ).map((status, index) => {
                const isCurrent =
                  application.status === status;

                return (
                  <div
                    key={status}
                    className={`timeline-step ${
                      isCurrent ? "active" : ""
                    }`}
                  >
                    <span>{index + 1}</span>
                    <small>
                      {statusLabels[status]}
                    </small>
                  </div>
                );
              })}
            </div>

            <div className="current-status">
              Status sekarang:
              <strong>
                {statusLabels[application.status]}
              </strong>
            </div>

            {availableTransitions.length > 0 ? (
              <div className="transition-form">
                <label htmlFor="next-status">
                  Pindahkan Status Ke
                </label>

                <select
                  id="next-status"
                  value={targetStatus}
                  onChange={(e) => {
                    setTargetStatus(
                      e.target.value as ApplicationStatus | "",
                    );
                    setErrors({});
                  }}
                >
                  <option value="">
                    Pilih status tujuan
                  </option>

                  {availableTransitions.map((status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>

                {/* FORM APPLIED */}
                {targetStatus === "APPLIED" && (
                  <div className="conditional-fields">
                    <label htmlFor="detail-cv">
                      Versi CV *
                    </label>

                    <input
                      id="detail-cv"
                      value={cvVersion}
                      onChange={(e) =>
                        setCvVersion(e.target.value)
                      }
                      placeholder="Contoh: CV ATS November"
                    />

                    {errors.cvVersion && (
                      <span className="field-error">
                        {errors.cvVersion}
                      </span>
                    )}

                    <label htmlFor="detail-applied-date">
                      Tanggal Melamar *
                    </label>

                    <input
                      id="detail-applied-date"
                      type="date"
                      value={appliedDate}
                      onChange={(e) =>
                        setAppliedDate(e.target.value)
                      }
                    />

                    {errors.appliedDate && (
                      <span className="field-error">
                        {errors.appliedDate}
                      </span>
                    )}
                  </div>
                )}

                {/* FORM INTERVIEW */}
                {targetStatus === "INTERVIEW" && (
                  <div className="conditional-fields">
                    <label htmlFor="detail-interview">
                      Jadwal Interview *
                    </label>

                    <input
                      id="detail-interview"
                      type="datetime-local"
                      value={interviewAt}
                      onChange={(e) =>
                        setInterviewAt(e.target.value)
                      }
                    />

                    {errors.interviewAt && (
                      <span className="field-error">
                        {errors.interviewAt}
                      </span>
                    )}
                  </div>
                )}

                {/* FORM OFFER */}
                {targetStatus === "OFFER" && (
                  <div className="conditional-fields">
                    <label htmlFor="detail-salary">
                      Nilai Offer (Rp) *
                    </label>

                    <input
                      id="detail-salary"
                      type="number"
                      min="1"
                      value={salary}
                      onChange={(e) =>
                        setSalary(e.target.value)
                      }
                      placeholder="Contoh: 4500000"
                    />

                    {errors.salary && (
                      <span className="field-error">
                        {errors.salary}
                      </span>
                    )}

                    <label htmlFor="detail-workmode">
                      Mode Kerja *
                    </label>

                    <select
                      id="detail-workmode"
                      value={workMode}
                      onChange={(e) =>
                        setWorkMode(
                          e.target.value as WorkMode | "",
                        )
                      }
                    >
                      <option value="">
                        Pilih mode kerja
                      </option>
                      <option value="Remote">
                        Remote
                      </option>
                      <option value="Hybrid">
                        Hybrid
                      </option>
                      <option value="On-site">
                        On-site
                      </option>
                    </select>

                    {errors.workMode && (
                      <span className="field-error">
                        {errors.workMode}
                      </span>
                    )}
                  </div>
                )}

                {targetStatus && (
                  <button
                    type="button"
                    className="confirm-transition"
                    onClick={handleStatusTransition}
                  >
                    Konfirmasi Perubahan Status
                  </button>
                )}
              </div>
            ) : (
              <p className="final-status-message">
                Status ini tidak memiliki transisi
                berikutnya.
              </p>
            )}
          </article>

          {/* CHECKLIST */}
          <article className="detail-panel">
            <div className="panel-heading">
              <h2>Daftar Persiapan</h2>

              <strong>
                {completedCount}/{checklist.length} selesai
              </strong>
            </div>

            <div className="detail-progress-track">
              <div
                className="detail-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>

            {checklist.length === 0 ? (
              <p className="empty-checklist">
                Belum ada checklist. Tambahkan persiapan
                lamaranmu.
              </p>
            ) : (
              <div className="checklist-list">
                {checklist.map((item) => (
                  <div
                    className="checklist-item"
                    key={item.id}
                  >
                    <label>
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() =>
                          handleToggleChecklist(item.id)
                        }
                      />

                      <span
                        className={
                          item.completed
                            ? "checklist-completed"
                            : ""
                        }
                      >
                        {item.label}
                      </span>
                    </label>

                    <button
                      type="button"
                      className="delete-checklist"
                      aria-label={`Hapus ${item.label}`}
                      onClick={() =>
                        handleDeleteChecklist(item.id)
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="add-checklist-form">
              <input
                type="text"
                value={newChecklist}
                onChange={(e) =>
                  setNewChecklist(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddChecklist();
                  }
                }}
                placeholder="Tambah tugas persiapan baru..."
              />

              <button
                type="button"
                onClick={handleAddChecklist}
                disabled={!newChecklist.trim()}
              >
                Tambah
              </button>
            </div>
          </article>

          {/* CATATAN MANUAL */}
          <article className="detail-panel">
            <h2>Catatan Kapten</h2>

            <textarea
              value={noteDraft}
              onChange={(e) =>
                setNoteDraft(e.target.value)
              }
              placeholder="Tuliskan catatan atau informasi penting..."
              rows={3}
            />

            <button
              type="button"
              className="confirm-transition"
              onClick={handleAddNote}
              disabled={!noteDraft.trim()}
            >
              Simpan Catatan
            </button>
          </article>
        </section>

        {/* BAGIAN KANAN */}
        <aside className="detail-sidebar">
          <article className="detail-panel">
            <h2>Informasi Lamaran</h2>

            <div className="detail-information">
              <p>
                <span>Perusahaan</span>
                <strong>{application.company}</strong>
              </p>

              <p>
                <span>Posisi</span>
                <strong>{application.role}</strong>
              </p>

              <p>
                <span>Versi CV</span>
                <strong>
                  {application.cvVersion || "-"}
                </strong>
              </p>

              <p>
                <span>Tanggal Melamar</span>
                <strong>
                  {application.appliedDate || "-"}
                </strong>
              </p>

              <p>
                <span>Jadwal Interview</span>
                <strong>
                  {application.interviewAt
                    ? new Date(
                        application.interviewAt,
                      ).toLocaleString("id-ID")
                    : "-"}
                </strong>
              </p>

              <p>
                <span>Mode Kerja</span>
                <strong>
                  {application.workMode || "-"}
                </strong>
              </p>
            </div>
          </article>

          {/* [ORANG 3] Latihan Interview: timer hanya dirender saat panel
              dibuka, jadi saat ditutup komponen unmount dan clearInterval jalan. */}
          <article className="detail-panel">
            <button
              type="button"
              className="confirm-transition"
              onClick={() =>
                setShowPrep((previous) => !previous)
              }
            >
              {showPrep
                ? "Tutup Latihan Interview"
                : "Latihan Interview"}
            </button>

            {showPrep && <InterviewPrepTimer />}
          </article>

          <article className="detail-panel">
            <h2>Riwayat Aktivitas</h2>

            {activityLog.length === 0 ? (
              <p className="empty-checklist">
                Belum ada aktivitas.
              </p>
            ) : (
              <div className="activity-list">
                {[...activityLog]
                  .reverse()
                  .map((log) => (
                    <div
                      className="activity-item"
                      key={log.id}
                    >
                      <span className="activity-dot" />

                      <div>
                        <small>
                          {new Date(
                            log.timestamp,
                          ).toLocaleString("id-ID")}
                        </small>

                        <p>{log.message}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </article>
        </aside>
      </div>
    </div>
  );
}