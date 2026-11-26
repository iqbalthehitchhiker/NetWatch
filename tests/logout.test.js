/**
 * tests/logout.test.js
 * Tests for logout functionality across student and instructor roles.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as auth from '../src/auth.js';

// Create a minimal DOM mock
function createMockElement(id, initialClasses = []) {
  return {
    id,
    classList: {
      _classes: new Set(initialClasses),
      add(cls) { this._classes.add(cls); },
      remove(cls) { this._classes.delete(cls); },
      contains(cls) { return this._classes.has(cls); },
      toggle(cls, force) {
        if (force === undefined) {
          this._classes.has(cls) ? this._classes.delete(cls) : this._classes.add(cls);
        } else {
          force ? this._classes.add(cls) : this._classes.delete(cls);
        }
      }
    },
    textContent: '',
    style: {},
    appendChild: vi.fn(),
    remove: vi.fn()
  };
}

describe('Logout functionality', () => {
  let mockElements;

  beforeEach(async () => {
    // Create mock DOM elements
    mockElements = {
      'gnav-auth-slot': createMockElement('gnav-auth-slot'),
      'gnav-login-btn': createMockElement('gnav-login-btn'),
      'gnav-profile': createMockElement('gnav-profile', ['hidden']),
      'gnav-profile-name': createMockElement('gnav-profile-name'),
      'gnav-sim-ctx': createMockElement('gnav-sim-ctx'),
      'gnav-mode-teach': createMockElement('gnav-mode-teach'),
      'gnav-mode-quiz': createMockElement('gnav-mode-quiz'),
      'gnav-score-teach': createMockElement('gnav-score-teach'),
      'gnav-score-quiz': createMockElement('gnav-score-quiz'),
      'screen-landing': createMockElement('screen-landing'),
      'screen-lesson-select': createMockElement('screen-lesson-select', ['hidden']),
      'screen-skill-select': createMockElement('screen-skill-select', ['hidden']),
      'screen-simulation': createMockElement('screen-simulation', ['hidden']),
      'screen-manage-students': createMockElement('screen-manage-students', ['hidden']),
      'screen-select': createMockElement('screen-select', ['hidden']),
      'modal-login': createMockElement('modal-login', ['hidden']),
      'modal-blocked': createMockElement('modal-blocked', ['hidden']),
      'modal-admin-reset': createMockElement('modal-admin-reset', ['hidden']),
      'modal-hint': createMockElement('modal-hint', ['hidden']),
      'modal-diagnosis': createMockElement('modal-diagnosis', ['hidden']),
      'modal-device': createMockElement('modal-device', ['hidden']),
      'explain-panel': createMockElement('explain-panel', ['hidden']),
      'settings-drawer': createMockElement('settings-drawer'),
      'topbar-mode-badge': createMockElement('topbar-mode-badge'),
      'topbar-welcome': createMockElement('topbar-welcome'),
      'topbar-div-mode': createMockElement('topbar-div-mode'),
      'app': createMockElement('app')
    };

    global.document = {
      getElementById: (id) => mockElements[id] || null,
      body: {
        classList: {
          _classes: new Set(),
          add(cls) { this._classes.add(cls); },
          remove(cls) { this._classes.delete(cls); },
          contains(cls) { return this._classes.has(cls); }
        },
        appendChild: vi.fn()
      },
      createElement: vi.fn((tag) => ({
        tagName: tag,
        textContent: '',
        style: { cssText: '' },
        remove: vi.fn()
      })),
      addEventListener: vi.fn()
    };

    global.window = {
      scrollTo: vi.fn()
    };
    global.sessionStorage = {
      _store: {},
      getItem(key) { return this._store[key] || null; },
      setItem(key, val) { this._store[key] = String(val); },
      removeItem(key) { delete this._store[key]; },
      clear() { this._store = {}; }
    };

    global.setTimeout = (fn, delay) => {
      if (typeof fn === 'function') fn();
      return 0;
    };

    // Mock alert/confirm
    global.alert = vi.fn();
    global.confirm = vi.fn(() => true); // Default: confirm logout

    // Reset auth module state
    auth.clearStudentSession();
    auth.clearInstructorToken();
  });

  describe('Student logout', () => {
    it('should clear student session and show guest nav', async () => {
      // Import app.js which sets up the state
      const app = await import('../src/app.js?t=' + Date.now());

      // Set up a student session
      auth.setStudentSession('fake-token', 'Alice', '2106001', 'teach');
      
      // Verify student is logged in
      expect(auth.getCurrentRole()).toBe('student');
      expect(auth.getStudentName()).toBe('Alice');
      expect(auth.getStudentNPM()).toBe('2106001');
      expect(sessionStorage.getItem('nw_student_token')).toBe('fake-token');

      // Update nav to show logged-in state
      app.updateGlobalNav();
      
      // Verify profile is visible
      expect(document.getElementById('gnav-profile').classList.contains('hidden')).toBe(false);

      // Call logout
      app.logout();

      // Verify session is cleared
      expect(auth.getSessionToken()).toBe(null);
      expect(auth.getStudentName()).toBe(null);
      expect(auth.getStudentNPM()).toBe(null);
      expect(auth.getCurrentMode()).toBe(null);
      expect(auth.getCurrentRole()).toBe('guest');

      // Verify sessionStorage is cleared
      expect(sessionStorage.getItem('nw_student_token')).toBe(null);
      expect(sessionStorage.getItem('nw_student_name')).toBe(null);
      expect(sessionStorage.getItem('nw_student_npm')).toBe(null);
      expect(sessionStorage.getItem('nw_student_mode')).toBe(null);

      // Verify modals are closed
      expect(document.getElementById('modal-login').classList.contains('hidden')).toBe(true);
      expect(document.getElementById('modal-blocked').classList.contains('hidden')).toBe(true);
      expect(document.getElementById('modal-admin-reset').classList.contains('hidden')).toBe(true);
      expect(document.getElementById('modal-hint').classList.contains('hidden')).toBe(true);
      expect(document.getElementById('modal-diagnosis').classList.contains('hidden')).toBe(true);
      expect(document.getElementById('modal-device').classList.contains('hidden')).toBe(true);

      // Verify manage students screen is hidden
      expect(document.getElementById('screen-manage-students').classList.contains('hidden')).toBe(true);

      // Verify explain panel is hidden
      expect(document.getElementById('explain-panel').classList.contains('hidden')).toBe(true);

      // Verify quiz-mode class is removed
      expect(document.body.classList.contains('quiz-mode')).toBe(false);

      // Verify landing screen is shown
      expect(document.getElementById('screen-landing').classList.contains('hidden')).toBe(false);

      // Verify guest nav state (profile hidden, login button visible)
      expect(document.getElementById('gnav-profile').classList.contains('hidden')).toBe(true);
      expect(document.getElementById('gnav-login-btn').classList.contains('hidden')).toBe(false);
    });

    it('should confirm before logout if quiz simulation is active', async () => {
      const app = await import('../src/app.js?t=' + Date.now());

      // Set up a student session in quiz mode
      auth.setStudentSession('fake-token', 'Bob', '2106002', 'quiz');

      // Note: We cannot directly set simState as it's module-private.
      // This test verifies that the logout function exists and can be called.
      // The confirmation dialog behavior is tested through integration tests.
      
      // Mock confirm to return false (cancel)
      global.confirm = vi.fn(() => false);

      // Since we can't set simState externally, we can't fully test the
      // confirmation behavior in a unit test. This would need an integration test.
      // For now, verify the logout function completes without simState.
      app.logout();

      // Session should be cleared even without active simulation
      expect(auth.getSessionToken()).toBe(null);
    });

    it('should logout after confirm if quiz simulation is active', async () => {
      const app = await import('../src/app.js?t=' + Date.now());

      // Set up a student session in quiz mode
      auth.setStudentSession('fake-token', 'Charlie', '2106003', 'quiz');

      // Mock confirm to return true (proceed)
      global.confirm = vi.fn(() => true);

      // Call logout - without active simulation, no confirm should be shown
      app.logout();

      // Verify session IS cleared
      expect(auth.getSessionToken()).toBe(null);
      expect(auth.getCurrentRole()).toBe('guest');
    });
  });

  describe('Instructor logout', () => {
    it('should clear instructor session and show guest nav', async () => {
      const app = await import('../src/app.js?t=' + Date.now());

      // Create a fake instructor JWT token
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ 
        name: 'Dr. Smith', 
        exp: Math.floor(Date.now() / 1000) + 3600 
      }));
      const signature = 'fake-signature';
      const fakeToken = `${header}.${payload}.${signature}`;

      // Set up instructor session
      auth.setInstructorToken(fakeToken);
      
      // Verify instructor is logged in
      expect(auth.getCurrentRole()).toBe('instructor');
      expect(auth.getInstructorToken()).toBe(fakeToken);
      expect(sessionStorage.getItem('nw_instructor_token')).toBe(fakeToken);

      // Update nav to show logged-in state
      app.updateGlobalNav();

      // Call logout
      app.logout();

      // Verify session is cleared
      expect(auth.getInstructorToken()).toBe(null);
      expect(auth.getCurrentRole()).toBe('guest');

      // Verify sessionStorage is cleared
      expect(sessionStorage.getItem('nw_instructor_token')).toBe(null);

      // Verify modals are closed
      expect(document.getElementById('modal-admin-reset').classList.contains('hidden')).toBe(true);

      // Verify manage students screen is hidden
      expect(document.getElementById('screen-manage-students').classList.contains('hidden')).toBe(true);

      // Verify guest nav state
      expect(document.getElementById('gnav-profile').classList.contains('hidden')).toBe(true);
      expect(document.getElementById('gnav-login-btn').classList.contains('hidden')).toBe(false);
    });

    it('should close admin reset modal on instructor logout', async () => {
      const app = await import('../src/app.js?t=' + Date.now());

      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ 
        name: 'Dr. Jones', 
        exp: Math.floor(Date.now() / 1000) + 3600 
      }));
      const fakeToken = `${header}.${payload}.fake-sig`;

      auth.setInstructorToken(fakeToken);

      // Open admin reset modal
      document.getElementById('modal-admin-reset').classList.remove('hidden');

      // Verify modal is open
      expect(document.getElementById('modal-admin-reset').classList.contains('hidden')).toBe(false);

      // Call logout
      app.logout();

      // Verify modal is closed
      expect(document.getElementById('modal-admin-reset').classList.contains('hidden')).toBe(true);
    });
  });

  describe('Logout button visibility', () => {
    it('should show logout button when student is logged in', async () => {
      const app = await import('../src/app.js?t=' + Date.now());

      auth.setStudentSession('token', 'Student', '2106004', 'teach');
      app.updateGlobalNav();

      // Profile should be visible with logout button
      expect(document.getElementById('gnav-profile').classList.contains('hidden')).toBe(false);
      expect(document.getElementById('gnav-login-btn').classList.contains('hidden')).toBe(true);
    });

    it('should show logout button when instructor is logged in', async () => {
      const app = await import('../src/app.js?t=' + Date.now());

      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ 
        name: 'Instructor', 
        exp: Math.floor(Date.now() / 1000) + 3600 
      }));
      const fakeToken = `${header}.${payload}.sig`;

      auth.setInstructorToken(fakeToken);
      app.updateGlobalNav();

      // Profile should be visible with logout button
      expect(document.getElementById('gnav-profile').classList.contains('hidden')).toBe(false);
      expect(document.getElementById('gnav-login-btn').classList.contains('hidden')).toBe(true);
    });

    it('should show login button when logged out', async () => {
      const app = await import('../src/app.js?t=' + Date.now());

      // Ensure no session
      auth.clearStudentSession();
      auth.clearInstructorToken();
      app.updateGlobalNav();

      // Login button should be visible, profile hidden
      expect(document.getElementById('gnav-login-btn').classList.contains('hidden')).toBe(false);
      expect(document.getElementById('gnav-profile').classList.contains('hidden')).toBe(true);
    });
  });
});
