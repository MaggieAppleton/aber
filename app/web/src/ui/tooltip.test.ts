import { describe, expect, it } from "vitest";
import { splitShortcut } from "./tooltip";

describe("tooltip shortcuts", () => {
  it("splits a trailing shortcut from the name", () => {
    expect(splitShortcut("Accept (A)")).toEqual({ name: "Accept", key: "A" });
    expect(splitShortcut("Close (Esc)")).toEqual({ name: "Close", key: "Esc" });
    expect(splitShortcut("Find (⌘K)")).toEqual({ name: "Find", key: "⌘K" });
    expect(splitShortcut("Dump log (⌘⇧L)")).toEqual({ name: "Dump log", key: "⌘⇧L" });
    expect(splitShortcut("Full width (⌘[)")).toEqual({ name: "Full width", key: "⌘[" });
  });
  it("leaves counts and plain labels alone", () => {
    expect(splitShortcut("Prototypes (3)")).toEqual({ name: "Prototypes (3)" });
    expect(splitShortcut("File in a theme")).toEqual({ name: "File in a theme" });
  });
});
