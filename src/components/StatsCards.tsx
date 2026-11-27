import { useMemo } from "react";
import type { Application } from "../types/magang";
import { calculateStats } from "../utils/offerStats";

interface StatsCardsProps {
  applications: Application[];
}

export function StatsCards({ applications }: StatsCardsProps) {
  // Derived state: dihitung ulang tiap applications berubah, tanpa useState.
  const stats = useMemo(() => calculateStats(applications), [applications]);

  const cards = [
    {
      label: "Total Lamaran",
      value: String(stats.total),
      note: `${stats.sent} sudah dikirim`,
    },
    {
      label: "Response Rate",
      value: `${stats.responseRate}%`,
      note: `${stats.responded} dari ${stats.sent} diproses`,
    },
    {
      label: "Interview Rate",
      value: `${stats.interviewRate}%`,
      note: `${stats.interviewed} masuk wawancara`,
    },
    {
      label: "Rawan Ghosting",
      value: String(stats.ghosting),
      note: "> 14 hari tanpa kabar",
    },
    {
      label: "Total Offer",
      value: String(stats.offers),
      note: "Siap dibandingkan",
    },
  ];

  return (
    <section className="stats-grid" aria-label="Statistik lamaran">
      {cards.map((card) => (
        <div className="stats-card" key={card.label}>
          <span className="stats-label">{card.label}</span>
          <strong className="stats-value">{card.value}</strong>
          <small className="stats-note">{card.note}</small>
        </div>
      ))}
    </section>
  );
}