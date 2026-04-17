# English Office Mystery

`English Office Mystery` is a static browser game for learning English through comprehensible input. Students move Mia around an office, talk to coworkers, inspect objects, and solve a simple mystery in short spoken English.

## What Is Included

- A playable browser game with arrow-key or `WASD` movement
- Hint support for students who get stuck
- Local pre-generated audio files for dialogue
- A Python audio generator so you can regenerate voices after editing the story
- A GitHub-friendly static site structure with no build step

## How To Run Locally

1. Open a terminal in this folder.
2. Run `python -m http.server 8000`
3. Open [http://localhost:8000](http://localhost:8000)

You can also run `serve_game.bat` on Windows.

## How To Publish On GitHub Pages

1. Create a GitHub repository and upload the whole `english-office-mystery` folder.
2. In GitHub, open `Settings` -> `Pages`.
3. Set the source to the main branch and the root folder.
4. Save the settings and wait for the site to publish.

## Edit The Story

- Main case content lives in `assets/data/story.json`
- Browser logic lives in `src/`
- Voice generation lives in `tools/generate_audio.py`
- Install voice dependencies with `python -m pip install -r requirements-audio.txt`

If you change dialogue text, run:

```bash
python tools/generate_audio.py
```

The generator now prefers Microsoft Edge neural voices and writes `.mp3` files for more natural speech. During generation it may use the internet, but the finished game audio stays local inside `assets/audio/dialogue`. If neural voices are unavailable, the script falls back to `gTTS`, then to the older Windows desktop voices.

Speaker voice settings live in `assets/data/story.json` under each speaker:

- `naturalVoice` for the preferred neural voice
- `naturalRate` for a slower or faster reading speed
- `voice` for the Windows fallback voice

## Classroom Notes

- Students can move freely, but the objective card keeps the story focused.
- The language is intentionally short, repetitive, and contextual.
- Hints become stronger step by step, so weaker students can still finish the case.

## Credits

See `CREDITS.md` for asset and library sources.
