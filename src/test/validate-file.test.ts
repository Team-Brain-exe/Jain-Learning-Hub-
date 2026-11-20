import { describe, expect, it } from "vitest";

import { validateFile } from "@/lib/validate-file";

describe("validateFile", () => {
  it("returns null for a valid video file under the size limit", () => {
    const file = { name: "intro-lesson.mp4", size: 10 * 1024 * 1024 }; // 10 MB
    expect(validateFile(file, "video")).toBeNull();
  });

  it("returns an error message for a disallowed extension", () => {
    const file = { name: "malicious.exe", size: 1024 * 1024 };
    const result = validateFile(file, "video");
    expect(result).toBe("That file type isn't allowed for Video. Use: mp4, webm.");
  });

  it("handles uppercase extensions case-insensitively", () => {
    const file = { name: "LESSON.MP4", size: 15 * 1024 * 1024 };
    expect(validateFile(file, "video")).toBeNull();

    const mixedFile = { name: "Presentation.PpTx", size: 5 * 1024 * 1024 };
    expect(validateFile(mixedFile, "ppt")).toBeNull();
  });

  it("accepts a file exactly at the maximum MB limit", () => {
    const exactMaxVideoBytes = 500 * 1024 * 1024; // 500 MB
    const file = { name: "full-length-lecture.webm", size: exactMaxVideoBytes };
    expect(validateFile(file, "video")).toBeNull();
  });

  it("returns an error message for a file 1 byte over the maximum limit", () => {
    const overLimitBytes = 500 * 1024 * 1024 + 1; // 500 MB + 1 byte
    const file = { name: "too-large.mp4", size: overLimitBytes };
    const result = validateFile(file, "video");
    expect(result).toBe("File is too large (max 500 MB).");
  });

  it("returns an error message for a file with no extension", () => {
    const file = { name: "videofile", size: 1024 * 1024 };
    const result = validateFile(file, "video");
    expect(result).toBe("That file type isn't allowed for Video. Use: mp4, webm.");
  });

  it("returns an error message for a file ending with a trailing dot", () => {
    const file = { name: "videofile.", size: 1024 * 1024 };
    const result = validateFile(file, "video");
    expect(result).toBe("That file type isn't allowed for Video. Use: mp4, webm.");
  });

  it("validates all supported formats correctly", () => {
    // audio: max 100 MB, mp3/wav/m4a
    expect(validateFile({ name: "lecture.mp3", size: 50 * 1024 * 1024 }, "audio")).toBeNull();
    expect(validateFile({ name: "lecture.wav", size: 101 * 1024 * 1024 }, "audio")).toBe(
      "File is too large (max 100 MB).",
    );

    // ppt: max 50 MB, ppt/pptx
    expect(validateFile({ name: "slides.pptx", size: 10 * 1024 * 1024 }, "ppt")).toBeNull();
    expect(validateFile({ name: "slides.pdf", size: 10 * 1024 * 1024 }, "ppt")).toBe(
      "That file type isn't allowed for Presentation. Use: ppt, pptx.",
    );

    // pdf: max 25 MB, pdf
    expect(validateFile({ name: "syllabus.pdf", size: 25 * 1024 * 1024 }, "pdf")).toBeNull();
    expect(validateFile({ name: "syllabus.docx", size: 10 * 1024 * 1024 }, "pdf")).toBe(
      "That file type isn't allowed for PDF. Use: pdf.",
    );

    // docx: max 25 MB, doc/docx
    expect(validateFile({ name: "notes.docx", size: 5 * 1024 * 1024 }, "docx")).toBeNull();
    expect(validateFile({ name: "notes.doc", size: 5 * 1024 * 1024 }, "docx")).toBeNull();

    // image: max 10 MB, png/jpg/jpeg/webp
    expect(validateFile({ name: "diagram.webp", size: 2 * 1024 * 1024 }, "image")).toBeNull();
    expect(validateFile({ name: "diagram.gif", size: 2 * 1024 * 1024 }, "image")).toBe(
      "That file type isn't allowed for Image. Use: png, jpg, jpeg, webp.",
    );
  });
});
