// The demo world from app/server/src/db/seed-world.ts, extended with the fields the real schema holds
// (signal_sources, signal_origins, transcripts) so the jig shows realistic provenance.
// The D2 transcript and source titles are authored for this jig; seed-world.ts stores only the dump's first line,
// and seed.ts sets each source title to the gist (the duplication seen in the live app).
window.WORLD = (() => {
  const THEMES = {
    cost: "Cost of intelligence", memory: "Agent memory", review: "Code review after agents",
    personal: "Personal software", funding: "AI funding cycle", interfaces: "Novel agent interfaces", identity: "Agent identity",
  };
  const THEORIES = {
    t1: { claim: "Tokens become nearly free for routine work", conf: 3 },
    t2: { claim: "Frontier intelligence stays scarce and expensive", conf: 2 },
    t3: { claim: "Agents keep context across months, not sessions", conf: 4 },
    t4: { claim: "Code review becomes the bottleneck, not writing", conf: 4 },
    t5: { claim: "Most software is made for an audience of one", conf: 3 },
    t6: { claim: "Labs face a funding correction before agents pay their way", conf: 2 },
    d1: { claim: "Local models absorb most everyday agent work", draft: true },
    d2: { claim: "Software is priced per outcome, not per seat", draft: true },
    d3: { claim: "Review shifts from diffs to intent", draft: true },
  };

  // D2: "Voice note, 4 min: review is the new bottleneck". Paragraphs; `made` lists what each passage produced.
  const D2_PARAS = [
    { text: "Okay, it's quarter to eight, I'm walking to the station, so this is going to be a bit scattered. The thing I keep coming back to this week is that review is the new bottleneck. Not writing code. Reviewing it. Every conversation I've had since Thursday has ended up there somehow, even the ones that started somewhere else entirely." },
    { text: "So, first. Someone on a platform team at a payments company posted that their agents are now opening about forty pull requests a day. Forty. And the humans on that team are, what, six people? They said the agents aren't the problem, the queue is. Half those PRs sit for two days because nobody can hold enough context to approve them, so they either rubber-stamp or they let them rot. That's exactly the shape I've been describing.", made: ["s5"], quote: "their agents are now opening about forty pull requests a day … the agents aren't the problem, the queue is." },
    { text: "Which makes me think the interesting work isn't making agents write better code, it's making their work legible. What did it intend, what did it touch, what would I need to believe to merge this. I don't think a diff is the right unit any more. I've said that before, I know. I'm saying it again because it keeps being true." },
    { text: "Second thing, slightly different. I saw on The Verge last night that one of the big assistants pulled its memory feature after privacy complaints. People found it remembering things they'd told it in a completely different context, a health thing, I think, and it surfaced in a work chat in front of a colleague. They've switched it off in Europe entirely, pending a review. I'm not sure what to do with that. It cuts against my memory theory a little, or at least against the timing.", made: ["s7"], quote: "one of the big assistants pulled its memory feature after privacy complaints … They've switched it off in Europe entirely." },
    { text: "Although, honestly, maybe it doesn't. Maybe it just means memory needs boundaries. Scopes, the way we have folders, or the way you'd never tell your dentist what you told your therapist. That's a product problem, not a capability problem. Park that." },
    { text: "Third. There's a small design studio, I think they're called Tessaro, and they shipped an agent interface that's basically a canvas. No chat box at all. You drop the agent's outputs onto a board as cards, you cluster them, draw arrows between them, and the agent reads the arrangement as its next instruction. It looks rough, but it's the first thing I've seen in months that isn't a chat window with a sidebar bolted on. I want to keep an eye on that. It feels related to the review thing, actually: the canvas is a review surface.", made: ["s12"], quote: "they shipped an agent interface that's basically a canvas. No chat box at all … the agent reads the arrangement as its next instruction." },
    { text: "And then the bit that might connect all of it. If agents produce more than we can review, the tools that win are the ones that compress review. Summaries aren't enough, because you can't trust a summary of something you didn't watch happen. So it's provenance. Showing where each change came from, in a way you can scan in a few seconds. Which is, slightly embarrassingly, the whole point of this app." },
    { text: "Okay, the train's here. Things to follow up: find the original post about the forty PRs and see if there's a proper write-up. Check whether the memory thing really is Europe only. And look properly at the canvas thing, there might be a prototype in it. That's it." },
  ];
  const words = s => s.trim().split(/\s+/).length;
  const D2_WORDS = D2_PARAS.reduce((n, p) => n + words(p.text), 0);

  const DUMPS = [
    { id: "D1", day: "Today", time: "08:12", kind: "link", first: "3 links and a ramble about small models", produced: ["s1", "s2", "s4"],
      paras: [{ text: "3 links and a ramble about small models. The price cut is the third this year and nobody even blogged about it. The HN thread is mostly people saying they've moved their routine stuff to the small tier already. And the FT piece is the counterweight: power is booked years ahead, so the frontier stays rationed.", made: ["s1", "s2", "s4"] }],
      links: ["x.com/labnotes/status/18829", "news.ycombinator.com/item?id=41920", "ft.com/content/power-contracts"] },
    { id: "D2", day: "Today", time: "07:40", kind: "voice", first: "Voice note, 4 min: review is the new bottleneck", produced: ["s5", "s7", "s12"], duration: "4:12", paras: D2_PARAS, words: D2_WORDS },
    { id: "D3", day: "Yesterday", time: "22:05", kind: "text", first: "What if review is about intent, not diffs?", produced: ["s6", "d3"],
      paras: [{ text: "What if review is about intent, not diffs? Watched two senior reviewers today. Both skimmed the agent's diff and approved within a minute. Neither could tell me what the change was for.", made: ["s6", "d3"] }] },
    { id: "D4", day: "Yesterday", time: "18:30", kind: "link", first: "arxiv.org paper on training costs, plus 2 posts", produced: ["s3", "s8", "s13"],
      paras: [{ text: "arxiv.org paper on training costs, plus 2 posts.", made: ["s3", "s8", "s13"] }] },
    { id: "D5", day: "Fri 30 Oct", time: "21:10", kind: "voice", first: "Voice note, 2 min: household software", produced: ["s9", "s10", "s11"], duration: "2:03",
      paras: [{ text: "Voice note about household software.", made: ["s9", "s10", "s11"] }] },
  ];

  const src = (domain, author, title, date) => ({ domain, author, title, date, url: `https://${domain}/` });
  const SIGNALS = [
    { id: "s1", gist: "Lab cuts API prices again for its small model tier", source: "x.com", themes: ["cost"], evidence: [{ theory: "t1", stance: "supports" }], day: "Today", dump: "D1", fresh: true,
      sources: [src("x.com", "@labnotes", "Small tier now $0.04 per million input tokens. Third cut this year.", "2 Nov")] },
    { id: "s2", gist: "Open-weight model matches last year's frontier on coding", source: "news.ycombinator.com", themes: ["cost"], evidence: [{ theory: "t1", stance: "supports" }, { theory: "d1", stance: "supports" }], day: "Today", dump: "D1", fresh: true,
      sources: [src("news.ycombinator.com", "Show HN", "Open-weight 32B model scores 71% on last year's coding benchmark", "2 Nov")] },
    { id: "s4", gist: "Data-centre power contracts are booked years ahead", source: "ft.com", themes: ["cost", "funding"], evidence: [{ theory: "t2", stance: "supports", suggested: true }], day: "Today", dump: "D1", fresh: true,
      sources: [src("ft.com", "Financial Times", "Hyperscalers lock in power for 2029 and beyond", "1 Nov")] },
    { id: "s5", gist: "Team reports agents opening 40 PRs a day", source: "x.com", themes: ["review"], evidence: [{ theory: "t4", stance: "supports" }], day: "Today", dump: "D2", fresh: true,
      note: "Six reviewers. The queue, not the agents, is the constraint.",
      sources: [src("x.com", "@mira_builds", "Our agents opened 41 PRs yesterday. Generation isn't the bottleneck any more; nobody can review that much.", "2 Nov"),
                src("news.ycombinator.com", "Ask HN", "How are you reviewing agent PRs at volume?", "2 Nov")],
      merged: { from: "Agents open more PRs than six people can review", at: "2 Nov" } },
    { id: "s7", gist: "Memory feature withdrawn after privacy complaints", source: "theverge.com", themes: ["memory"], evidence: [{ theory: "t3", stance: "undermines", suggested: true }], day: "Today", dump: "D2", fresh: true,
      sources: [src("theverge.com", "The Verge", "Assistant pulls its memory feature in Europe after privacy complaints", "2 Nov")] },
    { id: "s12", gist: "Design studio ships a canvas-style agent UI", source: "x.com", themes: ["interfaces"], evidence: [], day: "Today", dump: "D2", fresh: true,
      sources: [src("x.com", "@tessaro.studio", "We took the chat box out. Agents now work on a shared canvas: drop outputs as cards, cluster them, draw the next step.", "2 Nov")] },
    { id: "s3", gist: "Frontier training runs keep growing in cost", source: "arxiv.org", themes: ["cost", "funding"], evidence: [{ theory: "t1", stance: "undermines" }, { theory: "t2", stance: "supports" }], day: "Yesterday", dump: "D4",
      sources: [src("arxiv.org", "arXiv 2611.01842", "Compute trends in frontier training, 2020–2026", "1 Nov")] },
    { id: "s6", gist: "Reviewers skim agent diffs and approve", source: "My observation", themes: ["review"], evidence: [{ theory: "t4", stance: "supports" }, { theory: "d3", stance: "supports" }], day: "Yesterday", dump: "D3", sources: [] },
    { id: "s8", gist: "Agent recalls a codebase across a month of sessions", source: "x.com", themes: ["memory"], evidence: [{ theory: "t3", stance: "supports" }], day: "Yesterday", dump: "D4",
      sources: [src("x.com", "@kp_dev", "Came back after four weeks and it remembered why we split the auth module.", "1 Nov")] },
    { id: "s13", gist: "Agents get their own OAuth identities", source: "github.blog", themes: ["identity"], evidence: [], day: "Yesterday", dump: "D4",
      sources: [src("github.blog", "GitHub Blog", "Agent identities: scoped tokens for automated contributors", "1 Nov")] },
    { id: "s9", gist: "Friend built a budgeting app just for her household", source: "My observation", themes: ["personal"], evidence: [{ theory: "t5", stance: "supports" }], day: "Fri 30 Oct", dump: "D5", sources: [] },
  ];

  // Theme "Novel agent interfaces" has 14 signals in the seed; the theme feed shows its most recent few.
  const FEED_EXTRA = [
    { id: "x1", gist: "Spatial IDE lets agents arrange files on a board", source: "x.com", themes: ["interfaces"], evidence: [{ theory: "t4", stance: "supports", suggested: true }], day: "Yesterday", dump: "D4",
      sources: [src("x.com", "@boardcode", "Files as cards on a board; the agent rearranges them as it works.", "1 Nov")] },
    { id: "x2", gist: "Voice-first agent UI drops the transcript view", source: "theverge.com", themes: ["interfaces"], evidence: [], day: "Yesterday", dump: "D4",
      sources: [src("theverge.com", "The Verge", "This assistant never shows you what it heard", "1 Nov")] },
  ];

  const byId = id => SIGNALS.find(s => s.id === id) || FEED_EXTRA.find(s => s.id === id);
  const dump = id => DUMPS.find(d => d.id === id);
  const passageFor = s => { const d = dump(s.dump); return d && d.paras.find(p => p.made && p.made.includes(s.id)); };
  return { THEMES, THEORIES, DUMPS, SIGNALS, FEED_EXTRA, signal: byId, dump, passageFor, words };
})();
