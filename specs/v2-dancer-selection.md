# V2 Dancer Selection

Replaces the old single-step dancer picker with a two-step gender + chapter selection backed by the new v2 GLB model set.

---

## Model Files

### File Layout

All v2 models are stored flat under `public/v2-models/`:

```
public/v2-models/
  male-1.glb  …  male-9.glb      (ตัวพระ — Tae)
  female-1.glb … female-9.glb    (ตัวนาง — Gade)
  FRAME_TIMING_INFO.md
```

Renamed from the original `Tae/Taesection{N}.glb` and `Gade/Gadesection{N}.glb` layout.

### Gender Mapping

| Gender | Thai   | Folder origin | File pattern       |
| ------ | ------ | ------------- | ------------------ |
| Male   | ตัวพระ | `Tae/`        | `male-{1-9}.glb`   |
| Female | ตัวนาง | `Gade/`       | `female-{1-9}.glb` |

### Frame Timing (24 fps)

| Section | Male end frame | Female end frame |
| ------- | -------------- | ---------------- |
| 1       | 3832           | 3832             |
| 2       | 2688           | 2688             |
| 3       | 2693           | 2693             |
| 4       | 2610           | 2610             |
| 5       | 2659           | 2659             |
| 6       | 2653           | 2653             |
| 7       | 2668           | 2668             |
| 8       | 2528           | 2528             |
| 9       | 5189           | 5218             |

### Deleted Old Models

The following files were removed from `public/models/` (no longer used):

- `Kukpat.glb`, `Kukpat-Original.glb`
- `terry.glb`, `terry-original.glb`
- `yokrob.glb`, `yokrob-original.glb`
- `improvise.glb`, `improvise-original.glb`

---

## UI Flow

### First Visit (no dancer selected)

The main action button reads **"Select Dances"**. Clicking it skips the main command menu and opens the dancer selection directly (gender step).

### After a Dancer is Selected

The button switches to **"Add Command"** and behaves normally (toggles the full command menu).

### Selection Steps

```
[dances]
  Step 1 — Gender
    > Male (ตัวพระ)       key: male
    > Female (ตัวนาง)     key: female

  Step 2 — Chapter
    > 1  > 2  > 3  > 4  > 5  > 6  > 7  > 8  > 9
```

The selected values encode as `gender:chapter` (e.g. `male:5`) and map to the model file `v2-models/{gender}-{chapter}.glb`.

---

## Code Changes

### `public/v2-models/`

- Renamed `Tae/Taesection{N}.glb` → `male-{N}.glb`
- Renamed `Gade/Gadesection{N}.glb` → `female-{N}.glb`
- Removed now-empty `Tae/` and `Gade/` subdirectories

### `src/character.ts`

- `Character.sources`: removed `waiting`, `terry`, `yokrob`, `yokroblingImprovise`; added 18 v2 entries (`v2-male-1` … `v2-female-9`) pointing to `v2-models/{gender}-{N}.glb`
- `Character.defaultActions`: removed old entries; v2 entries all set to `''` (falls back to first animation in each GLB)
- `INITIAL_MODEL` and default `options.model`: changed from `'waiting'` to `'v2-male-1'`
- `resetLimits`: cleared (all entries were for old models)

### `src/preloader.ts`

- Load path now resolves as `/${source}` when the source contains `/`, otherwise `/models/${source}`. This allows v2 models under `v2-models/` to load without moving files.

### `src/step-input.ts`

- Removed old `dances` step (single list of named dance keys)
- Added `dancerGender` step: two choices — `Male (ตัวพระ)` / `Female (ตัวนาง)`
- Added `dancerChapter` step: choices 1–9
- `choices.dances` updated to use `[steps.dancerGender, steps.dancerChapter]`
- `dances` moved to the top of the `choices` object (renders first in the menu)

### `src/switch-dance.ts`

- Removed `DanceConfig` type, `danceKeyMap`, and the legacy fallback path
- `switchDancers(key)` now only handles `gender:chapter` keys via regex `/^(male|female):([1-9])$/`; resolves to `v2-{gender}-{N}` model key

### `src/command.ts`

- `dances` handler destructures `[gender, chapter]` from args and calls `switchDancers('male:5')` style
- Sets `$dancesSelected.set(true)` after a successful dancer switch

### `src/store/choice.ts`

- Added `$dancesSelected = atom(false)` — tracks whether the user has actively selected a dancer
- Removed voice autocorrections for old dance keys (`kukpat`, `yokroblingImprovise`, `number60`)

### `src/overrides.ts`

- `Params.characters` default model changed from `'waiting'` to `'v2-male-1'`

### `src/world.ts`

- Initial character setup (`scene === 'BLACK'`) changed from `model: 'waiting'` to `model: 'v2-male-1'`

### `src/view/App.vue`

- Imports `$dancesSelected` and `setChoice`
- Added `selectDances()`: resets prompt, calls `setChoice('dances')`, shows the prompt — lands directly on gender selection
- Button label: `"Select Dances"` when `$dancesSelected` is false, `"Add Command"` after a dancer is picked
- Button click handler: `dancesSelected ? show() : selectDances()`
