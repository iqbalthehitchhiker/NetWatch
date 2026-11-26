# Batch 2c + Batch 3: Logout & Global Nav Report

## Batch 2c: Admin Panel Logout Bug

### Bug Identified

**Root Cause**: Two issues were found:

1. **`goToLanding()` incomplete**: The function only hid `#app` and `#screen-select`, but NOT `#screen-manage-students`. After logout called `goToLanding()`, the admin panel remained visible.

2. **`updateGlobalNav()` scope limited**: The auth slot (login button / profile with logout) was only shown when `isLanding === true`. After logout on the admin panel, the function hid the auth slot entirely, leaving neither the name nor the "Log in" button visible.

**Element ID**: `#screen-manage-students` - the instructor admin panel

### Changes Made

#### 1. Fixed `goToLanding()` (src/app.js, line 423)

**Added line to hide admin panel:**
```javascript
document.getElementById('screen-manage-students').classList.add('hidden');
```

Now `goToLanding()` hides ALL non-landing screens:
- `#app` (simulation screen)
- `#screen-select` (lesson/skill select)
- `#screen-manage-students` (admin panel) ✅ NEW

#### 2. Fixed `updateGlobalNav()` (src/app.js, lines 224-258)

**Before:**
```javascript
if (authSlot) {
  if (isLanding) {
    // Show auth slot only on landing page
    authSlot.classList.remove('hidden');
    // ... role logic ...
  } else {
    // Hide auth slot on other screens ❌
    authSlot.classList.add('hidden');
  }
}
```

**After:**
```javascript
if (authSlot) {
  // Always show the auth slot (not just on landing) ✅
  authSlot.classList.remove('hidden');
  
  // Check role: instructor takes priority, then student
  const role = getCurrentRole();
  
  // ... role logic (unchanged) ...
}
```

The auth slot now appears on ALL screens with proper role-based content:
- Guest: "Log in" button
- Student: Name + "Log out" button
- Instructor: "Name (Instructor)" + "Log out" button

#### 3. Added guard to `_navigateToManageStudents()` (src/app.js, line 1638)

```javascript
function _navigateToManageStudents() {
  // Guard: redirect to landing if no valid instructor token
  if (!getInstructorToken()) {
    goToLanding();
    return;
  }
  // ... rest of function
}
```

Prevents access to admin panel if logged out or token expired.

#### 4. Added `updateGlobalNav()` call when opening admin panel (src/app.js, line 1653)

```javascript
// Show manage students screen
document.getElementById('screen-manage-students').classList.remove('hidden');

// Update global nav to show logout button ✅
updateGlobalNav();
```

Ensures the logout button appears when the admin panel opens.

---

## Batch 3: Account Block on Every Screen

### Requirement
"The account block must appear on every screen, including the admin panel, with a working Log out."

### Implementation

The auth slot (`#gnav-auth-slot`) now:
1. ✅ Appears on ALL screens (landing, lesson select, simulation, admin panel)
2. ✅ Shows correct content based on role:
   - Guest: "Log in" button
   - Student: Name + "Log out"
   - Instructor: "Name (Instructor)" + "Log out"
3. ✅ "Log out" button functions correctly on all screens
4. ✅ After logout, displays "Log in" button (guest state)

### Testing

#### Unit Tests (tests/logout.test.js - 8 tests)
- Student logout: session clearing, nav updates
- Instructor logout: token clearing, modal closing
- Logout button visibility for all roles

#### Integration Tests (tests/logout-integration.test.js - 3 tests with real HTML)
- ✅ **Admin panel logout**: Log in as instructor → open admin panel → logout → assert admin panel hidden, landing visible, "Log in" button visible
- ✅ **Logout button on admin panel**: Verify logout button appears when instructor is on admin panel
- ✅ **Guard protection**: Admin panel redirects to landing if no valid instructor token

### Test Results

```
✓ 476 total tests pass
  - 8 logout unit tests
  - 3 logout integration tests
  - 465 existing tests (all pass)
```

---

## Summary of All Changes

### src/app.js

1. **`goToLanding()`** (line 423)
   - Added: `document.getElementById('screen-manage-students').classList.add('hidden');`

2. **`updateGlobalNav()`** (lines 224-258)
   - Removed: `if (isLanding)` conditional wrapping auth slot display
   - Changed: Auth slot now always visible on all screens
   - Kept: Role-based content logic unchanged

3. **`_navigateToManageStudents()`** (line 1638)
   - Added: Guard to check `getInstructorToken()` and redirect if null
   - Added: `updateGlobalNav()` call after showing admin screen

4. **`logout()`** (no changes from Batch 2c)
   - Already calls `logoutInstructor()` or `logoutStudent()` correctly
   - Already hides `#screen-manage-students`
   - Already calls `goToLanding()` and `updateGlobalNav()`

### New Test Files

1. **tests/logout.test.js** (created in Batch 2c)
   - 8 unit tests with mocked DOM elements

2. **tests/logout-integration.test.js** (created in Batch 3)
   - 3 integration tests using real `index.html` markup via jsdom
   - Tests actual DOM structure and behavior

### Dependencies Added

- `jsdom` (dev dependency for integration tests)

---

## Browser Testing Checklist

✅ **To verify manually:**

1. Log in as student → verify name + "Log out" appears on all screens
2. Log in as instructor → open admin panel → verify "Name (Instructor)" + "Log out" appears
3. While on admin panel → click "Log out" → verify:
   - Admin panel closes
   - Landing page appears
   - "Log in" button is visible
   - SessionStorage is cleared
4. Try to access admin panel as guest → verify redirect to landing
5. During active quiz → logout → verify confirmation dialog appears
6. After logout from any screen → verify "Log in" button appears

---

## Status

✅ **Batch 2c Complete**: Logout bug fixed
✅ **Batch 3 Complete**: Account block appears on every screen with working logout
✅ **All 476 tests passing**
✅ **Ready for browser testing**
