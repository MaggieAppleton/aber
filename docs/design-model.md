# Design Model: Aber

Last updated 31 Oct 2026. Layer 1 (grammar) is settled enough to build on. Layers 2–3 (space, motion) are proposed and drawn on the canvas linked in section 3. Layer 4 (surface) is not designed yet. Items marked *(proposed)* are not yet confirmed.

## 0. Brief

| | |
| --- | --- |
| Who | Maggie, alone in v1. Later: separate accounts and shared themes and theories for up to about 10 people |
| Audience | Fluent |
| Posture | Laptop: sovereign (long thinking and writing sessions). Phone: transient (capture and triage) |
| Devices | iPhone, two MacBooks |
| Context of use | Capturing on the go from X, Safari and voice notes; a morning review of what agents did overnight; deep sessions stating, writing and challenging theories |

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

**Agents can create draft objects and do anything to them. To my objects, agents can only propose.**

| Agents do directly | Agents propose (as Suggestions) | Agents never |
| --- | --- | --- |
| Transcribe and split dumps into signals | Evidence links on my theories | Change my confidence |
| File signals into existing themes | Revisions to my theories and themes | Edit my objects |
| Attach a repeat dump to an existing signal | Merges (signals, themes, theories) | Delete anything |
| Record mentions | Challenges (tripwire hits, red-team arguments) | |
| Create draft themes, theories and prototypes, and attach anything to their own drafts | | |

### Dump

