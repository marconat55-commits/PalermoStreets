import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { inflateSync } from 'node:zlib';

const publicRoot = path.join(process.cwd(), 'public');
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(publicRoot, relative), 'utf8'));
const errors = [];
const warnings = [];

function fail(message) { errors.push(message); }
function warn(message) { warnings.push(message); }

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decodePng(relative) {
  const source = fs.readFileSync(path.join(publicRoot, relative));
  const signature = source.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') throw new Error(`${relative}: firma PNG non valida`);
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (offset < source.length) {
    const length = source.readUInt32BE(offset);
    const type = source.subarray(offset + 4, offset + 8).toString('ascii');
    const data = source.subarray(offset + 8, offset + 8 + length);
    offset += length + 12;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
  }
  if (bitDepth !== 8 || ![2, 4, 6].includes(colorType)) {
    throw new Error(`${relative}: PNG non supportato (depth=${bitDepth}, color=${colorType})`);
  }
  const bytesPerPixel = colorType === 6 ? 4 : colorType === 4 ? 2 : 3;
  const stride = width * bytesPerPixel;
  const packed = inflateSync(Buffer.concat(idat));
  const pixels = Buffer.alloc(stride * height);
  let packedOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = packed[packedOffset++];
    const row = packed.subarray(packedOffset, packedOffset + stride);
    packedOffset += stride;
    const outputOffset = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= bytesPerPixel ? pixels[outputOffset + x - bytesPerPixel] : 0;
      const up = y > 0 ? pixels[outputOffset + x - stride] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel ? pixels[outputOffset + x - stride - bytesPerPixel] : 0;
      const value = row[x] ?? 0;
      pixels[outputOffset + x] = filter === 0 ? value
        : filter === 1 ? (value + left) & 255
          : filter === 2 ? (value + up) & 255
            : filter === 3 ? (value + Math.floor((left + up) / 2)) & 255
              : filter === 4 ? (value + paeth(left, up, upperLeft)) & 255
                : value;
    }
  }
  const alphaAt = colorType === 6
    ? (x, y) => pixels[y * stride + x * bytesPerPixel + 3]
    : colorType === 4
      ? (x, y) => pixels[y * stride + x * bytesPerPixel + 1]
      : () => 255;
  let left = width;
  let top = height;
  let right = 0;
  let bottom = 0;
  let meaningfulLeft = width;
  let meaningfulTop = height;
  let meaningfulRight = 0;
  let meaningfulBottom = 0;
  let alphaCount = 0;
  let visibleCount = 0;
  let centroidX = 0;
  let centroidY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = alphaAt(x, y);
      if (alpha <= 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + 1);
      bottom = Math.max(bottom, y + 1);
      alphaCount += 1;
      if (alpha <= 16) continue;
      meaningfulLeft = Math.min(meaningfulLeft, x);
      meaningfulTop = Math.min(meaningfulTop, y);
      meaningfulRight = Math.max(meaningfulRight, x + 1);
      meaningfulBottom = Math.max(meaningfulBottom, y + 1);
      visibleCount += 1;
      centroidX += x;
      centroidY += y;
    }
  }
  if (!alphaCount) throw new Error(`${relative}: PNG trasparente vuoto`);
  let topRun = 0;
  let currentRun = 0;
  let topCount = 0;
  for (let x = meaningfulLeft; x < meaningfulRight; x += 1) {
    if (alphaAt(x, meaningfulTop) > 16) {
      currentRun += 1;
      topCount += 1;
      topRun = Math.max(topRun, currentRun);
    } else currentRun = 0;
  }
  let bottomRun = 0;
  let bottomCurrentRun = 0;
  let bottomCount = 0;
  let bottomOpaqueRun = 0;
  let bottomOpaqueCurrentRun = 0;
  let bottomOpaqueCount = 0;
  for (let x = meaningfulLeft; x < meaningfulRight; x += 1) {
    const bottomAlpha = alphaAt(x, Math.max(0, meaningfulBottom - 1));
    if (bottomAlpha > 16) {
      bottomCurrentRun += 1;
      bottomCount += 1;
      bottomRun = Math.max(bottomRun, bottomCurrentRun);
    } else bottomCurrentRun = 0;
    if (bottomAlpha > 224) {
      bottomOpaqueCurrentRun += 1;
      bottomOpaqueCount += 1;
      bottomOpaqueRun = Math.max(bottomOpaqueRun, bottomOpaqueCurrentRun);
    } else bottomOpaqueCurrentRun = 0;
  }
  const silhouette = [];
  const silhouetteSize = 32;
  for (let gridY = 0; gridY < silhouetteSize; gridY += 1) {
    for (let gridX = 0; gridX < silhouetteSize; gridX += 1) {
      const sampleX = Math.min(meaningfulRight - 1, Math.floor(meaningfulLeft + (gridX + 0.5) * (meaningfulRight - meaningfulLeft) / silhouetteSize));
      const sampleY = Math.min(meaningfulBottom - 1, Math.floor(meaningfulTop + (gridY + 0.5) * (meaningfulBottom - meaningfulTop) / silhouetteSize));
      silhouette.push(alphaAt(sampleX, sampleY) > 32 ? 1 : 0);
    }
  }
  return {
    width,
    height,
    bounds: [left, top, right - left, bottom - top],
    topRun,
    topRatio: topCount / Math.max(1, meaningfulRight - meaningfulLeft),
    bottomRun,
    bottomRatio: bottomCount / Math.max(1, meaningfulRight - meaningfulLeft),
    bottomOpaqueRun,
    bottomOpaqueRatio: bottomOpaqueCount / Math.max(1, meaningfulRight - meaningfulLeft),
    visibleCount,
    silhouette,
    centroid: [centroidX / Math.max(1, visibleCount), centroidY / Math.max(1, visibleCount)],
    rawPixels: pixels,
  };
}

