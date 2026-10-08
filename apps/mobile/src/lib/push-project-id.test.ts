import { describe, expect, test } from "bun:test";

import { projectIdFor } from "./push-project-id";

describe("projectIdFor", () => {
  test("reads the EAS project id Expo injects", () => {
    expect(projectIdFor({ eas: { projectId: "abc-123" } })).toBe("abc-123");
  });

  test("returns undefined when the extra block is missing or malformed", () => {
    expect(projectIdFor(undefined)).toBeUndefined();
    expect(projectIdFor(null)).toBeUndefined();
    expect(projectIdFor({})).toBeUndefined();
    expect(projectIdFor({ eas: {} })).toBeUndefined();
    expect(projectIdFor({ eas: { projectId: 42 } })).toBeUndefined();
    expect(projectIdFor("nope")).toBeUndefined();
  });
});
