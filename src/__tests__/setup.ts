import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Reset the store via a *dynamic* import so this setup file does not eagerly
// evaluate the store -> client module chain. Eager evaluation here would bind
// the store to the real `../lib/client` before a test file's `vi.mock(...)`
// could take effect (the store <-> client circular import is only re-bound if
// the store's first evaluation happens after the mock is registered).
afterEach(async () => {
  cleanup();
  vi.clearAllMocks();
  const { resetStore } = await import("./helpers/utils");
  resetStore();
});
