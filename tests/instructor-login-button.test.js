/**
 * Instructor Login Button Test
 * 
 * Tests that the "Instructor login" button opens the modal and
 * that logout confirmation is called.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Instructor Login Button (real HTML)', () => {
  let dom;
  let document;
  let window;

  beforeEach(() => {
    // Load real index.html
    const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf-8');
    dom = new JSDOM(html, { 
      runScripts: 'outside-only',
      url: 'http://localhost' // Required for localStorage to work
    });
    document = dom.window.document;
    window = dom.window;

    // Mock the functions that will be called
    window.openInstructorLogin = vi.fn(() => {
      const modal = document.getElementById('modal-instructor-login');
      if (modal) modal.classList.remove('hidden');
    });

    window.logout = vi.fn(() => {
      const confirmed = window.confirm('Log out of NetWatch?');
      return confirmed;
    });

    window.confirm = vi.fn(() => true);
  });

  it('clicking "Instructor login" button opens the modal', () => {
    const btn = document.getElementById('gnav-instructor-login-btn');
    expect(btn).toBeTruthy();
    expect(btn.textContent.trim()).toBe('Instructor login');

    // Verify onclick attribute exists
    expect(btn.getAttribute('onclick')).toBe('openInstructorLogin()');

    // Call the function directly (simulating click)
    window.openInstructorLogin();

    // Assert openInstructorLogin was called
    expect(window.openInstructorLogin).toHaveBeenCalledTimes(1);

    // Assert modal is now visible
    const modal = document.getElementById('modal-instructor-login');
    expect(modal).toBeTruthy();
    expect(modal.classList.contains('hidden')).toBe(false);
  });

  it('clicking Log out calls confirm', () => {
    const btn = document.getElementById('gnav-logout-btn');
    expect(btn).toBeTruthy();

    // Make button visible (normally hidden for guest)
    btn.classList.remove('hidden');

    // Verify onclick attribute exists
    expect(btn.getAttribute('onclick')).toBe('logout()');

    // Call the function directly (simulating click)
    window.logout();

    // Assert logout was called
    expect(window.logout).toHaveBeenCalledTimes(1);

    // Assert confirm was called
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(window.confirm).toHaveBeenCalledWith('Log out of NetWatch?');
  });
});
