-- monifes — onboarding numbers.
-- income: monthly take-home pay (after tax).
-- baseline: where the money goes today, per bucket per month
--           { necessities, "guilt-free", investments, savings } — the "now" to the plan.
-- Both are optional and covered by the existing "Own profile" policy.

alter table public.profiles
  add column income numeric(14, 2) check (income > 0),
  add column baseline jsonb;
