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
] as const;

export type VisualAcuity =
  (typeof VISUAL_ACUITY_OPTIONS)[number];