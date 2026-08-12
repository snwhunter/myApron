# myApron Agent Instructions

These instructions apply to all work in this repository.

## Project

- Project name: `myApron`
- Repository: `snwhunter/myApron`
- The `main` branch in GitHub is the canonical source of truth for the site code.
- Keep changes focused on the current working site and preserve existing functionality unless a change is explicitly requested.
- Do not treat the currently published `chatgpt.site` copy as the authoritative source when it differs from GitHub `main`.

## Versioning

- **Always update the app version whenever code or behavior changes.**
- `package.json` is the single source of truth for the version number.
- The UI must read the version from `package.json`; do not maintain a second hard-coded UI version.
- Use semantic-style versioning (`major.minor.patch`).
- For normal bug fixes, UI tweaks, and incremental improvements, bump the patch version.
- For larger new features, bump the minor version.
- Include the version bump in the same change/commit whenever practical.
- The purpose of the visible version is to make it obvious on a phone whether the latest site build has deployed.

## Deployment verification

- A successful GitHub push means the source is updated, not that the ChatGPT Site has been published.
- After making a change, report the new version and commit SHA so they can be compared with the deployed site.
- The deployed site should display the version in a persistent badge. If the badge does not match `package.json` on `main`, the deployed site is stale and must be republished/rebuilt.
- Do not assume a site rebuild completed just because the GitHub commit succeeded.

## Continuous integration

- Keep the GitHub Actions validation workflow passing on `main`.
- Changes should install dependencies, lint, and build successfully before being considered ready to publish.
