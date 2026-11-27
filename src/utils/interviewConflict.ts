import type { Application } from "../types/magang";

export interface InterviewConflict {
  first: Application;
  second: Application;
  minutesApart: number;
}

export function findInterviewConflicts(
  applications: readonly Application[],
): InterviewConflict[] {
  const interviews = applications
    .filter(
      (application) =>
        application.status === "INTERVIEW" &&
        Boolean(application.interviewAt),
    )
    .map((application) => ({
      application,
      timestamp: Date.parse(application.interviewAt!),
    }))
    .filter((item) =>
      Number.isFinite(item.timestamp)
    );

  const conflicts: InterviewConflict[] = [];

  for (let i = 0; i < interviews.length; i++) {
    for (let j = i + 1; j < interviews.length; j++) {
      const difference = Math.abs(
        interviews[i].timestamp -
          interviews[j].timestamp,
      );

      const minutesApart = difference / 60000;

      if (minutesApart < 60) {
        conflicts.push({
          first: interviews[i].application,
          second: interviews[j].application,
          minutesApart: Math.round(minutesApart * 10) / 10,
        });
      }
    }
  }

  return conflicts;
}