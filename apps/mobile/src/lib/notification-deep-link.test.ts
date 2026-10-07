import { describe, expect, test } from "bun:test";

import { notificationDeepLink } from "./notification-deep-link";

describe("notificationDeepLink", () => {
  test("prefers the explicit url the daemon attached", () => {
    expect(notificationDeepLink({ url: "waku://task/abc", sessionId: "abc" })).toBe(
      "waku://task/abc",
    );
  });

  test("falls back to the session id when the url is missing", () => {
    expect(notificationDeepLink({ sessionId: "abc" })).toBe("waku://task/abc");
  });

  test("returns null when the payload cannot route", () => {
    expect(notificationDeepLink(undefined)).toBeNull();
    expect(notificationDeepLink(null)).toBeNull();
    expect(notificationDeepLink("nope")).toBeNull();
    expect(notificationDeepLink({})).toBeNull();
    expect(notificationDeepLink({ url: "  " })).toBeNull();
    expect(notificationDeepLink({ sessionId: 42 })).toBeNull();
  });
});
