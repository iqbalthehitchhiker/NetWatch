# Implementation Plan: Learning Modules

## Implementation Status

- **Tasks 0-9**: ⬜ Not started
- Phase 1 (release 1): Tasks 0-8 (infrastructure plus Modules 0-2)
- Phase 2 (later): Task 9 (Modules 3-8, Explain Panel links)

---

## Overview

Add a reading-and-practice path in front of Teach Mode: short text modules with annotated screenshots and an ungraded quiz each, with per-browser read/completed tracking. No backend changes. The Simulation_Engine is untouched.

Content is a pure data module checked by tests; logic is DOM-free; rendering is separate; `app.js` gets glue only.

Dependency order: licence and docs → content contract and tests → pure logic → renderers → screen glue → entry points → content for Modules 0-2 → verification. Once Task 1 fixes the data schema, module content (Task 7) can be written in parallel with Tasks 2-5.

---

## Tasks

- [x] 0. Prerequisites
  - [x] 0.1 Switch the licence to CC BY-NC 4.0 [S]
    - Replace the MIT section of `LICENSE` with the CC BY-NC 4.0 notice; keep the font/OFL section; add the third-party screenshots and npm dependencies lines; paste the official legal code at the end
    - Add the line "Versions up to commit 457439f were released under the MIT License"
    - Update the README licence badge and the License section
    - Add `"license": "CC-BY-NC-4.0"` to `package.json`
    - Do this **before** any module content is committed
    - _Requirements: 4.2_

  - [x] 0.2 Save the spec [S]
    - Save requirements, design and tasks as `docs/modules/requirements.md`, `design.md`, `tasks.md`

- [ ] 1. Content data contract (tests first)
  - [ ] 1.1 Create `src/modules-content.js` with `MODULES = []`, `GLOSSARY = {}` and a header comment documenting the schema [S]
    - _Requirements: 8.1_
  - [ ] 1.2 Create `ATTRIBUTIONS.md` with a table: tool, version, source link, date captured, policy checked [S]
    - _Requirements: 4.1_
  - [ ] 1.3 Write `tests/modules-content.test.js` [M]
    - Properties 1, 2 and 10: unique ids; all references resolve; quiz shape (3-5 questions, one above recall, `correctIndex` in range, a note on every option); Figure files exist with alt text; every credited tool appears in `ATTRIBUTIONS.md`; `estimatedMinutes` 3-10; 2-5 takeaways; learning goal starts with "By the end you will be able to"
    - Once Module 0 exists (Task 7), also assert that `MODULES` is not empty
    - _Requirements: 2.1, 3.1, 3.4, 3.7, 4.4, 5.1, 5.2, 8.2_

- [ ] 2. Pure logic: `src/modules.js`
  - [ ] 2.1 Progress functions [M]
    - `loadProgress`, `markOpened`, `setRead`, `recordQuiz`, `stateOf`, `resetAll`; storage injected; every call in try/catch returning `{ ok: false }` on failure
    - Keys `nw_module_<moduleId>`; state derived, not stored
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.6, 6.7_
  - [ ] 2.2 Quiz state functions [S]
    - `createQuizState`, `answer`, `isDone`, `score`; in memory only
    - _Requirements: 5.3, 5.4, 5.5, 5.6_
  - [ ] 2.3 Write `tests/modules-logic.test.js` [M]
    - Properties 3-6, with fast-check where it fits: key contains no identity; state derivation and monotonicity; storage that throws on every call; corrupt stored values
    - _Requirements: 6.1, 6.4, 6.5, 6.7_

- [ ] 3. Renderer: `src/renderers/modules.js`
  - [ ] 3.1 Block renderer [M]
    - `h`, `p`, `list`, `callout`, `figure`; `{{term:id}}` becomes a link to the defining module; DOM built with `createElement`/`textContent` only
    - Figure: `<figure>` with `<img alt>` and `<figcaption>`; credit line for third-party; on image error, show alt text and caption
    - _Requirements: 3.1, 3.2, 3.7, 2.3_
  - [ ] 3.2 List view [M]
    - Cards with title, summary, minutes and a text-plus-icon state badge; "N of M completed"; two-step inline "Reset progress"; "progress won't be saved" notice when storage fails
    - _Requirements: 1.3, 6.3, 6.5, 6.6, 9.4_
  - [ ] 3.3 Viewer [M]
    - Learning goal and minutes at the top; sections; takeaways; "Mark as read" toggle; links to prepared Skills and lessons; Previous/Next/Back; "Take the quiz"
    - Heading hierarchy; marks the module as opened on view
    - _Requirements: 1.5, 2.4, 2.5, 2.6, 6.2, 9.2_
  - [ ] 3.4 Quiz view [L]
    - One question at a time; options as buttons; on answer, lock and show every option's note; focus moves to feedback (`aria-live="polite"`); optional `evidence`; summary with "Try again" and "Next module"; records completion on the last answer
    - _Requirements: 5.1-5.7, 9.1_
  - [ ] 3.5 Add rendering tests [M]
    - Property 9: content with `<script>` or `<img onerror>` renders as literal text
    - _Requirements: 3.2, 9.2_

