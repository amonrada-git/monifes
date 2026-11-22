# monifes — Product Spec

_A psychology-focused budgeting app. A spending log is a rear-view mirror; monifes is a windshield._

---

## The core belief

Recording what you spent is just **history** — and history alone doesn't make anyone wealthier.
Real change comes from two things most budget apps ignore:

1. **Understanding *why* you spent** — the emotion behind the purchase.
2. **Seeing yourself improve** — a sense of momentum, "better than yesterday."

Emotion is the bridge between *what I spent* and *who I want to become*. monifes makes the
**feeling the primary data** and the money secondary.

**Tone:** calm, mindful, non-judgmental. No red warnings, no shame. Awareness over control.

---

## Who it's for

People in **Japan and Thailand**, launching publicly by **end of December 2026**.
Phone-first: it must look and feel great on a phone above all.

**Accounts (decided Nov 2026):** try first, sign in to save. Visitors can log spends as a
guest on the device; "Continue with email" sends a one-time code (no passwords) and carries
the guest's spends into the new account.

**Backend:** Supabase, Singapore region (between Japan and Thailand). Postgres with Row Level
Security, so each person can only ever read their own rows. Auth emails go out through Resend
from `no-reply@monifes.com`; templates and the 8-digit code length live in the Supabase
dashboard. Schema: `supabase/migrations/`. The app saves on the device first and syncs in the
background, so it keeps working offline.

---

## The three jobs of the app

1. **Capture** — log a spend in under 2 minutes, mostly taps. Fast enough to actually do daily.
2. **Learn (the mirror)** — spending organized by *feeling*, so you see your emotional patterns.
3. **Grow (the windshield)** — forward-looking progress: the Need:Want climb + growing wealth.

---

## Capture — two taps per spend

Each spend records: **amount**, **bucket**, **feeling**.

**Feelings** (tap one):
- 😌 Worth it — aligned with what I value
- 😊 Joy — this genuinely made me happy
- 😐 Meh — neutral, just needed it
- 😬 Impulse — didn't plan this
- 😔 Regret — wish I hadn't

The two layers reinforce each other — e.g. discovering most "Want" spending is tagged
*Impulse* or *Regret* shows exactly where to shift.

---

## The Need : Want progress game

Progress = **how close your Need : Want ratio gets to your chosen target.**
It's a gradual climb, never pass/fail. You might start at 40:60 and nudge toward your goal.

