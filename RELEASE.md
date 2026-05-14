# Release Checklist

Use this checklist before publishing `my-crud-lib` to npm.

## Preflight

- Confirm `package.json` version is the intended release version.
- Add an entry to `CHANGELOG.md` under the target version.
- Move `CHANGELOG.md` entries from `Unreleased` to the release date before publishing.
- Confirm `README.md` examples match tested public imports.
- Confirm migration notes are linked when the release contains breaking changes.
- Confirm `LICENSE`, `README.md`, `examples`, `dist`, and `prisma/schema.prisma` are included in the package.
- Review open issues for release blockers.

## Verify

```bash
npm ci
npm run ci
npm pack --dry-run
```

Inspect the dry-run file list before publishing.

## Publish

```bash
npm publish --access public
```

## After Publish

- Create a GitHub release or tag for the published version.
- Use `CHANGELOG.md` as the release body, and include migration links for breaking releases.
- Confirm the npm page shows repository, license, README, examples, and keywords.
- Smoke test installation in a fresh temporary project.
