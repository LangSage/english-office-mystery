# Teacher Kit

Use this kit when you want to make a new case without rebuilding the engine by hand.

## Fast Workflow

1. Open `teacher-kit/story-template.json`
2. Change the story text, targets, map positions, and speaker voices
3. Run `build_teacher_game.bat`
4. The finished game appears in `builds/teacher-game`

## What You Can Change

- `meta`:
  title, case title, review phrases, difficulty defaults
- `speakers`:
  names, avatars, voice ids, speaking speed
- `comprehensionChecks`:
  up to 2 quick checks per case
- `steps`:
  instructions, vocab, hints, wrong-turn coaching
- `interactives`:
  object positions, NPC dialogue, item sequence
- `world`:
  room zones and furniture layout

## Builder Rules

- Keep comprehension checks at `2` or fewer
- Every `step.targetIds` value must match an interactive `id`
- Every `comprehensionChecks.stepId` must match a real step id
- Reuse the existing image asset keys unless you add new files to `assets/images`

## Build Command

```bash
python tools/build_game.py --story teacher-kit/story-template.json --output builds/my-new-game --force
```

Add `--skip-audio` if you only want a fast structure build first.
