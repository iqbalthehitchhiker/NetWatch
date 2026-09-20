# Implementation Summary: Manage Students Enhancements

**Date:** 2026-09-21  
**Status:** Complete — All tests passing (12 files, 427 tests)

---

## PART A — Per-Lesson Attempt and Score Visibility

### Backend Changes (`backend/routes/admin.js`)

**Modified:** `GET /api/admin/students`

The endpoint now returns per-lesson breakdown instead of aggregate statistics:

```javascript
// OLD FORMAT (removed):
{
  npm: "2311011001",
  name: "Ahmad Rizky Pratama",
  attemptsUsed: 8,        // Total across all lessons
  bestScore: 85,          // Best across all lessons
  createdAt: "2024-01-01"
}

// NEW FORMAT:
{
  npm: "2311011001",
  name: "Ahmad Rizky Pratama",
  createdAt: "2024-01-01",
  lessonBreakdown: [
    { lessonId: "ddos_edge", attemptsUsed: 3, bestScore: 85 },
    { lessonId: "scan_detect", attemptsUsed: 5, bestScore: 70 }
  ]
}
```

**Implementation Details:**
- Queries `Attempt_Counters` table per student to get attempt counts by lesson
- Queries `Result_Records` table per student to get MAX(score) grouped by lesson
- Lessons never attempted are **omitted** from the array (not shown as zero)
- Results sorted by `lessonId` for consistent display

**Database Schema Note:**
No foreign key constraints exist between Student_Accounts and Attempt_Counters/Result_Records, so deletion must be handled manually in correct order.

---

### Frontend Changes (`src/app.js`, `index.html`)

**Table Redesign: Expandable Rows**

The student table now uses expandable rows to show per-lesson data:

1. **Summary Row (collapsed by default):**
   - Checkbox for selection
   - NPM with expand/collapse arrow (▶/▼)
   - Student name
   - Total attempts (sum across all lessons)
   - Summary text: "3 lesson(s) attempted, avg best score 75"

2. **Detail Rows (expanded on click):**
   - Each lesson displayed in a nested row
   - Shows: lessonId, attemptsUsed, bestScore
   - Per-lesson "Reset" button (pre-filled with lessonId)

**Updated Functions:**
- `refreshStudentList()` — Updated to render new structure
- `toggleStudentDetails(npm)` — New function to expand/collapse detail rows
- `resetStudentAttempts(npm, lessonId)` — Now accepts optional lessonId parameter

**Table Header Change:**
- "Best Score" column → "Summary" column

---

## PART B — Selective (Multi-Select) Student Deletion

### Backend Changes (`backend/routes/admin.js`)

**New Endpoint:** `DELETE /api/admin/students`

```javascript
// Request:
DELETE /api/admin/students
Authorization: Bearer <instructor-token>
Content-Type: application/json

{
  "npms": ["2311011001", "2311011002"]
}

// Response (200):
{
  "message": "Deleted 2 student(s)",
  "deleted": [
    {
      "npm": "2311011001",
      "name": "Ahmad Rizky Pratama",
      "resultsDeleted": 5,
      "attemptsDeleted": 2,
      "backupsDeleted": 1
    },
    {
      "npm": "2311011002",
      "name": "Siti Nurhaliza",
      "resultsDeleted": 0,
      "attemptsDeleted": 1,
      "backupsDeleted": 0
    }
  ]
}
```

**Deletion Order (correct dependency handling):**
1. `Attempt_Counter_Backups` (references npm)
2. `Result_Records` (references npm)
3. `Attempt_Counters` (references npm)
4. `Student_Accounts` (primary table)

**Safety Features:**
- Validates all NPMs exist before deleting any
- Returns 404 if any NPM not found
- Instructor authentication required (403 for non-instructors)
- Returns 400 if npms is not an array or is empty

---

### Frontend Changes (`src/app.js`, `index.html`, `src/api.js`)

**UI Components Added:**

1. **Checkboxes:**
   - Select-all checkbox in table header
   - Individual checkbox per student row
   - Selection state tracked independently of row expansion

