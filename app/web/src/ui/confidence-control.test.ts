import { describe, expect, it } from "vitest";
import { confidenceAt, confidenceDigit, confidenceMarks } from "./confidence-control";

describe("confidence direct selection", () => {
  it("accepts exactly the five number keys and leaves navigation and other input alone", () => {
    expect(["1", "2", "3", "4", "5"].map(confidenceDigit)).toEqual([1, 2, 3, 4, 5]);
    for (const key of ["0", "6", "12", "ArrowRight", "Home", "End", "a", " "]) expect(confidenceDigit(key)).toBeUndefined();
  });
});

describe("confidence hover preview", () => {
  it("maps a pointer across the control onto the five steps", () => {
    expect([0, 10, 50, 90, 100, -20, 140].map(x => confidenceAt(x, 0, 100))).toEqual([1, 1, 3, 5, 5, 1, 5]);
  });
  it("previews the steps up to the hovered one, keeping set steps set", () => {
    expect(confidenceMarks(3)).toEqual(["on", "on", "on", undefined, undefined]);
    expect(confidenceMarks(3, 4)).toEqual(["on", "on", "on", "pre", undefined]);
    expect(confidenceMarks(3, 2)).toEqual(["on", "on", undefined, undefined, undefined]);
    expect(confidenceMarks(null, 2)).toEqual(["pre", "pre", undefined, undefined, undefined]);
  });
});
