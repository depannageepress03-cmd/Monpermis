#!/usr/bin/env python3
"""Construit le catalogue révision panneaux depuis panneaux_par_categorie.zip."""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "content" / "code-panneaux"
DEFAULT_ZIP = Path.home() / "Downloads" / "panneaux_par_categorie.zip"
DEFAULT_MASTER_PDF = Path.home() / "Downloads" / "TOUS LES PANNEAUX.pdf"

META = [
    ("Signaux_de_danger_(A)", "a", "Signaux de danger", "A"),
    ("Signaux_de_priorité_aux_intersections_(AB)", "ab", "Priorité aux intersections", "AB"),
    ("Signaux_dinterdiction_et_dobligation_(B)", "b", "Interdiction et obligation", "B"),
    ("Signaux_dindication_(C)", "c", "Signaux d'indication", "C"),
    ("Signalisation_dindication_de_services_(CE)", "ce", "Indication de services", "CE"),
    ("Signaux_de_direction_(D_Dp)", "d", "Signaux de direction", "D"),
    ("Signaux_de_direction_avec_affectation_de_voies_(Da)", "da", "Direction — affectation de voies", "Da"),
    ("Signaux_de_direction_cyclable_(Dv)", "dv", "Direction cyclable", "Dv"),
    ("Signaux_de_localisation_(E)", "e", "Localisation", "E"),
    ("Entree_et_sortie_dagglomeration_(EB)", "eb", "Entrée / sortie d'agglomération", "EB"),
    ("Signalisation_des_passages_a_niveau_(G)", "g", "Passages à niveau", "G"),
    ("Signalisation_touristique_-_itineraires_(H)", "h", "Tourisme — itinéraires", "H"),
    ("Signalisation_touristique_et_de_service_(ID)", "id", "Tourisme et service", "ID"),
    ("Balisage_(J)", "j", "Balisage", "J"),
    ("Panonceaux_(M)", "m", "Panonceaux", "M"),
    ("Signaux_lumineux_de_circulation_(R)", "r", "Signaux lumineux", "R"),
    ("Signaux_de_rappel_de_securite_(SR)", "sr", "Rappel de sécurité", "SR"),
    (
        "Signalisation_temporaire_de_chantier_(AK-K-KC-KD-KM-KS-KR-KXC)",
        "temporaire",
        "Signalisation temporaire",
        "K",
    ),
    (
        "Signalisation_directionnelle_autoroutiere_(SE-SI-SC-SU)",
        "autoroute",
        "Directionnelle autoroutière",
        "S",
    ),
    ("Panneau_a_message_variable_(PMV)", "pmv", "Panneau à message variable", "PMV"),
]

CODE_RE = re.compile(
    r"^(AB\d+[a-z]?|AK\d+[a-z]?|CE\d+[a-z]?|EB\d+[a-z]?|ID\d+[a-z]?|SR\d+[a-z]?|"
    r"KC\d+[a-z]?|KD\d+[a-z]?|KM\d+[a-z]?|KS\d+[a-z]?|KR\d+[a-z]?|KXC\d+[a-z]?|"
    r"SE\d+[a-z]?|SI\d+[a-z]?|SC\d+[a-z]?|SU\d+[a-z]?|"
    r"Da\d+[a-z]?|Dp\d+[a-z]?|Dv\d+[a-z]?|"
    r"PMV|"
    r"[A-Z]\d+[a-z]?)$"
)

HEADER_SKIP = re.compile(
    r"^(.*panneau\(x\)|.*extrait de|Liste complète des signaux routiers|"
    r"TOUS LES PANNEAUX|DEFINITION)$",
    re.I,
)


def pdf_text(path: Path, *, raw: bool = False) -> str:
    mode = "-raw" if raw else "-layout"
    r = subprocess.run(
        ["pdftotext", mode, str(path), "-"],
        capture_output=True,
        text=True,
        errors="replace",
        check=False,
    )
    return (r.stdout or "").replace("\x0c", "\n")


