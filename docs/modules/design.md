# Design Document — Learning Modules

## Overview

Learning Modules add a reading-and-practice path in front of Teach Mode. The design follows patterns already in the codebase:

- Content is a **pure data module**, like `explain-content.js`, enforced by tests.
- Logic lives in a **DOM-free module**, so it can be tested without a browser.
- The screen is shown and hidden with the `hidden` class, like `#screen-leaderboard`.
- Progress uses `localStorage` inside try/catch, like `recordTeachProgress`.
- DOM is built with `createElement` and `textContent`, never `innerHTML`.

`app.js` is already about 3,100 lines. It receives only thin glue code; all new logic goes in new files. There is no backend change.

### Decisions that adjust the requirements

1. **Landing entry (Req 1.1):** the hero already has two primary buttons. The third path is a secondary text link below them ("New to network monitoring? Start with the basics") plus a one-line description, not a third button of equal weight.
2. **Popup links (Req 7.1) move to phase 2.** Following a link from the Explain Panel would leave a running Teach simulation, and `goToLanding()` stops timers and clears `simState`. Phase 1 links come from the landing page, the Skill Select screen and skill/course cards. Phase 2 adds term chips in the Explain Panel that open the module in an overlay, so the simulation keeps running.
3. **Figure manifest (Req 3.6) is derived** from the module data by a test, so there is no separate file to keep in sync.

---

## Architecture

### File layout

```
src/modules-content.js     data: MODULES[], GLOSSARY{}
src/modules.js             pure logic: progress, quiz state, state derivation (no DOM)
src/renderers/modules.js   DOM: list, viewer, quiz
src/app.js                 glue only: openModules(), openModule(id), closeModules(),
                           window exports, add #screen-modules to goToLanding()'s hide list
index.html                 #screen-modules, landing link, Skill Select link
public/modules/<id>/*.png  figures (served at /public/modules/<id>/…)
ATTRIBUTIONS.md            third-party figure credits
tests/modules-content.test.js, modules-logic.test.js, modules-screen.test.js
```

The Express server serves the repo root as static files, so `public/modules/` works the same way `public/styles.css` does.

### Screen flow

```
Landing ──"Start with the basics"──────────► #screen-modules [list]
Skill Select ──"New to this? Start here"───► #screen-modules [list]
[list] ──open──► [viewer] ──"Take the quiz"──► [quiz] ──"Next module"──► [viewer]
[list] / [viewer] ──Back──► the screen it was opened from
```

One screen, `#screen-modules`, with three sub-views (list, viewer, quiz), toggled the way `#screen-select` toggles `#lesson-grid` and `#skill-grid`. A module-level variable `_modulesReturnTo` ('landing' or 'skills') records where Back goes.

---

## Components and Interfaces

### Module list
Renders from `MODULES` plus stored progress. Each card shows title, summary, minutes and a state badge (text plus icon, never colour alone). The header shows "N of M completed". "Reset progress" uses a two-step inline confirm ("Reset? Yes / Cancel"), avoiding a new modal.

### Module viewer
An `<article>` with the learning goal and minutes at the top, then the content blocks, then key takeaways, a "Mark as read" toggle, links to the Skills and lessons the module prepares for, Previous/Next, and "Take the quiz".

Content blocks render by `type`: `h`, `p`, `list`, `callout`, `figure`. Text may contain `{{term:id}}`, which renders as a link to the module that defines the term. A `<script>` or HTML in content renders as literal text.

### Module quiz
One question at a time. Selecting an option locks the question and shows a note under every option (why it is right or wrong). Focus moves to the feedback region (`aria-live="polite"`). After the last question the summary offers "Try again" and "Next module". Quiz state is in memory only. Optional `evidence` (a figure or text snippet) can precede the prompt for reading-tier questions. Click-on-image questions are not supported in v1.

### Progress (`src/modules.js`, storage injected)
```
loadProgress(storage, ids)        → { [id]: entry }
markOpened(storage, id)
setRead(storage, id, bool)
recordQuiz(storage, id, correct, total)
stateOf(entry)                    → 'not-started' | 'in-progress' | 'read' | 'completed'
resetAll(storage, ids)
createQuizState(quiz), answer(state, i), isDone(state), score(state)
```
Every storage call is wrapped in try/catch and returns `{ ok: false }` on failure. The UI then shows "Progress won't be saved on this device" once.

