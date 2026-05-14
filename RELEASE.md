# Release Checklist

Use this checklist before publishing `my-crud-lib` to npm.

## Preflight

- Confirm `package.json` version is the intended release version.
- Confirm `README.md` examples match tested public imports.
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
- Confirm the npm page shows repository, license, README, examples, and keywords.
- Smoke test installation in a fresh temporary project.
