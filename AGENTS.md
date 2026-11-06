# AGENTS

## Worktree isolation

- For every task in this project, start T3 sessions in Local mode and use lane for repository edits.
- Before editing, read `/Users/maggieappleton/.agents/skills/lane/SKILL.md` and run `lane ls --json`.
- Reuse this task's lane, or create one with `lane new <task>` and work in the printed path. Use `--base <branch>` explicitly when continuing work on a feature branch.
- Preserve existing checkouts, sessions and uncommitted work. Read-only investigation can stay in the current checkout.
- Create additional worktrees with lane; use T3's Local environment rather than its built-in worktree creation.
- Merge a PR only after Maggie explicitly approves that PR once it is ready for review.

<!-- lane:protocol -->
## Context memory

- Before editing a file, read `.lane/memory/<path>/` if it exists, or run `lane why <path>`.
- Record non-obvious findings with `lane note add <path> -a <anchor> "..."`.
- Do not edit `.lane/` by hand; landing manages it.
- Land with `lane merge`, or `lane push` where trunk is protected, then `lane prune` once it merges.
- Detailed workflow lives in `/Users/maggieappleton/.agents/skills/lane/SKILL.md`.
<!-- /lane:protocol -->
