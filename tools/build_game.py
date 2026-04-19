from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RUNTIME_FILES = [
    Path(".gitignore"),
    Path("CREDITS.md"),
    Path("README.md"),
    Path("index.html"),
    Path("package.json"),
    Path("requirements-audio.txt"),
    Path("serve_game.bat"),
    Path("styles.css"),
]
RUNTIME_DIRS = [
    Path("assets/images"),
    Path("assets/vendor"),
    Path("src"),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a standalone static game package from a story template."
    )
    parser.add_argument(
        "--story",
        required=True,
        help="Path to the source story JSON file.",
    )
    parser.add_argument(
        "--output",
        required=True,
        help="Output directory for the built game.",
    )
    parser.add_argument(
        "--provider",
        choices=("auto", "edge", "gtts", "system"),
        default="auto",
        help="Preferred TTS provider for generated audio.",
    )
    parser.add_argument(
        "--skip-audio",
        action="store_true",
        help="Skip dialogue generation and copy only the runtime files.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite an existing output directory inside this workspace.",
    )
    return parser.parse_args()


def validate_story(story: dict) -> None:
    required_keys = ("meta", "speakers", "steps", "world", "interactives", "inventoryItems")
    missing = [key for key in required_keys if key not in story]
    if missing:
        raise ValueError(f"Story is missing required keys: {', '.join(missing)}")

    step_ids = {step["id"] for step in story["steps"]}
    interactive_ids = {interactive["id"] for interactive in story["interactives"]}

    for step in story["steps"]:
        for target_id in step.get("targetIds", []):
            if target_id not in interactive_ids:
                raise ValueError(f"Unknown target id '{target_id}' in step '{step['id']}'")

    checks = story.get("comprehensionChecks", [])
    if len(checks) > 2:
        raise ValueError("This game currently supports at most 2 comprehension checks per case.")

    for check in checks:
        if check["stepId"] not in step_ids:
            raise ValueError(f"Check '{check['id']}' points to unknown step '{check['stepId']}'")
        if not any(option.get("isCorrect") for option in check.get("options", [])):
            raise ValueError(f"Check '{check['id']}' does not include a correct answer option.")


def remove_existing_output(output_dir: Path) -> None:
    if not output_dir.exists():
        return

    if ROOT not in output_dir.parents:
        raise ValueError("Refusing to delete an output path outside the current game workspace.")

    shutil.rmtree(output_dir)


def copy_runtime(output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    for relative_path in RUNTIME_FILES:
        source = ROOT / relative_path
        destination = output_dir / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)

    for relative_path in RUNTIME_DIRS:
        shutil.copytree(ROOT / relative_path, output_dir / relative_path)

    (output_dir / "assets" / "data").mkdir(parents=True, exist_ok=True)
    (output_dir / "assets" / "audio" / "dialogue").mkdir(parents=True, exist_ok=True)
    (output_dir / "tools").mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / "tools" / "generate_audio.py", output_dir / "tools" / "generate_audio.py")


def generate_audio(story_path: Path, audio_dir: Path, provider: str) -> None:
    command = [
        sys.executable,
        str(ROOT / "tools" / "generate_audio.py"),
        "--story-path",
        str(story_path),
        "--audio-dir",
        str(audio_dir),
        "--provider",
        provider,
    ]
    subprocess.run(command, check=True)


def main() -> None:
    args = parse_args()
    story_path = Path(args.story).resolve()
    output_dir = Path(args.output).resolve()
    output_story_path = output_dir / "assets" / "data" / "story.json"
    output_audio_dir = output_dir / "assets" / "audio" / "dialogue"

    story = json.loads(story_path.read_text(encoding="utf-8"))
    validate_story(story)

    if output_dir.exists():
        if not args.force:
            raise FileExistsError(f"Output directory already exists: {output_dir}")
        remove_existing_output(output_dir)

    copy_runtime(output_dir)
    output_story_path.write_text(
        json.dumps(story, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    if not args.skip_audio:
        generate_audio(output_story_path, output_audio_dir, args.provider)

    print(f"Built game package in {output_dir}")


if __name__ == "__main__":
    main()
