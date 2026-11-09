# API reference site

This directory builds the GitHub Pages API reference for **every** top-level
`azure-functions-nodejs-extensions-*` package: currently base, blob, connectors,
and servicebus. It is separate from Microsoft Learn onboarding and does not
publish npm packages or change the extensions' runtime builds.

The site URL after Pages setup is
<https://azure.github.io/azure-functions-nodejs-extensions/>.
This is the intended URL, not a claim that the site is already deployed.

## Local generation

Use Node.js 24+ and npm to satisfy every extension's engine requirement. From this directory:

```shell
npm ci --ignore-scripts
npm test
npm run install:packages
npm run build
```

`install:packages` first checks **all** extension manifests against their existing
lockfiles and rejects local file dependencies, then runs `npm ci --ignore-scripts`
in each package. Native build/install hooks are unnecessary for declaration docs.
This intentionally uses real package lockfiles and package-specific SDK versions;
it does not install a single shared SDK version or synthesize missing types.
To check the prerequisite locks without installing anything:

```shell
node scripts/install-packages.mjs --check
```

If compatible dependencies are **already installed** in every package, `npm run
build` can run directly after installing the documentation tools. It checks SDK
versions and resolves imported declarations from each package's own `node_modules`.
This is useful for local development with unpublished SDKs, but is **not**
evidence that a clean CI install is possible.

Open `site/index.html`, or serve the `site` directory with a local static server.
Output and intermediate tsconfigs are ignored by Git. There are no absolute site
links, so both a project URL and a custom domain work without a base-path setting.

## Dependency feeds and publication prerequisites

The connectors manifest requires `@azure/connectors@^0.4.0-preview` and
`@azure/functions@^4.17.0`. Its checked-in `.npmrc` and lockfile use the public
`azfunc/upstream-public` feed:

```text
https://pkgs.dev.azure.com/azfunc/public/_packaging/upstream-public/npm/registry/
```

### Fixing an upstream-feed E401

The feed can expose upstream package metadata without having saved the package
tarball. In that case, anonymous downloads fail with **401**, and the feed's
response explains: **"No local versions of package '@azure/connectors'; please
provide authentication to access versions from upstream that have not yet been
saved to your feed."** This caused the initial API documentation CI failure.
It is not a GitHub token problem, and changing Node.js alone does not fix it.

A maintainer must save the locked dependency graph to the public feed once:

1. Use an Azure DevOps account with **Feed and Upstream Reader (Collaborator)**
   permission or higher on `azfunc/public`'s `upstream-public` feed.
2. In **Artifacts > upstream-public > Connect to feed > npm**, follow the
   authentication instructions for the **user-level** npm configuration.
   Never commit credentials or add a PAT to the repository's `.npmrc`.
3. From `azure-functions-nodejs-extensions-connectors`, run the following in
   PowerShell while authenticated:

   ```powershell
   npm ci --ignore-scripts --no-audit --no-fund --cache (Join-Path $env:TEMP ("azfunc-feed-bootstrap-" + [guid]::NewGuid()))
   ```

   The fresh npm cache forces real feed downloads, saving upstream dependencies
   rather than reusing a developer's cached tarballs. Delete that temporary cache
   when finished. Do not regenerate the lockfile or downgrade the SDK to bootstrap
   the feed.
4. Verify an anonymous download separately; this Node.js request does not read
   npm credentials:

   ```shell
   node --input-type=module -e "const r = await fetch('https://pkgs.dev.azure.com/azfunc/public/_packaging/upstream-public/npm/registry/@azure/connectors/-/connectors-0.4.0-preview.tgz', { signal: AbortSignal.timeout(30000) }); console.log('HTTP', r.status); if (!r.ok) process.exitCode = 1; await r.body?.cancel();"
   ```

   Expect **HTTP 200**, then rerun the failed GitHub Actions build. Its clean
   `npm ci` validates anonymous access to the full locked dependency graph.
   If downloads still return 401, the feed owner must check permissions and
   upstream availability.

