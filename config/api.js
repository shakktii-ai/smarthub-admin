// Mock data is opt-in outside development to avoid accidentally using it in production.
export const API_CONFIG = {
  useMocks:
    process.env.NEXT_PUBLIC_USE_MOCKS === "true" ||
    (process.env.NODE_ENV === "development" &&
      process.env.NEXT_PUBLIC_USE_MOCKS !== "false"),
  mockDelayMs: 350,
};
