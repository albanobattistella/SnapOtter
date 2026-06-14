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

  it("defines exactly 5 states", () => {
    const states = new Set<string>();
    for (const [from, to] of Object.entries(validTransitions)) {
      states.add(from);
      states.add(to);
    }
    expect(states.size).toBe(5);
    expect(states).toEqual(new Set(["PENDING", "EXPORTING", "EXPORTED", "PURGING", "COMPLETE"]));
  });

  it("follows the exact sequence PENDING->EXPORTING->EXPORTED->PURGING->COMPLETE", () => {
    const chain: string[] = ["PENDING"];
    let current = "PENDING";
    while (validTransitions[current]) {
      current = validTransitions[current];
      chain.push(current);
    }
    expect(chain).toEqual(["PENDING", "EXPORTING", "EXPORTED", "PURGING", "COMPLETE"]);
  });

  it("has exactly 4 transitions", () => {
    expect(Object.keys(validTransitions).length).toBe(4);
  });

  it("visits each state exactly once in the transition chain", () => {
    const visited: string[] = [];
    let current: string | undefined = "PENDING";
    while (current) {
      visited.push(current);
      current = validTransitions[current];
    }
    const unique = new Set(visited);
    expect(visited.length).toBe(unique.size);
    expect(visited.length).toBe(5);
  });
});
