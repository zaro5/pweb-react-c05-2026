
import type { ApplicationStatus } from "../types/magang";

export type StatusTransitionMap = Partial<
  Record<ApplicationStatus, readonly ApplicationStatus[]>
>;

// DRAFT = WISHLIST pada soal praktikum.
export const APPLICATION_TRANSITIONS: StatusTransitionMap = {
  DRAFT: ["APPLIED"],
  APPLIED: ["SCREENING"],
  SCREENING: ["INTERVIEW"],
  INTERVIEW: ["OFFER", "REJECTED", "GHOSTED"],
  GHOSTED: ["SCREENING"],
  OFFER: [],
  REJECTED: [],
};

export function getAvailableTransitions(
  currentStatus: ApplicationStatus,
  transitions: StatusTransitionMap = APPLICATION_TRANSITIONS,
): ApplicationStatus[] {
  // Status final tidak boleh berpindah.
  if (
    currentStatus === "OFFER" ||
    currentStatus === "REJECTED"
  ) {
    return [];
  }

  // Ghosted hanya boleh kembali ke Screening.
  if (currentStatus === "GHOSTED") {
    return ["SCREENING"];
  }

  return [...(transitions[currentStatus] ?? [])];
}

export function canTransitionStatus(
  currentStatus: ApplicationStatus,
  nextStatus: ApplicationStatus,
  transitions: StatusTransitionMap = APPLICATION_TRANSITIONS,
): boolean {
  return getAvailableTransitions(
    currentStatus,
    transitions,
  ).includes(nextStatus);
}
