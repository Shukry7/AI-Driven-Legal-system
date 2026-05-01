export type PlanTier = "free" | "pro" | "premium";

export const PLAN_LIMITS: Record<PlanTier, number> = {
  free: 100,
  pro: 1000,
  premium: Number.POSITIVE_INFINITY,
};

export const TOKEN_COSTS = {
  translation: 40,
  classification: 30,
  clauseDetection: 20,
  legalLineage: 15,
} as const;

export type TokenFeature = keyof typeof TOKEN_COSTS;