**Difficulty levels** (this is the user's goal, not a rule the app imposes):
- 🟢 **60:40 — Easy** — build the habit without pressure; lowers the barrier to start
- 🔵 **70:30 — Recommended** — the default, where real change starts to show
- 🔴 **80:20 — Hard** — for people serious about transforming their finances

Default is 70:30. The Need:Want game is played between **Necessities** and **Guilt-free spending**.

---

## The 4-category plan (budgeting)

Introduced **gently** and optionally — spending comes first. Many users aren't ready to budget
yet, so the home screen offers a friendly, dashed "Let's set up budgets" prompt rather than
forcing it.

| Category | Role | Concept |
|---|---|---|
| 🏠 Necessities | Need | Rent, food, bills — survival |
| 🎉 Guilt-free spending | Want | Fun, no shame — spend it and enjoy it |
| 📈 Investments | Wealth | Money that grows itself |
| 🎯 Savings Goals | Wealth | Money set aside for specific dreams |

"Guilt-free" names the emotion on purpose — permission to enjoy Wants without guilt.

---

## The growth reward loop (the "seed-to-plant")

The daily action is a **check-in**, not necessarily a spend. Every day you either:
- 💸 **Spent something** → log it (2 taps), or
- 🎉 **Spent nothing** → tap **"No-spend day"**

Both earn a reward. A **no-spend day is a celebrated win** — spending zero is how wealth is
built, so it may be worth even more than a normal check-in. Unlike a Duolingo fire-streak that
*shames* you for missing, monifes *rewards* you for a day you didn't need to spend.

The reward is visualized as a **🌱 seed that grows into a plant** — each check-in waters it,
no-spend days grow it faster. Over weeks you watch it flourish: a calm, living picture of
"becoming better than yesterday."

---

## Screens (Phase 1)

Bottom navigation, four tabs:

- 🏠 **Home** — daily heartbeat: check-in (`+` capture / "No-spend day"), the growing plant,
  gentle budget-setup prompt, recent activity, Need:Want balance donut.
- 📊 **Insights** — the mirror: spending organized by feeling; emotional patterns over time.
- 🌱 **Becoming** — the 4-bucket plan + difficulty selector; savings goals and progress.
- 👤 **Profile** — settings: currency, target/difficulty, preferences.

**Look & feel (updated Nov 2026):** soft and tactile. Warm-white surfaces (`#F9F8F5`) sit
raised on a warm light canvas (`#ECEBE6`), lit from above: a bright top edge and a soft warm
shadow (`.raised`). A set of options sits in a white tray (`.tray`); the chosen option is a
glossy ink key that stands off the tray (`.key-on`), the rest stay flat. The primary action
is the same ink key (`.btn-ink`); inputs are inset wells (`.well`). The tab bar is a floating
tray with the current tab as the ink key. Ink `#020201` is still the one accent; charts stay
1px outlined (hollow-band rings), no bold text (medium/regular only), Inter, 22px card
radius, month-as-dot-grid on Insights (filled = spent, open ring = no-spend win, faint =
quiet). Phone frame: iPhone 13 / 390px.

---

## Phase 2 (later)

- 📚 **1-minute daily money micro-lessons.** Small bite-sized learning, one minute a day.
  Feeds the *same* growth loop — lessons also grow the plant. Awareness (check-ins) + knowledge
  (lessons) is what turns "recording history" into "becoming wealthy."
- 💳 **Live card connection.** CSV import shipped in Phase 1 (below). A live connection would go
  through an aggregator (Moneytree LINK in Japan; Thailand coverage unclear) — needs a business
  contract, so it's after launch.

## Open decision (next session)

- **Where does "No-spend day 🎉" live?** The connect-card prompt replaced the yes/no ask, so
  there is currently no way to mark a no-spend day from the UI. Leading option: a quiet text
  link under the Connect / Record-manually buttons. Alternative: auto-count empty days at
  midnight (loses the deliberate tap). Claude recommends the text link.

## Built so far (Phase 1 status)

- ✅ Home: streak + plant header, dashed budget prompt, Recent activity (fills screen, holds
  the daily ask + Add), Need:Want hollow-band ring
- ✅ Capture: amount keypad (decimal-aware per currency) → bucket → feeling → done
- ✅ Insights: month dot-grid (rest of the mirror pending)
- ✅ Profile: debug presets (no data / some data / data + budget); settings pending
- ✅ Local storage w/ validation; deep code review passed (9 findings fixed)
- ✅ Accounts: email-code sign-in, Supabase sync with offline queue, guest → account
  migration, sign out (Profile → Account card)
- ✅ Statement import (Home → Import): any card's CSV, UTF-8 or Shift_JIS, preamble lines
  skipped; date/shop/amount columns guessed then confirmable; payments & refunds left out; each
  purchase tagged with bucket + feeling (shop's usual bucket preselected). Ids are derived from
  the row, so re-importing a statement only shows what's new. Not yet tried on a real Amex file.
- ✅ Meet you (first two onboarding steps): "Welcome to monifes / What should we call you?",
  then "Which one feels like you?" — two answers (woman/man · light/medium/deep skin) pick your
  clay character from a cast of six; the portrait swaps instantly on the card. Portraits in
  `public/cast/<id>/portrait.webp`, all one pose, lined up to the same height, feet line and
  background tone. Made once with Figma AI in "monifes — clay art" — no running cost. Saved
  locally under `monifes:me:v1` for now (not yet synced).
  Next (decided 2026-11-22): more base characters (hair options) + clay dress-up accessories
  layered on the portrait (glasses, hats… — tested, looks natural), and three mascots as your
  little friends: the sprout, a Siamese lucky cat, a Shiba Inu guide dog. "You're the hero,
  the mascot is your little friend."
  Tried and dropped: a 3D clay figure in three.js (not cute enough), an ink line-art builder
  (preferred clay), and per-person AI generation through AI Gateway (≈ ¥30 a person; in git
  history, commit 0c93eb9).
- ✅ Welcome: "See who you could become." — an album of six clay moments with no one in them
  (places, not people — the life is yours to picture): more time with family · free to travel ·
  building your own thing · living in abundance · at peace with money · watching your wealth
  grow. A swipeable scroll-snap stack (neighbours tucked behind, tilted), caption + page dots;
  turns its own pages until touched. Art from Figma AI ("monifes — clay art",
  ydtxVcnpFQreMj7ip1y4Pi, Signary team), 720px WebP in `public/scenes/`. Becoming's no-plan card shows the
  today → becoming ring demo (3% → 20% of pay kept).
- ✅ Onboarding "magic moment" (first run, or Becoming → Make my plan): take-home pay → a
  suggested four-bucket plan drawn as one ring (the Home ring's band, cut into the buckets;
  income no bucket covers stays as the bare track). Spending share by difficulty
  (Easy 85% / Recommended 80% / Hard 75%) split by the Need:Want target; the rest is half
  invested, half saved. Toggling difficulty reshapes the ring live. Then "today, roughly"
  per bucket → Now vs Plan rings (% that builds wealth in the hole), monthly build, Need:Want now → target, the 12-month
  difference. Income + baseline live on `profiles` (migration 0002).
- ✅ Becoming tab (was "Goals" — named for the transformation, not a target): the plan, this month's spending vs plan per bucket, start → plan, redo.
- ⏳ Launch needs: export my data, delete my account, privacy policy, deploy to monifes.com

---

## Out of scope (for now)

- Bank syncing / automatic import
- Desktop-first layouts (mobile is the priority)