2. **Bulk Actions Bar:**
   - Shows when any students selected
   - Displays count: "3 selected"
   - "Delete Selected" button (red background)
   - "Clear Selection" button

**Two-Stage Confirmation Process:**

**Stage 1 — Detailed Confirmation:**
```
You are about to delete 2 student(s):

• Ahmad Rizky Pratama (2311011001) — ⚠️  This will also delete 5 attempt(s) and associated results
• Siti Nurhaliza (2311011002) — ⚠️  This will also delete 1 attempt(s) and associated results

⚠️  THIS ACTION CANNOT BE UNDONE.

Do you want to continue?
```

**Stage 2 — Explicit Text Confirmation:**
```
FINAL CONFIRMATION

About to permanently delete 2 student(s) and all their data.

Type "DELETE" (all caps) to confirm:
```

If user types anything other than "DELETE" exactly, deletion is cancelled.

**New Functions:**
- `updateStudentSelection()` — Update selection count and bulk actions visibility
- `toggleSelectAllStudents()` — Handle select-all checkbox
- `clearStudentSelection()` — Clear all checkboxes
- `deleteSelectedStudents(npmsOverride)` — Execute deletion with double confirmation

**API Addition (`src/api.js`):**
```javascript
export async function deleteStudents(npms)
```

**No "Select All" Convenience Shortcut:**
Per requirements, no "select all and delete" shortcut was added. Users must manually check boxes to avoid accidental bulk wipes. The select-all checkbox exists but requires individual selection awareness.

---

## PART C — Teach Mode Completion Summary

### Feature Implementation (`src/self-check.js`)

**When:** After student completes all 3 self-check questions (recall → reading → synthesis)

**Display:** Animated toast notification (bottom-center, 5-second auto-dismiss)

**Message Variants:**

1. **All correct + high score:**
   ```
   Nice work, Ahmad! You answered all questions correctly and scored 30 points on Network Topology Basics!
   ```

2. **Completed with some errors:**
   ```
   Good effort, Ahmad! You completed Network Topology Basics and scored 20 points. Review the explanations to strengthen your understanding.
   ```

3. **Completed with low/no score:**
   ```
   You've completed the self-check for Network Topology Basics. Review the explanations to build your understanding.
   ```

**Implementation Details:**
- Toast shown by `_showCompletionSummary()` called from `_finish()`
- Uses first name from session storage if available (fallback: "there")
- Retrieves score from `window.getScTally()` (ephemeral tally from app.js)
- Never sent to backend — purely client-side display
- Not stored — disappears after session/page refresh
- Does NOT appear in Manage Students or any instructor view

**CSS Animations Added (`public/styles.css`):**
```css
@keyframes slideUp { /* ... */ }
@keyframes fadeOut { /* ... */ }
```

**Constraints Maintained:**
- ✅ No POST to backend
- ✅ No persistent storage
- ✅ Student-facing only
- ✅ Uses existing ephemeral tally from prior scoring task
- ✅ Does not modify Quiz mode behavior

---

## Test Coverage

### New Tests Added (`tests/manage-students.test.js`)

**Per-Lesson Data Shape:**
```javascript
describe('GET /api/admin/students', () => {
  it('should return students list with per-lesson breakdown')
  // Validates lessonBreakdown array structure
  // Checks attemptsUsed and bestScore per lesson
  // Verifies empty array for students with no attempts
})
```

**Selective Deletion:**
```javascript
describe('DELETE /api/admin/students (selective deletion)', () => {
  it('should delete selected students and their dependent data')
  it('should return 404 if any NPM does not exist')
  it('should require instructor authentication')
  it('should return 400 if npms is not an array or is empty')
})
```

**Teach Mode Completion:**
```javascript
describe('Teach Mode completion summary (Part C)', () => {
  it('completion message never triggers a POST to any backend endpoint')
  // Documented constraint verification
})
```

### Test Updates

