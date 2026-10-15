# npm release

This repository publishes three npm packages from separate official-build
artifacts:

| Pipeline artifact | npm package |
| --- | --- |
| `azure-functions-nodejs-extensions-base` | `@azure/functions-extensions-base` |
| `azure-functions-nodejs-extensions-blob` | `@azure/functions-extensions-blob` |
| `azure-functions-nodejs-extensions-servicebus` | `@azure/functions-extensions-servicebus` |

The connectors package is not part of the official build matrix and is not
released by these pipelines.

## Release flow

Use `eng/ci/release.yml` to publish an artifact from
`azure-functions-nodejs-extensions.official`:

1. Select one `PackageArtifact`. The shared ESRP helper requires exactly one
   `.tgz`, so packages must not be combined into one release invocation.
2. Set `NpmPublishTag` to the npm distribution tag required for the release.
   Use `latest` for a stable release or `preview` for a pre-release.
3. Leave `NpmPublishDryRun` set to `true` first. This downloads the selected
   official-build artifact, runs the selected package's `validateRelease`
   script to check the package filename, version, and npm tag, and then runs:

   ```text
   npm publish <package.tgz> --tag <tag> --registry https://registry.npmjs.org --dry-run --ignore-scripts
   ```

4. Queue again with `NpmPublishDryRun: false` only after checking the package
   and npm tag. The pipeline requires manual validation and delegates publishing
   to `/ci/release-npm-package.yml@eng` with `publishMethod: esrp`.

## Azure DevOps configuration

Create and authorize the `azure-functions-nodejs-extensions-release` variable
group with:

| Variable | Purpose |
| --- | --- |
| `EsrpOwners` | Comma- or newline-separated individual `alias@microsoft.com` owners. |
| `EsrpApprovers` | Individual `alias@microsoft.com` approvers, different from the owners. |
| `EsrpManualApprovers` | Azure DevOps users or groups allowed to approve publishing. |

Create a release pipeline definition for `eng/ci/release.yml`. Authorize it to
use the variable group, the internal `engineering` repository at
`refs/tags/release`, the `azfunc-internal-esrp-prod` service connection, and
the `azure-functions-nodejs-extensions.official` pipeline resource.

For all three npm packages, grant `microsoft1es` and
`microsoft-oss-releases` read/write collaborator access before the first ESRP
release.
