from __future__ import annotations

import argparse
import asyncio
import json
import subprocess
from pathlib import Path

try:
    import edge_tts
except ImportError:  # pragma: no cover - optional dependency
    edge_tts = None

try:
    from gtts import gTTS
except ImportError:  # pragma: no cover - optional dependency
    gTTS = None


ROOT = Path(__file__).resolve().parents[1]
STORY_PATH = ROOT / "assets" / "data" / "story.json"
AUDIO_DIR = ROOT / "assets" / "audio" / "dialogue"
DEFAULT_EDGE_VOICE = "en-US-EmmaMultilingualNeural"
DEFAULT_EDGE_RATE = "-8%"
DEFAULT_EDGE_VOLUME = "+0%"
DEFAULT_EDGE_PITCH = "+0Hz"


def collect_lines(story: dict) -> list[dict]:
    seen = {}

    for line in story.get("introLines", []):
        seen[line["id"]] = line

    for step in story.get("steps", []):
        for hint in step.get("hints", []):
            seen[hint["id"]] = hint

    for interactive in story.get("interactives", []):
        for response in interactive.get("responses", {}).values():
            for line in response.get("lines", []):
                seen[line["id"]] = line
            for variant in response.get("variants", []):
                for line in variant:
                    seen[line["id"]] = line

    return list(seen.values())


def build_powershell_script(text: str, voice_name: str, output_path: Path) -> str:
    escaped_text = text.replace("'", "''")
    escaped_voice = voice_name.replace("'", "''")
    escaped_output = str(output_path).replace("'", "''")

    return f"""
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice('{escaped_voice}')
$synth.Rate = 0
$synth.SetOutputToWaveFile('{escaped_output}')
$synth.Speak('{escaped_text}')
$synth.Dispose()
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate dialogue audio for English Office Mystery."
    )
    parser.add_argument(
        "--provider",
        choices=("auto", "edge", "gtts", "system"),
        default="auto",
        help="Preferred TTS provider. 'auto' tries edge-tts, then gTTS, then Windows system voices.",
    )
    parser.add_argument(
        "--only",
        nargs="*",
        default=[],
        help="Optional list of line ids to regenerate.",
    )
    return parser.parse_args()


def get_provider_order(requested: str) -> list[str]:
    if requested != "auto":
        return [requested]

    provider_order: list[str] = []

    if edge_tts is not None:
        provider_order.append("edge")

    if gTTS is not None:
        provider_order.append("gtts")

    provider_order.append("system")
    return provider_order


def get_speaker_config(line: dict, speakers: dict) -> dict:
    return speakers[line["speaker"]]


async def synthesize_with_edge(line: dict, speaker: dict) -> Path:
    if edge_tts is None:
        raise RuntimeError("edge-tts is not installed.")

    output_path = AUDIO_DIR / f"{line['id']}.mp3"
    communicate = edge_tts.Communicate(
        line["text"],
        speaker.get("naturalVoice", DEFAULT_EDGE_VOICE),
        rate=speaker.get("naturalRate", DEFAULT_EDGE_RATE),
        volume=speaker.get("naturalVolume", DEFAULT_EDGE_VOLUME),
        pitch=speaker.get("naturalPitch", DEFAULT_EDGE_PITCH),
    )
    await communicate.save(output_path)
    return output_path


def synthesize_with_gtts(line: dict, speaker: dict) -> Path:
    if gTTS is None:
        raise RuntimeError("gTTS is not installed.")

    output_path = AUDIO_DIR / f"{line['id']}.mp3"
    tts = gTTS(
        text=line["text"],
        lang=speaker.get("gttsLang", "en"),
        tld=speaker.get("gttsTld", "com"),
        slow=False,
    )
    tts.save(str(output_path))
    return output_path


def synthesize_with_system(line: dict, speaker: dict) -> Path:
    output_path = AUDIO_DIR / f"{line['id']}.wav"
    command = build_powershell_script(line["text"], speaker["voice"], output_path)
    subprocess.run(
        ["powershell", "-NoProfile", "-Command", command],
        check=True,
        capture_output=True,
        text=True,
    )
    return output_path


def synthesize_line(line: dict, speakers: dict, provider_order: list[str]) -> tuple[str, Path]:
    speaker = get_speaker_config(line, speakers)
    last_error: Exception | None = None

    for provider in provider_order:
        try:
            if provider == "edge":
                output_path = asyncio.run(synthesize_with_edge(line, speaker))
            elif provider == "gtts":
                output_path = synthesize_with_gtts(line, speaker)
            elif provider == "system":
                output_path = synthesize_with_system(line, speaker)
            else:
                raise RuntimeError(f"Unsupported provider: {provider}")

            return provider, output_path
        except Exception as exc:  # pragma: no cover - network/provider dependent
            last_error = exc
            print(f"Provider {provider} failed for {line['id']}: {exc}")

    raise RuntimeError(f"Could not generate audio for {line['id']}: {last_error}")


def main() -> None:
    args = parse_args()
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    story = json.loads(STORY_PATH.read_text(encoding="utf-8"))
    lines = collect_lines(story)
    provider_order = get_provider_order(args.provider)

    if args.only:
        only = set(args.only)
        lines = [line for line in lines if line["id"] in only]

    print(
        f"Generating {len(lines)} audio files into {AUDIO_DIR} "
        f"with provider order: {', '.join(provider_order)}"
    )

    for line in lines:
        provider, output_path = synthesize_line(line, story["speakers"], provider_order)
        print(f"Created {output_path.name} with {provider}")

    print("Audio generation complete.")


if __name__ == "__main__":
    main()
