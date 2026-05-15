import type { TranslationKeys } from "@snapotter/shared";

const API_ERROR_MAP: Record<string, string> = {
  "Authentication required": "authRequired",
  "Invalid credentials": "invalidCredentials",
  "Invalid username or password": "invalidCredentials",
  "Current password is incorrect": "currentPasswordIncorrect",
  "No valid files uploaded": "noValidFiles",
  "File too large": "fileTooLarge",
  "Rate limit exceeded": "rateLimitExceeded",
  "Processing failed": "processingFailed",
  "Request timed out": "timeout",
  "Connection error": "connectionError",
  "Permission denied": "permissionDenied",
  "Not found": "notFound",
};

export function translateApiError(apiMessage: string, t: TranslationKeys): string {
  const key = API_ERROR_MAP[apiMessage];
  if (key && key in t.errors) {
    return t.errors[key as keyof typeof t.errors];
  }
  return apiMessage;
}
