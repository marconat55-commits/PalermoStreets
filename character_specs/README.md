# Character import specifications

Ogni import usa un piccolo JSON:

```json
{
  "schema": 1,
  "id": "nuovo_nemico",
  "profile_source": "character_specs/profiles/nuovo_nemico.json",
  "source_root": "C:/percorso/pose_approvate"
}
```

La sorgente deve contenere una cartella per clip (`idle`, `walk`, `attack`, ecc.) e file sequenziali `01.png`, `02.png` su canvas trasparente 640x420.

Prima eseguire sempre:

```powershell
npm.cmd run character:import -- --spec character_specs/nuovo_nemico.json --check-only
```

Solo dopo il passaggio del gate rimuovere `--check-only`. L'importatore rifiuta ID già esistenti, non offre sovrascrittura automatica e ripristina index/metadata se una fase successiva fallisce.
