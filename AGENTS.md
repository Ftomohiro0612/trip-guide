## Memorips PM fixed Session Memory shorthands

Apply this section only when the entire user message is exactly `セッション開始`
or exactly `セッション終了`. Do not activate it for a substring, quoted example,
longer request, or another scope.

- Role: Memorips PM
- Expected scope: `memorips`
- Fixed Session Memory:
  `C:\Users\tomo-\Documents\ai-session-memory\memorips\current-session.md`

### `セッション開始`

1. Read only the fixed `current-session.md` above. Record its `updated_at`,
   `session`, and SHA-256 at read time as the write base.
2. Confirm that the frontmatter `scope` is `memorips`, and use only the
   frontmatter and `# Current State` as the resume point.
3. Briefly report the current position, exact stop point, and next major
   direction.
4. Before the initial report, do not read an archive, this product repository,
   Git / GitHub, Issues, production, another memory, or another scope. Do not
   start investigation, implementation, verification, or a Monitor.
5. After reporting, inspect the Active Lane, Authorization Envelope, Next
   Action, Exact Stop Point, and Owner Decision Required recorded in
   `# Current State`.
6. Continue an existing lane only when all of the following are true:
   - the Authorization Envelope is valid and points to a canonical Owner
     decision;
   - the Next Action and Exact Stop Point are concrete;
   - the next action has no unresolved Owner Decision Required;
   - no HOLD, scope conflict, invalidating change, material canonical
     contradiction, or security / permission problem applies;
   - any production, publication, or other L3 action is bound to a still-valid
     exact-artifact Owner authorization.
7. Session Memory is only a resume pointer. Before changing anything, follow
   the normal project read-first, re-check the canonical Owner decision, active
   Issue / PR, and the Git / GitHub, production, or other evidence needed for
   the lane. If canonical evidence disagrees with Session Memory, stop without
   making the disputed change.
8. When the continuation conditions remain valid, proceed without a new user
   instruction until the first formal `GREEN / blocking 0`, the recorded Exact
   Stop Point, or a central exception-stop condition, then report the result.
9. If there is no active lane, authority or next action is unclear, an Owner
   decision is pending, a HOLD applies, an L3 action is not specifically
   authorized, or required memory fields are missing, report and wait.
10. If the fixed file is missing, its scope does not match, or `# Current State`
    is missing, report that fact and wait. Do not search, infer, or fall back.

### `セッション終了`

1. Do not perform additional investigation, implementation, or verification.
2. If no write base was recorded, read the fixed file once and record its
   `updated_at`, `session`, and SHA-256. Immediately before writing, reread the
   same fixed file and compare all three values.
3. If any value differs, do not create an archive or modify the fixed file.
   Report the stale-write conflict and end.
4. If there is no conflict, save the complete pre-close fixed file as a new,
   non-overwriting file under the same scope's `archive/`, following the
   existing filename convention.
5. Replace the whole fixed file with only the latest position confirmed in
   this session. Keep frontmatter and one `# Current State` containing only
   what is needed to restore the current position, fixed decisions, HOLD,
   out-of-scope boundaries, stop point, and next major direction. Do not append
   or retain past history.
6. Briefly report the archive path, replacement result, and stale-write result,
   then end without additional work.

Do not create a dedicated workspace, agmsg destination, Monitor, binding, Owner
Pack, ZIP, or additional operating infrastructure for these shorthands.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