- [ ] 4. Screen and navigation glue
  - [ ] 4.1 `index.html` and styles [M]
    - Add `#screen-modules` (hidden by default) with list, viewer and quiz sub-views
    - Add styles to `public/styles.css` using the existing tokens; check light and dark themes and phone width
    - _Requirements: 9.3, 9.5_
  - [ ] 4.2 `app.js` glue (keep under about 80 lines) [M]
    - `openModules(returnTo)`, `openModule(id)`, `closeModules()`, `_modulesReturnTo`; export through the `Object.assign(window, …)` block
    - Add `#screen-modules` to the hide list in `goToLanding()`
    - Mirror `proceedToTeach`: set `nw_intro_seen`, hide landing
    - Check `updateGlobalNav()` and `handleLogoClick()` still behave on the new screen
    - _Requirements: 1.2, 1.4, 1.5, 10.1, 10.2_
  - [ ] 4.3 Screen tests (JSDOM, following `mode-behavior.test.js`) [M]
    - Property 7: no `fetch` calls; Property 8: `#screen-modules` hidden after `goToLanding()`
    - _Requirements: 10.2, 10.3_

- [ ] 5. Entry points
  - [ ] 5.1 Landing page [S]
    - Secondary link under the two hero CTAs ("New to network monitoring? Start with the basics") with a one-line description
    - _Requirements: 1.1_
  - [ ] 5.2 Skill Select screen link [S]
    - _Requirements: 1.7_
  - [ ] 5.3 Skill and course cards [M]
    - "Prepare with" links derived by scanning `prepares`; edit `renderSkillSelect()`
    - _Requirements: 7.2, 7.3_
  - [ ] 5.4 Quiz-mode guard test [S]
    - No module link is rendered while a Quiz simulation is active
    - _Requirements: 1.6_

- [ ] 6. Checkpoint — infrastructure works
  - Run `npm test`; all existing tests plus new ones pass
  - Add a temporary placeholder module and walk the flow in a browser: landing → list → viewer → quiz → back
  - `git diff src/engine.js` is empty
  - _Requirements: 10.1, 10.4_

- [ ] 7. Phase 1 content (Modules 0-2)

  For each module: write text, capture figures, write quiz, run the tests, then do the beginner trial (Task 8.2).

  - [ ] 7.1 Module 0 — How NetWatch works [L]
    - Cover: stat bar, tabs, Teach vs Quiz, Hint, Self-Check, simulation time, attempts, explain panel
    - Crop component screenshots from NetWatch (see the Teach Mode screenshots you sent); save under `public/modules/m0-how-netwatch-works/`
    - Quiz: 3-5 questions, at least one reading or synthesis
    - _Requirements: 2.1-2.6, 3.1-3.6, 5.1-5.3_
  - [ ] 7.2 Module 1 — What network monitoring is [L]
    - Cover: symptom vs cause, baselines, "what changed first"
    - Add one real-tool dashboard figure: pick the tool, read its screenshot/trademark policy, capture it yourself, add the `ATTRIBUTIONS.md` entry **before** adding the figure, no logo
    - _Requirements: 2.1-2.6, 3.7, 4.1, 4.3, 4.4, 5.1-5.3_
  - [ ] 7.3 Module 2 — Network vocabulary [L]
    - Scan `explain-content.js` for undefined jargon (NAT, Layer 2, SYN flood, swapping, STP/TCN, gradient synchronization, uplink, baseline, etc.) and define each in the glossary
    - _Requirements: 2.3, 5.1-5.3_

- [ ] 8. Verification and release
  - [ ] 8.1 Accessibility pass [M]
    - Keyboard-only walkthrough of list, viewer and quiz; visible focus; heading order; spot-check with a screen reader; phone width with no horizontal scroll; light and dark themes
    - _Requirements: 9.1-9.5_
  - [ ] 8.2 Beginner trial [M]
    - One reader with no networking background completes each of Modules 0-2; record every term or step they got stuck on; fix the text or add a glossary entry
    - _Requirements: 11.2_
  - [ ] 8.3 Final test run [S]
    - `npm test`; confirm Quiz Mode login, attempts, scoring and leaderboard behave as before
    - _Requirements: 10.2, 10.4_
  - [ ] 8.4 Update README [S]
    - Add a "Learning Modules" section, update project structure and licence text

- [ ] 9. Phase 2 (after release 1)
  - [ ] 9.1 Modules 3-8, one task each, same steps as Task 7 [L each]
  - [ ] 9.2 Explain Panel glossary chips and overlay reader [L]
    - Show chips for glossary terms found in the panel text; open the module in an overlay that mounts the same renderer into a container; the simulation keeps running; focus trap and Esc to close
    - _Requirements: 7.1, 7.4_
  - [ ] 9.3 Optional: let renderers accept a container so live components can appear inside modules; only if screenshot upkeep becomes a problem
  - [ ] 9.4 Optional: server-side progress and an instructor view (separate spec)
