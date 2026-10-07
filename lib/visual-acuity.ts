export const VISUAL_ACUITY_OPTIONS = [
  "6/4",
  "6/5",
  "6/6",
  "6/9",
  "6/12",
  "6/18",
  "6/24",
  "6/36",
  "6/60",
  "CF @ 5m",
  "CF @ 4m",
  "CF @ 3m",
  "CF @ 2m",
  "CF @ 1m",
  "Hand Motion",
  "Perception of Light",
  "No Perception of Light",
] as const;

export type VisualAcuity =
  (typeof VISUAL_ACUITY_OPTIONS)[number];