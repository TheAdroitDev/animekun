# line-art (vendored)

From [JDhruv14/line-art-animation](https://github.com/JDhruv14/line-art-animation) (MIT, see `LICENSE`).

- `lib/`: the drawing, gait, motion and day/night modules, unchanged except for import paths.
- `village/`: the ink village scene. `mount.ts` replaces the original `main.ts`:
  - `mountVillage(root)` returns `pause()`, `resume()` and `destroy()`;
  - everything is scoped to `root`, with no URL flags and no window globals;
  - it starts at the visitor's local time.

  The village files are `// @ts-nocheck` and excluded from eslint, because they're not written for strict TS.
