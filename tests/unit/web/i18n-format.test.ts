import { describe, expect, it } from "vitest";
import { format, formatFileSize, plural } from "@/lib/format";

describe("format", () => {
  it("replaces single placeholder", () => {
    expect(format("Hello {name}", { name: "World" })).toBe("Hello World");
  });

  it("replaces multiple placeholders", () => {
    expect(format("{a} and {b}", { a: "X", b: "Y" })).toBe("X and Y");
  });

  it("replaces numeric values", () => {
    expect(format("{count} files", { count: 5 })).toBe("5 files");
  });

  it("preserves unmatched placeholders", () => {
    expect(format("Hello {name}", {})).toBe("Hello {name}");
  });

  it("handles empty template", () => {
    expect(format("", { name: "test" })).toBe("");
  });

  it("handles template with no placeholders", () => {
    expect(format("No placeholders here", { name: "test" })).toBe("No placeholders here");
  });
});

describe("plural", () => {
  it("returns one form for count 1", () => {
    expect(plural(1, "1 file", "files")).toBe("1 file");
  });

  it("returns other form for count 0", () => {
    expect(plural(0, "1 file", "0 files")).toBe("0 files");
  });

  it("returns other form for count > 1", () => {
    expect(plural(5, "1 file", "5 files")).toBe("5 files");
  });

  it("returns other form for negative count", () => {
    expect(plural(-1, "1 file", "files")).toBe("files");
  });
});

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(2048)).toBe("2.0 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(1536 * 1024)).toBe("1.5 MB");
  });

  it("formats gigabytes", () => {
    expect(formatFileSize(2.5 * 1024 * 1024 * 1024)).toBe("2.5 GB");
  });

  it("handles zero", () => {
    expect(formatFileSize(0)).toBe("0 B");
  });
});
