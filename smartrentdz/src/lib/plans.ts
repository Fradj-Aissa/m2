export type NormalizedPlanName = "Free" | "Basic" | "Pro";

const DISPLAY_PLAN_BY_STORED = {
  free: "Free",
  basic: "Basic",
  pro: "Pro",
} as const;

export function normalizePlanName(value?: string | null): NormalizedPlanName {
  const normalized = String(value ?? "").trim().toLowerCase() as keyof typeof DISPLAY_PLAN_BY_STORED;
  return DISPLAY_PLAN_BY_STORED[normalized] ?? "Free";
}
