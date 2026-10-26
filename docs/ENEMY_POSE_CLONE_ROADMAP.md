# Palermo Streets — scaletta pose nemici da riferimenti

## Regola di produzione

Ogni posa viene prodotta come sostituzione di identità su un fotogramma preciso. Il generatore non deve inventare la posa né interpolare liberamente.

Input obbligatori per ogni immagine:

1. master approvato del personaggio;
2. singolo fotogramma numerato del personaggio di riferimento;
3. una o due pose già approvate dello stesso personaggio per continuità grafica;
4. una sola posa completa su sfondo trasparente.

Prima si approvano le pose chiave in un pilot. Solo dopo si normalizzano su canvas 640×420, piedi a Y=400, scala uniforme e si costruiscono atlas e profilo runtime.

## Ordine consigliato

### 1. Barbaccia — boss pesante

- Camminata: Savage Hulk, Action 20.
- Il pilot a otto fotogrammi dispari è stato respinto perché ancora scattoso.
- Pilot corrente: ciclo Hulk completo 01–16, copiato un fotogramma alla volta. Non creare pose intermedie a parole.
- Idle e guardia: Haggar, scegliendo prima i singoli frame numerati.
- Attacco leggero: Haggar `attack`, 6 pose.
- Attacco pesante: Haggar `heavy`, 7–8 pose.
- Reazione al colpo: 3–5 pose selezionate da Haggar/Hulk.
- Caduta e rialzata: una sequenza unica; l'ultimo frame della caduta deve essere identico al primo della rialzata.

### 2. Pino U Pizzettu — rapido e difensivo

- Riferimento principale: AIori.
- Walk: 8 pose numerate.
- Idle: 6 pose.
- Attacco: 7 pose, un solo colpo rapido.
- Schivata laterale: 9 pose AIori.
- Hit, caduta e rialzata solo dopo locomozione e attacco approvati.

### 3. U Tignusu — picchiatore medio

- Riferimento principale: Haggar per guardia e pugno; Ken per una camminata più leggibile.
- Esistono già una posa walk-contact e una posa punch-impact approvate: usarle come identità/continuità, senza rigenerarle.
- Completare prima 8 pose walk attorno al contact approvato, poi 6 pose pugno attorno all'impact approvato.

### 4. U Scafazzatu — pesante compatto

- Riferimento principale: Haggar.
- Walk pesante 8 pose, idle 6, pugno 6, heavy 8.
- La sigaretta elettronica del master non deve moltiplicarsi o cambiare mano tra i fotogrammi; decidere prima se resta in combattimento.

### 5. U Muraturi — pesante lento

- Riferimento principale: Haggar; Hulk solo per camminata e carica.
- Conservare casco, cintura e attrezzi sempre identici.
- Evitare salti e calci alti: il suo linguaggio è spinta, martellata di braccio, presa e colpo di spalla.

### 6. U Pacco — agile

- Riferimento principale: AIori o Ken.
- Prima creare un master combat senza telefono; il telefono può restare in un idle variante separato.
- Walk 8, idle 6, jab 6–7, calcio 5–6, schivata 9.

### 7. Sciaron — potente ma mobile

- Prima creare e approvare il master combat senza telefono.
- Riferimento locomozione: AIori.
- Riferimento attacchi: Ken per pugni/calci leggibili, Haggar per un colpo pesante.
- Capelli, gioielli e cintura richiedono controllo di continuità a ogni fotogramma.

### 8. U Tappo — corto e aggressivo

- Riferimento principale: AIori per passi rapidi; Haggar per il colpo pesante.
- Il corpo resta basso e compatto: si copia lo scheletro della posa senza allungare le proporzioni del master.

### 9. Pino Facci Lorda

- Definire il suo ruolo prima delle pose per non duplicare Pino U Pizzettu.
- Se è tecnico: Ken. Se è bruto: Haggar. Non mescolare i due riferimenti nella stessa locomozione.

## Prompt rigido riutilizzabile

```text
Create ONE full-body transparent PNG sprite of [PERSONAGGIO].

REFERENCE ROLES
- Image 1 is the mandatory approved identity master. Preserve exactly the same face, body proportions, hair, clothing, footwear, accessories and distinctive marks.
- Image 2 is the mandatory numbered pose skeleton: [RIFERIMENTO, AZIONE, NUMERO FRAME]. Copy this body pose exactly.
- Images 3 and 4 are approved frames of [PERSONAGGIO] and lock rendering style, camera angle, identity, proportions and detail level.

POSE LOCK — DO NOT REINTERPRET
Match Image 2 exactly in facing direction, torso height and lean, pelvis height and rotation, shoulder placement, both elbow bends, both hand positions, forward/rear leg identity, knee bends, planted/lifted foot, stride width and complete silhouette. Do not mirror it. Do not substitute a generic walk, run, guard or attack. Change only the character identity and costume.

CONTINUITY LOCK
Keep every permanent accessory on the same anatomical side. Keep the same body mass and camera distance as Images 3 and 4. Do not add or remove clothing, jewelry, tattoos, footwear or equipment.

OUTPUT
Exactly one complete character, including hair and soles, true transparent background, no ground, shadow, effects, scenery, text, border, sprite sheet or extra limbs.
```

## Prompt per un ciclo completo

Non chiedere mai “crea una camminata fluida”. Eseguire un prompt separato per ogni fotogramma e cambiare soltanto questa riga:

```text
Image 2 is the mandatory numbered pose skeleton: [NOME RIFERIMENTO], [AZIONE], frame [NN]. Copy this body pose exactly.
```

Il nome del file deve conservare il numero del riferimento, per esempio `phase05_pose_locked_candidate.png`. Una posa generata senza riferimento numerato viene archiviata come scartata e non entra nel pilot.
