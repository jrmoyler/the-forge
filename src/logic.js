export const rubric = [
  ["Evidence & correctness", 30],
  ["Completion & function", 25],
  ["Craft & clarity", 20],
  ["Handoff & reproducibility", 15],
  ["Efficiency & judgment", 10],
];
export function scorePrompt(fields) {
  return Object.values(fields).filter((v) => v.trim().length >= 20).length;
}
export function rank(xp) {
  return xp >= 2500
    ? "Architect"
    : xp >= 1200
      ? "Artisan"
      : xp >= 400
        ? "Builder"
        : "Apprentice";
}
export function earned(submissions, missions) {
  const passed = new Set(
    submissions.filter((s) => s.status === "passed").map((s) => s.mission_id),
  );
  return [...passed].reduce(
    (sum, id) => sum + (missions.find((m) => m.id === id)?.xp || 0),
    0,
  );
}
export function isSafeUrl(value) {
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
export const views = [
  "campus",
  "missions",
  "library",
  "sandbox",
  "team",
  "rewards",
];
export function parseRoute(hash) {
  const parts = hash.replace(/^#\/?/, "").split("/");
  if (parts[0] === "mission" && /^S(0[1-9]|1[0-2])$/.test(parts[1]))
    return { view: "mission", missionId: parts[1] };
  return {
    view: views.includes(parts[0]) ? parts[0] : "campus",
    missionId: null,
  };
}
export function missionState(id, submissions, progress) {
  const records = submissions.filter((s) => s.mission_id === id);
  if (records.some((s) => s.status === "passed")) return "Mastered";
  if (records.some((s) => s.status === "pending")) return "In review";
  if (records.some((s) => s.status === "revision")) return "Revise";
  if (progress?.["artifact-" + id]) return "Draft saved";
  return "Ready to begin";
}
export function nextMission(missions, submissions, progress, assignments = []) {
  return (
    missions.find(
      (m) => missionState(m.id, submissions, progress) === "Revise",
    ) ||
    missions.find(
      (m) =>
        assignments.some((a) => a.mission_id === m.id) &&
        !["Mastered", "In review"].includes(
          missionState(m.id, submissions, progress),
        ),
    ) ||
    missions.find(
      (m) => missionState(m.id, submissions, progress) === "Draft saved",
    ) ||
    missions.find(
      (m) => missionState(m.id, submissions, progress) === "Ready to begin",
    ) ||
    missions[0]
  );
}
