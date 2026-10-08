import { describe, expect, test } from "bun:test";

import { notificationSessionId } from "./notification-deep-link";

describe("notificationSessionId", () => {
  test("prefers the sessionId the daemon attached", () => {
    expect(
      notificationSessionId({ url: "waku://session/abc", sessionId: "abc" }),
    ).toBe("abc");
  });

  test("parses the id out of the url when sessionId is missing", () => {
    expect(notificationSessionId({ url: "waku://session/abc" })).toBe("abc");
    expect(notificationSessionId({ url: "waku://session/abc/extra" })).toBe("abc");
  });

  test("returns null when the payload cannot route", () => {
    expect(notificationSessionId(undefined)).toBeNull();
    expect(notificationSessionId(null)).toBeNull();
    expect(notificationSessionId("nope")).toBeNull();
    expect(notificationSessionId({})).toBeNull();
    expect(notificationSessionId({ url: "  " })).toBeNull();
    expect(notificationSessionId({ url: "waku://task/abc" })).toBeNull();
    expect(notificationSessionId({ sessionId: 42 })).toBeNull();
  });
});
