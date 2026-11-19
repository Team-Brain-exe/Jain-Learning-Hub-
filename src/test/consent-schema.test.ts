import { describe, expect, it } from "vitest";

import { consentMessages, consentSchema, type ConsentFormValues } from "@/lib/consent-schema";

const valid: ConsentFormValues = {
  title: "Intro to Docker",
  category: "Academic",
  format: "video",
  description: "A 20 minute beginner walkthrough of containers and images.",
  facultyEmail: "reviewer@demo.jain.edu",
  consent: true,
  proposalName: "docker-proposal.pdf",
};

/** first error message for a field, or undefined if it passes */
const errorFor = (patch: Record<string, unknown>, field: keyof ConsentFormValues) => {
  const result = consentSchema.safeParse({ ...valid, ...patch });
  if (result.success) return undefined;
  return result.error.issues.find((i) => i.path[0] === field)?.message;
};

describe("consentSchema", () => {
  it("accepts valid input", () => {
    expect(consentSchema.safeParse(valid).success).toBe(true);
  });

  it("allows proposalName to be missing", () => {
    const { proposalName: _omit, ...rest } = valid;
    expect(consentSchema.safeParse(rest).success).toBe(true);
  });

  it.each(["", "abc", "   abcd   "])("rejects title %j with the exact message", (title) => {
    expect(errorFor({ title }, "title")).toBe(consentMessages.title);
  });

  it("rejects a title over 100 characters", () => {
    expect(errorFor({ title: "x".repeat(101) }, "title")).toBe(consentMessages.titleTooLong);
  });

  it.each(["", "not-an-email", "a@b"])(
    "rejects faculty email %j with the exact message",
    (facultyEmail) => {
      expect(errorFor({ facultyEmail }, "facultyEmail")).toBe(
        "Enter a valid faculty email address.",
      );
    },
  );

  it("rejects an unticked consent box with the exact message", () => {
    expect(errorFor({ consent: false }, "consent")).toBe(
      "You must accept the consent declaration to continue.",
    );
  });

  it("rejects an empty or unknown category and format", () => {
    expect(errorFor({ category: "" }, "category")).toBe("Choose a category.");
    expect(errorFor({ category: "Sports" }, "category")).toBe("Choose a category.");
    expect(errorFor({ format: "" }, "format")).toBe("Choose a content format.");
    expect(errorFor({ format: "mp4" }, "format")).toBe("Choose a content format.");
  });

  it("rejects a description shorter than 30 characters", () => {
    expect(errorFor({ description: "Too short." }, "description")).toBe(
      "Describe the content and its purpose (at least 30 characters).",
    );
  });
});