const index = readJson('data/characters/index.json');
const meta = readJson('data/generated/frame_meta.json');
let checkedFrames = 0;

for (const id of index.characters) {
  const profile = readJson(`data/characters/${id}.json`);
  const template = profile.factory?.animation_template
    ? readJson(profile.factory.animation_template)
    : null;
  const qa = template?.qa ?? {};
  const uprightGroundedClips = new Set(qa.upright_grounded_clips ?? ['idle', 'walk', 'walk_up', 'walk_down']);
  const uprightGroundedPrefixes = qa.upright_grounded_prefixes ?? ['idle_variant_'];
  const uniqueMotionClips = new Set(qa.unique_motion_clips ?? ['idle', 'walk', 'walk_up', 'walk_down', 'run', 'brake', 'jump']);
  const uniqueMotionPrefixes = qa.unique_motion_prefixes ?? ['idle_variant_'];
  const distinctMotionClips = new Set(qa.distinct_motion_clips ?? []);
  const distinctMotionPrefixes = qa.distinct_motion_prefixes ?? [];
  const minSilhouetteDistance = qa.min_silhouette_distance ?? 0;
  const maxVisualHeightError = qa.max_visual_height_error_px ?? 6;
  const maxBottomOpaqueRun = qa.max_bottom_opaque_run_px ?? 23;
  const maxBottomOpaqueRatio = qa.max_bottom_opaque_ratio ?? 0.24;
  const maxLoopCentroidStep = qa.max_loop_centroid_step ?? 0.42;
  const decoded = new Map();
  const medianVisibleAreaByClip = new Map();
  for (const [clipName, spec] of Object.entries(profile.animations)) {
    const uprightGrounded = profile.role === 'player' && (
      uprightGroundedClips.has(clipName) || uprightGroundedPrefixes.some((prefix) => clipName.startsWith(prefix))
    );
    const uniqueMotion = profile.role === 'player' && (
      uniqueMotionClips.has(clipName) || uniqueMotionPrefixes.some((prefix) => clipName.startsWith(prefix))
    );
    const distinctMotion = profile.role === 'player' && (
      distinctMotionClips.has(clipName) || distinctMotionPrefixes.some((prefix) => clipName.startsWith(prefix))
    );
    const clipMinSilhouetteDistance = qa.min_silhouette_distance_by_clip?.[clipName] ?? minSilhouetteDistance;
    const scales = spec.visual_scales?.length === 1
      ? Array.from({ length: spec.frames }, () => spec.visual_scales[0])
      : spec.visual_scales ?? Array.from({ length: spec.frames }, () => 1);
    const sequence = [];
    for (let frameIndex = 1; frameIndex <= spec.frames; frameIndex += 1) {
      const frameName = `${String(frameIndex).padStart(2, '0')}.png`;
      const relative = `${profile.assets.animation_root}/${spec.folder}/${frameName}`;
      let art = decoded.get(relative);
      if (!art) {
        art = decodePng(relative);
        decoded.set(relative, art);
      }
      checkedFrames += 1;
      if (art.width !== 640 || art.height !== 420) fail(`${id}/${clipName}/${frameName}: canvas ${art.width}x${art.height}, atteso 640x420`);
      const expected = meta[`/${relative}`]?.bounds;
      if (!expected || expected.some((value, indexValue) => value !== art.bounds[indexValue])) {
        fail(`${id}/${clipName}/${frameName}: frame_meta non corrisponde ai pixel`);
      }
      if (art.bounds[0] <= 1 || art.bounds[1] <= 1 || art.bounds[0] + art.bounds[2] >= 639) {
        fail(`${id}/${clipName}/${frameName}: contenuto troppo vicino al bordo del canvas`);
      }
      if (art.topRun >= 24 && art.topRatio >= 0.12) {
        fail(`${id}/${clipName}/${frameName}: probabile taglio orizzontale superiore (${art.topRun}px)`);
      }
      if (uprightGrounded) {
        const targetBottom = profile.factory.content_bottom_y ?? profile.factory.baseline_y;
        const renderedHeight = art.bounds[3] * (scales[frameIndex - 1] ?? 1);
        if (Math.abs(art.bounds[1] + art.bounds[3] - targetBottom) > 1) {
          fail(`${id}/${clipName}/${frameName}: piedi fuori baseline (${art.bounds[1] + art.bounds[3]} vs ${targetBottom})`);
        }
        if (Math.abs(renderedHeight - profile.visual_height) > maxVisualHeightError) {
          fail(`${id}/${clipName}/${frameName}: scala verticale incoerente (${renderedHeight.toFixed(1)}px vs ${profile.visual_height}px)`);
        }
        if (art.bottomOpaqueRun > maxBottomOpaqueRun && art.bottomOpaqueRatio > maxBottomOpaqueRatio) {
          fail(`${id}/${clipName}/${frameName}: probabile taglio orizzontale dei piedi (${art.bottomOpaqueRun}px opachi, ${(art.bottomOpaqueRatio * 100).toFixed(0)}%)`);
        }
      }
      sequence.push({ art, scale: scales[frameIndex - 1] ?? 1 });
    }
    if (uniqueMotion) {
      for (let firstIndex = 0; firstIndex < sequence.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < sequence.length; secondIndex += 1) {
          if (sequence[firstIndex].art.rawPixels.equals(sequence[secondIndex].art.rawPixels)) {
            fail(`${id}/${clipName}: frame duplicati ${firstIndex + 1} e ${secondIndex + 1}; usa una durata maggiore invece di copiare la stessa posa`);
          }
        }
      }
    }
    if (distinctMotion && clipMinSilhouetteDistance > 0) {
      for (let firstIndex = 0; firstIndex < sequence.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < sequence.length; secondIndex += 1) {
          const first = sequence[firstIndex].art.silhouette;
          const second = sequence[secondIndex].art.silhouette;
          const changedCells = first.reduce((count, value, indexValue) => count + Number(value !== second[indexValue]), 0);
          const distance = changedCells / Math.max(1, first.length);
          if (distance < clipMinSilhouetteDistance) {
            fail(`${id}/${clipName}: pose quasi duplicate ${firstIndex + 1} e ${secondIndex + 1} (distanza silhouette ${distance.toFixed(3)})`);
          }
        }
      }
    }
    if (spec.loop && sequence.length > 1) {
      for (let frameIndex = 0; frameIndex < sequence.length; frameIndex += 1) {
        const first = sequence[frameIndex];
        const second = sequence[(frameIndex + 1) % sequence.length];
        const distance = Math.hypot(
          first.art.centroid[0] - second.art.centroid[0],
          first.art.centroid[1] - second.art.centroid[1],
        ) / profile.visual_height;
        if (distance > maxLoopCentroidStep) fail(`${id}/${clipName}: salto del baricentro tra frame ${frameIndex + 1} e ${(frameIndex + 1) % sequence.length + 1} (${distance.toFixed(3)})`);
      }
    }
    const visibleAreas = sequence.map(({ art, scale }) => art.visibleCount * scale * scale).sort((a, b) => a - b);
    const middle = Math.floor(visibleAreas.length / 2);
    const medianVisibleArea = visibleAreas.length % 2 === 0
      ? (visibleAreas[middle - 1] + visibleAreas[middle]) / 2
      : visibleAreas[middle];
    medianVisibleAreaByClip.set(clipName, medianVisibleArea);
  }

  const areaReferenceClip = qa.apparent_area_reference_clip;
  const areaLimits = qa.apparent_area_ratio_by_clip ?? {};
  if (areaReferenceClip && Object.keys(areaLimits).length > 0) {
    const referenceArea = medianVisibleAreaByClip.get(areaReferenceClip);
    if (!referenceArea) fail(`${id}: clip di riferimento scala apparente mancante: ${areaReferenceClip}`);
    for (const [clipName, limits] of Object.entries(areaLimits)) {
      const area = medianVisibleAreaByClip.get(clipName);
      if (!area || !referenceArea) continue;
      const ratio = area / referenceArea;
      const [minimum, maximum] = limits;
      if (ratio < minimum || ratio > maximum) {
        fail(`${id}/${clipName}: massa apparente ${ratio.toFixed(2)}x rispetto a ${areaReferenceClip}, atteso ${minimum.toFixed(2)}–${maximum.toFixed(2)}x`);
      }
    }
  }

  if (id !== 'barbetta') {
    const fall = profile.animations.knockdown;
    const getup = profile.animations.getup;
    const fallScale = fall.visual_scales?.at(-1) ?? 1;
    const getupScale = getup.visual_scales?.[0] ?? 1;
    const fallRelative = `${profile.assets.animation_root}/${fall.folder}/${String(fall.frames).padStart(2, '0')}.png`;
    const getupRelative = `${profile.assets.animation_root}/${getup.folder}/01.png`;
    const fallArt = decoded.get(fallRelative) ?? decodePng(fallRelative);
    const getupArt = decoded.get(getupRelative) ?? decodePng(getupRelative);
    if (!fallArt.rawPixels.equals(getupArt.rawPixels)) fail(`${id}: ultimo fall e primo getup non sono pixel-identici`);
    if (Math.abs(fallScale - getupScale) > 0.0001) fail(`${id}: scala fall/getup non continua`);
    if (Math.abs(fallScale - 1) > 0.0001 || Math.abs(getupScale - 1) > 0.0001) {
      fail(`${id}: fall/getup devono mantenere scala runtime 1.0`);
    }
    const groundRatio = fallArt.bounds[2] * fallScale / profile.visual_height;
    if (groundRatio < 0.92 || groundRatio > 1.10) fail(`${id}: corpo a terra sproporzionato (${groundRatio.toFixed(2)}x)`);
  }
}

for (const warning of warnings) console.warn(`ART WARNING - ${warning}`);
if (errors.length) {
  console.error(`ART VALIDATION FAILED (${errors.length})`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`ART VALIDATION PASS - ${checkedFrames} frame controllati: canvas, metadata, bordi, tagli, continuità e scala a terra.`);
