# Aber — Grammar Draft

Oct 30, 2026 · @Maggie Appleton

> Superseded by the [design model](design-model.md). Kept for history.

The core move: separate **what you've seen** (signals, themes) from **what you claim** (theories), and design everything around making claims that can turn out wrong. This draft covers the grammar (nouns and verbs), the background agent work, three spatial directions and the open questions. Nothing here is at screen level yet.

## Purposes

Seven outcomes, stated as what you get done rather than as features.

1. Get a thought or signal in within seconds, from phone or laptop, without deciding where it goes.
2. See my current theories of the future, written down clearly.
3. Know what each theory rests on, and what would make it wrong.
4. See where theories compete (near-free tokens vs scarce compute).
5. Think forward from a theory to its second- and third-order effects.
6. Turn a theory into something I can build.
7. Arrive in the morning and see what the agents noticed overnight.

## Nouns

Seven concepts survive; five candidates are merged or deferred.

| Concept | Purpose | Lifetime | Notes |
| --- | --- | --- | --- |
| **Dump** | Keep exactly what I said, as I said it | Permanent, immutable | The raw transcript. Agents break it into the other objects; it stays as provenance |
| **Signal** | Record one thing I saw in the world | Permanent | The link, paper or tweet is an attribute of the signal (its provenance), not a separate concept |
| **Theme** | Name a pattern across signals | Long-lived | Descriptive, with no stance: "agents gaining long-running memory" |
| **Theory** | State a claim about the future that could be wrong | Long-lived, versioned | Has a stance and a confidence. Second-order effects are theories that *follow from* another theory |
| **Question** (tentative) | Hold the uncertainty that rival theories answer differently | Long-lived | "What happens to the cost of intelligence?" The two token theories become rival answers to it |
| **Prototype** | Embody a theory in something buildable | Idea → building → built | The link back to the theory is the point |
| **Suggestion** | Let agents propose without changing my model | Task: pending until accepted or dismissed | Every agent output is one of these |

### Merged or dropped

| Candidate | Decision | Why |
| --- | --- | --- |
| Source | Attribute of Signal | Nobody thinks about a URL apart from what it shows |
| Bet | A state of Theory (held → betting → retired) | Used as a synonym; one name everywhere |
| Effect / consequence | Theory with a *follows from* link | A second-order effect is a conditional claim. It can gather its own evidence and stand alone later. Order = depth in the chain. Moderate confidence; the alternative is a separate noun |
| Evidence | A relationship: signal → theory, **supports** or **undermines** | It only exists between two things |
| Scenario / future | Deferred | A coherent bundle of theories is real but premature. Revisit at 15+ theories |

### Theme vs Theory

This is the key distinction. A theme is "what I'm seeing"; a theory is "what I think will happen". Agents are good at producing themes by clustering. Theories should be yours.

## Verbs

Only theories can be extrapolated or challenged; dumps can only be captured.

| Object | Capture | Link | Name / State | Extrapolate | Challenge | Revise | Retire |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dump | ● |  |  |  |  |  |  |
| Signal | ● | ● |  |  |  | annotate |  |
| Theme |  | ● | name |  |  | ● | ● |
| Theory |  | ● | state | ● | ● | ● (versioned) | ● |
| Question |  | ● | ● |  |  | ● | ● |
| Prototype |  | ● | ● |  |  | ● | ● |

Suggestions take only **accept** and **dismiss**.

### Deliberate gaps

- **Only theories can be extrapolated or challenged.** You can't think forward from a vibe. A theme has to be stated as a claim first, so the tool nudges you to commit.
- **Dumps are immutable.** They're the record of your thinking at that moment.
- **Retire, never delete.** Being wrong is information. A retired theory with its evidence is something your head can't currently keep for you.

## Background agents

All agent output arrives as Suggestions; the tripwire and diagnosticity jobs are where the real value is.

| Job | Trigger | Proposes |
| --- | --- | --- |
| Break up a dump | New dump | Signals, candidate themes, draft theory statements |
| Link evidence | New signal | "This supports / undermines theory X" |
| Cluster | Overnight | New theme from unthemed signals |
| Tripwire check | New signal | "This matches what you said would change your mind about X" |
| Red-team | Weekly, on high-confidence theories | The strongest case for the rival theory |
| Diagnosticity | Overnight | "This signal fits both rivals equally, so it tells you nothing" |
| Extrapolate | On request, or a new theory | Candidate second- and third-order effects |

The tripwire and diagnosticity jobs need each theory to carry a **"what would change my mind"** attribute.

## Spatial directions

Recommendation (moderate confidence): **A as the world, with B in miniature as a theory's expanded state.**