See [Azure Artifacts upstream sources](https://learn.microsoft.com/azure/devops/artifacts/concepts/upstream-sources)
for the save-on-download behavior and required role.

The workflow deliberately has no private feed credentials, so fork PR validation
works without exposing secrets. Metadata visibility or a successful install using
an existing npm cache does **not** establish anonymous tarball access.

For future SDK updates:

1. Make compatible SDK artifacts **anonymously downloadable** in the registry
   selected by each package's `.npmrc` **before** updating extension manifests.
   For an upstream feed, use the authenticated bootstrap above to save new versions.
2. Regenerate and commit package lockfiles using real registry artifacts. Never
   copy a developer's locally installed package or local tarball into CI.
3. Run `node scripts/install-packages.mjs --check`, then the full local-generation
   sequence on a clean checkout.

Unavailable SDK versions, stale lockfiles, or inaccessible feed URLs are explicit
build blockers. `install:packages` fails instead of ignoring a package, installing
an older SDK, creating stubs, or fabricating lockfile integrity metadata.

The documentation-tool lockfile was generated by npm against the configured
public Azure npm mirror. Its recorded resolved URLs and integrity values are
genuine npm output, not rewritten npmjs URLs. A runner must be able to fetch
those public mirror URLs too; if repository policy requires npmjs URLs, regenerate
the lockfile against that registry in an environment that can access it.

## First-run GitHub Pages setup

A repository administrator must:

1. Enable GitHub Actions and allow the pinned GitHub-owned actions used in
   `.github/workflows/api-docs.yml`.
2. In **Settings → Pages → Build and deployment → Source**, select
   **GitHub Actions**. The workflow does not enable Pages through the API.
3. Configure the `github-pages` environment to allow deployment **only from the
   repository's default branch**. Retain any required environment approvals.
   The workflow also checks the actual default branch dynamically; it does not
   assume `main`.
4. Complete any required upstream-feed bootstrap above and verify all
   dependency feeds are accessible to GitHub-hosted runners, then
   merge this workflow to the default branch. A successful push build uploads and deploys the site. For the
   first run or a retry, choose **Actions → API documentation → Run workflow**
   on the default branch.
5. In branch protection/rulesets, require **API documentation / build** after a
   successful first validation run. It validates every PR, including
   forks and PRs targeting a non-default integration branch.

Every merged PR produces a default-branch push and rebuilds the reference from
that commit. Publication occurs only after the docs tests, dependency installation,
TypeScript/TypeDoc checks, and generated-link checks succeed. A failed build never
replaces the previously deployed site. A merge to an intermediate stacked branch
does not publish; publication waits for the repository's default branch.

PR jobs have read-only repository access, no persisted checkout credentials,
no Pages deployment permissions, and never upload a Pages deployment artifact.
Only the separate deployment job has `pages: write` and `id-token: write`.
No `pull_request_target`, deployment secrets, or writeable source branch is used.
Default-branch builds and deployments are serialized without cancelling an
in-progress deployment, so an older slow build cannot overwrite a newer site.
GitHub may consolidate superseded queued pushes; the latest queued revision wins.
Superseded PR validation runs are cancelled.

## Maintenance

- Add a new top-level extension package using the existing folder/name convention
  and a `types` manifest entry. Discovery is automatic; missing declarations fail
  rather than silently dropping a package. Samples are not library packages.
- Edit the public declarations and their TSDoc comments in each package's `types`
  directory. TypeDoc starts at the manifest entrypoint, includes SDK re-exports,
  and compares the generated API against **every** TypeScript public export.
- Strict declaration checking remains on (`skipLibCheck: false`). Unresolved
  declaration imports, incompatible SDK versions, TypeDoc warnings, empty APIs,
  missing HTML/assets, broken anchors, and root-relative links fail the build.
  External HTTP links are not crawled by this check.
- Each package gets a separate generated tsconfig so its own SDK dependencies
  resolve independently. Local extension imports point at this checkout's public
  declarations. Test/example/runtime implementation files are not API entrypoints.
- The Functions registration comment `app.connectorTrigger` links to the upstream
  Functions app source via an explicit TypeDoc resolver, since `app` is not an
  exported symbol in this repository. Do not suppress unresolved-link warnings.
- Update pinned tooling with npm in this directory and commit `package.json` plus
  its real generated lockfile. Rebuild all APIs and run the test suite. Update
  Actions by immutable commit SHA after reviewing the upstream release.
- `site/<package>/api.json` is a generated reflection manifest for auditing; it is
  checked alongside the HTML but not committed. The root landing page lists every
  discovered package with its current manifest version.
