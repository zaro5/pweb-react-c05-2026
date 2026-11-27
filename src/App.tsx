import { useEffect, useRef, useState } from "react";

import type {
  Application,
  JobListing,
  MatchResult,
} from "./types/magang";

import {
  JobExplorer,
  DEFAULT_KAPTEN_SKILLS,
} from "./components/JobExplorer";

import { ManualApplicationForm } from "./components/ManualApplicationForm";
import { WarRoom } from "./components/WarRoom";
import { ApplicationDetail } from "./components/ApplicationDetail";

// [ORANG 3]
import { useLocalStorage } from "./hooks/useLocalStorage";
import { StatsCards } from "./components/StatsCards";
import { OfferComparator } from "./components/OfferComparator";

import "./App.css";

type ActiveView = "explore" | "pipeline" | "add" | "detail" | "compare";

const UNDO_DELAY_MS = 5000;

function App() {
  // [ORANG 3] Persistensi via useLocalStorage<T>
  const [applications, setApplications] = useLocalStorage<Application[]>(
    "applications",
    [],
  );

  const [kaptenSkills, setKaptenSkills] = useLocalStorage<string[]>(
    "kaptenSkills",
    DEFAULT_KAPTEN_SKILLS,
  );

  const [activeView, setActiveView] = useState<ActiveView>("explore");

  const [selectedApplicationId, setSelectedApplicationId] = useState<
    string | null
  >(null);

  // [ORANG 3] Undo Delete
  const [pendingDelete, setPendingDelete] = useState<Application | null>(null);
  const undoTimerRef = useRef<number | null>(null);

  const selectedApplication = applications.find(
    (application) => application.id === selectedApplicationId,
  );

  // Derived: jumlah offer untuk label menu.
  const offerCount = applications.filter(
    (application) => application.status === "OFFER",
  ).length;

  function clearUndoTimer() {
    if (undoTimerRef.current !== null) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  }

  // [ORANG 3] Bersihkan timer saat App unmount.
  useEffect(() => {
    return () => {
      if (undoTimerRef.current !== null) {
        window.clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  // [ORANG 3] Hapus lamaran + toast Undo 5 detik.
  function handleDeleteApplication(id: string) {
    const target = applications.find((application) => application.id === id);
    if (!target) return;

    // Hapus berturut-turut: timer lama dibersihkan dulu.
    clearUndoTimer();

    setApplications((previous) =>
      previous.filter((application) => application.id !== id),
    );
    setPendingDelete(target);

    // Kalau dihapus dari halaman detail, kembali ke pipeline.
    if (selectedApplicationId === id) {
      setSelectedApplicationId(null);
      setActiveView("pipeline");
    }

    undoTimerRef.current = window.setTimeout(() => {
      setPendingDelete(null);
      undoTimerRef.current = null;
    }, UNDO_DELAY_MS);
  }

  // [ORANG 3] Undo: lamaran kembali utuh (checklist + activity log ikut).
  function handleUndoDelete() {
    if (!pendingDelete) return;

    clearUndoTimer();
    setApplications((previous) => [...previous, pendingDelete]);
    setPendingDelete(null);
  }

  // Menambahkan lamaran dari Form Manual.
  function handleAddApplication(
    newApplication: Omit<Application, "id" | "lastUpdatedAt">,
  ) {
    const now = new Date().toISOString();

    const application: Application = {
      ...newApplication,
      id: crypto.randomUUID(),
      lastUpdatedAt: now,
    };

    setApplications((previous) => [...previous, application]);
    setActiveView("pipeline");
  }

  // Menyimpan lowongan dari Job Explorer ke Wishlist.
  function handleSaveJobAsApplication(job: JobListing, match: MatchResult) {
    const now = new Date().toISOString();

    const application: Application = {
      id: crypto.randomUUID(),
      company: job.company_name,
      role: job.title,
      status: "DRAFT", // di UI Orang 2 label "DRAFT" ditampilkan sebagai "Wishlist"
      lastUpdatedAt: now,
      matchScore: match.score,
      requiredSkills: job.tags, // [ORANG 3] dipakai Offer Comparator
      checklist: [],
      activityLog: [
        {
          id: crypto.randomUUID(),
          timestamp: now,
          message: "Lowongan disimpan ke Wishlist.",
        },
      ],
    };

    setApplications((previous) => [...previous, application]);
    setActiveView("pipeline");
  }

  // Memperbarui data aplikasi dari Detail Lamaran.
  function handleUpdateApplication(updatedApplication: Application) {
    setApplications((previous) =>
      previous.map((application) =>
        application.id === updatedApplication.id
          ? updatedApplication
          : application,
      ),
    );
  }

  // Membuka Detail Lamaran.
  function handleOpenDetail(id: string) {
    setSelectedApplicationId(id);
    setActiveView("detail");
  }

  // Simulasi waktu mundur 15 hari untuk pengujian Ghosting.
  function handleSimulateGhosting(id: string) {
    const now = new Date();

    const simulatedDate = new Date(
      now.getTime() - 15 * 24 * 60 * 60 * 1000,
    ).toISOString();

    setApplications((previous) =>
      previous.map((application) => {
        if (application.id !== id) return application;

        return {
          ...application,
          lastUpdatedAt: simulatedDate,
          activityLog: [
            ...(application.activityLog ?? []),
            {
              id: crypto.randomUUID(),
              timestamp: now.toISOString(),
              message:
                "Simulasi waktu dimundurkan 15 hari untuk pengujian Rawan Ghosting.",
            },
          ],
        };
      }),
    );
  }

  function handleBackToPipeline() {
    setSelectedApplicationId(null);
    setActiveView("pipeline");
  }

  return (
    <div className="app-shell">
      {/* HEADER */}
      <header className="app-header">
        <div className="app-brand">
          <div className="app-logo">AM</div>

          <div>
            <strong>Aku Mw Magang</strong>
            <span>Internship Management System</span>
          </div>
        </div>

        <nav className="app-navigation">
          <button
            className={activeView === "explore" ? "nav-active" : ""}
            onClick={() => setActiveView("explore")}
          >
            Eksplorasi Lowongan
          </button>

          <button
            className={
              activeView === "pipeline" || activeView === "detail"
                ? "nav-active"
                : ""
            }
            onClick={() => setActiveView("pipeline")}
          >
            Pipeline Lamaran ({applications.length})
          </button>

          {/* [ORANG 3] */}
          <button
            className={activeView === "compare" ? "nav-active" : ""}
            onClick={() => setActiveView("compare")}
          >
            Bandingkan Offer ({offerCount})
          </button>

          <button
            className={activeView === "add" ? "nav-active" : ""}
            onClick={() => setActiveView("add")}
          >
            + Tambah Lamaran
          </button>
        </nav>
      </header>

      {/* MAIN CONTENT */}
      <main className="app-main">
        {/* [ORANG 3] 5 kartu statistik (derived state) */}
        {(activeView === "explore" || activeView === "pipeline") && (
          <StatsCards applications={applications} />
        )}

        {activeView === "explore" && (
          <JobExplorer
            kaptenSkills={kaptenSkills}
            onChangeKaptenSkills={setKaptenSkills}
            applications={applications}
            onSaveJobAsApplication={handleSaveJobAsApplication}
          />
        )}

        {activeView === "add" && (
          <ManualApplicationForm
            applications={applications}
            onAddApplication={handleAddApplication}
          />
        )}

        {activeView === "pipeline" && (
          <WarRoom
            applications={applications}
            onSimulateGhosting={handleSimulateGhosting}
            onOpenDetail={handleOpenDetail}
            onDelete={handleDeleteApplication}
          />
        )}

        {activeView === "detail" && selectedApplication && (
          <ApplicationDetail
            application={selectedApplication}
            onUpdate={handleUpdateApplication}
            onClose={handleBackToPipeline}
            onDelete={handleDeleteApplication}
          />
        )}

        {activeView === "detail" && !selectedApplication && (
          <div className="app-empty">
            <h2>Lamaran tidak ditemukan</h2>
            <button onClick={handleBackToPipeline}>Kembali ke Pipeline</button>
          </div>
        )}

        {/* [ORANG 3] Offer Comparator */}
        {activeView === "compare" && (
          <OfferComparator
            applications={applications}
            kaptenSkills={kaptenSkills}
          />
        )}
      </main>

      {/* [ORANG 3] Toast Undo */}
      {pendingDelete && (
        <div className="undo-toast" role="status">
          <span>
            Lamaran <strong>{pendingDelete.company}</strong> telah dihapus.
          </span>
          <button onClick={handleUndoDelete}>Undo</button>
        </div>
      )}

      {/* FOOTER */}
      <footer className="app-footer">
        <span>Aku Mw Magang © 2026</span>
        <span>Built with React 19 + TypeScript</span>
      </footer>
    </div>
  );
}

export default App;