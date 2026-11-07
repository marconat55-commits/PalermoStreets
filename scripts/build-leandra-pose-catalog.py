#!/usr/bin/env python3
"""Create a readable, frame-level checklist from the Cammy motion inventory."""

import hashlib
import json
from pathlib import Path


root = Path(__file__).resolve().parents[1]
mapping = json.loads((root / "character_specs/cammy_to_leandra_frame_map.json").read_text(encoding="utf-8"))["clips"]
candidates = json.loads((root / "character_specs/leandra_pose_candidates.json").read_text(encoding="utf-8"))["poses"]
names = {
    "idle": "Posizione di riposo", "walk": "Camminata", "run": "Corsa",
    "brake": "Frenata", "jump": "Salto", "land": "Atterraggio",
    "air_attack": "Attacco in aria", "air_punch": "Pugno in aria",
    "punch_left": "Primo pugno", "punch_right": "Secondo pugno",
    "muay_elbow": "Gomitata", "combo_finisher": "Finale combo",
    "kick_front": "Calcio frontale", "kick_right": "Calcio opposto",
    "kick_finisher": "Finale di calcio", "block": "Guardia",
    "grab": "Presa", "grab_strike": "Colpo durante la presa",
    "throw": "Lancio", "super": "Mossa speciale", "hit": "Colpo subito",
    "punch_backfist": "Pugno rovescio", "kick_low": "Calcio basso",
    "kick_slide": "Calcio scivolato", "knockdown": "Caduta",
    "getup": "Rialzata", "dead": "Sconfitta",
}
lines = [
    "# Leandra — catalogo pose dal riferimento Cammy",
    "",
    "Ogni riga indica un frame del prototipo Cammy. Il codice stabile è `clip/NN`; `Pnnn` è il numero progressivo di questo inventario. Apri il PNG collegato e allegalo alla chat che genera la posa di Leandra insieme ai master di identità.",
    "",
    "Leandra usa pose originali per `idle/01`, `block/01`, `punch_left` e `punch_right`. Il suo `idle` è attualmente statico: i frame `idle/02`–`idle/08` sono riferimenti per un eventuale ciclo di respirazione. La guardia originale è anche mostrata brevemente come `idle_variant_1`.",
    "",
    "I duplicati identici possono riusare l'immagine Leandra della prima occorrenza. Il nome di un colpo indica la clip di gioco; per il braccio effettivamente avanti segui il frame visuale, perché 'sinistro' e 'destro' possono cambiare secondo l'inquadratura.",
    "",
]
seen = {}
number = 0
for clip, frames in mapping.items():
    lines += [f"## {names.get(clip, clip)} — `{clip}` ({len(frames)} frame)", "", "| N. | Posa | MUGEN | Stato / riuso | Riferimento |", "|---|---|---|---|---|"]
    for frame in frames:
        number += 1
        local = f"{clip}/{frame['frame']:02d}"
        path = root / "public/assets/characters/cammy_ref_anim" / f"{local}.png"
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        original = seen.get(digest)
        if original is None:
            seen[digest] = local
        pose_id = f"P{number:03d}"
        candidate = candidates.get(pose_id)
        status = (
            "Leandra pronta" if local in {"idle/01", "block/01"}
            else "Approvata nel gioco" if candidate and candidate["status"] == "approved"
            else "In prova locale" if candidate and candidate["status"] == "local_trial"
            else "Candidato ricevuto" if candidate and candidate["status"] == "candidate_ready"
            else "Da verificare" if candidate
            else f"Riusa `{original}`" if original
            else "Da creare"
        )
        action = frame["action"]
        group, item = frame["sprite"]
        lines.append(f"| {pose_id} | `{local}` | action {action}, sprite {group},{item} | {status} | [PNG](../public/assets/characters/cammy_ref_anim/{local}.png) |")
    lines.append("")
lines += [f"**Totale:** {number} voci, {len(seen)} immagini distinte. Leandra ha anche i due pugni approvati; alcuni raccordi riusano pose già presenti.", ""]
(root / "docs/LEANDRA_CAMMY_POSE_CATALOG.md").write_text("\n".join(lines), encoding="utf-8")
print(f"Catalogo scritto: {number} frame, {len(seen)} immagini distinte")
