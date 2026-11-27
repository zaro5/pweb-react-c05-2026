import { useMemo, useState } from "react";
import type { Application } from "../types/magang";
import {
  formatRupiah,
  scoreOffers,
  type OfferScore,
} from "../utils/offerStats";

interface OfferComparatorProps {
  applications: Application[];
  kaptenSkills: string[];
}

export function OfferComparator({
  applications,
  kaptenSkills,
}: OfferComparatorProps) {
  const offers = useMemo(
    () => applications.filter((a) => a.status === "OFFER"),
    [applications],
  );

  const [selectedAId, setSelectedAId] = useState<string>("");
  const [selectedBId, setSelectedBId] = useState<string>("");

  if (offers.length < 2) {
    return (
      <section className="app-empty">
        <h2>Bandingkan Offer Magang</h2>
        <p>
          Belum cukup offer untuk dibandingkan. Dibutuhkan minimal 2 lamaran
          berstatus OFFER (saat ini: {offers.length}).
        </p>
      </section>
    );
  }

  // Derived: pilihan efektif, fallback otomatis kalau pilihan tidak valid.
  const offerA = offers.find((o) => o.id === selectedAId) ?? offers[0];
  const offerB =
    offers.find((o) => o.id === selectedBId && o.id !== offerA.id) ??
    offers.find((o) => o.id !== offerA.id) ??
    offers[1];

  const [scoreA, scoreB]: OfferScore[] = scoreOffers(
    [offerA, offerB],
    kaptenSkills,
  );

  const isTie = scoreA.total === scoreB.total;
  const winnerId = isTie
    ? null
    : scoreA.total > scoreB.total
      ? offerA.id
      : offerB.id;

  return (
    <section className="comparator">
      <header className="comparator-header">
        <div>
          <h2>Bandingkan Offer Magang</h2>
          <small>
            Bobot penilaian: Uang Saku 50% • Mode Kerja 25% • Kecocokan Skill
            25%
          </small>
        </div>

        <div className="comparator-selects">
          <label>
            Offer A:{" "}
            <select
              value={offerA.id}
              onChange={(e) => setSelectedAId(e.target.value)}
            >
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.company}
                </option>
              ))}
            </select>
          </label>

          <span>vs</span>

          <label>
            Offer B:{" "}
            <select
              value={offerB.id}
              onChange={(e) => setSelectedBId(e.target.value)}
            >
              {offers
                .filter((o) => o.id !== offerA.id)
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.company}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </header>

      {isTie && (
        <p className="comparator-tie">
          Skor kedua offer seri, tidak ada rekomendasi tunggal.
        </p>
      )}

      <div className="comparator-grid">
        {[scoreA, scoreB].map((score) => (
          <article
            key={score.application.id}
            className={`comparator-card ${
              winnerId === score.application.id ? "comparator-winner" : ""
            }`}
          >
            <div className="comparator-card-head">
              <div>
                <h3>{score.application.company}</h3>
                <small>{score.application.role}</small>
              </div>
              {winnerId === score.application.id && (
                <span className="badge-best">Rekomendasi Terbaik</span>
              )}
            </div>

            <dl className="comparator-rows">
              <div>
                <dt>Uang Saku / Bulan</dt>
                <dd>{formatRupiah(score.salary)}</dd>
                <dd>{score.salaryPoints.toFixed(1)} / 50</dd>
              </div>
              <div>
                <dt>Mode Kerja</dt>
                <dd>
                  {score.application.workMode ?? "-"} ({score.modeScore})
                </dd>
                <dd>{score.modePoints.toFixed(1)} / 25</dd>
              </div>
              <div>
                <dt>Kecocokan Skill</dt>
                <dd>
                  {score.skill.percent}% ({score.skill.matched} dari{" "}
                  {score.skill.total} skill)
                </dd>
                <dd>{score.skillPoints.toFixed(1)} / 25</dd>
              </div>
            </dl>

            <div className="comparator-total">
              <span>TOTAL SKOR BERBOBOT</span>
              <strong>{score.total.toFixed(1)}</strong>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}