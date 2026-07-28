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
   direction, then wait.
4. Do not read an archive, this product repository, Git / GitHub, Issues,
   production, another memory, or another scope. Do not start investigation,
   implementation, verification, or a Monitor.
5. If the fixed file is missing, its scope does not match, or `# Current State`
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
