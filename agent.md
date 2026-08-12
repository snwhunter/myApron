# myApron Agent Instructions

These instructions apply to all work in this repository.

## Project

- Project name: `myApron`
- Repository: `snwhunter/myApron`
- Keep changes focused on the current working site and preserve existing functionality unless a change is explicitly requested.

## Versioning

- **Always update the visible app version whenever code or behavior changes.**
- Keep the version in `package.json` and the version shown in the UI synchronized.
- Use semantic-style versioning (`major.minor.patch`).
- For normal bug fixes, UI tweaks, and incremental improvements, bump the patch version.
- For larger new features, bump the minor version.
- Include the version bump in the same change/commit whenever practical.
- The purpose of the visible version is to make it obvious on a phone whether the latest site build has deployed.

## Deployment verification

- After making a change, report the new version and commit SHA so it can be compared with the deployed site.
- Do not assume a site rebuild completed just because the GitHub commit succeeded; the visible version is the deployment check.
