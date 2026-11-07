---
id: 01M6RSTGJ66MJCE44NY6T5DXJF
anchor: function BriefingView
created: 2026-11-06T16:07:15Z
norm: '1'
sig: 8c5ff5cc50ef16d5
body_hash: c1e175f6964e5d78
raw_hash: acdb3184d85670c0
lines: 27-94
---

Restore a saved challenge Undo notice after mount effects: main.tsx connects before rendering, so Briefing can mount with loading=false before the sibling toast has subscribed.
