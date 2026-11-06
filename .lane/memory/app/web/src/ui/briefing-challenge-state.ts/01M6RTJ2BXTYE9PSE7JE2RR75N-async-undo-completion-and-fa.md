---
id: 01M6RTJ2BXTYE9PSE7JE2RR75N
anchor: function present
created: 2026-11-06T16:20:07Z
norm: '1'
sig: 04f3f30503c3b09f
body_hash: 89b05dcec772c60a
raw_hash: fe5bf0c33e2b962d
lines: 39-50
---

Async Undo completion and failure must check the notice token before clearing or replacing it, so an older request cannot retire a newer decision’s Undo.