def parse_occurrences(text: str) -> list[dict[str, str]]:
    """Toutes les occurrences code+définition dans l'ordre (doublons inclus)."""
    lines = [ln.strip() for ln in text.splitlines()]
    out: list[dict[str, str]] = []
    i = 0
    while i < len(lines):
        ln = lines[i]
        if not CODE_RE.match(ln):
            i += 1
            continue
        code = ln
        defs: list[str] = []
        i += 1
        while i < len(lines):
            nxt = lines[i]
            if not nxt:
                i += 1
                if defs:
                    break
                continue
            if CODE_RE.match(nxt):
                break
            if HEADER_SKIP.match(nxt):
                i += 1
                continue
            defs.append(nxt)
            i += 1
        definition = re.sub(r"\s+", " ", " ".join(defs)).strip()
        definition = definition.replace("comportan ", "comportant ").strip(" .")
        out.append({"code": code, "definition": definition or code})
    return out


def parse_master_definitions(master_pdf: Path) -> dict[str, str]:
    """Définitions officielles depuis TOUS LES PANNEAUX.pdf (extraction -raw)."""
    occurrences = parse_occurrences(pdf_text(master_pdf, raw=True))
    best: dict[str, str] = {}
    for entry in occurrences:
        code = entry["code"]
        definition = entry["definition"]
        if not definition or definition == code:
            continue
        prev = best.get(code, "")
        if len(definition) > len(prev):
            best[code] = definition
    return best


def apply_master_definitions(catalog: dict, master_defs: dict[str, str]) -> int:
    updated = 0
    for cat in catalog["categories"]:
        for sign in cat["signs"]:
            definition = master_defs.get(sign["code"])
            if not definition:
                continue
            if sign.get("definition") != definition:
                sign["definition"] = definition
                updated += 1
    return updated


def extract_images(pdf: Path, dest_dir: Path) -> list[Path]:
    dest_dir.mkdir(parents=True, exist_ok=True)
    for p in dest_dir.glob("__raw*"):
        p.unlink()
    prefix = dest_dir / "__raw"
    subprocess.run(["pdfimages", "-png", str(pdf), str(prefix)], check=True)
    return sorted(dest_dir.glob("__raw-*.png"), key=lambda p: int(p.stem.split("-")[-1]))


def safe_name(code: str) -> str:
    return re.sub(r"[^A-Za-z0-9_-]+", "_", code)


def build(zip_path: Path, master_pdf: Path | None = None) -> dict:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    with tempfile.TemporaryDirectory() as td:
        td_path = Path(td)
        subprocess.run(["unzip", "-oq", str(zip_path), "-d", str(td_path)], check=True)
        pdf_dir = td_path / "panneaux_par_categorie"
        if not pdf_dir.is_dir():
            # zip may flatten
            pdf_dir = td_path

        catalog: dict = {"version": 1, "categories": []}
        for stem, cid, label, prefix in META:
            pdf = pdf_dir / f"{stem}.pdf"
            if not pdf.exists():
                matches = list(pdf_dir.rglob(f"{stem}.pdf"))
                if not matches:
                    print(f"SKIP missing {stem}")
                    continue
                pdf = matches[0]

            occurrences = parse_occurrences(pdf_text(pdf))
            cat_dir = OUT / cid
            cat_dir.mkdir(parents=True, exist_ok=True)
            images = extract_images(pdf, cat_dir)

            paired: list[tuple[dict[str, str], Path]] = []
            n = min(len(occurrences), len(images))
            for i in range(n):
                paired.append((occurrences[i], images[i]))

            # Meilleure définition connue par code (ignore les fallbacks = code seul)
            best_def: dict[str, str] = {}
            for entry in occurrences:
                code = entry["code"]
                definition = entry["definition"]
                if not definition or definition == code:
                    continue
                prev = best_def.get(code, "")
                if len(definition) > len(prev):
                    best_def[code] = definition

            # Garder 1ère image par code + meilleure définition
            signs: list[dict] = []
            seen: set[str] = set()
            for entry, img in paired:
                code = entry["code"]
                if code in seen:
                    continue
                seen.add(code)
                dest = cat_dir / f"{safe_name(code)}.png"
                shutil.copyfile(img, dest)
                definition = best_def.get(code) or entry["definition"]
                if definition == code:
                    definition = best_def.get(code, definition)
                signs.append(
                    {
                        "code": code,
                        "definition": definition,
                        "image": f"/content/code-panneaux/{cid}/{safe_name(code)}.png",
                    }
                )

            for p in images:
                p.unlink(missing_ok=True)

            catalog["categories"].append(
                {
                    "id": cid,
                    "label": label,
                    "codePrefix": prefix,
                    "count": len(signs),
                    "signs": signs,
                }
            )
            print(
                f"{cid}: occ={len(occurrences)} img={len(images)} unique={len(signs)}"
            )

    if master_pdf and master_pdf.exists():
        master_defs = parse_master_definitions(master_pdf)
        n = apply_master_definitions(catalog, master_defs)
        print(f"master defs applied: {len(master_defs)} known, {n} updated")
    elif master_pdf:
        print(f"WARN master PDF introuvable: {master_pdf}")

    (OUT / "catalog.json").write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    total = sum(c["count"] for c in catalog["categories"])
    print(f"TOTAL unique={total} categories={len(catalog['categories'])}")
    return catalog


