"""Allège les médias embarqués dans l'APK (mode hors connexion).

  - Audios (code-audio, code-panneaux/audio) : mono 40 kbps, 24 kHz, encodés depuis les originaux
    de server/content quand ils existent (pas de double perte), sinon depuis le fichier embarqué.
  - Images des questions (code-images) : PNG -> WebP qualité 90 (le PNG est supprimé).

À lancer après scripts/generate-panneaux-assets.mjs. Ne modifie jamais server/content.
Ensuite : (cd server && npm run generate:bundled-assets) pour régénérer les références .webp.
Nécessite : pip install imageio-ffmpeg pillow
"""
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import imageio_ffmpeg
from PIL import Image

MOBILE = Path(__file__).resolve().parent.parent
ASSETS = MOBILE / "assets"
SERVER_CONTENT = MOBILE.parent / "server" / "content"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
BITRATE = "40k"
SAMPLE_RATE = "24000"
WEBP_QUALITY = 90


def encode_audio(path: Path) -> tuple[int, int]:
    before = path.stat().st_size
    rel = path.relative_to(ASSETS)
    original = SERVER_CONTENT / rel
    source = original if original.exists() else path
    tmp = path.with_name(path.stem + ".tmp.mp3")
    result = subprocess.run(
        [FFMPEG, "-y", "-loglevel", "error", "-i", str(source), "-vn", "-map_metadata", "-1",
         "-ac", "1", "-ar", SAMPLE_RATE, "-c:a", "libmp3lame", "-b:a", BITRATE, str(tmp)],
        capture_output=True,
    )
    if result.returncode != 0 or not tmp.exists() or tmp.stat().st_size == 0:
        tmp.unlink(missing_ok=True)
        print(f"ÉCHEC {rel}: {result.stderr.decode(errors='ignore')[:200]}", file=sys.stderr)
        return before, before
    after = tmp.stat().st_size
    if after >= before:  # déjà plus léger : on garde le fichier actuel
        tmp.unlink()
        return before, before
    tmp.replace(path)
    return before, after


def png_to_webp(path: Path) -> tuple[int, int]:
    before = path.stat().st_size
    target = path.with_suffix(".webp")
    with Image.open(path) as img:
        img = img.convert("RGBA") if img.mode in ("RGBA", "LA", "P") else img.convert("RGB")
        img.save(target, "WEBP", quality=WEBP_QUALITY, method=6)
    path.unlink()
    return before, target.stat().st_size


def run(label: str, fn, files: list[Path]) -> None:
    with ThreadPoolExecutor(max_workers=4) as pool:
        sizes = list(pool.map(fn, files))
    before = sum(b for b, _ in sizes)
    after = sum(a for _, a in sizes)
    print(f"{label}: {len(files)} fichiers, {before / 1e6:.1f} Mo -> {after / 1e6:.1f} Mo")


def main() -> None:
    audios = sorted(ASSETS.glob("code-audio/**/*.mp3")) + sorted(ASSETS.glob("code-panneaux/audio/*.mp3"))
    run("Audios", encode_audio, audios)
    run("Images", png_to_webp, sorted(ASSETS.glob("code-images/**/*.png")))


if __name__ == "__main__":
    main()
