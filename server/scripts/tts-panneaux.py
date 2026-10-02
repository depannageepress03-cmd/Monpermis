#!/usr/bin/env python3
"""Génère les MP3 des définitions de panneaux (voix neuves / accent africain).

Moteurs :
  - edge (défaut) : Microsoft Neural FR — gratuit, voix naturelle
  - elevenlabs    : voix Alimata (accent africain) si crédits disponibles

Usage :
  .venv-tts/bin/python server/scripts/tts-panneaux.py
  .venv-tts/bin/python server/scripts/tts-panneaux.py --engine elevenlabs
  .venv-tts/bin/python server/scripts/tts-panneaux.py --only A1a,B1
  .venv-tts/bin/python server/scripts/tts-panneaux.py --force
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SERVER = ROOT / "server"
CATALOG = SERVER / "content" / "code-panneaux" / "catalog.json"
OUT_DIR = SERVER / "content" / "code-panneaux" / "audio"

# Voix Edge (naturelle FR). Pas de locale africaine côté Edge aujourd'hui.
EDGE_VOICE = "fr-FR-HenriNeural"

# Voix africaines FR (ElevenLabs Voice Library)
# Anicet (homme) — narration claire ; Alimata (femme) : 4SFJvuIUvxaPLgk8FoK3
ELEVEN_AFRICAN_VOICE_ID = "hgZie8MSRBRgVn6w8BzP"
ELEVEN_MODEL = "eleven_multilingual_v2"


def load_env() -> None:
    env_path = SERVER / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        os.environ.setdefault(key, val)


def speech_text(code: str, definition: str) -> str:
    defn = (definition or "").strip()
    code = (code or "").strip()
    if defn and defn != code:
        return f"Panneau {code}. {defn}."
    return f"Panneau {code}."


def safe_name(code: str) -> str:
    return re.sub(r"[^A-Za-z0-9_-]+", "_", code)


async def synth_edge(text: str, out: Path, voice: str) -> None:
    import edge_tts

    communicate = edge_tts.Communicate(text, voice, rate="-5%")
    await communicate.save(str(out))


def synth_elevenlabs(text: str, out: Path, voice_id: str, api_key: str, model: str) -> None:
    import urllib.request

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128"
    body = json.dumps(
        {
            "text": text,
            "model_id": model,
            "voice_settings": {
                "stability": 0.42,
                "similarity_boost": 0.8,
                "style": 0.2,
                "use_speaker_boost": True,
            },
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as res:
        data = res.read()
    if not data:
        raise RuntimeError("Réponse audio vide")
    out.write_bytes(data)


def export_ts(catalog: dict) -> None:
    sys.path.insert(0, str(SERVER / "scripts"))
    # reuse build script export
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "build_panneaux", SERVER / "scripts" / "build-panneaux-catalog.py"
    )
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(mod)
    mod.export_ts(catalog)


async def run(args: argparse.Namespace) -> None:
    load_env()
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    only = {c.strip() for c in (args.only or "").split(",") if c.strip()} if args.only else None
    signs: list[tuple[str, str, str]] = []  # code, definition, cat_id
    for cat in catalog["categories"]:
        for sign in cat["signs"]:
            code = sign["code"]
            if only and code not in only:
                continue
            signs.append((code, sign.get("definition") or code, cat["id"]))

    print(f"engine={args.engine} signs={len(signs)} voice={args.voice}")

    api_key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    eleven_voice = (
        args.voice
        or os.environ.get("ELEVENLABS_PANNEAUX_VOICE_ID", "").strip()
        or ELEVEN_AFRICAN_VOICE_ID
    )
    eleven_model = os.environ.get("ELEVENLABS_MODEL_ID", ELEVEN_MODEL).strip() or ELEVEN_MODEL
    edge_voice = args.voice or EDGE_VOICE

    if args.engine == "elevenlabs" and not api_key:
        raise SystemExit("ELEVENLABS_API_KEY manquant dans server/.env")

    sem = asyncio.Semaphore(args.concurrency)
    done = 0
    skipped = 0
    failed = 0

    async def one(code: str, definition: str) -> None:
        nonlocal done, skipped, failed
        out = OUT_DIR / f"{safe_name(code)}.mp3"
        if out.exists() and out.stat().st_size > 500 and not args.force:
            skipped += 1
            return
        text = speech_text(code, definition)
        async with sem:
            try:
                if args.engine == "elevenlabs":
                    await asyncio.to_thread(
                        synth_elevenlabs, text, out, eleven_voice, api_key, eleven_model
                    )
                    await asyncio.sleep(0.15)
                else:
                    await synth_edge(text, out, edge_voice)
                done += 1
                if done % 25 == 0 or done == 1:
                    print(f"  ok {done}/{len(signs)} ({code})")
            except Exception as exc:
                failed += 1
                print(f"  FAIL {code}: {exc}")

    await asyncio.gather(*(one(c, d) for c, d, _ in signs))

    # Attach audio URLs in catalog
    updated = 0
    for cat in catalog["categories"]:
        for sign in cat["signs"]:
            audio_rel = f"/content/code-panneaux/audio/{safe_name(sign['code'])}.mp3"
            path = OUT_DIR / f"{safe_name(sign['code'])}.mp3"
            if path.exists() and path.stat().st_size > 500:
                if sign.get("audio") != audio_rel:
                    sign["audio"] = audio_rel
                    updated += 1
            elif "audio" in sign:
                del sign["audio"]

    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    export_ts(catalog)
    print(f"done={done} skipped={skipped} failed={failed} audio_fields={updated}")
    print(f"out={OUT_DIR}")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--engine", choices=("edge", "elevenlabs"), default="edge")
    p.add_argument("--voice", default=None, help="Override voice id / Edge ShortName")
    p.add_argument("--only", default=None, help="Codes séparés par des virgules")
    p.add_argument("--force", action="store_true")
    p.add_argument("--concurrency", type=int, default=4)
    args = p.parse_args()
    asyncio.run(run(args))


if __name__ == "__main__":
    main()