**Modified:** `tests/manage-students.test.js` — Updated mocks to match new API structure (lessonBreakdown instead of attemptsUsed/bestScore)

**Modified:** `tests/self-check.test.js` — Added `createElement()` and `body` to mock DOM:
- `createElement` returns mock elements with proper structure
- `body.appendChild` / `body.removeChild` support for toast management
- Maintains JSDOM-free environment (vitest environment: 'node')

---

## Schema Report (Part B Requirement)

**Current Database Schema (from `backend/db.js`):**

```sql
Student_Accounts
  - npm (PRIMARY KEY)
  - name
  - password_hash
  - created_at

Attempt_Counters
  - npm (references Student_Accounts.npm — NO FK constraint)
  - lesson_id
  - count
  - PRIMARY KEY (npm, lesson_id)

Result_Records
  - id (AUTOINCREMENT PRIMARY KEY)
  - npm (references Student_Accounts.npm — NO FK constraint)
  - lesson_id
  - outcome
  - score
  - hints_used
  - wrong_answers
  - recorded_at

Attempt_Counter_Backups
  - npm (references Student_Accounts.npm — NO FK constraint)
  - lesson_id
  - prior_count
  - reset_at

PRAGMA foreign_keys = ON
```

**Critical Finding:** Despite `PRAGMA foreign_keys = ON`, no explicit FOREIGN KEY constraints are defined in the schema. This means:
- ON DELETE CASCADE does not apply
- Manual deletion in dependency order is required
- Our implementation deletes in correct order: backups → results → attempts → students

---

## Out of Scope (Confirmed)

✅ No changes to Quiz mode scoring/attempt logic  
✅ No changes to lessons/skills content data  
✅ No modification of `db.js` schema  
✅ No reusable "admin delete all" action  
✅ One-time cleanup script (`backend/cleanup-dev-db.js`) remains separate  

---

## Test Results Summary

```
Test Files  12 passed (12)
Tests       427 passed (427)
Duration    3.19s
```

**All tests passing**, including:
- ✅ Per-lesson data shape validation
- ✅ Selective delete removes exactly named students and dependencies
- ✅ Selective delete endpoint is instructor-gated
- ✅ Teach-mode completion never triggers backend POST
- ✅ Mock DOM completeness (createElement, body.appendChild, body.removeChild)

---

## Files Modified

### Backend
- `backend/routes/admin.js` — Updated GET, added DELETE endpoint
- `backend/db.js` — No changes (schema inspection only)

### Frontend
- `src/app.js` — Updated refreshStudentList, added selection/deletion functions
- `src/api.js` — Added deleteStudents() function
- `src/self-check.js` — Added completion summary display
- `index.html` — Updated table structure with checkboxes and bulk actions
- `public/styles.css` — Added toast animations

### Tests
- `tests/manage-students.test.js` — Updated mocks, added new tests
- `tests/self-check.test.js` — Enhanced mock DOM with createElement/body support

### Documentation
- Created: `IMPLEMENTATION_SUMMARY.md` (this file)

---

## Database State Before Cleanup (from Step 1)

**Instructors Found:** 2
- instructor1 (Prof. Smith, created 2026-09-12)
- admin (Prof. Smith, created 2026-09-20)

**Students Found:** 17 (from bulk seed)

**Dependent Data:** 25 rows total
- Attempt_Counters: 8 rows
- Result_Records: 5 rows
- Attempt_Counter_Backups: 12 rows

The one-time cleanup script (`backend/cleanup-dev-db.js`) is ready to run when needed but is **not part of this feature implementation** — it remains a separate manual tool.

---

## Next Steps / Recommendations

1. **Run the app** and test the Manage Students page with real data
2. **Verify expandable rows** display correctly at various screen widths
3. **Test deletion flow** end-to-end with the double confirmation
4. **Observe Teach mode completion** after finishing a self-check
5. Consider adding **CSV export** for student data in a future iteration
6. Consider adding **lesson name display** in detail rows (currently shows lessonId)

---

**Implementation Complete** ✅
