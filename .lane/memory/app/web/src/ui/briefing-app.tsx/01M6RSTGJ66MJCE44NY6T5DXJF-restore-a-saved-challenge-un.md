---
id: 01M6RSTGJ66MJCE44NY6T5DXJF
anchor: function BriefingView
created: 2026-11-06T16:07:15Z
norm: '1'
---

Restore a saved challenge Undo notice after mount effects: main.tsx connects before rendering, so Briefing can mount with loading=false before the sibling toast has subscribed.
