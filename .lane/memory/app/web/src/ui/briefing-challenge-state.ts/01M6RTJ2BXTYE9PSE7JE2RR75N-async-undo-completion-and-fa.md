---
id: 01M6RTJ2BXTYE9PSE7JE2RR75N
anchor: function present
created: 2026-11-06T16:20:07Z
norm: '1'
---

Async Undo completion and failure must check the notice token before clearing or replacing it, so an older request cannot retire a newer decision’s Undo.
