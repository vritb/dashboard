/**
 * Global Vitest setup
 *
 * This file runs before each test file and sets up the global test environment.
 */

// Add any global test setup here
// For example, adding custom matchers, mocking global objects, etc.

// Mock global objects if needed
global.requestAnimationFrame = callback => setTimeout(callback, 0);

// Mock window.matchMedia
window.matchMedia = window.matchMedia || function () {
  return {
    matches: false,
    addListener: function () {},
    removeListener: function () {}
  };
};

// Mock console methods to keep test output clean
// Uncomment if you want to suppress console output in tests
/*
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

beforeAll(() => {
  console.error = vi.fn();
  console.warn = vi.fn();
  console.log = vi.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});
*/

// Add D3.js specific setup if needed
// For example, mocking D3 selection methods

// Add custom matchers if needed
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false
      };
    }
  }
});
