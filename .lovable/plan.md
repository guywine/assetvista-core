

## Fix: Update react-router-dom to patch XSS vulnerability

The fix is straightforward — update `react-router-dom` to the latest patched version (6.31.0+).

### What I'll do

1. Update the `react-router-dom` version in `package.json` from `^6.30.1` to `^6.31.0`
2. This will pull in the patched `@remix-run/router` dependency that fixes the XSS via Open Redirects vulnerability

Since the version constraint uses `^`, npm/bun would normally pick up minor patches automatically on a fresh install. But to ensure the lockfile is updated, I'll bump the minimum version explicitly.

### Risk

This is a patch-level update with no breaking changes — fully backward compatible.

