#!/usr/bin/env python3
"""Génère les MP3 des définitions de panneaux (voix neuves / accent africain).

Moteurs :
  - edge (défaut) : Microsoft Neural FR — gratuit, voix naturelle
  - elevenlabs    : voix Jérôme (accent africain, Eleven v4) — même voix que
                    les audios des questions

Usage :
  .venv-tts/bin/python server/scripts/tts-panneaux.py
  .venv-tts/bin/python server/scripts/tts-panneaux.py --engine elevenlabs
  .venv-tts/bin/python server/scripts/tts-panneaux.py --only A1a,B1
  .venv-tts/bin/python server/scripts/tts-panneaux.py --force
  .venv-tts/bin/python server/scripts/tts-panneaux.py --dry-run   # textes parlés seulement
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

# Voix africaine FR (ElevenLabs Voice Library) : Jérôme — Confident, Clear and Proud.
# Mêmes réglages que les audios des questions (variante « accent renforcé »).
ELEVEN_AFRICAN_VOICE_ID = "YwEKgPNrswweXodAZi29"
ELEVEN_MODEL = "eleven_v4"
ELEVEN_STYLE_TAGS = "[confident] [West African French accent] "
ELEVEN_VOICE_SETTINGS = {
    "stability": 0.4,
    "similarity_boost": 0.95,
    "style": 0.3,
    "use_speaker_boost": True,
}

# Définitions du catalogue inutilisables telles quelles à l'oral (concaténations
# de plusieurs panneaux, mots tronqués) : texte parlé réécrit à la main.
SPOKEN_OVERRIDES = {
    "A14": "Autres dangers. La nature du danger peut être précisée par un panonceau",
    "AK31": "Accident",
    "B5c": "Arrêt au poste de péage",
    "B8": "Accès interdit aux véhicules affectés au transport de marchandises. "
    "Si le panneau est complété par un panonceau M4f, l'interdiction ne s'applique que si "
    "le poids total autorisé en charge du véhicule dépasse le poids indiqué sur le panonceau",
    "B19": "Autres interdictions, dont la nature est indiquée par une inscription sur le panneau",
    "G1": "Signalisation de position, d'une part, des passages à niveau à une voie sans barrières "
    "ni demi-barrières et non munis de signalisation automatique, et d'autre part, des aires de "
    "danger aérien où les avions volant à basse altitude constituent un danger pour la circulation routière",
    "G1a": "Signalisation de position des passages à niveau à plusieurs voies, sans barrière ni "
    "demi-barrière, et non munis de signalisation automatique",
    "ID15a": "Parc naturel régional. Ce panneau reçoit, dans l'ovale marron, l'emblème du parc naturel régional signalé",
    "K2": "Barrage. Signalisation de position de travaux ou de tout autre obstacle de caractère temporaire",
    "K10": "Signal servant à régler manuellement la circulation",
    "M6a": "Indique que le stationnement ou l'arrêt est gênant. Il complète les panneaux B6a1 ou B6b1 "
    "pour le stationnement gênant, et le panneau B6d pour le stationnement et l'arrêt gênants. "
    "Dans les deux cas, le véhicule en infraction peut être mis en fourrière",
}
SPOKEN_OVERRIDES["G1b"] = SPOKEN_OVERRIDES["G1"]
SPOKEN_OVERRIDES["G1c"] = SPOKEN_OVERRIDES["G1a"]

# Corrections orthographiques / oralisation (appliquées dans l'ordre).
SPOKEN_FIXES = [
    (r"\s*,?\s*au sens de l[’']article R\.\s?[\d-]+ du code de la route", ""),
    (r"dans les conditions définies à l[’']article R\.\s?[\d-]+ du code de la route",
     "dans les conditions définies par le code de la route"),
    (r"visées à l[’']article R\.\s?[\d-]+ du code la de route", "prévues par le code de la route"),
    (r"\b(demi|semi|car|au|Haut)\s*-\s+", r"\1-"),
    (r"\bdon les\b", "dont les"),
    (r"\butilis$", "utilisé"),
    (r"\btout dro$", "tout droit"),
    (r"\béga à\b", "égal à"),
    (r"\bfréquemmen\b", "fréquemment"),
    (r"\bpoids tota\b", "poids total"),
    (r"\bcelui ci\b", "celui-ci"),
    (r"\ble droi\b", "le droit"),
    (r"\bobstacl$", "obstacle"),
    (r"\bdun tunnel\b", "d'un tunnel"),
    (r"\brétrécissemen\b", "rétrécissement"),
    (r"\bpéciser\b", "préciser"),
    (r"\blorsque on\b", "lorsqu'on"),
    (r"\bd'un Etat\b", "d'un État"),
    (r"\bl'union européenne\b", "l'Union européenne"),
    (r"\bparle signal\b", "par le signal"),
    (r"\bpa le\b", "par le"),
    (r"\bd '", "d'"),
    (r'"Dév\. "', '"Dév."'),
    (r"\s*\(G\.P\.L\.\)", " (GPL)"),
    (r"\((s)\)", r"\1"),
    (r"et/ou", "ou"),
    (r"(\d) t$", r"\1 tonnes"),
    (r"\s*\(exemple\)", ""),
    (r"\.(?=[A-ZÉ])", ". "),
]

# Début d'une autre définition collée à la suite (« … B6a1 Stationnement … »,
# « … M6c - ancien Indique … ») : on coupe le texte parlé à cet endroit.
EMBEDDED_SIGN = re.compile(
    r"\s+[A-Z]{1,3}[a-z]?\d+[a-z]{0,2}\d*(?:bis|\s?[-_]\s?(?:bis|ancien))?\s+(?=[A-ZÉ][a-zéèê])"
)


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


def spoken_code(code: str) -> str:
    # « G1a_bis » → « G1a bis », « B6b3-ancien » → « B6b3 ancien modèle »
    code = re.sub(r"[-_]ancien$", " ancien modèle", code)
    return code.replace("_", " ")


def spoken_definition(code: str, definition: str) -> str:
    if code in SPOKEN_OVERRIDES:
        return SPOKEN_OVERRIDES[code]
    defn = EMBEDDED_SIGN.split(definition or "", maxsplit=1)[0].strip()
    for pattern, repl in SPOKEN_FIXES:
        defn = re.sub(pattern, repl, defn)
    return re.sub(r"\s{2,}", " ", defn).strip(" .")


def speech_text(code: str, definition: str) -> str:
    code = (code or "").strip()
    defn = spoken_definition(code, (definition or "").strip())
    if defn and defn != code:
        return f"Panneau {spoken_code(code)}. {defn}."
    return f"Panneau {spoken_code(code)}."


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
            # Balises d'interprétation comprises par v3/v4 seulement (lues sinon).
            "text": (ELEVEN_STYLE_TAGS if model.startswith(("eleven_v3", "eleven_v4")) else "") + text,
            "model_id": model,
            "language_code": "fr",
            "voice_settings": ELEVEN_VOICE_SETTINGS,
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
    eleven_model = (
        os.environ.get("ELEVENLABS_PANNEAUX_MODEL_ID", ELEVEN_MODEL).strip() or ELEVEN_MODEL
    )
    edge_voice = args.voice or EDGE_VOICE

    if args.dry_run:
        for code, definition, _ in signs:
            print(f"{code}\t{speech_text(code, definition)}")
        return

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
    p.add_argument("--dry-run", action="store_true", help="Affiche les textes parlés sans générer")
    args = p.parse_args()
    asyncio.run(run(args))


if __name__ == "__main__":
    main()
