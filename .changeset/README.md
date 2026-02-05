# Changesets

This directory contains changeset files that track changes to packages in this monorepo.

## What are Changesets?

Changesets are a way to manage versions and changelogs for multi-package repositories. Each changeset:
- Describes the changes made
- Specifies which packages are affected
- Indicates the type of version bump (major, minor, or patch)

## Creating a Changeset

When you make changes that should be published, create a changeset:

```bash
pnpm changeset
```

This will:
1. Prompt you to select which packages have changed
2. Ask whether the change is major, minor, or patch
3. Request a summary of the changes

## Workflow

1. **Develop**: Make your changes
2. **Changeset**: Run `pnpm changeset` to document the change
3. **Commit**: Commit both your code and the changeset file
4. **PR**: Create a pull request
5. **Merge**: When merged to main, the GitHub Actions workflow will:
   - Create a "Version Packages" PR with updated versions and changelogs
   - Once that PR is merged, automatically publish to npm

## Version Packages

The CI/CD pipeline automatically:
- Accumulates changesets
- Creates version bump PRs
- Publishes packages when version PRs are merged

## Manual Publishing (if needed)

```bash
# Update versions based on changesets
pnpm version

# Publish updated packages
pnpm release
```

## Learn More

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Detailed Walkthrough](https://github.com/changesets/changesets/blob/main/docs/detailed-explanation.md)
