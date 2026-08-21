# A Puaicca V1 — input richiesto

Master canonico: `art_source/stage1_zen/characters_master/transparent/A_PUAICCA_MASTER.png`.

Consegnare 29 PNG trasparenti 640x420, baseline piedi Y=400, scala baked e corpo sempre completo:

- `idle/01.png`–`05.png`: respiro/guardia;
- `walk/01.png`–`05.png`: cinque sorgenti riprodotte `1-2-3-4-5-4-3-2`;
- `attack/01.png`–`06.png`: schiaffo laterale, contatto al frame 4;
- `hit/01.png`–`03.png`: impatto e recupero;
- `fall/01.png`–`05.png`: caduta completa;
- `getup/01.png`–`05.png`: rialzata; `getup/01.png` deve essere identico a `fall/05.png`.

`heavy` riusa `attack`; `dead` riusa `fall`. Nessun frame duplicato deve essere consegnato.

Il personaggio non va registrato nel runtime fino al passaggio di:

```powershell
npm.cmd run character:import -- --spec character_specs/a_puaicca.json --check-only
```
