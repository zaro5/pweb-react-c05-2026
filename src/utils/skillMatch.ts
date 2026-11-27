import type { MatchResult } from "../types/magang";

export function calculateSkillMatch(
  requiredSkills: string[],
  captainSkills: string[],
): MatchResult {
  const required = requiredSkills
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 0);

  const captain = new Set(
    captainSkills.map((skill) =>
      skill.trim().toLowerCase()
    ),
  );

  const matchedSkills = required.filter((skill) =>
    captain.has(skill.toLowerCase())
  );

  const missingSkills = required.filter(
    (skill) => !captain.has(skill.toLowerCase()),
  );

  const score =
    required.length === 0
      ? 0
      : Math.round(
          (matchedSkills.length / required.length) * 100,
        );

  const level =
    score >= 70
      ? "Tinggi"
      : score >= 40
        ? "Sedang"
        : "Rendah";

  return {
    score,
    level,
    matchedSkills,
    missingSkills,
  };
}