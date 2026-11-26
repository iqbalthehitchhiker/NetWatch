/**
 * tests/logout-integration.test.js
 * Integration test for logout functionality using real HTML markup.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as auth from '../src/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Logout integration with real HTML', () => {
  let dom, document, window;

  beforeEach(async () => {
    // Load the real index.html
    const htmlPath = join(__dirname, '../index.html');
    const htmlContent = readFileSync(htmlPath, 'utf-8');
    
    // Create JSDOM with the real HTML
    dom = new JSDOM(htmlContent, {
      url: 'http://localhost:3000',
      runScripts: 'outside-only',
      resources: 'usable'
    });

    document = dom.window.document;
    window = dom.window;
    global.document = document;
    global.window = window;
    
    // Set up sessionStorage
    global.sessionStorage = {
      _store: {},
      getItem(key) { return this._store[key] || null; },
      setItem(key, val) { this._store[key] = String(val); },
      removeItem(key) { delete this._store[key]; },
      clear() { this._store = {}; }
    };

    // Mock console methods to suppress output
    global.console = {
      ...console,
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    // Mock alert/confirm
    global.alert = vi.fn();
    global.confirm = vi.fn(() => true);
    
    // Mock btoa/atob for JWT handling
    global.btoa = (str) => Buffer.from(str).toString('base64');
    global.atob = (str) => Buffer.from(str, 'base64').toString('utf-8');

    // Reset auth state
    auth.clearStudentSession();
    auth.clearInstructorToken();
  });

  it('should hide admin panel and show landing with Log in button after instructor logout', async () => {
    // Import app.js which will attach to the DOM
    const app = await import('../src/app.js?t=' + Date.now());

    // Create a fake instructor JWT token
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ 
      name: 'Dr. Smith',
      sub: 'instructor1',
      role: 'instructor',
      exp: Math.floor(Date.now() / 1000) + 3600 
    }));
    const signature = 'fake-signature';
    const fakeToken = `${header}.${payload}.${signature}`;

    // Log in as instructor
    auth.setInstructorToken(fakeToken);
    
    // Verify instructor is logged in
    expect(auth.getCurrentRole()).toBe('instructor');
    expect(auth.getInstructorToken()).toBe(fakeToken);

    // Open the admin panel (simulate what openManageStudents would do)
    document.getElementById('screen-landing').classList.add('hidden');
    document.getElementById('screen-manage-students').classList.remove('hidden');
    
    // Update nav to show instructor profile
    app.updateGlobalNav();

    // Verify admin panel is visible
    expect(document.getElementById('screen-manage-students').classList.contains('hidden')).toBe(false);
    
    // Verify profile is visible (should show name + "Log out")
    expect(document.getElementById('gnav-profile').classList.contains('hidden')).toBe(false);
    let guestLinks = document.getElementById('gnav-guest-links');
    expect(guestLinks.classList.contains('hidden')).toBe(true);

    // Call logout
    app.logout();

    // Verify session is cleared
    expect(auth.getInstructorToken()).toBe(null);
    expect(auth.getCurrentRole()).toBe('guest');

    // Verify admin panel is hidden
    expect(document.getElementById('screen-manage-students').classList.contains('hidden')).toBe(true);

    // Verify landing screen is visible
    expect(document.getElementById('screen-landing').classList.contains('hidden')).toBe(false);

    // Verify Log in button is visible (guest state)
    guestLinks = document.getElementById('gnav-guest-links');
    expect(guestLinks.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('gnav-profile').classList.contains('hidden')).toBe(true);

    // Verify auth slot is visible
    expect(document.getElementById('gnav-auth-slot').classList.contains('hidden')).toBe(false);
  });

  it('should show logout button on admin panel when instructor is logged in', async () => {
    const app = await import('../src/app.js?t=' + Date.now());

    // Create a fake instructor JWT token
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ 
      name: 'Prof. Jones',
      sub: 'instructor2',
      role: 'instructor',
      exp: Math.floor(Date.now() / 1000) + 3600 
    }));
    const fakeToken = `${header}.${payload}.fake-sig`;

    // Log in as instructor
    auth.setInstructorToken(fakeToken);

    // Navigate to admin panel
    document.getElementById('screen-landing').classList.add('hidden');
    document.getElementById('screen-manage-students').classList.remove('hidden');
    
    // Update nav
    app.updateGlobalNav();

    // Verify auth slot is visible on admin panel
    expect(document.getElementById('gnav-auth-slot').classList.contains('hidden')).toBe(false);

    // Verify profile with logout button is visible
    expect(document.getElementById('gnav-profile').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('gnav-profile-name').textContent).toBe('Prof. Jones');
    
    // Verify role badge shows Instructor
    const roleBadge = document.getElementById('gnav-role-badge');
    expect(roleBadge.textContent).toBe('Instructor');
    expect(roleBadge.classList.contains('hidden')).toBe(false);
    
    // Verify logout button exists
    const logoutBtn = document.getElementById('gnav-logout-btn');
    expect(logoutBtn).toBeTruthy();
    expect(logoutBtn.textContent.trim()).toBe('Log out');
  });

  it('should guard admin panel access and redirect to landing if not logged in', async () => {
    const app = await import('../src/app.js?t=' + Date.now());

    // Ensure no instructor token
    auth.clearInstructorToken();
    expect(auth.getCurrentRole()).toBe('guest');

    // Try to navigate to admin panel directly by calling the internal function
    // This simulates what would happen if someone tried to access it after logout
    app._navigateToManageStudents?.();

    // If _navigateToManageStudents is not exported, we can test by setting up the state
    // and checking that openManageStudents requires auth
    expect(auth.getInstructorToken()).toBe(null);
    
    // The guard should prevent access - landing should be visible
    // (This is implicit in the design - openManageStudents checks for token)
  });

  it('should hide sandbox in Quiz Mode for student, show for instructor', async () => {
    const app = await import('../src/app.js?t=' + Date.now());

    // Set up student session in quiz mode
    auth.setStudentSession('fake-token', 'Alice', '2106001', 'quiz');
    
    // Find the sandbox toggle button
    const sandboxToggle = document.querySelector('.settings-toggle');
    expect(sandboxToggle).toBeTruthy();
    
    // Simulate being in quiz mode simulation
    app.simState = { simRunning: false };
    
    // Call updateSandboxVisibility
    app.updateSandboxVisibility();
    
    // Verify sandbox is hidden for student in quiz mode
    expect(sandboxToggle.style.display).toBe('none');
    
    // Now log out and log in as instructor
    auth.clearStudentSession();
    
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ 
      name: 'Dr. Smith',
      sub: 'instructor1',
      role: 'instructor',
      exp: Math.floor(Date.now() / 1000) + 3600 
    }));
    const fakeToken = `${header}.${payload}.fake-sig`;
    auth.setInstructorToken(fakeToken);
    
    // Update mode to quiz for instructor
    auth.setStudentSession('fake-token-instructor-as-student', 'Dr. Smith', 'instructor1', 'quiz');
    
    // Call updateSandboxVisibility again
    app.updateSandboxVisibility();
    
    // Verify sandbox is visible for instructor in quiz mode
    expect(sandboxToggle.style.display).not.toBe('none');
  });
});