def export_ts(catalog: dict) -> None:
    web = ROOT.parent / "src" / "data" / "codeRoute" / "panneauxCatalog.ts"
    mobile = ROOT.parent / "mobile" / "src" / "data" / "codeRoute" / "panneauxCatalog.ts"
    categories = []
    for cat in catalog["categories"]:
        signs = ",\n".join(
            "    {\n"
            f"      code: {json.dumps(s['code'], ensure_ascii=False)},\n"
            f"      definition: {json.dumps(s['definition'], ensure_ascii=False)},\n"
            f"      image: {json.dumps(s['image'], ensure_ascii=False)},\n"
            + (
                f"      audio: {json.dumps(s['audio'], ensure_ascii=False)},\n"
                if s.get("audio")
                else ""
            )
            + "    }"
            for s in cat["signs"]
        )
        categories.append(
            "  {\n"
            f"    id: {json.dumps(cat['id'])},\n"
            f"    label: {json.dumps(cat['label'], ensure_ascii=False)},\n"
            f"    codePrefix: {json.dumps(cat['codePrefix'])},\n"
            f"    count: {cat['count']},\n"
            f"    signs: [\n{signs}\n    ],\n"
            "  }"
        )
    body = (
        "/** Catalogue révision panneaux — généré par server/scripts/build-panneaux-catalog.py */\n"
        "export type PanneauSign = {\n"
        "  code: string\n"
        "  definition: string\n"
        "  image: string\n"
        "  audio?: string\n"
        "}\n\n"
        "export type PanneauCategory = {\n"
        "  id: string\n"
        "  label: string\n"
        "  codePrefix: string\n"
        "  count: number\n"
        "  signs: PanneauSign[]\n"
        "}\n\n"
        "export const PANNEAUX_CATEGORIES: PanneauCategory[] = [\n"
        + ",\n".join(categories)
        + "\n]\n\n"
        "export function getPanneauCategory(id: string): PanneauCategory | undefined {\n"
        "  return PANNEAUX_CATEGORIES.find((c) => c.id === id)\n"
        "}\n\n"
        "export function getPanneauSign(\n"
        "  categoryId: string,\n"
        "  code: string,\n"
        "): PanneauSign | undefined {\n"
        "  return getPanneauCategory(categoryId)?.signs.find((s) => s.code === code)\n"
        "}\n"
    )
    web.parent.mkdir(parents=True, exist_ok=True)
    mobile.parent.mkdir(parents=True, exist_ok=True)
    web.write_text(body, encoding="utf-8")
    mobile.write_text(body, encoding="utf-8")
    print(f"Wrote {web}")
    print(f"Wrote {mobile}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, default=DEFAULT_ZIP)
    parser.add_argument(
        "--master-pdf",
        type=Path,
        default=DEFAULT_MASTER_PDF,
        help="PDF 'TOUS LES PANNEAUX' pour les textes explicatifs",
    )
    args = parser.parse_args()
    if not args.zip.exists():
        raise SystemExit(f"ZIP introuvable: {args.zip}")
    catalog = build(args.zip, master_pdf=args.master_pdf)
    export_ts(catalog)


if __name__ == "__main__":
    main()