|  | A. Theory wall | B. Strata | C. Cone canvas |
| --- | --- | --- | --- |
| Base plane | Theories as cards, grouped by Question | Bands stacked bottom to top: signals → themes → theories → prototypes, with links as vertical threads | Theories placed by time horizon and plausibility |
| Matches | What you'll act on | Your "bubbles up" mental model, literally | Futures-cone thinking |
| Breaks | Signals and themes become second-class | Turns into a hairball; poor on phone | Placing things becomes busywork; unreadable on phone |

### Expanded theory

A theory card expands in place:

- evidence sits below the claim, split into **supports** and **undermines**;
- consequences branch outwards;
- prototypes sit above.

### How agent suggestions appear

Suggestions render on the object they concern, in a distinct "not yet mine" material (translucent or dashed). A proposed evidence link appears as a ghost link on the theory itself. Only orphan suggestions, such as a brand-new theme, go to a separate stack. The morning view is your wall with ghosts on it, not an inbox.

### Chat

Chat attaches to an object: you talk *to a theory* in a panel docked beside it. Global chat exists only for dumping.

## Phone vs laptop

The phone is for capture and triage; the laptop is for developing theories.

| Phone (transient) | Laptop (sovereign) |
| --- | --- |
| Voice dump, quick signal | Stating and revising theories |
| Triage suggestions with accept/dismiss swipes | Extrapolating, challenging |
| Glance at a theory | Spawning and tracking prototypes |

## Precedents worth borrowing

Four established futures and analysis methods map directly onto parts of the grammar.

| Method | Origin | What it gives the tool |
| --- | --- | --- |
| [Futures Wheel](https://mcguinnessinstitute.org/wp-content/uploads/2024/11/06-FuturesWheel.pdf) | Jerome C. Glenn, 1971, as a student at Antioch Graduate School of Education. Some sources, including his [alumni profile](https://commonthread.antioch.edu/notes/jerome-glenn-works-to-tackle-management-ghallenges-faced-in-the-governance-of-agi), say 1972; his own chapter says 1971. A central change ringed by direct consequences, then indirect ones | The **extrapolate** verb and the *follows from* chain |
| [Analysis of Competing Hypotheses](https://en.wikipedia.org/wiki/Analysis_of_competing_hypotheses) (ACH) | Richards Heuer, CIA, 1970s. Each piece of evidence is assessed as consistent or inconsistent with every hypothesis; some evidence [discriminates better than other evidence](https://www.doc.surf/wiki/analysis-of-competing-hypotheses). A known weakness: the matrix is a static snapshot | Rival theories, **undermines** links, the diagnosticity job. Background agents fix the static-snapshot weakness |
| [Futures cone](https://thevoroscope.com/2017/02/24/the-futures-cone-use-and-history/) | Hancock and Bezold, 1994, building on Henchey's 1978 taxonomy of possible, plausible, probable and preferable futures. Voros extended it with a single "projected" baseline | A plausibility attribute on theories, plus a "preferable" flag: what you *want* to happen, which prototypes push towards |
| [Shell scenario planning](https://ourplausiblefutures.substack.com/p/an-introduction-to-plausible-futures) | Pierre Wack, Royal Dutch Shell, 1970s. Scenarios as a way to widen mental flexibility rather than predict one outcome (secondary source) | The case for **Question** as a noun: critical uncertainties with rival answers |

## Where I'd push back

The biggest risk is building a confirmation machine.

1. **The default failure is a confirmation machine** (high confidence). The easiest agent job to build is "find more support for my theories". Make disconfirmation structural: every theory needs either a rival or a "what would change my mind", and the agent flags evidence that doesn't discriminate.
2. **Authorship.** Accepting agent-drafted theories wholesale will slowly import the model's framings. One option: accepting a drafted theory requires you to restate it, even slightly. It may be too much friction; worth testing.
3. **Don't build the ontology first** (moderate confidence). Spend a week or two with only dumps, agent-extracted signals and a plain list of theories. Watch what the agents propose, then design the wall.
4. **Revision history matters more than it looks.** "My confidence in X has fallen over three months" is exactly what currently lives only in your head.

## Open questions

- [ ] Is **Question** a real noun, or are rival theories just linked directly to each other?
- [ ] Does Theme vs Theory match how you think, or are they one thing?
- [ ] **Substrate:** markdown with frontmatter in a git repo (agent-native, readable in Obsidian, free version history) or a database (easier to query for the wall)? Leaning markdown, moderate confidence, with the UI as a view over the files.
- [ ] **Inflows:** are Todoist and X bookmarks the main sources? Todoist is connected, so an agent could sweep a capture project.
- [ ] **Naming:** "Dump" or "Capture"?
