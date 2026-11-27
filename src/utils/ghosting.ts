import type { Application } from "../types/magang";

const FOURTEEN_DAYS =
  14 * 24 * 60 * 60 * 1000;

export function isAtRiskOfGhosting(
  application: Pick<Application, "status" | "lastUpdatedAt">,
  now: Date = new Date(),
): boolean {
  if (
    application.status !== "APPLIED" &&
    application.status !== "SCREENING"
  ) {
    return false;
  }

  const lastUpdated = Date.parse(
    application.lastUpdatedAt,
  );

  if (Number.isNaN(lastUpdated)) {
    return false;
  }

  const elapsed = now.getTime() - lastUpdated;

  return elapsed > FOURTEEN_DAYS;
}