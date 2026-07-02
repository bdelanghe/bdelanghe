# data/linkedin/ — the downstream copy

`data/profile.json` is canonical. LinkedIn is a separate surface that drifts. The
files here are LinkedIn's exported profile, committed so `linkedin-check.mjs` can
diff the two and tell you what to fix **on LinkedIn**.

## Format: JSON Resume

The export is `resume.json` in [JSON Resume](https://jsonresume.org/schema) format —
an existing open standard with a published JSON Schema, vendored at
`contract/jsonresume.schema.json`. The checker validates `resume.json` against that
schema before diffing, so a malformed export is caught early.

Only `work[]` (`name`, `position`, `startDate`, `endDate`) and `skills[]` are
diffed; the rest is carried for completeness. Dates are ISO8601 (`2023-10`, `2025`).

## Refresh the export

1. Export your LinkedIn profile to JSON Resume — e.g. the JSON Resume browser
   exporter, or convert a LinkedIn *Get a copy of your data* archive.
2. Save it here as `resume.json`. Commit.

> The committed `resume.json` was seeded from a profile PDF export (Jun 2026); the
> `skills[]` list is partial (only the skills visible on the profile page). Replace
> it with a full export when convenient.

## Run the check

```
npm run check:linkedin             # report-only
node linkedin-check.mjs --strict   # exit 1 on schema-invalid or unaccepted drift
```

CI runs it advisory-only (`.github/workflows/linkedin-check.yml`) on PRs that touch
`profile.json` or this folder.

## accepted-drift.json

Intentional divergences (e.g. the contract-era "Integrations Consultant" titles,
which the repo deliberately reframes as engineering work). Listed so they're
classified **accepted** instead of re-flagged. Add an entry only for a deliberate
choice, with a note explaining why.
