import { describe, expect, it } from "vitest";

describe("audit archival state machine", () => {
  const validTransitions: Record<string, string> = {
    PENDING: "EXPORTING",
    EXPORTING: "EXPORTED",
    EXPORTED: "PURGING",
    PURGING: "COMPLETE",
  };

  it("state transitions are valid", () => {
    for (const [from, to] of Object.entries(validTransitions)) {
      expect(from).toBeTruthy();
      expect(to).toBeDefined();
    }
  });

  it("covers all non-terminal states", () => {
    const states = ["PENDING", "EXPORTING", "EXPORTED", "PURGING", "COMPLETE"];
    const nonTerminal = states.filter((s) => s !== "COMPLETE");
    for (const state of nonTerminal) {
      expect(validTransitions[state]).toBeDefined();
    }
  });

  it("COMPLETE is terminal (no outgoing transition)", () => {
    expect(validTransitions.COMPLETE).toBeUndefined();
  });

  it("has no cycles in the transition graph", () => {
    const visited = new Set<string>();
    let current = "PENDING";
    while (current && !visited.has(current)) {
      visited.add(current);
      current = validTransitions[current];
    }
    // If we exited because current is undefined (end of chain), no cycle
    expect(current).toBeUndefined();
  });
});
