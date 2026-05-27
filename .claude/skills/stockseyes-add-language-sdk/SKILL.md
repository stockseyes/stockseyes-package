---
name: stockseyes-add-language-sdk
description: Procedure to add a new language or platform SDK (e.g. react, python) to the monorepo. Use when standing up a new package.
---

# Adding a new language/platform SDK

Each platform is a self-contained package that conforms to the shared contract. (Architecture:
`stockseyes-architecture`. `node/` is the reference implementation.)

## Procedure

1. **Folder** — create a new top-level `<platform>/` directory; it owns its build, tests,
   dependencies, and publish pipeline.
2. **Naming** — npm: `@stockseyes/<platform>`. PyPI: flat `stockseyes`. No separate `core` package.
3. **Conform to the contract** — implement the same endpoints as `spec/openapi.yaml` and produce
   the **exact** normalized shapes (`Quote`, `Instrument`, `SearchResult`). If a shape must change,
   change the spec first via `stockseyes-add-endpoint` — don't invent SDK-specific shapes.
4. **Reuse the fixtures** — the SDK's tests assert its normalizers against the shared
   `fixtures/*.json` (raw → normalized). This is what guarantees it matches `@stockseyes/node`.
5. **CI** — add `.github/workflows/<platform>.yml` path-filtered to `<platform>/**`, plus a publish
   workflow that tags `<platform>-vX.Y.Z`. The existing `spec.yml` already gates the contract.
6. **JS packages** — when a second JS package (e.g. react) lands, add a root workspace
   (`"workspaces": ["node", "react"]`); `@stockseyes/react` depends on `@stockseyes/node` and must
   keep the client isomorphic.
7. **Docs** — add `README.md` (the package's registry page) and `LICENSE` inside the folder.

Canonical references: `README.md`, `spec/openapi.yaml`, `fixtures/`, and the `node/` package.
