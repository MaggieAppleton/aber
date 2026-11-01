// Act 3: the interface (slides 10–13). Owned by the act 3 build.
import type { Slide } from "../../deck";
import * as Capture from "./10-capture";
import * as Briefing from "./11-briefing";
import * as Tripwire from "./12-tripwire";
import * as Handoff from "./13-handoff";
import "./act3.css";
export const SLIDES: Slide[] = [Capture, Briefing, Tripwire, Handoff];
