// Test setup file
// Note: @testing-library/jest-dom not imported for Node.js environment tests

// Mock Electron APIs
global.window = {
  api: {
    files: {
      import: jest.fn(),
      export: jest.fn(),
      selectFolder: jest.fn(),
      readAsDataURL: jest.fn(),
      copyToClipboard: jest.fn()
    },
    emojis: {
      getAll: jest.fn(),
      get: jest.fn(),
      add: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      search: jest.fn()
    },
    categories: {
      getAll: jest.fn(),
      add: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    tags: {
      getAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    scanner: {
      detectSources: jest.fn(),
      runScan: jest.fn(),
      getConfig: jest.fn(),
      saveConfig: jest.fn()
    }
  },
  electronAPI: {
    scanner: {
      detectSources: jest.fn(),
      runScan: jest.fn(),
      getConfig: jest.fn(),
      saveConfig: jest.fn()
    },
    files: {
      selectFolder: jest.fn()
    }
  }
} as any;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock as any;

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn()
};