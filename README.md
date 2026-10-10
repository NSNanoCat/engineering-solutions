# Engineering Solutions

Public build tools maintained by NSNanoCat. Use Node.js 24 and pnpm 9.9.0.

The twelve published packages are `@nsnanocat/arguments-builder`, `@nsnanocat/utils`, `@nsnanocat/surge2egern`, `@nsnanocat/modkit`, `@nsnanocat/modkit-shared`, and the seven `@nsnanocat/modkit-plugin-*` packages (boxjs, dts, egern, loon, quantumultx, stash, surge).

`utils` provides build utilities; it is separate from the proxy runtime package `@nsnanocat/util`. The old doc-ui workspace is private and retained as historical source. Use the independently maintained `@nsnanocat/doc-ui` instead.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm --filter @nsnanocat/arguments-builder exec tsc --noEmit
pnpm --filter @nsnanocat/arguments-builder exec jest --runInBand
pnpm --filter @nsnanocat/modkit-plugin-surge exec jest --runInBand
```

## Releases

Add Changesets, then run `pnpm changeset version`. Modkit packages keep their fixed version group. After checks pass, advance the release commit to `main`. Push package tags using maintainer credentials, for example `@nsnanocat/arguments-builder@1.8.7`. Main-branch pushes do not publish packages.

The release workflow validates the tag, builds and checks the workspaces, and uses `pnpm pack`. GitHub Packages and npm jobs publish the same artifact with explicit registries. Existing versions are skipped only when the published integrity matches. Both registries must pass isolated installation, entry point, type and CLI checks before a GitHub Release is created from the corresponding package CHANGELOG entry.

For the initial migration, publish and verify utils and surge2egern first; then arguments-builder and modkit-shared; then the seven plugins; finally modkit. Do not push a dependent package tag until both sources of its dependencies have passed verification.

GitHub publishing uses `GITHUB_TOKEN` with `packages: write`. Confirm repository association, public visibility and consumer read permissions after initial publication. Consumers route `@nsnanocat` to `https://npm.pkg.github.com/` and provide a token with package read permission.

npm publishing uses OIDC with `id-token: write`, without an npm token in the release workflow. Each package's trusted publisher is `NSNanoCat/engineering-solutions`, workflow `release.yml`. A new trusted publisher must successfully publish within 48 hours to become validated; the migration's follow-up patch releases validate these connections.
