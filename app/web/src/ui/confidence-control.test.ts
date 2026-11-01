import { describe, expect, it } from "vitest";
import { confidenceDigit } from "./confidence-control";

describe("confidence direct selection", () => {
  it("accepts exactly the five number keys and leaves navigation and other input alone", () => {
    expect(["1", "2", "3", "4", "5"].map(confidenceDigit)).toEqual([1, 2, 3, 4, 5]);
    for (const key of ["0", "6", "12", "ArrowRight", "Home", "End", "a", " "]) expect(confidenceDigit(key)).toBeUndefined();
  });
});
