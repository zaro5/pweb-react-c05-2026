import { useState, useRef, useCallback } from "react";
import type { Application, ApplicationStatus, WorkMode } from "../types/magang";

export interface ManualApplicationFormProps {
  applications: Application[];
  onAddApplication: (newApp: Omit<Application, "id" | "lastUpdatedAt">) => void;
}

export function ManualApplicationForm({
  applications,
  onAddApplication,
}: ManualApplicationFormProps) {
  // Controlled inputs state
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<ApplicationStatus>("DRAFT");
  const [cvVersion, setCvVersion] = useState("");
  const [appliedDate, setAppliedDate] = useState("");
  const [expectedSalary, setExpectedSalary] = useState<string>("");
  const [workMode, setWorkMode] = useState<WorkMode>("Remote");
  const [notes, setNotes] = useState("");

  // Error messages
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    company?: string;
    role?: string;
    cvVersion?: string;
    appliedDate?: string;
  }>({});

  // useRef untuk auto-focus ke input yang bermasalah
  const companyInputRef = useRef<HTMLInputElement | null>(null);
  const roleInputRef = useRef<HTMLInputElement | null>(null);
  const cvVersionInputRef = useRef<HTMLInputElement | null>(null);
  const appliedDateInputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setFormError(null);
      setFieldErrors({});

      const trimmedCompany = company.trim();
      const trimmedRole = role.trim();
      const trimmedCv = cvVersion.trim();
      const errors: {
        company?: string;
        role?: string;
        cvVersion?: string;
        appliedDate?: string;
      } = {};

      // 1. Validasi Wajib Isi
      if (!trimmedCompany) {
        errors.company = "Nama Perusahaan wajib diisi.";
      }
      if (!trimmedRole) {
        errors.role = "Posisi / Role wajib diisi.";
      }

      // Validasi Kondisional untuk Status APPLIED
      if (status === "APPLIED") {
        if (!trimmedCv) {
          errors.cvVersion = "Versi CV wajib diisi jika status APPLIED.";
        }
        if (!appliedDate) {
          errors.appliedDate = "Tanggal Melamar wajib diisi jika status APPLIED.";
        }
      }

      // 2. Auto-Focus ke Field Error Pertama jika ada error validasi dasar
      if (errors.company) {
        setFieldErrors(errors);
        companyInputRef.current?.focus();
        return;
      }
      if (errors.role) {
        setFieldErrors(errors);
        roleInputRef.current?.focus();
        return;
      }
      if (errors.cvVersion) {
        setFieldErrors(errors);
        cvVersionInputRef.current?.focus();
        return;
      }
      if (errors.appliedDate) {
        setFieldErrors(errors);
        appliedDateInputRef.current?.focus();
        return;
      }

      // 3. Validasi Anti-Duplikat (Company + Role)
      const isDuplicate = applications.some(
        (app) =>
          app.company.trim().toLowerCase() === trimmedCompany.toLowerCase() &&
          app.role.trim().toLowerCase() === trimmedRole.toLowerCase(),
      );

      if (isDuplicate) {
        setFormError(
          `Lamaran untuk ${trimmedRole} di ${trimmedCompany} sudah ada dalam daftar.`,
        );
        companyInputRef.current?.focus();
        return;
      }

      // 4. Submit & Reset Form
      onAddApplication({
        company: trimmedCompany,
        role: trimmedRole,
        status,
        cvVersion: status === "APPLIED" ? trimmedCv : undefined,
        appliedDate: status === "APPLIED" ? appliedDate : undefined,
        expectedSalary: expectedSalary ? Number(expectedSalary) : undefined,
        workMode,
        notes: notes.trim() || undefined,
        checklist: [],
        activityLog: [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            message: `Lamaran manual dibuat dengan status ${status}.`,
          },
        ],
      });

      // Reset Form State
      setCompany("");
      setRole("");
      setStatus("DRAFT");
      setCvVersion("");
      setAppliedDate("");
      setExpectedSalary("");
      setWorkMode("Remote");
      setNotes("");
      setFormError(null);
      setFieldErrors({});
    },
    [
      company,
      role,
      status,
      cvVersion,
      appliedDate,
      expectedSalary,
      workMode,
      notes,
      applications,
      onAddApplication,
    ],
  );

  return (
    <section aria-label="Fitur 2 - Form Tambah Lamaran Manual">
      <h2>Tambah Lamaran Manual</h2>

      {formError && (
        <div role="alert" style={{ color: "red", marginBottom: "1rem" }}>
          <strong>Error:</strong> {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="company-name">Nama Perusahaan *</label>
          <input
            id="company-name"
            ref={companyInputRef}
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Contoh: PT Teknologi Indonesia"
          />
          {fieldErrors.company && (
            <span style={{ color: "red", display: "block" }}>
              {fieldErrors.company}
            </span>
          )}
        </div>

        <div>
          <label htmlFor="role-title">Posisi / Role *</label>
          <input
            id="role-title"
            ref={roleInputRef}
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Contoh: Cybersecurity Analyst Intern"
          />
          {fieldErrors.role && (
            <span style={{ color: "red", display: "block" }}>
              {fieldErrors.role}
            </span>
          )}
        </div>

        <div>
          <label htmlFor="initial-status">Status Awal</label>
          <select
            id="initial-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
          >
            <option value="DRAFT">DRAFT</option>
            <option value="APPLIED">APPLIED</option>
          </select>
        </div>

        {/* Field Kondisional: Hanya muncul jika Status = APPLIED */}
        {status === "APPLIED" && (
          <fieldset style={{ marginTop: "1rem", marginBottom: "1rem" }}>
            <legend>Detail Lamaran (Status: APPLIED)</legend>

            <div>
              <label htmlFor="cv-version">Versi CV *</label>
              <input
                id="cv-version"
                ref={cvVersionInputRef}
                type="text"
                value={cvVersion}
                onChange={(e) => setCvVersion(e.target.value)}
                placeholder="Contoh: CV_Kapten_SecOps_v2.pdf"
              />
              {fieldErrors.cvVersion && (
                <span style={{ color: "red", display: "block" }}>
                  {fieldErrors.cvVersion}
                </span>
              )}
            </div>

            <div>
              <label htmlFor="applied-date">Tanggal Melamar *</label>
              <input
                id="applied-date"
                ref={appliedDateInputRef}
                type="date"
                value={appliedDate}
                onChange={(e) => setAppliedDate(e.target.value)}
              />
              {fieldErrors.appliedDate && (
                <span style={{ color: "red", display: "block" }}>
                  {fieldErrors.appliedDate}
                </span>
              )}
            </div>
          </fieldset>
        )}

        <div>
          <label htmlFor="work-mode">Mode Kerja</label>
          <select
            id="work-mode"
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value as WorkMode)}
          >
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
            <option value="On-site">On-site</option>
          </select>
        </div>

        <div>
          <label htmlFor="expected-salary">Ekspektasi Gaji (Rp/Bulan)</label>
          <input
            id="expected-salary"
            type="number"
            min="0"
            value={expectedSalary}
            onChange={(e) => setExpectedSalary(e.target.value)}
            placeholder="Contoh: 3500000"
          />
        </div>

        <div>
          <label htmlFor="notes">Catatan Tambahan</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tambahkan catatan singkat (opsional)..."
          />
        </div>

        <button type="submit" style={{ marginTop: "1rem" }}>
          Simpan Lamaran Manual
        </button>
      </form>
    </section>
  );
}