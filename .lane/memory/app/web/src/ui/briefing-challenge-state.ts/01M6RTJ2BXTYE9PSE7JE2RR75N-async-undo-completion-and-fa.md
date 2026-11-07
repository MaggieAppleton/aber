---
id: 01M6RTJ2BXTYE9PSE7JE2RR75N
anchor: function present
created: 2026-11-06T16:20:07Z
norm: '1'
sig: 04f3f30503c3b09f
body_hash: 442bd41d8ca56f62
raw_hash: 968287001b0cf6ec
vouched: 2026-11-07T07:58:11Z
lines: 39-50
---

Async Undo completion and failure must check the notice token before clearing or replacing it, so an older request cannot retire a newer decision’s Undo.