---

## Data Models

### Module content
```js
export const MODULES = [{
  id: 'm0-how-netwatch-works',
  title, summary, estimatedMinutes,          // 3–10
  goal: 'By the end you will be able to …',
  prepares: { skills: ['read_topology'], lessons: ['ddos_edge'] },
  sections: [
    { type: 'h', text },
    { type: 'p', text },                      // may contain {{term:nat}}
    { type: 'list', items: [] },
    { type: 'callout', text },
    { type: 'figure', src, alt, caption,
      credit: { tool, version, url, capturedOn } }   // credit only for third-party
  ],
  takeaways: [],                              // 2–5
  quiz: [{
    id, tier: 'recall' | 'reading' | 'synthesis',
    prompt, evidence?,
    options: [{ id, text, note }],            // note = why right / why wrong
    correctIndex,
  }],
}];

export const GLOSSARY = {
  nat: { term: 'NAT', short: '…', moduleId: 'm2-…' },
};
```
Skill and course cards derive their "Prepare with" links by scanning `prepares`. The relationship is stored once, in the module.

### Client-side storage
Key `nw_module_<moduleId>`, mirroring `nw_teach_<lessonId>`:
```js
{ openedAt, readAt?, quizAt?, bestCorrect?, total? }   // ISO timestamps
```
State is derived, not stored: `completed` = `readAt` and `quizAt`; `read` = `readAt`; `in-progress` = `openedAt`; otherwise `not-started`. No identity is ever stored.

---

## Error Handling

- **Storage unavailable or full:** content and quizzes still work; show the "won't be saved" notice.
- **Corrupt stored JSON:** treated as not started.
- **Unknown module id:** return to the list.
- **Image fails to load:** hide the broken image and show its alt text and caption.
- **Quiz Mode:** module links are never rendered during a Quiz simulation.

---

## Correctness Properties

### Property 1: References resolve
Module ids are unique, and every `prepares` skill/lesson, `{{term:…}}` and `GLOSSARY.moduleId` points to something that exists.

### Property 2: Quiz shape
Every quiz has 3 to 5 questions, at least one above recall, a `correctIndex` inside its options, and a non-empty `note` on every option.

### Property 3: Progress key never contains student identity
The key is `nw_module_` plus a module id and nothing else (mirrors Teach Property 7).

### Property 4: State derivation is consistent
`completed` iff read and quiz done. Opening a module never downgrades its state. Unmarking "read" on a completed module gives `in-progress`.

### Property 5: Storage failure never throws or blocks content
With a storage object that throws on every call, all logic functions return normally.

### Property 6: Corrupt storage is harmless
Any non-JSON or wrong-shape stored value yields `not-started`.

### Property 7: Modules make no backend calls
With `fetch` stubbed, using list, viewer and quiz never calls it, and never touches the attempt counter.

### Property 8: Navigation leaves nothing visible
After `goToLanding()`, `#screen-modules` is hidden. (The hide list in `goToLanding` is maintained by hand, so this is the likeliest regression.)

### Property 9: Content is rendered as text
Content containing `<script>` or `<img onerror=…>` produces no such elements.

### Property 10: Figures and credits are complete
Every Figure file exists and has alt text, and every credited tool name appears in `ATTRIBUTIONS.md`.

---

## Testing Strategy

- **Node tests** for data and logic (P1, P2, P4–P6, P10), in the style of `explain-content.test.js`.
- **fast-check** (already a devDependency) for P3, P4, P6, P9.
- **JSDOM tests** for the screen (P7, P8, P9), following the setup in `mode-behavior.test.js`.
- **Manual:** keyboard-only walkthrough, phone width, light and dark themes, and one beginner trial per module (Req 11.2).

## Integration points to verify during implementation

`updateGlobalNav()` (probably unchanged), `handleLogoClick()`, the `nw_intro_seen` flag set by `proceedToTeach` and `proceedToLessons`, and `renderSkillSelect()` where the prep links go. I haven't read these in detail.
