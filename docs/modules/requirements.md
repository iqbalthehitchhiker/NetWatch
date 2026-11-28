# Requirements Document — Learning Modules

## Introduction

This feature adds a series of short reading modules to NetWatch for students who have no teacher and no networking background. Each module teaches one idea about network monitoring in plain text, with annotated screenshots of NetWatch components and of real open-source monitoring tools, and ends with an ungraded quiz. Students can see which modules they have read and completed.

Modules are a third entry path from the landing page, alongside Teach Mode and Quiz Mode. They require no login. They do not affect Quiz Mode attempts, scores or the leaderboard.

Modules teach the vocabulary and reasoning needed to use Teach Mode, and prepare students for it. They do not replace the Explain_Panel or Skill cards. Scope is network monitoring and diagnosis only; general cybersecurity is out of scope.

---

## Glossary

- **Module**: One reading unit with a single learning goal, identified by a unique `moduleId`.
- **Module_List_Screen**: The screen listing all Modules in recommended order with each Module's progress state.
- **Module_Viewer**: The screen that displays one Module's content.
- **Module_Quiz**: The ungraded question set at the end of a Module.
- **Module_Progress**: The per-Module record of read and quiz state, stored in the browser.
- **Figure**: An image in a Module, with alt text, caption and (for third-party images) an attribution.
- **Attribution_Manifest**: The file listing every third-party Figure with tool name, version, source link and the screenshot policy checked.
- **Glossary_Term**: A defined networking term that a Module introduces and that Explain_Panel text can link to.
- **Tier**: Question level as in Self_Check: recall, reading or synthesis.
- Terms Teach Mode, Quiz Mode, Landing Page, Skill, Self_Check, Explain_Panel and Simulation_Engine keep their meanings from the existing requirements document.

---

## Requirements

### Requirement 1: Module Entry and Navigation

**User Story:** As a student new to networking, I want a clear starting point before Teach Mode, so that I can learn the basics without a teacher.

#### Acceptance Criteria

1. THE Landing Page SHALL present three top-level paths: the two existing paths and a third labelled "Start with the basics" (Modules), each with a description of no more than 30 words. This amends Requirement 1 of the existing document.
2. WHEN the student activates "Start with the basics", THE NetWatch SHALL show the Module_List_Screen without a login.
3. THE Module_List_Screen SHALL list Modules in the recommended order, showing title, one-sentence summary, estimated minutes and progress state for each.
4. THE student SHALL be able to open any Module in any order. THE NetWatch SHALL NOT lock Modules behind earlier ones.
5. WHEN a Module is open, THE Module_Viewer SHALL provide "Previous", "Next" and "Back to list" actions.
6. WHILE a Quiz Mode simulation is running, THE NetWatch SHALL NOT display links to Modules.
7. THE Skill Select screen SHALL include a visible link to the Module_List_Screen for students who are new to the topic.

---

### Requirement 2: Module Content Structure

**User Story:** As a student, I want each module to be short and focused, so that I can finish it in one sitting.

#### Acceptance Criteria

1. EACH Module SHALL define: `id`, `title`, `summary`, `estimatedMinutes` (3 to 10), a one-sentence learning goal beginning "By the end you will be able to", ordered content sections, and key takeaways (2 to 5 items).
2. EACH Module SHALL teach one idea, stated in its learning goal.
3. WHEN a networking term is used for the first time in a Module, THE Module SHALL define it in plain language or link to its Glossary_Term.
4. EACH Module SHALL end with its key takeaways, followed by the Module_Quiz.
5. THE Module_Viewer SHALL show the Module's estimated minutes and its learning goal at the top.
6. EACH Module SHALL name the Skills and lessons it prepares the student for, and THE Module_Viewer SHALL link to them.

---

### Requirement 3: Figures and Screenshots

**User Story:** As a student, I want to see what the components look like in NetWatch and in real tools, so that I recognise them when I meet them.

#### Acceptance Criteria

1. EACH Figure SHALL have alt text and a visible caption stating what to notice in it.
2. EACH Figure SHALL be a local file stored in the repository. THE NetWatch SHALL NOT hotlink images from external sites.
3. EACH Figure file SHALL be no larger than 300 KB.
4. THE Module text SHALL describe the important content of every Figure, so that a student who cannot see the image can follow the Module.
5. THE Module text SHALL NOT identify features by their position on screen alone (for example "top right"). It SHALL use labels or visual descriptions.
6. FOR every NetWatch Figure, THE Module SHALL cite which component it shows. A manifest SHALL record which Modules use which image, so images can be retaken after a UI change.
7. FOR every third-party Figure, THE Module SHALL show the tool name and version in the caption and a link to the tool's source.

---

### Requirement 4: Attribution and Licensing

**User Story:** As the project owner, I want third-party material credited and kept apart from the project's own license, so that its use is clear and legitimate.

#### Acceptance Criteria

1. THE repository SHALL contain an Attribution_Manifest listing each third-party Figure with: tool name, version, source link, date captured, and the screenshot or trademark policy that was checked.
2. THE project's license file SHALL state that third-party screenshots belong to their respective projects and are not covered by the project license.
3. THIRD-party Figures SHALL be screenshots taken from a running copy of the tool by the project author, and SHALL NOT include the tool's logo.
4. A third-party Figure SHALL NOT be added to a Module until its Attribution_Manifest entry exists.