- **Purpose:** Keep what I said, exactly as I said it.
- **State:** raw content (text, audio, links, images); transcript for audio; captured at; captured from (share sheet, web app, a theory's page; a hint for the processing agent, not a relationship); signals produced; processing runs (agent, model, version).
- **Actions:** user: capture, delete. System: transcribe, split, re-process.
- **Operational principle:** If you share three X links and a ramble, then within a minute they appear as signals in their themes, each traceable back to this dump.
- **Relationships:** produced signals (many-to-many: one signal can come from several dumps); can lead to draft theories, draft prototypes and revision suggestions.
- **Lifetime:** permanent and immutable, but deletable.
- **Delete rule:** deleting a dump removes only the signals whose **sole** origin is that dump. Signals that also came from other dumps lose that one origin. The confirmation shows what will go ("removes 4 signals and 2 evidence links"). Deleted dumps go to a bin for 30 days and can be restored *(proposed)*.

### Signal

- **Purpose:** Record one observation about the world.
- **State:** gist (one line, written by the agent, editable by me); sources (one or more: URL, author, date, or "my own observation") *(proposed: several sources per signal)*; my note; fetched content (best effort; a signal never depends on it); origins (dumps); mentions; themes; evidence links.
- **Actions:** user: edit gist and note, link to themes, link to theories as evidence, merge, discard. System: create (by splitting a dump), file into themes, attach repeat dumps, propose evidence, propose merges.
- **Operational principle:** If you save a post you already saved last month, then no duplicate appears: the existing signal gains another origin and its mention count goes up.
- **Relationships:** gathered in themes; evidence for or against theories; came from dumps.
- **Lifetime:** permanent until discarded, or until its last origin dump is deleted.
- **Discarded signals stay as tombstones** so the de-duplication step doesn't recreate them from a later dump *(proposed)*.

### Theme

- **Purpose:** Gather everything about one area of attention.
- **State:** name; draft or mine; signals; theories; mentions.
- **Actions:** user: write, rename, accept / rephrase / discard (drafts), link, merge, retire. System: create drafts (by clustering), file signals, propose merges.
- **Operational principle:** If a theme fills with signals but has no theory, then it reads as an open question and invites you to state one.
- **Relationships:** gathers signals; theories take positions on it. Flat: no theme inside another.
- **Lifetime:** long-lived.

### Theory

- **Purpose:** State a claim about the future that could be wrong.
- **State:**
  - claim (the title: short and falsifiable);
  - body (rich prose);
  - status: **draft → held → retired**, with a reason when retired (disproven, superseded, abandoned) *(proposed reasons)*;
  - authorship: agent wording accepted, rephrased by me, or written by me;
  - confidence and its history (mine only; a draft has none until I accept it);
  - horizon (when I think it happens);
  - what would change my mind;
  - themes; evidence; rivals; follows-from; mentions; versions.
- **Actions:** user: write, edit (versioned), accept / rephrase / discard (drafts), link, merge, extrapolate, challenge, set confidence, retire. System: create drafts, attach evidence to its own drafts, and on my theories propose evidence, revisions, merges and challenges.
- **Operational principle:** If a new signal matches what you said would change your mind, then the theory shows the challenge. You revise your confidence or retire it, and the history is kept.
- **Drafts behave like full theories:** they collect evidence and links before I accept them. Accepting or rephrasing makes a draft mine. I'm open to the agent's wording being right.
- **Relationships:** positions on themes; evidence from signals (supports or undermines); rivals (two-way); follows from other theories (many-to-many: "if A and B, then C"); embodied by prototypes.
- **Lifetime:** long-lived, versioned.

### Prototype

- **Purpose:** Embody a theory in something I can build.
- **State:** name; draft or mine; status (idea → building → built → shelved); body (rich prose with images and video, in the same writing view as a theory's body); links (repo, demo, recording); theories it embodies.
- **Actions:** user: write, edit, accept / rephrase / discard (drafts), link to theories, retire (shelve). System: create drafts when a dump describes something to build.
- **Operational principle:** If a theory you built on is later retired, then the prototype shows it now rests on a retired claim.
- **Relationships:** embodies theories.
- **Lifetime:** long-lived. In from v1.

### Suggestion

- **Purpose:** Let an agent propose a change to something of mine without making it.
- **State:** kind (evidence, revision, merge, challenge); target objects; the proposed change; the agent's reasoning; proposing agent and model; status (pending, accepted, discarded).
- **Actions:** user: accept, rephrase then accept, discard. System: propose.
- **Operational principle:** If an agent thinks a signal undermines one of your theories, then a ghost link appears on that theory. Accepting makes it real; discarding removes it.
- **Lifetime:** task.
- **Not suggestions:** new themes, theories and prototypes arrive as drafts. Extrapolations arrive as draft theories that follow from the original.

### Merged, dropped or deferred

| Candidate | Decision | Why |
| --- | --- | --- |
| Question | Merged into Theme | A theme with signals but no theories is an open question |
| Source | Attribute of Signal | Nobody thinks about a URL apart from what it shows |
| Bet | Dropped | Starting a prototype from a theory is the bet |
| Effect / consequence | A theory that follows from another | A second-order effect is a conditional claim with its own evidence |
| Evidence | A relationship with a stance | It only exists between a signal and a theory |
| Chat | Happens in the dump-or-ask panel; each message sent is a Dump *(proposed)* | Talking to the agent needs no concept of its own. Replies attach to the dump; anything it changes arrives as drafts or suggestions |
| Subject (what a dump is about) | Dropped | Signals connect to theories through evidence; where a dump was captured is only a hint |
| Scenario / future | Deferred | A bundle of theories is real but premature; revisit at 15+ theories |

## 2. Object–action matrix

d = drafts only.

| Object \ Action | Capture | Write | Edit | Link | Merge | Extrapolate | Challenge | Accept | Rephrase | Retire | Discard | Delete |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dump | ● | | | | | | | | | | | ● |
| Signal | via dump | | gist, note | ● | ● | | | | | | ● | |
| Theme | | ● | rename | ● | ● | | | d | d | ● | d | |
| Theory | | ● | ● versioned | ● | ● | ● | ● | d | d | ● | d | |
| Prototype | | ● | ● | ● | | | | d | d | ● | d | |
| Suggestion | | | | | | | | ● | ● | | ● | |

Intentional gaps:

- **One way in.** Signals can't be written directly; everything enters as a dump, so every signal has provenance.
- **Dumps can't be edited.** They are the record. Mistakes are deleted, not corrected.
- **Retire vs discard vs delete.** Being wrong is information, so my themes, theories and prototypes are retired and keep their history. A bad extraction or an unwanted draft isn't information, so signals, drafts and suggestions are discarded. Only dumps are deleted, because they're the one thing I author by accident.
- **Only theories are extrapolated or challenged.** A theme has to become a claim first.
- **Themes can't be split.** Merge and re-file instead, until splitting proves necessary.
- **No "bet" verb.** Starting a prototype is the bet.

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

### De-duplication

| The processing agent finds | It does | Authority |
| --- | --- | --- |
| A link already saved (after normalising x.com/twitter.com, tracking parameters, etc.) | Attaches the dump to the existing signal | Direct |
| The same observation from a different source | Proposes merging into one signal with two sources | Suggestion *(proposed)* |
| A signal that fits an existing theme | Files it there instead of drafting a new theme | Direct |
| Two overlapping themes | Proposes a merge | Suggestion |
| A theory I've stated before | Records a mention; proposes a revision if the wording moved. No new draft | Direct / suggestion |

### What a dump can produce

| Found in the dump | Becomes |
| --- | --- |
| Observations about the world | Signals, filed into themes; proposed as evidence on my theories |
| A new speculative claim | A draft theory |
| Thinking about an existing theory | A revision suggestion on that theory (claim change, or text for its body) |
| An idea for something to build | A draft prototype |

### Background agent jobs

| Job | Trigger | Produces |
| --- | --- | --- |
| Process a dump | New dump | Signals, filings, mentions, drafts, revision and evidence suggestions |
| Link evidence | New signal | Evidence suggestions on my theories; evidence on drafts |
| Cluster | Overnight | Draft themes from unthemed signals |
| Tripwire | New signal | Challenge when a signal matches "what would change my mind" |
| Red-team | Weekly, on high-confidence theories | Challenge with the strongest case against |
| Diagnosticity | Overnight | Flags evidence that fits rival theories equally and so tells me nothing |
| Extrapolate | On request, or a new theory | Draft theories that follow from it |
| De-duplicate | Overnight | Merge suggestions |

### Attribute ranking

| Object | Glanceable | On demand | Rare |
| --- | --- | --- | --- |
| Theory | Claim, draft marker, confidence, evidence balance (e.g. 5 supports / 2 undermines), pending suggestions, mentions | Body, horizon, what would change my mind, rivals, follows-from, confidence history | Versions, authorship, origin dump |
| Signal | Gist, source | My note, themes, theories it bears on, origins, mentions | Fetched content, capture time, processing run |
| Theme | Name, draft marker, signal and theory counts, "open" marker when it has no theories, latest activity | Its signals and theories | History, merges |
| Dump | Date, first line, number of things produced | Full text or audio and transcript | Processing runs |
| Prototype | Name, status, draft marker | Body and media, links, theories it embodies | History |
| Suggestion | What it proposes, on which object | The agent's reasoning | Which agent and model |

## 3. Spatial model *(proposed)*

Visual proposal: the [Aber — Space & Motion canvas](https://claude.ai/artifact/684MAujZZHLPsVor9fVDBj) (private to Maggie). Board names below refer to it.

### Base plane: theme sections *(decision pending: compare boards "A · World as theme sections" and "B · Theory board with theme filter")*

One vertical page: one section per theme, holding its theories as cards. Open themes show only a signal count and a "State a theory" action. A theory in two themes appears in both sections, as the same object. Drafts sit at the end of their section; more than three collapse into a ghost stack.

### At scale (100+ themes, hundreds of theories) *(proposed; board "A2 · World at scale")*

The World page shows what's alive, not everything:

1. **Pinned:** the few themes being actively worked on, expanded with their theory cards.
2. **Moved since yesterday:** one row per theme where something happened, with ghost counts; includes draft themes clustered overnight.
3. **All themes:** a dense, sortable table (theories, signals, last activity).

Find (⌘K) in the theme index is the main way to reach anything else. This adds a **Pin** verb to Theme (possibly Theory), which is new grammar.

### Three zoom levels

Going deeper always means zooming in, and each level grows from the thing you clicked.

| Level | What fills the base plane | Reached by |
| --- | --- | --- |
| World | Theme sections | Opening the app |
| Theme | The theme's theories above, its signals below | Clicking a theme heading |
| Theory | The compass | Clicking a theory card |

### The theory compass

| Direction | Holds | Meaning |
| --- | --- | --- |
| Above | Prototypes | What I'm building on it |
| Below | Evidence, split into supports and undermines | What it rests on |
| Left | Theories it follows from | Causes |
| Right | Theories that follow from it | Consequences; following a chain always moves right |
| Behind | Rivals, peeking from the card's top-right edge | Compare splits the view in two |
| Centre | Claim, confidence, horizon, what would change my mind, body | Focusing the body enters writing mode: the four directions shrink to edge tabs with counts |

The same stacking holds at the Theme level: theories above, signals below.

### Prototypes area

Prototypes are not on the World page. They have their own area, reached from a "Prototypes" link pinned to the bottom of the theme index (and from the phone's menu), grouped by status with media thumbnails and the theories each embodies. Inside a theory they sit above the claim in the compass.

### Surfaces

| Surface | Tier | Attachment | Origin | Persistence | Narrow screen |
| --- | --- | --- | --- | --- | --- |
| World / Theme / Theory | 0 | The world | Grows from the clicked card or heading | Permanent | Same zoom levels, each full screen |
| Theme index | 1 | Docked left, pushes | Left edge | Session | Sheet from the left |
| Dump-or-ask pill (+ round mic button) | 1 | Floats over content, bottom centre of the content area, small shadow | — | Always | Same, bottom centre |
| Dump-or-ask panel | 3 | Covers content, casts a shadow | Grows from the pill; Esc shrinks it back | Task | Grows from the pill to near full width |
| Theory and signal cards | 2 | Rest on the plane; lift only while dragged | In place | Session | Lift on long-press |
| Dump log (recent dumps, processing status, bin) | 3 | Covers content, casts a shadow | Rises from the pill | Task | Card above the open panel |
| Object menu, signal source preview | 4 | Tethered | Its trigger | Moment | Bottom sheet |
| Delete-dump confirmation | 5 | Blocks, dims the world | Centre | Task | Same |
| Toast ("Dumped · processing", with undo) | 6 | Never takes focus | Just above the pill | Seconds | Same |
| Tooltip | 7 | Tethered | Its trigger | While hovered or focused | None; long-press instead |

**Drafts and suggestions are a material, not a tier:** dashed outline, translucent fill, no shadow, on the same plane as my own things. Accepting solidifies them in place. A dashed border means "not yet mine" and nothing else.

**Posture:** sovereign on the laptop, so chrome stays quiet; transient on the phone, which is for capture and triage.

**Dump or ask** (decided after review, board "Dump-or-ask panel, open"): capture and chat share one small floating pill, bottom centre, never full width. Clicking it (or ⌘J) grows it into a panel with: a "SEES" row showing what on-screen context the agent gets (the current screen as a removable chip, plus a + to add other things on screen); the conversation, with what the agent produced (signals filed, dashed suggestions to accept); and one input to dump anything or ask about anything on screen, with attach, mic and send. A separate round mic button beside the pill starts a voice dump directly.

## 4. Behaviour *(proposed)*

| Element | Rest | Approach / hover | Press | Drag | Touch |
| --- | --- | --- | --- | --- | --- |
| Theory card | Claim, confidence, evidence balance | Its instances in other themes highlight; ⋯ appears | Zooms in to the compass | Reorder within a theme; drop on a theme heading to add it there | Tap zooms; long-press lifts |
| Signal row | Gist, source | Source preview after a short delay | Expands in place: note, origins, links | Onto a theory's supports or undermines column, or a theme heading | Long-press lifts; drop targets appear |
| Ghost (draft or suggestion) | Dashed, translucent | Accept and discard appear on its edge | Opens it to rephrase | Drafts drag like real cards | Swipe right to accept, left to discard |
| Evidence link | Line between signal and theory | The pair highlights; stance shown | Opens the note | — | Tap |
| Dump-or-ask pill | "Dump or ask · sees <screen>" | Lifts slightly | Grows into the panel | Drop links, images or cards onto it to dump them or add them as context | Tap opens; mic button beside it |
| Theme heading | Name, counts, open marker | ⋯ appears | Zooms in to strata | Drop target for cards and signals | Tap |
| Compass direction | Count at the margin | Edge brightens | Expands that direction | — | Tap |

**Motion:** zooming grows from the clicked object's bounds and reverses back into it (about 250 ms spring, proposed). Sheets leave the way they came. Everything is interruptible. Dragging follows the pointer 1:1 and settles with a spring. Nothing animates on load: overnight changes are simply there, as ghosts. Reduced motion swaps movement for cross-fades and keeps the spatial logic.

**Keyboard:** ⌘J open the dump-or-ask panel · J / K next / previous ghost · A / X accept / discard · E zoom in · Esc zoom out · ⌘K every verb.

**Shadow scale** (shadow means "above" and nothing else): tier 0 and docked tier 1 none · floating pill `0 4px 14px` · 2 lifted `0 2px 6px` · 3 sheet `0 8px 24px` · 4 float `0 6px 16px` · 5 modal `0 16px 40px` · 6 toast `0 4px 12px` · 7 tooltip `0 2px 6px` (all in ink at 10–18% opacity).

## 5. Surface

Not designed yet. Use the concept names above exactly, everywhere.

## Implementation notes

- SQLite for v1, with guardrails that keep a later move to Postgres cheap. Details are in the [hosting guide](hosting-guide.md).
- Every row has an owner; every write records its actor (me, or which agent job and model).
- Confidence is stored as an append-only stance: person, theory, confidence, note, time.
- Inflows are manual only. iPhone capture goes through an Apple Shortcut in the share sheet.
- Images and video for prototypes live outside SQLite, so they need their own backup; Litestream covers only the database.

## 6. Open questions

Space and motion (see the canvas):

1. **Base plane:** theme sections (A) or theory board (B)?
2. **Compass:** prototypes above, evidence below, causes left, consequences right, rivals behind. Right?
3. **Conversation storage:** each message sent from the panel is stored as a Dump (with the context it saw), and the agent's replies attach to that dump, so there is no separate Conversation concept. Agree?
4. **Pinning:** add a Pin verb to Theme (and Theory?) so the World page can scale? And do 100+ flat themes eventually need groups?
5. **Drafts:** proposed: at the end of their theme section, collapsing into a ghost stack past three. Is an expiry needed too?

Grammar and implementation:

6. **Hosting:** my own server, or the team's Coolify server? That depends on whether Aber is a work tool or a personal one.
7. **Bin:** confirm 30 days for deleted dumps.
8. **Near-duplicate signals:** confirm that merging them is a suggestion, not automatic.
9. **Sources:** confirm a signal can have several.
10. **Discarded signals as tombstones:** confirm, so they don't come back.
11. **Retire reasons:** disproven, superseded, abandoned. Complete?
12. **Media storage:** on the server disk, or straight to B2?
