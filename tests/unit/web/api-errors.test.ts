import { describe, expect, it } from "vitest";
import { translateApiError } from "@/lib/api-errors";

// Minimal mock of the relevant portion of TranslationKeys
function makeTranslations(errors: Record<string, string>) {
  return { errors } as Parameters<typeof translateApiError>[1];
}

describe("translateApiError", () => {
  const t = makeTranslations({
    authRequired: "Please log in",
    invalidCredentials: "Wrong username or password",
    currentPasswordIncorrect: "Current password is wrong",
    noValidFiles: "No files were uploaded",
    fileTooLarge: "File exceeds size limit",
    rateLimitExceeded: "Too many requests",
    processingFailed: "Processing error",
    timeout: "Timed out",
    connectionError: "Cannot connect",
    permissionDenied: "Access denied",
    notFound: "Resource not found",
  });

  it("translates 'Authentication required'", () => {
    expect(translateApiError("Authentication required", t)).toBe("Please log in");
  });

  it("translates 'Invalid credentials'", () => {
    expect(translateApiError("Invalid credentials", t)).toBe("Wrong username or password");
  });

  it("translates 'Invalid username or password' to same key as invalid credentials", () => {
    expect(translateApiError("Invalid username or password", t)).toBe("Wrong username or password");
  });

  it("translates 'Current password is incorrect'", () => {
    expect(translateApiError("Current password is incorrect", t)).toBe("Current password is wrong");
  });

  it("translates 'No valid files uploaded'", () => {
    expect(translateApiError("No valid files uploaded", t)).toBe("No files were uploaded");
  });

  it("translates 'File too large'", () => {
    expect(translateApiError("File too large", t)).toBe("File exceeds size limit");
  });

  it("translates 'Rate limit exceeded'", () => {
    expect(translateApiError("Rate limit exceeded", t)).toBe("Too many requests");
  });

  it("translates 'Processing failed'", () => {
    expect(translateApiError("Processing failed", t)).toBe("Processing error");
  });

  it("translates 'Request timed out'", () => {
    expect(translateApiError("Request timed out", t)).toBe("Timed out");
  });

  it("translates 'Connection error'", () => {
    expect(translateApiError("Connection error", t)).toBe("Cannot connect");
  });

  it("translates 'Permission denied'", () => {
    expect(translateApiError("Permission denied", t)).toBe("Access denied");
  });

  it("translates 'Not found'", () => {
    expect(translateApiError("Not found", t)).toBe("Resource not found");
  });

  it("returns original message for unmapped API error", () => {
    expect(translateApiError("Something unexpected happened", t)).toBe(
      "Something unexpected happened",
    );
  });

  it("returns original message when mapped key is missing from translations", () => {
    const sparseT = makeTranslations({});
    expect(translateApiError("Authentication required", sparseT)).toBe("Authentication required");
  });

  it("returns empty string if API message is empty", () => {
    expect(translateApiError("", t)).toBe("");
  });
});
