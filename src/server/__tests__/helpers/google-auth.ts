import { vi } from "vitest";
import type { GoogleTokenPayload } from "../../utils/google-auth";

export const TEST_GOOGLE_CLIENT_ID = "test-google-client-id.apps.googleusercontent.com";

export const TEST_GOOGLE_USER: GoogleTokenPayload = {
  sub: "google-uid-12345",
  email: "matt@gmail.com",
  email_verified: true,
  name: "Matt Butler",
  picture: "https://lh3.googleusercontent.com/photo.jpg",
  aud: TEST_GOOGLE_CLIENT_ID,
  iss: "https://accounts.google.com",
  exp: Math.floor(Date.now() / 1000) + 3600,
};

export const mockVerifyGoogleToken = vi.fn<
  [string, string],
  Promise<GoogleTokenPayload>
>();

vi.mock("../../utils/google-auth", () => ({
  verifyGoogleToken: (...args: [string, string]) => mockVerifyGoogleToken(...args),
}));
