// Simulated (mock) data and demo credentials exist ONLY in development.
export const API_CONFIG = {
  useMocks: process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_MOCKS !== 'false',
  mockDelayMs: 350,
};
