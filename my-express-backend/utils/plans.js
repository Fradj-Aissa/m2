const DISPLAY_PLAN_BY_STORED = {
  free: 'Free',
  basic: 'Basic',
  pro: 'Pro',
};

function normalizeStoredPlan(plan, fallback = 'free') {
  const normalized = String(plan ?? '').trim().toLowerCase();
  return DISPLAY_PLAN_BY_STORED[normalized] ? normalized : fallback;
}

function normalizeDisplayPlan(plan, fallback = 'Free') {
  const storedPlan = normalizeStoredPlan(plan, '');
  return DISPLAY_PLAN_BY_STORED[storedPlan] || fallback;
}

module.exports = {
  normalizeStoredPlan,
  normalizeDisplayPlan,
};
