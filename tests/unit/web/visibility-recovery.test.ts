// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

vi.stubGlobal("localStorage", {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  get length() {
    return 0;
  },
  key: vi.fn(() => null),
});

function okHealth() {
  return Promise.resolve(new Response(JSON.stringify({ status: "healthy" }), { status: 200 }));
}

function simulateVisible() {
  Object.defineProperty(document, "visibilityState", {
    value: "visible",
    writable: true,
    configurable: true,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

function simulateHidden() {
  Object.defineProperty(document, "visibilityState", {
    value: "hidden",
    writable: true,
    configurable: true,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("visibility recovery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock.mockReset();
    fetchMock.mockImplementation(() => okHealth());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("connection monitor", () => {
    it("calls checkHealth when tab becomes visible", async () => {
      const { useConnectionStore } = await import("@/stores/connection-store");
      const { useConnectionMonitor } = await import("@/hooks/use-connection-monitor");
      const { renderHook } = await import("@testing-library/react");

      useConnectionStore.setState({
        status: "connected",
        failedSince: null,
        lastHealthCheck: null,
      });
      fetchMock.mockReset();
      fetchMock.mockImplementation(() => okHealth());

      const { unmount } = renderHook(() => useConnectionMonitor());

      await vi.advanceTimersByTimeAsync(0);
      const initialCalls = fetchMock.mock.calls.length;

      simulateVisible();
      await vi.advanceTimersByTimeAsync(0);

      expect(fetchMock.mock.calls.length).toBeGreaterThan(initialCalls);
      unmount();
    });

    it("does not call checkHealth when tab becomes hidden", async () => {
      const { useConnectionStore } = await import("@/stores/connection-store");
      const { useConnectionMonitor } = await import("@/hooks/use-connection-monitor");
      const { renderHook } = await import("@testing-library/react");

      useConnectionStore.setState({
        status: "connected",
        failedSince: null,
        lastHealthCheck: null,
      });
      fetchMock.mockReset();
      fetchMock.mockImplementation(() => okHealth());

      const { unmount } = renderHook(() => useConnectionMonitor());
      await vi.advanceTimersByTimeAsync(0);
      const callsAfterMount = fetchMock.mock.calls.length;

      simulateHidden();
      await vi.advanceTimersByTimeAsync(0);

      expect(fetchMock.mock.calls.length).toBe(callsAfterMount);
      unmount();
    });
  });
});
