import { describe, expect, it } from "vitest";
import { getCategoryName, getToolDescription, getToolName } from "@/lib/tool-i18n";

// Minimal mock shaped like TranslationKeys with tools and categories
function makeT(
  tools: Record<string, { name?: string; description?: string }>,
  categories: Record<string, string>,
) {
  return { tools, categories } as Parameters<typeof getToolName>[0];
}

describe("getToolName", () => {
  const t = makeT(
    {
      resize: { name: "Resize Image", description: "Change dimensions" },
      compress: { name: "Compress" },
      "no-name": { description: "Only has description" },
    },
    {},
  );

  it("returns translated name when available", () => {
    expect(getToolName(t, "resize", "Fallback")).toBe("Resize Image");
  });

  it("returns fallback when tool entry has no name", () => {
    expect(getToolName(t, "no-name", "Fallback Name")).toBe("Fallback Name");
  });

  it("returns fallback when tool id is not in translations", () => {
    expect(getToolName(t, "nonexistent", "Default Name")).toBe("Default Name");
  });

  it("returns fallback for empty tool id", () => {
    expect(getToolName(t, "", "Empty Fallback")).toBe("Empty Fallback");
  });
});

describe("getToolDescription", () => {
  const t = makeT(
    {
      resize: { name: "Resize", description: "Change image dimensions" },
      "no-desc": { name: "Tool Without Desc" },
    },
    {},
  );

  it("returns translated description when available", () => {
    expect(getToolDescription(t, "resize", "Fallback")).toBe("Change image dimensions");
  });

  it("returns fallback when tool entry has no description", () => {
    expect(getToolDescription(t, "no-desc", "Default Desc")).toBe("Default Desc");
  });

  it("returns fallback when tool id is not in translations", () => {
    expect(getToolDescription(t, "unknown", "Fallback Desc")).toBe("Fallback Desc");
  });
});

describe("getCategoryName", () => {
  const t = makeT(
    {},
    {
      transform: "Transform",
      effects: "Effects & Filters",
    },
  );

  it("returns translated category name when available", () => {
    expect(getCategoryName(t, "transform", "Fallback")).toBe("Transform");
  });

  it("returns fallback when category id is not in translations", () => {
    expect(getCategoryName(t, "unknown-cat", "Unknown Category")).toBe("Unknown Category");
  });

  it("returns fallback for empty category id", () => {
    expect(getCategoryName(t, "", "Empty")).toBe("Empty");
  });
});