---

### Requirement 5: Module Quiz

**User Story:** As a student, I want questions at the end of each module, so that I can check I understood it.

#### Acceptance Criteria

1. EACH Module_Quiz SHALL contain 3 to 5 multiple-choice questions, each with a Tier.
2. EACH Module_Quiz SHALL contain at least one question above the recall Tier (reading or synthesis).
3. WHEN the student answers a question, THE Module_Quiz SHALL immediately show whether it was correct and an explanation of why the correct option is correct and why each incorrect option is wrong.
4. THE Module_Quiz SHALL be ungraded, with unlimited retries and no attempt counter.
5. WHEN the student finishes the last question, THE Module_Quiz SHALL show a summary of correct answers and offer "Try again" and "Next module".
6. THE Module_Quiz result SHALL NOT be sent to the server, and SHALL NOT be used for grading or the leaderboard. THE correct answers MAY exist in client code, because the quiz is a practice tool only.
7. THE Module_Quiz SHALL NOT use the Attempt_Counter or Result_Record.

---

### Requirement 6: Progress Tracking

**User Story:** As a student, I want to see which modules I have read and finished, so that I know where to continue.

#### Acceptance Criteria

1. EACH Module SHALL have one of four states: "Not started", "In progress" (opened), "Read" (marked as read) and "Completed" (read and Module_Quiz finished at least once).
2. THE Module_Viewer SHALL provide a "Mark as read" action, and THE Module_Quiz completion SHALL update the state without further action.
3. THE Module_List_Screen SHALL show each Module's state and an overall count such as "3 of 9 completed".
4. THE Module_Progress SHALL be stored in the browser on the student's device only, and SHALL contain no personal information.
5. WHEN browser storage is unavailable or fails, THE NetWatch SHALL still display and run all Modules and quizzes, and SHALL tell the student that progress will not be saved.
6. THE Module_List_Screen SHALL provide a "Reset progress" action that requires confirmation.
7. THE Module_Progress SHALL NOT depend on, or be linked to, a Student_Account.

---

### Requirement 7: Integration with Teach Mode

**User Story:** As a student reading a popup full of unfamiliar terms, I want to jump to the matching module, so that I can learn what the term means.

#### Acceptance Criteria

1. WHERE an Explain_Panel entry uses a defined Glossary_Term, THE Explain_Panel SHALL link that term to the Module that defines it.
2. EACH Skill card SHALL link to the Modules that prepare for it.
3. EACH course card SHALL show its recommended Modules.
4. WHEN the student follows any such link and activates "Back", THE NetWatch SHALL return to the screen the student came from.
5. THE existing Self_Check SHALL remain unchanged.

---

### Requirement 8: Content Data Contract

**User Story:** As the author, I want module content to be plain data checked by tests, so that mistakes are caught before students see them.

#### Acceptance Criteria

1. MODULE content SHALL live in a data module with no DOM or runtime logic, in the same way as the Explain_Panel content.
2. A test SHALL fail if any of these is true: duplicate `moduleId`; missing learning goal, key takeaways, or fewer than 3 or more than 5 questions; no question above the recall Tier; a `correctIndex` outside its options; a question without an explanation; a Figure file that does not exist or has no alt text; a third-party Figure without an Attribution_Manifest entry; a Skill, lesson or Glossary_Term reference that does not exist.
3. Adding a Module SHALL NOT require changes to rendering code.

---

### Requirement 9: Accessibility and Responsiveness

#### Acceptance Criteria

1. THE Module_List_Screen, Module_Viewer and Module_Quiz SHALL be fully usable by keyboard, with visible focus.
2. THE Module pages SHALL use a correct heading structure.
3. THE Module pages and Figures SHALL remain legible in both light and dark themes, and SHALL respect the theme chosen under Requirement 14.
4. THE Module pages SHALL NOT rely on colour alone to convey meaning.
5. THE Module pages SHALL be usable at phone width without horizontal scrolling.

---

### Requirement 10: Preservation of Existing Behaviour

#### Acceptance Criteria

1. THE Simulation_Engine SHALL NOT be modified.
2. Quiz Mode authentication, attempt limiting, scoring, results and the leaderboard SHALL behave as before.
3. THIS phase SHALL add no backend endpoints or database tables.
4. ALL existing tests SHALL continue to pass.

---

### Requirement 11: Phased Delivery and Quality Check

#### Acceptance Criteria

1. THE first release SHALL contain Module 0 (How NetWatch works), Module 1 (What network monitoring is) and Module 2 (Network vocabulary). Later Modules SHALL be added one at a time.
2. BEFORE each Module is released, at least one reader with no networking background SHALL complete it, and any term they did not understand SHALL be defined or linked.

---

## Out of Scope (this phase)

- Server-side progress and instructor progress view
- Graded module quizzes
- Video, certificates, and general cybersecurity content
- Live NetWatch components rendered inside Modules
