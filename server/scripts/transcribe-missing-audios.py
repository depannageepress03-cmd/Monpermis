#!/usr/bin/env python3
"""
Transcrit les MP3 code-audio qui n'ont pas encore de fichier texts/{n}.txt.
Utilise faster-whisper (local, gratuit).

Usage:
  /tmp/mp-whisper-venv/bin/python server/scripts/transcribe-missing-audios.py
  /tmp/mp-whisper-venv/bin/python server/scripts/transcribe-missing-audios.py --model small --chapter 6
"""
from __future__ import annotations

import argparse
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO_ROOT = ROOT / "content" / "code-audio"


def find_missing(chapter_filter: int | None = None) -> list[tuple[int, int, Path]]:
    missing: list[tuple[int, int, Path]] = []
    for chap_dir in sorted(AUDIO_ROOT.iterdir()):
        m = re.match(r"^chapitre-(\d+)$", chap_dir.name)
        if not m or not chap_dir.is_dir():
            continue
        chapter = int(m.group(1))
        if chapter_filter is not None and chapter != chapter_filter:
            continue
        texts_dir = chap_dir / "texts"
        texts_dir.mkdir(parents=True, exist_ok=True)
        existing = {
            int(p.stem)
            for p in texts_dir.glob("*.txt")
            if p.stem.isdigit() and p.stat().st_size > 0
        }
        for mp3 in sorted(chap_dir.glob("*.mp3"), key=lambda p: int(p.stem) if p.stem.isdigit() else 10**9):
            if not mp3.stem.isdigit():
                continue
            n = int(mp3.stem)
            if n not in existing:
                missing.append((chapter, n, mp3))
    return missing


def clean_transcript(text: str) -> str:
    value = (text or "").strip()
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    # Enlever marqueurs éventuels
    value = re.sub(r"^\s*\[.*?\]\s*", "", value)
    return value.strip()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="base", help="tiny|base|small|medium…")
    parser.add_argument("--chapter", type=int, default=None)
    parser.add_argument("--limit", type=int, default=0, help="0 = tous")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    missing = find_missing(args.chapter)
    if args.limit > 0:
        missing = missing[: args.limit]

    print(f"À transcrire: {len(missing)} fichiers (model={args.model})")
    if not missing:
        return 0
    if args.dry_run:
        for ch, n, p in missing[:30]:
            print(f"  ch{ch}/{n} {p}")
        if len(missing) > 30:
            print(f"  … +{len(missing) - 30}")
        return 0

    from faster_whisper import WhisperModel

    print("Chargement du modèle…")
    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    ok = 0
    fail = 0
    t0 = time.time()

    for i, (chapter, n, mp3) in enumerate(missing, 1):
        out = AUDIO_ROOT / f"chapitre-{chapter}" / "texts" / f"{n}.txt"
        try:
            segments, _info = model.transcribe(str(mp3), language="fr", vad_filter=True)
            text = clean_transcript("".join(seg.text for seg in segments))
            if not text:
                print(f"[{i}/{len(missing)}] ch{chapter}/{n} VIDE — skip")
                fail += 1
                continue
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(text + "\n", encoding="utf-8")
            ok += 1
            print(f"[{i}/{len(missing)}] ch{chapter}/{n} OK ({len(text)} car)")
        except Exception as exc:  # noqa: BLE001
            fail += 1
            print(f"[{i}/{len(missing)}] ch{chapter}/{n} ERR {exc}", file=sys.stderr)

    elapsed = time.time() - t0
    print(f"\nTerminé: ok={ok} fail={fail} en {elapsed/60:.1f} min")
    print("Ensuite: npm run generate:transcripts --prefix server")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
