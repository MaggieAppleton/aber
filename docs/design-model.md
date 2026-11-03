# Design Model: Aber

Last updated 1 Nov 2026. This is the source of truth for what Aber is and how it behaves. All four layers and the agent stack are settled for v1. Nothing is open (section 6).

- **Visuals:** the jigs are canonical for how things look and move. Run `bun install && bun run dev` in `jig/`, then open http://localhost:5181. [`/app`](http://localhost:5181/app) is the whole app in one frame; [`/reference`](http://localhost:5181/reference) indexes every canonical route and constant.
- **Decisions:** every pick is stored in [`design/decisions.json`](../design/decisions.json), made on [`/decide`](http://localhost:5181/decide) and the other jigs.
- **Building it:** [build-spec.md](build-spec.md).

## 0. Brief

| | |
| --- | --- |
| Who | Maggie, alone in v1. Later: separate accounts and shared themes and theories for up to about 10 people |
| Audience | Fluent |
| Posture | Laptop: sovereign (long thinking and writing sessions). Phone, once hosted: transient (capture and a quick look) |
| Devices | iPhone, two MacBooks |
| Context of use | Capturing on the go from X, Safari and voice notes; a morning look at what agents did overnight; deep sessions stating, writing and challenging theories |
| Where it runs | This build round: Maggie's MacBook only, on `localhost`. Eventually: the team's Coolify server, which makes Aber a **work tool** (Implementation notes) |

Purposes:

1. Get a thought or signal in within seconds, from phone or laptop, without deciding where it goes.
2. See my current theories of the future, written down clearly.
3. Know what each theory rests on.
4. Know what would make each theory wrong.
5. See where theories compete.
6. Think forward from a theory to its second- and third-order effects.
7. Turn a theory into something I can build.
8. Arrive in the morning and see what the agents noticed overnight.
9. Notice what keeps coming back to me, without duplicates piling up.

## 1. Concepts

Six concepts. The core move: separate what I've **seen** (signals, themes) from what I **claim** (theories), and make claims that can turn out wrong.

### The authority rule

**Agents can create draft objects and do anything to them. To my objects, agents can only propose. One exception: near-duplicate signals merge automatically, logged and undoable.**

| Agents do directly | Agents propose (as Suggestions) | Agents never |
| --- | --- | --- |
| Transcribe and split dumps into signals | Evidence links on my theories | Change my confidence |
| File signals into existing themes | Revisions to my theories and themes | Edit my objects |
| Attach a repeat dump to an existing signal | Merges of themes and theories | Delete anything |
| **Merge near-duplicate signals** (the exception, below) | Challenges (tripwire matches; later, red-team arguments) | Undo my decisions |
| Record mentions | | |
| Create draft themes, theories and prototypes, and attach anything to their own drafts | | |
| Reply in the dump-or-ask column | | |

**The near-duplicate exception** (decided 1 Nov 2026). Signals are mine once filed, so strictly a merge should be a suggestion. Maggie chose automatic merging to cut triage. The guard rails:

| Guard rail | What it means |
| --- | --- |
| Logged | Every merge records the agent, model, both signals and the agent's reasoning |
| Undoable | One step restores both signals with their sources, origins, themes, evidence links and notes exactly as they were |
| Visible | The merge shows in the dump log against the dump that caused it, and in the surviving signal's sources |
| Bounded | Applies to signals only. Themes and theories still merge only by suggestion |

### Dump

- **Purpose:** Keep what I said, exactly as I said it.
- **State:** raw content (text, audio, links, images); transcript for audio; captured at; captured from (Shortcut, web app, the dump-or-ask column; a hint for the processing agent, not a relationship); the context it saw (the "sees" pills, when sent from the column); signals produced; agent replies; processing runs (agent, model, version); status (received, processing, done, failed).
- **Actions:** user: capture, delete, restore from the bin. System: transcribe, split, re-process, reply.
- **Operational principle:** If you share three X links and a ramble, then within a minute they appear as signals in their themes, each traceable back to this dump.
- **Relationships:** produced signals (many-to-many: one signal can come from several dumps); can lead to draft theories, draft prototypes and revision suggestions; holds the agent's replies.
- **Lifetime:** permanent and immutable, but deletable.
- **Delete rule:** deleting a dump removes only the signals whose **sole** origin is that dump. Signals that also came from other dumps lose that one origin. The confirmation shows what will go ("removes 4 signals and 2 evidence links"). Deleted dumps go to a **bin for 30 days** and can be restored with everything they removed; after 30 days they are purged.
- **Chat is dumps.** Every message sent from the dump-or-ask column is stored as a Dump, with the context it saw. The agent's reply attaches to that dump. A message with a question mark is an ask: it is still a dump, and usually produces a reply and nothing else.

### Signal

- **Purpose:** Record one observation about the world.
- **State:** gist (one line, written by the agent, editable by me); **sources (one or more**: URL, author, date, or "my own observation"); my note; fetched content (best effort; a signal never depends on it); origins (dumps); mentions; themes; evidence links; merged-from (signals absorbed into it); seen (whether I've looked since it arrived).
- **Actions:** user: edit gist and note, link to themes, link to theories as evidence, merge, discard, undo a merge. System: create (by splitting a dump), file into themes, attach repeat dumps, propose evidence, merge near-duplicates.
- **Operational principle:** If you save a post you already saved last month, then no duplicate appears: the existing signal gains another origin and its mention count goes up. If you save a different report of the same thing, it merges into the existing signal as a second source.
- **Relationships:** gathered in themes; evidence for or against theories; came from dumps.
- **Lifetime:** permanent until discarded, or until its last origin dump is deleted.
- **Tombstones:** a discarded signal leaves a hidden tombstone (its normalised URLs and gist) so a later dump can't recreate it.

### Theme

- **Purpose:** Gather everything about one area of attention.
- **State:** name; draft or mine; signals; theories; mentions; retired (with reason).
- **Actions:** user: write, rename, accept / rephrase / discard (drafts), link, merge, retire. System: create drafts (by clustering, after v1), file signals, propose merges.
- **Operational principle:** If a theme fills with signals but has no theory, then it reads as an open question and invites you to state one.
- **Relationships:** gathers signals; theories take positions on it. Flat: no theme inside another.
- **Lifetime:** long-lived.

### Theory

- **Purpose:** State a claim about the future that could be wrong.
- **State:**
  - claim (the title: short and falsifiable);
  - body (rich prose);
  - status: **draft → held → retired**, with a reason when retired: **disproven, superseded or abandoned** (complete);
  - authorship: agent wording accepted, rephrased by me, or written by me;
  - confidence (1 to 5) and its history as an append-only stance log (mine only; a draft has none until I accept it);
  - horizon (the year I think it happens by);
  - what would change my mind (the tripwire sentence) and its state: empty, watching, tripped, resolved;
  - themes; evidence; rivals; follows-from; mentions; versions.
- **Actions:** user: write, edit (versioned), accept / rephrase / discard (drafts), link, merge, extrapolate, challenge, set confidence, retire, decide a tripwire match (accept or dismiss). System: create drafts, attach evidence to its own drafts, and on my theories propose evidence, revisions, merges and challenges.
- **Operational principle:** If a new signal matches what you said would change your mind, then the tripwire trips and the theory shows the challenge. Accepting it lowers your confidence by one step with a note; dismissing it leaves confidence alone. Either way the history is kept.
- **Drafts behave like full theories:** they collect evidence and links before I accept them. Accepting or rephrasing makes a draft mine. I'm open to the agent's wording being right. Drafts never expire; they stack by age.
- **Relationships:** positions on themes; evidence from signals (supports or undermines); rivals (two-way); follows from other theories (many-to-many: "if A and B, then C"); embodied by prototypes.
- **Lifetime:** long-lived, versioned.

### Prototype

- **Purpose:** Embody a theory in something I can build.
- **State:** name; draft or mine; status (idea → building → built → shelved); body (rich prose with images and video, in the same writing view as a theory's body); media; links (repo, demo, recording); theories it tests.
- **Actions:** user: write, edit, accept / rephrase / discard (drafts), link to theories, retire (shelve). System: create drafts when a dump describes something to build.
- **Operational principle:** If a theory you built on is later retired, then the prototype shows it now rests on a retired claim.
- **Relationships:** embodies theories.
- **Lifetime:** long-lived. In from v1.

### Suggestion

- **Purpose:** Let an agent propose a change to something of mine without making it.
- **State:** kind (evidence, revision, merge, challenge); target objects; the proposed change; the agent's reasoning; proposing agent and model; status (pending, accepted, discarded).
- **Actions:** user: accept, rephrase then accept, discard. System: propose.
- **Operational principle:** If an agent thinks a signal undermines one of your theories, then a dashed link appears on that theory. Accepting makes it real; discarding removes it.
- **Lifetime:** task.
- **Not suggestions:** new themes, theories and prototypes arrive as drafts. Extrapolations arrive as draft theories that follow from the original. Near-duplicate signal merges are applied directly (the exception above).

### Merged, dropped or deferred

| Candidate | Decision | Why |
| --- | --- | --- |
| Question | Merged into Theme | A theme with signals but no theories is an open question |
| Source | Attribute of Signal, one or more per signal | Nobody thinks about a URL apart from what it shows |
| Bet | Dropped | Starting a prototype from a theory is the bet |
| Effect / consequence | A theory that follows from another | A second-order effect is a conditional claim with its own evidence |
| Evidence | A relationship with a stance | It only exists between a signal and a theory |
| Chat | Each message is a Dump; replies attach to it | Talking to the agent needs no concept of its own |
| Subject (what a dump is about) | Dropped | Signals connect to theories through evidence; where a dump was captured is only a hint |
| Pin | Dropped | Columns, Atlas and Timeline replace the at-scale World page that needed it |
| Scenario / future | Deferred | A bundle of theories is real but premature; revisit at 15+ theories |

## 2. Object–action matrix

d = drafts only.

| Object \ Action | Capture | Write | Edit | Link | Merge | Extrapolate | Challenge | Accept | Rephrase | Retire | Discard | Delete |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dump | ● | | | | | | | | | | | ● (bin, 30 days) |
| Signal | via dump | | gist, note | ● | ● (+ undo) | | | | | | ● (tombstone) | |
| Theme | | ● | rename | ● | ● | | | d | d | ● | d | |
| Theory | | ● | ● versioned | ● | ● | ● | ● | d | d | ● | d | |
| Prototype | | ● | ● | ● | | | | d | d | ● | d | |
| Suggestion | | | | | | | | ● | ● | | ● | |

Intentional gaps:

- **One way in.** Signals can't be written directly; everything enters as a dump, so every signal has provenance. Chat messages are dumps too.
- **Dumps can't be edited.** They are the record. Mistakes are deleted, not corrected.
- **Retire vs discard vs delete.** Being wrong is information, so my themes, theories and prototypes are retired and keep their history. A bad extraction or an unwanted draft isn't information, so signals, drafts and suggestions are discarded. Only dumps are deleted, because they're the one thing I author by accident.
- **Only theories are extrapolated or challenged.** A theme has to become a claim first.
- **Themes can't be split.** Merge and re-file instead, until splitting proves necessary.
- **No "bet" verb, no "pin" verb.**

### Relationships

| Relationship | Between | Shape | Set by |
| --- | --- | --- | --- |
| Came from | Signal ↔ Dump | Many-to-many | System |
| Gathered in | Signal ↔ Theme | Many-to-many | Agent directly; I can remove it |
| Positions on | Theory ↔ Theme | Many-to-many | Me; directly by the agent on its own drafts |
| Evidence | Signal → Theory | Supports or undermines, plus a note | Me; suggestion on my theories; directly on drafts |
| Rivals | Theory ↔ Theory | Two-way | Me, or an accepted suggestion |
| Follows from | Theory → Theory | Many-to-many | Me; drafts created by extrapolation |
| Embodies | Prototype → Theory | Many-to-many | Me; directly on draft prototypes |
| Merged into | Signal → Signal | Many-to-one, undoable | Agent directly (near-duplicates); me |

### De-duplication

| The processing agent finds | It does | Authority |
| --- | --- | --- |
| A link already saved (after normalising x.com/twitter.com, tracking parameters, etc.) | Attaches the dump to the existing signal | Direct |
| A link or observation matching a tombstone | Drops it silently, and records that in the processing run | Direct |
| The same observation from a different source | Merges into one signal with two sources | Direct, logged, undoable |
| A signal that fits an existing theme | Files it there instead of drafting a new theme | Direct |
| Two overlapping themes | Proposes a merge | Suggestion (after v1) |
| A theory I've stated before | Records a mention; proposes a revision if the wording moved. No new draft | Direct / suggestion |

### What a dump can produce

| Found in the dump | Becomes |
| --- | --- |
| Observations about the world | Signals, filed into themes; proposed as evidence on my theories |
| A new speculative claim | A draft theory |
| Thinking about an existing theory | A revision suggestion on that theory (claim change, or text for its body) |
| An idea for something to build | A draft prototype |
| A question (an ask) | A reply attached to the dump |

### Background agent jobs

| Job | Trigger | Produces | v1 |
| --- | --- | --- | --- |
| Process a dump | New dump | Signals, filings, mentions, near-duplicate merges, drafts, revision and evidence suggestions, a reply | **Yes** |
| Link evidence | New signal | Evidence suggestions on my theories; evidence on drafts | **Yes** |
| Tripwire | New signal; a tripwire written or edited | Challenge when a signal matches "what would change my mind" | **Yes** |
| Cluster | Overnight | Draft themes from unthemed signals | Later |
| Red-team | Weekly, on high-confidence theories | Challenge with the strongest case against | Later |
| Diagnosticity | Overnight | Flags evidence that fits rival theories equally and so tells me nothing | Later |
| Extrapolate | On request, or a new theory | Draft theories that follow from it | Later |
| De-duplicate (beyond exact links and near-duplicate signals) | Overnight | Theme and theory merge suggestions | Later |

### Attribute ranking

| Object | Glanceable | On demand | Rare |
| --- | --- | --- | --- |
| Theory | Claim, draft marker, confidence, evidence balance (+5 −2), pending suggestions, challenge mark, prototype count | Body, horizon, tripwire, rivals, follows-from, confidence history | Versions, authorship, origin dump |
| Signal | Gist, source, new mark | My note, themes, theories it bears on, origin dumps, other sources | Fetched content, capture time, processing run, merge history |
| Theme | Name, draft marker, signal and theory counts, open mark when it has no theories, new count | Its signals and theories | History, merges |
| Dump | Time, first line, status, number of things produced | Full text or audio and transcript, attachments, reply | Processing runs |
| Prototype | Name, status glyph, draft marker | Body and media, links, theories it tests | History |
| Suggestion | What it proposes, on which object | The agent's reasoning | Which agent and model |

## 3. Spatial model

The space is built in [`/app`](http://localhost:5181/app). One frame holds five views of the same objects, one shared object pane and the dump-or-ask pill.

```
  tooltip                                  ▔▔                          (7)
  toast                              ▔▔▔▔▔▔                            (6, just above the pill)
  delete-dump confirmation        ▔▔▔▔▔▔▔▔▔▔▔                          (5, centre, dims the world)
  previews, filed gists, spark log    ▔▔▔▔                             (4, tethered)
  dump log                                         ▔▔▔▔▔▔              (3, rises from the pill)
  view switcher ▔▔▔                                  pill ▔▔▔▔▔        (1, floating functional chrome)
  views ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▏object pane ▁▁▁▁▁▁▏dump column ▁▁▁▁        (0 base; pane and column docked, push the view)
```

### Views (the base plane)

| View | Shows | Role | Canonical jig |
| --- | --- | --- | --- |
| **Theme sections** (default, ⌘1) | A theme index on the left; one section per theme, holding its theory cards. Open themes show their signal count and an inline + | Where Aber opens | [`/app?view=current`](http://localhost:5181/app?view=current) |
| **Columns** (⌘2) | Dumps → Signals → Themes → Theories → Prototypes, left to right from raw to refined. Opening a stock folds other columns to **rails**; lineage pulls relatives to the top and dims the rest | Provenance and lineage | [`/app?view=columns`](http://localhost:5181/app?view=columns), [`/columns#rails`](http://localhost:5181/columns#rails) |
| **Atlas** (⌘3) | Themes as **circles** (territories) on a **Paper** ground; theories as landmarks sized by confidence; signals as faint **halos**, gists **revealed on zoom** | Where attention sits, at a glance | [`/app?view=atlas`](http://localhost:5181/app?view=atlas), [`/atlas#signals`](http://localhost:5181/atlas#signals) |
| **Timeline** (⌘4) | The **Field**: year across, confidence down, drafts in their own dashed row. One hop at a time with "+n" level badges, and **Follow chain** morphs into columns by depth. Black ink | When I think things happen, and what rests on what | [`/app?view=timeline`](http://localhost:5181/app?view=timeline), [`/timeline#chain-morph`](http://localhost:5181/timeline#chain-morph) |
| **Briefing** (⌘5) | An inbox lens over what changed since I last looked, grouped: Challenges, Drafts, Suggestions, Merged (near-duplicates, one click to unmerge), New signals | The morning look | [`/app?view=briefing`](http://localhost:5181/app?view=briefing) |

Prototypes have no view of their own: a "Prototypes" link sits at the bottom of the Theme sections index, and they have a column in Columns. Deck, Document and River are deferred to after v1.

### Surfaces

| Surface | Tier | Attachment | Origin | Persistence | Narrow screen |
| --- | --- | --- | --- | --- | --- |
| View | 0 | The world | Cross-fades with a slight scale on switch | Permanent | Briefing only |
| Theme index (Theme sections) | 0, inside the view | Left of the sections | — | Permanent | — |
| View switcher | 1, floating | Bottom-left, opposite the pill | — | Always | Not shown |
| Object pane (theme, theory, prototype) | 1, docked | Right edge, pushes the view; a hairline seam, no shadow | Slides in from the right edge; leaves the same way | Until closed | Full screen, from the right (judgement, moderate; no phone jig for the pane) |
| Dump-or-ask pill (mic integrated) | 1, floating | Bottom-right corner | — | Always | Not in v1 (capture is the Shortcut) |
| Dump column | 1, docked | Owns the far-right edge; the pane moves left of it; the view compresses | Grows up out of the pill (B2); folds back into the corner | Task | — |
| Context pills | Part of the column | Float above the input, aligned to its left edge | Rise from the input | While the column is open | — |
| Signal or dump detail | 0 | In place | Unfolds from its row | Until folded | Same |
| Dump log (status, what each dump made, bin) | 3 | Covers content, casts a shadow | Rises out of the pill's log segment and sinks back into it; closes when the column opens | Task | — |
| Source preview, filed gists, confidence log, attachment stack | 4 | Tethered | Its trigger | Moment | Bottom sheet |
| Delete-dump confirmation | 5 | Blocks, dims the world | Centre | Task | Same |
| Toast (counts made, Undo) | 6 | Never takes focus | Just above the pill | Seconds; holds while hovered | Same |
| Tooltip | 7 | Tethered | Its trigger | While hovered or focused | None; long-press instead |

**Drafts and suggestions are a material, not a tier:** dashed outline, translucent fill, no shadow, on the same plane as my own things. Accepting solidifies them in place. A dashed border means "not yet mine" and nothing else.

**Both open.** The pane and the dump column are docked peers. The column owns the far-right edge because it grows from the corner pill; the pane narrows and sits left of it; the view compresses (Timeline scrolls sideways rather than squeezing labels).

**Posture:** sovereign on the laptop, so chrome stays quiet; transient on the phone, which (once Aber is hosted) is for capture (Shortcut) and a quick look (Briefing and the pane). The narrow layouts are built in v1; reaching them from the phone comes with hosting.

### Superseded

| Earlier proposal | Replaced by |
| --- | --- |
| Three zoom levels (World → Theme → Theory) | Views plus one shared object pane |
| The theory compass (prototypes above, evidence below, causes left, consequences right) | The theory pane document; lineage lives in Columns and Timeline |
| World at scale (A2) with Pin | Columns, Atlas and Timeline |
| Pill bottom centre with a separate mic button; floating panel | Pill bottom-right with the mic inside; a docked column growing from it (B2) |
| "SEES" row inside the panel | Context pills floating above the input, with a crosshair to pick from the screen |

## 4. Behaviour

The jigs are canonical for timing and feel. Constants are indexed on [`/reference`](http://localhost:5181/reference).

| Element | Rest | Approach / hover | Press | Drag | Touch |
| --- | --- | --- | --- | --- | --- |
| Theory card | Claim, confidence, evidence balance, marks | Its instances in other themes highlight with an ink ring | Opens the theory in the pane | — | Tap opens |
| Theme heading | Name, signal count, + when open | — | Opens the theme in the pane | — | Tap |
| Signal row | Gist, source, new mark | — | Unfolds in place: note, theories it bears on, themes, origin dump | — | Tap |
| Draft or suggestion | Dashed, translucent | — | Accept and discard sit on its edge; accepting solidifies it in place | — | Tap the actions |
| Object pane edge | A hairline seam | Hairline and grip appear | Drag: follows the pointer 1:1, rubber-bands past either end, settles with a spring on the snap nearest where the throw was heading | Resize | — |
| Pane width buttons | Full width and Close, top right | Tooltip with shortcut | Toggle full / restore; close | — | Close only |
| View switcher | Icons; the current one filled on a sliding highlight | Tooltip with ⌘ number | Switches view; whatever is open stays open | — | — |
| Dump-or-ask pill | Log segment (dot while processing or failed), dump icon, what it sees, mic | Lifts slightly; hovering the "sees" name outlines that region | Grows into the column; the log segment opens the dump log | Drop links, images or cards onto it to dump them directly | — |
| Mic (in the pill) | Mic icon | — | The pill becomes the take (waveform, time, stop); stop drops the note in as a dump | — | — |
| Composer | Input, crosshair, attach, mic, send | — | Return sends. Send is an up arrow; it becomes a question mark (ask) when the text contains "?" | Paste a URL and it becomes a link chip | — |
| Crosshair | Off | Regions marked pickable outline on hover | Toggles picking; a click adds that object as a context pill | — | — |
| Filed token (in a reply) | Theme icon, theme name, count badge | — | Unfolds the gists filed there | — | Tap |
| Tripwire sentence | "I'd change my mind if …", signpost icon inline | — | Edit in place | — | Tap to edit |
| Tripwire, tripped | Signpost red, phrase underlined wavy red, dashed count | — | Count toggles the matched signals; each has Accept (lowers confidence one step) and dismiss | — | Tap |
| Confidence | Five steps and the sparkline | Sparkline shows the dated log | A step sets confidence and appends a stance | — | Tap |
| Timeline dot | Claim on its own dot, truncated | Dwell shows full claim and direct links, faint | Selects (opens in the pane); direct causes and consequences only, "+n" opens the next level | Drag to a new year (and confidence, for held theories) | — |
| Follow chain | Button when a theory is selected | — | Morphs the field into columns by depth; Esc morphs back | — | — |
| Atlas territory / landmark | Name; landmark sized by confidence | — | Opens it in the pane and centres the map on it | Pan the map | Pinch zoom |
| Briefing item | One component per kind of change | — | Accept / discard (or unmerge) on the item; settled items slide out right | — | Tap actions |
| Dump log row | Kind icon, first line, time, status, what it made | — | Retry if failed; delete to the bin (consequences confirmed first); Restore in the bin | — | Tap |

**Keyboard**

| Keys | Does |
| --- | --- |
| ⌘1 to ⌘5 | Theme sections, Columns, Atlas, Timeline, Briefing |
| ⌘J | Open or close dump or ask |
| Return / Shift-Return | Send / new line |
| Esc | One stack: stop picking or discard a take first; then close whichever of the pane and the column opened last, then the other. A folded signal or a Timeline level closes before the pane |
| ⌘[ / ⌘] (or ⌥← / ⌥→ outside text, or ← / → on the focused edge) | Widen / narrow the pane by one snap, while focus is in the pane |
| ⌘⇧L | Open or close the dump log |
| ⌘Z | Undo from the toast |
| J / K, A / X, U, Return or O | Briefing: next / previous, accept (or mark seen) / discard, unmerge, open in the pane |
| + / − / 0 / arrows | Atlas zoom in / out / fit all / pan |
| ⌘K | Find |

**Pane snaps.** Each view has four stops, remembered per view for the session: **compact** (480 px), **half** (pane and view share the width), **wide** (the view's own default) and **full** (the view folds to a strip of itself). When half lands within 40 px of compact, **half wins** and compact drops out; within 40 px of wide or full, half merges into that stop. The view folds to its strip once the pane passes halfway from wide to full.

**Motion.** Surfaces leave the way they came. Everything is interruptible. Dragging follows the pointer 1:1 and settles with a spring. Nothing animates on load: overnight changes are simply there, marked new. Reduced motion swaps movement for cross-fades and keeps the spatial logic.

## 5. Surface

### Encoding map

One meaning per variable, everywhere.

| Variable | Value | Means | Nothing else |
| --- | --- | --- | --- |
| Colour | Blue dot `#2f6fed` | New since I last looked | Also the focus ring tint |
| Colour | Red `--ap-neg` `#b4402f` (dot, signpost, wavy underline) | A challenge: a tripped tripwire or a challenge suggestion | |
| Colour | Green `#1f7a4d` in the sparkline | Confidence rose | |
| Colour | Amber `#b7791f` in the sparkline | Confidence fell | Red if the fall came from an accepted tripwire challenge |
| Colour | Prototype status glyph: grey idea, blue building, green built, hollow shelved | Prototype status | **Known clash:** building uses the same blue as "new". Flagged for Maggie; build it as the jig shows until she decides |
| Mark | Hollow ring | Open: a theme with no theory yet | |
| Mark | Slow breathing grey dot | A tripwire is watching | |
| Border | Dashed outline (with translucent fill) | Not yet mine: an agent draft or suggestion | Counts in a dashed badge are pending suggestions |
| Border | 1.5 px ink ring | Selected, open, or the same object highlighted elsewhere | |
| Weight | Icon fill | Active or selected | Regular weight otherwise |
| Weight | Text 600 | Object names: claims, theme names | Peers are told apart by weight and colour, not size |
| Shadow | None | Tier 0 and docked surfaces (a hairline seam at most) | Never decorative |
| Shadow | `--ap-shadow-1` | A card resting on the plane (my theory cards) | |
| Shadow | `--ap-shadow-float` (`0 4px 14px` at 10%) | Floating chrome: pill, view switcher | |
| Shadow | Sheet (`0 8px 24px` at 14%) | Tier 3: dump log | |
| Shadow | Larger tiers | Float `0 6px 16px`, modal `0 16px 40px`, toast `0 4px 12px`, tooltip `0 2px 6px`, ink at 10–18% | |
| Icon | Phosphor: Dump TrayArrowDown, Signal Pulse, Theme Binoculars, Theory Target, Prototype PencilRuler | One glyph per object type, from `OBJECT_ICONS` in `jig/src/homes/atoms.tsx` | Tripwire: Signpost. Views: Rows, Columns, MapTrifold, ChartScatter |
| Arrow | Up / down | Supports / undermines | |
| Send glyph | Up arrow / question mark | Dump / ask | |

### Type, colour and space

- **Tokens** are the `--ap-*` custom properties in `jig/src/homes/homes.css` (`.ap`). Use them; add a missing value to the set rather than a local literal.
- **Type:** Inter, 13 px base, antialiased, tabular numbers on anything that counts. Sizes: 11 (badges, keys), 12 (labels, meta), 13 (body), 20 (pane titles). Distinguish with weight and colour first.
- **Ink:** `--ap-ink`, `--ap-ink-2`, `--ap-ink-3` for primary, secondary and tertiary text. Lines at 9% and 5% black.

### Rules carried into every surface

| Rule | Source |
| --- | --- |
| No instructional text; headings only to tell groups apart; empty states show the action | Interface grammar, rule 8 |
| Icon-first, at most one text button per surface, every icon button named with a tooltip showing its shortcut | Rule 7 |
| Expanded surfaces (the pane) keep **persistent field labels**: Confidence, Happens by, Rival, Supports, Undermines, Status, Tests. Nothing on an expanded surface is hover-only | maggie-design |
| No dot separators; no coloured left-hand margins, borders or bars | Maggie's UI rules |
| As few type sizes as possible | Maggie's UI rules |
| Concentric radii, shadows over borders, 40 × 40 px hit areas, `scale(0.96)` on press, no `transition: all`, no clipped rings in scroll containers | make-interfaces-feel-better |
| Use the concept names exactly, everywhere | This model |
| **X only closes a fleeting surface** (a modal, popover, toast or transient card). It never discards, dismisses or rejects a suggestion, draft or proposal. A modal's close X always sits top-right | Maggie, DI-002 and DI-009 |
| **Decisions read Dismiss, then Accept.** Rejecting a model's suggestion or draft uses a labelled secondary **Dismiss** button on the left. The primary **Accept** (or Save or Confirm) sits on the right. This pair is the one exception to "at most one text button per surface" | Maggie, DI-009 |
| **The X key doesn't discard.** X is no longer a shortcut for discarding, dismissing or rejecting. Whether a different single key could do that is undecided; see DI-009 | Maggie, DI-009 |
| **Chevrons only expand and collapse.** They never mean "go to this object" | Maggie, DI-003 |

## Implementation notes

The full plan is in [build-spec.md](build-spec.md).

| Area | Decision |
| --- | --- |
| Front end | React + Vite + TypeScript, lifting the jig components |
| Server | Hono on Node 22+, SQLite (`better-sqlite3`) behind a typed tool layer; agents never touch the database directly |
| Agents | Vercel AI SDK 7 (the open-source `ai` library, not Vercel hosting) inside the server. Provider objects always, never plain model strings. OpenAI by default, Claude configured as the alternative per job ([agent-architecture-research.md](agent-architecture-research.md)) |
| Models | Transcription `gpt-transcribe`; processing and chat `gpt-6.1-terra`; evidence linking, tripwire and de-duplication (including the near-duplicate merge) `gpt-6-luna`; later jobs `gpt-6.1-sol`, batched overnight. Set per job in one config file |
| Background jobs | A `jobs` table in Aber's SQLite with a worker loop in the server. A crashed job restarts from the beginning; every agent write carries a `runId`, and a failed run's drafts and suggestions are cleared before the retry |
| Processing runs | The `agent_runs` table (job, model, tokens, cost, status, timings). Not shown in the app |
| Articles | Full fetched article text goes to the model for processing and evidence linking; stored as best effort, never depended on |
| Chat | AI SDK UI (`useChat`) in the dump-or-ask column. Generative UI components in v1: theory card, evidence split, signal list, theme activity |
| Evals | Vitest fixture tests on Maggie's real dumps; first, a comparison of OpenAI and Claude on 10–20 of them before locking models |
| Writes | Every row has an owner; every write records its actor (me, or which agent job and run) |
| Confidence | Append-only stance log: person, theory, confidence, note, time |
| Inflows | Manual only |
| This round | Runs locally on Maggie's MacBook: `npm` scripts, SQLite file and media in a local data folder, bound to `localhost`, no auth. An optional local backup copies the database and media |
| Later | Hosting on the **team Coolify server** (decided as the eventual target): Docker, Tailscale-only access with token auth, Litestream to Backblaze B2, media backed up to B2, iPhone capture through an Apple Shortcut. Aber then becomes a work tool: its data sits on work infrastructure under work policies. Moving it later is a database file plus a media folder |

## 6. Open questions

None for v1. The last one, the agent framework, was decided on 1 Nov 2026: Vercel AI SDK 7 with an own SQLite job queue ([agent-architecture-research.md](agent-architecture-research.md), recommendation A).

Answered on 1 Nov: base plane (Theme sections, with Columns, Atlas, Timeline and Briefing as views), compass (superseded by the pane), chat as dumps (yes), Pin (dropped), drafts (no expiry, stack by age), hosting (team Coolify, later), bin (30 days), near-duplicates (automatic, logged, undoable), sources (several), tombstones (kept), retire reasons (complete), media (server disk backed up to B2 once hosted; local disk this round), agent framework (AI SDK 7).
