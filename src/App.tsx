
import { useState } from "react";

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

import "./App.css";

type ActiveView = "explore" | "pipeline" | "add" | "detail";

function App() {
  // State utama aplikasi.
  const [applications, setApplications] = useState<Application[]>([]);

  const [kaptenSkills, setKaptenSkills] = useState<string[]>(
    DEFAULT_KAPTEN_SKILLS,
  );

  // Navigasi halaman.
  const [activeView, setActiveView] =
    useState<ActiveView>("explore");

  // Menyimpan ID lamaran yang sedang dibuka.
  const [selectedApplicationId, setSelectedApplicationId] =
    useState<string | null>(null);

  // Mencari detail lamaran berdasarkan ID.
  const selectedApplication = applications.find(
    (application) =>
      application.id === selectedApplicationId,
  );

  // Menambahkan lamaran dari Form Manual.
  function handleAddApplication(
    newApplication: Omit<
      Application,
      "id" | "lastUpdatedAt"
    >,
  ) {
    const now = new Date().toISOString();

    const application: Application = {
      ...newApplication,
      id: crypto.randomUUID(),
      lastUpdatedAt: now,
    };

    setApplications((previous) => [
      ...previous,
      application,
    ]);

    setActiveView("pipeline");
  }

  // Menyimpan lowongan dari Job Explorer ke Wishlist.
  function handleSaveJobAsApplication(
    job: JobListing,
    match: MatchResult,
  ) {
    const now = new Date().toISOString();

    const application: Application = {
      id: crypto.randomUUID(),
      company: job.company_name,
      role: job.title,
      status: "DRAFT",
      lastUpdatedAt: now,
      matchScore: match.score,
      checklist: [],
      activityLog: [
        {
          id: crypto.randomUUID(),
          timestamp: now,
          message: "Lowongan disimpan ke Wishlist.",
        },
      ],
    };

    setApplications((previous) => [
      ...previous,
      application,
    ]);

    setActiveView("pipeline");
  }

  // Memperbarui data aplikasi dari Detail Lamaran.
  function handleUpdateApplication(
    updatedApplication: Application,
  ) {
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
        if (application.id !== id) {
          return application;
        }

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
            className={
              activeView === "explore" ? "nav-active" : ""
            }
            onClick={() => setActiveView("explore")}
          >
            Eksplorasi Lowongan
          </button>

          <button
            className={
              activeView === "pipeline" ||
              activeView === "detail"
                ? "nav-active"
                : ""
            }
            onClick={() => setActiveView("pipeline")}
          >
            Pipeline Lamaran ({applications.length})
          </button>

          <button
            className={
              activeView === "add" ? "nav-active" : ""
            }
            onClick={() => setActiveView("add")}
          >
            + Tambah Lamaran
          </button>
        </nav>
      </header>

      {/* MAIN CONTENT */}
      <main className="app-main">
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
          />
        )}

        {activeView === "detail" && selectedApplication && (
          <ApplicationDetail
            application={selectedApplication}
            onUpdate={handleUpdateApplication}
            onClose={handleBackToPipeline}
          />
        )}

        {activeView === "detail" && !selectedApplication && (
          <div className="app-empty">
            <h2>Lamaran tidak ditemukan</h2>
            <button onClick={handleBackToPipeline}>
              Kembali ke Pipeline
            </button>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="app-footer">
        <span>Aku Mw Magang © 2026</span>
        <span>Built with React 19 + TypeScript</span>
      </footer>
    </div>
  );
}

export default App;
