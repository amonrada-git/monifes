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

A single user (personal tool). Phone-first: it must look and feel great on a phone above all.
No accounts or multi-user in Phase 1.

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
- 🚩 **Goals** — the 4-bucket plan + difficulty selector; savings goals and progress.
- 👤 **Profile** — settings: currency, target/difficulty, preferences.

**Look & feel (updated Jul 2026):** design reference is **thedot.space** — warm greige paper
canvas `#D1D0CC`, ink `#020201`, gray `#91908C`. Flat borderless cards one step lighter than
the canvas, 1px outlined charts (hollow-band ring), no bold text (medium/regular only,
hierarchy via size & gray), Inter font, 8px card radius, month-as-dot-grid on Insights
(filled = spent, open ring = no-spend win, faint = quiet). Phone frame: iPhone 13 / 390px.

---

## Phase 2 (later)

- 📚 **1-minute daily money micro-lessons.** Small bite-sized learning, one minute a day.
  Feeds the *same* growth loop — lessons also grow the plant. Awareness (check-ins) + knowledge
  (lessons) is what turns "recording history" into "becoming wealthy."
- 💳 **Card import.** Home already shows a "Connect" button (stubbed with a coming-soon note).
  Direction agreed: don't auto-sync silently — import a statement (CSV first), then walk
  through tagging each transaction with a feeling, so imported spends still pass through the
  mirror. Automation for completeness, manual for meaning.

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
- ⏳ Goals tab: placeholder — 4-bucket budget setup + difficulty picker not built yet

---

## Out of scope (for now)

- Multi-user / accounts / auth
- Bank syncing / automatic import
- Desktop-first layouts (mobile is the priority)
