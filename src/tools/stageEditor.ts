export {};

interface BackgroundLayer {
  src: string;
  enabled?: boolean;
  plane?: 'far' | 'main' | 'foreground';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface AmbientActor {
  id: string;
  kind: 'sprite_loop';
  enabled?: boolean;
  frames: string[];
  position: [number, number];
  size: [number, number];
  anchor?: [number, number];
  flip_x?: boolean;
  frame_durations: number[];
  parallax: number;
  alpha?: number;
  interactive: false;
  [key: string]: unknown;
}

interface StageModule {
  id: string;
  name: string;
  world_width?: number;
  background: string;
  background_layers?: BackgroundLayer[];
  ambient?: AmbientActor[];
  playfield_y?: [number, number];
  walk_top?: Array<[number, number]>;
  walk_bottom?: Array<[number, number]>;
  reference_actor_height?: number;
  [key: string]: unknown;
}

interface StageData {
  modules: StageModule[];
  [key: string]: unknown;
}

interface AssetEntry {
  path: string;
  frames: string[];
  name: string;
  category: string;
}

interface EditorPayload {
  stage: StageData;
  revision: string;
  assets: AssetEntry[];
  backgrounds: string[];
}

function element<T extends Element>(selector: string): T {
  const value = document.querySelector<T>(selector);
  if (!value) throw new Error(`Elemento editor mancante: ${selector}`);
  return value;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assetUrl(assetPath: string): string {
  return `/${assetPath.replace(/^\/+/, '')}`;
}

const moduleSelect = element<HTMLSelectElement>('#module-select');
const assetSearch = element<HTMLInputElement>('#asset-search');
const assetCategory = element<HTMLSelectElement>('#asset-category');
const assetList = element<HTMLDivElement>('#asset-list');
const stageScroll = element<HTMLElement>('#stage-scroll');
const stageViewport = element<HTMLDivElement>('#stage-viewport');
const stageCanvas = element<HTMLDivElement>('#stage-canvas');
const backgroundLayer = element<HTMLDivElement>('#background-layer');
const ambientLayer = element<HTMLDivElement>('#ambient-layer');
const walkGuides = element<SVGSVGElement>('#walk-guides');
const cameraGuide = element<HTMLDivElement>('#camera-guide');
const scaleReference = element<HTMLDivElement>('#scale-reference');
const zoomInput = element<HTMLInputElement>('#zoom');
const dirtyState = element<HTMLSpanElement>('#dirty-state');
const inspector = element<HTMLFormElement>('#inspector');
const emptyInspector = element<HTMLDivElement>('#empty-inspector');
const moduleInfo = element<HTMLElement>('#module-info');
const toast = element<HTMLDivElement>('#toast');

const objectId = element<HTMLInputElement>('#object-id');
const objectAsset = element<HTMLInputElement>('#object-asset');
const objectX = element<HTMLInputElement>('#object-x');
const objectY = element<HTMLInputElement>('#object-y');
const objectWidth = element<HTMLInputElement>('#object-width');
const objectHeight = element<HTMLInputElement>('#object-height');
const objectAlpha = element<HTMLInputElement>('#object-alpha');
const objectFlip = element<HTMLInputElement>('#object-flip');

let stageData: StageData;
let assets: AssetEntry[] = [];
let revision = '';
let activeModuleId = '';
let selectedId: string | null = null;
let zoom = 0.5;
let savedState = '';
let editHistory: string[] = [];
let historyIndex = 0;
let toastTimer = 0;

function currentModule(): StageModule {
  const module = stageData.modules.find((candidate) => candidate.id === activeModuleId);
  if (!module) throw new Error(`Modulo ${activeModuleId} non trovato`);
  return module;
}

function currentAmbient(): AmbientActor[] {
  const module = currentModule();
  module.ambient ??= [];
  return module.ambient;
}

function selectedActor(): AmbientActor | null {
  return currentAmbient().find((actor) => actor.id === selectedId) ?? null;
}

function serialized(): string {
  return JSON.stringify(stageData);
}

function showToast(message: string, error = false): void {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle('error', error);
  toast.classList.add('show');
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 3200);
}

function updateDirtyState(): void {
  const dirty = serialized() !== savedState;
  dirtyState.textContent = dirty ? `${activeModuleId} • modifiche non salvate` : `${activeModuleId} • salvato`;
  dirtyState.classList.toggle('dirty', dirty);
  element<HTMLButtonElement>('#undo').disabled = historyIndex <= 0;
  element<HTMLButtonElement>('#redo').disabled = historyIndex >= editHistory.length - 1;
}

function commitHistory(): void {
  const snapshot = serialized();
  if (editHistory[historyIndex] === snapshot) return;
  editHistory = editHistory.slice(0, historyIndex + 1);
  editHistory.push(snapshot);
  if (editHistory.length > 80) editHistory.shift();
  historyIndex = editHistory.length - 1;
  updateDirtyState();
}

function restoreHistory(index: number): void {
  if (index < 0 || index >= editHistory.length) return;
  historyIndex = index;
  stageData = JSON.parse(editHistory[index]!) as StageData;
  if (!stageData.modules.some((module) => module.id === activeModuleId)) activeModuleId = stageData.modules[0]?.id ?? '';
  if (!selectedActor()) selectedId = null;
  renderModule();
  updateDirtyState();
}

function worldWidth(module: StageModule): number {
  return module.world_width ?? 1280;
}

function applyZoom(): void {
  const width = worldWidth(currentModule());
  stageCanvas.style.width = `${width}px`;
  stageCanvas.style.height = '720px';
  stageCanvas.style.transform = `scale(${zoom})`;
  stageViewport.style.width = `${width * zoom}px`;
  stageViewport.style.height = `${720 * zoom}px`;
}

function renderBackground(module: StageModule): void {
  backgroundLayer.replaceChildren();
  const layers = module.background_layers?.filter((layer) => layer.enabled !== false) ?? [{
    src: module.background,
    plane: 'main' as const,
    x: 0,
    y: 0,
    width: worldWidth(module),
    height: 720,
  }];
  for (const layer of layers) {
    const image = new Image();
    image.src = assetUrl(layer.src);
    image.alt = '';
    image.dataset.plane = layer.plane ?? 'main';
    image.style.left = `${layer.x ?? 0}px`;
    image.style.top = `${layer.y ?? 0}px`;
    image.style.width = `${layer.width ?? worldWidth(module)}px`;
    image.style.height = `${layer.height ?? 720}px`;
    backgroundLayer.appendChild(image);
  }
}

function pointsFor(module: StageModule, key: 'walk_top' | 'walk_bottom'): Array<[number, number]> {
  const authored = module[key];
  if (authored?.length) return authored;
  const fallback = module.playfield_y ?? [500, 705];
  const y = key === 'walk_top' ? fallback[0] : fallback[1];
  return [[0, y], [worldWidth(module), y]];
}

function renderGuides(module: StageModule): void {
  const width = worldWidth(module);
  walkGuides.setAttribute('viewBox', `0 0 ${width} 720`);
  walkGuides.style.width = `${width}px`;
  walkGuides.style.height = '720px';
  walkGuides.replaceChildren();
  for (const [key, color] of [['walk_top', '#56f2a3'], ['walk_bottom', '#ff6f61']] as const) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    line.setAttribute('points', pointsFor(module, key).map(([x, y]) => `${x},${y}`).join(' '));
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '4');
    line.setAttribute('stroke-dasharray', '14 8');
    walkGuides.appendChild(line);
  }
  scaleReference.style.height = `${module.reference_actor_height ?? 290}px`;
  cameraGuide.style.left = `${Math.min(Math.max(0, stageScroll.scrollLeft / zoom), Math.max(0, width - 1280))}px`;
}

function renderAmbient(): void {
  ambientLayer.replaceChildren();
  for (const actor of currentAmbient()) {
    if (actor.enabled === false) continue;
    const anchor = actor.anchor ?? [0.5, 1];
    const wrapper = document.createElement('div');
    wrapper.className = `ambient-object${actor.id === selectedId ? ' selected' : ''}`;
    wrapper.dataset.id = actor.id;
    wrapper.style.left = `${actor.position[0] - anchor[0] * actor.size[0]}px`;
    wrapper.style.top = `${actor.position[1] - anchor[1] * actor.size[1]}px`;
    wrapper.style.width = `${actor.size[0]}px`;
    wrapper.style.height = `${actor.size[1]}px`;
    wrapper.style.opacity = String(actor.alpha ?? 1);

    const image = new Image();
    image.src = assetUrl(actor.frames[0] ?? '');
    image.alt = actor.id;
    image.draggable = false;
    image.style.transform = actor.flip_x ? 'scaleX(-1)' : '';
    wrapper.appendChild(image);

    const handle = document.createElement('span');
    handle.className = 'resize-handle';
    handle.title = 'Ridimensiona proporzionalmente';
    wrapper.appendChild(handle);
    wrapper.addEventListener('pointerdown', startObjectPointer);
    ambientLayer.appendChild(wrapper);
  }
}

function renderInspector(): void {
  const actor = selectedActor();
  inspector.hidden = !actor;
  emptyInspector.hidden = Boolean(actor);
  if (!actor) return;
  objectId.value = actor.id;
  objectAsset.value = actor.frames[0] ?? '';
  objectX.value = String(Math.round(actor.position[0]));
  objectY.value = String(Math.round(actor.position[1]));
  objectWidth.value = String(Math.round(actor.size[0]));
  objectHeight.value = String(Math.round(actor.size[1]));
  objectAlpha.value = String(actor.alpha ?? 1);
  objectFlip.checked = actor.flip_x === true;
}

function renderModuleInfo(module: StageModule): void {
  const top = pointsFor(module, 'walk_top')[0]?.[1] ?? 0;
  const bottom = pointsFor(module, 'walk_bottom')[0]?.[1] ?? 0;
  moduleInfo.innerHTML = `<dt>Nome</dt><dd>${module.name}</dd><dt>Larghezza</dt><dd>${worldWidth(module)} px</dd><dt>WALK</dt><dd>${top}–${bottom} px</dd><dt>Oggetti</dt><dd>${currentAmbient().length}</dd>`;
}

function renderModule(): void {
  const module = currentModule();
  moduleSelect.value = module.id;
  renderBackground(module);
  renderGuides(module);
  renderAmbient();
  renderInspector();
  renderModuleInfo(module);
  applyZoom();
}

function selectActor(id: string | null): void {
  selectedId = id;
  renderAmbient();
  renderInspector();
}

function startObjectPointer(event: PointerEvent): void {
  if (stageCanvas.classList.contains('preview-mode')) return;
  event.preventDefault();
  event.stopPropagation();
  const wrapper = event.currentTarget as HTMLDivElement;
  const id = wrapper.dataset.id ?? null;
  selectActor(id);
  const actor = selectedActor();
  if (!actor) return;
  wrapper.setPointerCapture(event.pointerId);
  const startX = event.clientX;
  const startY = event.clientY;
  const originalPosition: [number, number] = [...actor.position];
  const originalSize: [number, number] = [...actor.size];
  const resizing = (event.target as HTMLElement).classList.contains('resize-handle');

  const move = (moveEvent: PointerEvent): void => {
    const dx = (moveEvent.clientX - startX) / zoom;
    const dy = (moveEvent.clientY - startY) / zoom;
    if (resizing) {
      const factor = Math.max(0.05, (originalSize[0] + dx) / originalSize[0]);
      actor.size = [Math.round(originalSize[0] * factor), Math.round(originalSize[1] * factor)];
    } else {
      actor.position = [Math.round(originalPosition[0] + dx), Math.round(originalPosition[1] + dy)];
    }
    renderAmbient();
    renderInspector();
  };
  const up = (): void => {
    wrapper.removeEventListener('pointermove', move);
    wrapper.removeEventListener('pointerup', up);
    wrapper.removeEventListener('pointercancel', up);
    commitHistory();
    renderModuleInfo(currentModule());
  };
  wrapper.addEventListener('pointermove', move);
  wrapper.addEventListener('pointerup', up);
  wrapper.addEventListener('pointercancel', up);
}

function uniqueId(base: string): string {
  const clean = base.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'prop';
  const used = new Set(currentAmbient().map((actor) => actor.id));
  let candidate = `${activeModuleId.toLowerCase()}_${clean}`;
  let suffix = 2;
  while (used.has(candidate)) candidate = `${activeModuleId.toLowerCase()}_${clean}_${suffix++}`;
  return candidate;
}

async function addAsset(entry: AssetEntry, x: number, y: number): Promise<void> {
  const image = new Image();
  image.src = assetUrl(entry.path);
  await image.decode().catch(() => undefined);
  const ratio = image.naturalWidth > 0 && image.naturalHeight > 0 ? image.naturalWidth / image.naturalHeight : 1;
  const height = 180;
  const actor: AmbientActor = {
    id: uniqueId(entry.name),
    kind: 'sprite_loop',
    frames: entry.frames.length ? entry.frames : [entry.path, entry.path],
    position: [Math.round(x), Math.round(y)],
    size: [Math.round(height * ratio), height],
    anchor: [0.5, 1],
    frame_durations: entry.frames.map(() => 0.5),
    parallax: 1,
    alpha: 1,
    interactive: false,
  };
  if (actor.frames.length === 1) {
    actor.frames.push(actor.frames[0]!);
    actor.frame_durations.push(10);
  }
  currentAmbient().push(actor);
  selectedId = actor.id;
  commitHistory();
  renderModule();
}

function renderAssets(): void {
  const query = assetSearch.value.trim().toLowerCase();
  const category = assetCategory.value;
  const filtered = assets.filter((entry) => {
    return (!category || entry.category === category) && (!query || `${entry.name} ${entry.path}`.toLowerCase().includes(query));
  });
  assetList.replaceChildren();
  for (const entry of filtered) {
    const card = document.createElement('div');
    card.className = 'asset-card';
    card.draggable = true;
    card.title = 'Trascina nello stage';
    card.innerHTML = `<img loading="lazy" src="${assetUrl(entry.path)}" alt=""><strong>${entry.name}</strong><small>${entry.category}</small>`;
    card.addEventListener('dragstart', (event) => event.dataTransfer?.setData('application/x-palermo-asset', entry.path));
    card.addEventListener('dblclick', () => {
      const x = (stageScroll.scrollLeft + stageScroll.clientWidth / 2) / zoom;
      const y = Math.min(690, (stageScroll.scrollTop + stageScroll.clientHeight / 2) / zoom + 90);
      void addAsset(entry, x, y);
    });
    assetList.appendChild(card);
  }
}

function mutateSelected(mutator: (actor: AmbientActor) => void): void {
  const actor = selectedActor();
  if (!actor) return;
  mutator(actor);
  commitHistory();
  renderModule();
}

function deleteSelected(): void {
  if (!selectedId) return;
  const ambient = currentAmbient();
  const index = ambient.findIndex((actor) => actor.id === selectedId);
  if (index < 0) return;
  ambient.splice(index, 1);
  selectedId = null;
  commitHistory();
  renderModule();
}

function duplicateSelected(): void {
  const actor = selectedActor();
  if (!actor) return;
  const copy = clone(actor);
  copy.id = uniqueId(actor.id.replace(`${activeModuleId.toLowerCase()}_`, ''));
  copy.position = [actor.position[0] + 24, actor.position[1] + 12];
  currentAmbient().push(copy);
  selectedId = copy.id;
  commitHistory();
  renderModule();
}

async function saveStage(): Promise<boolean> {
  const saveButton = element<HTMLButtonElement>('#save');
  saveButton.disabled = true;
  dirtyState.textContent = 'Validazione e salvataggio…';
  try {
    const response = await fetch('/__stage-editor/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: stageData, revision }),
    });
    const result = await response.json() as { revision?: string; message?: string; error?: string };
    if (!response.ok) throw new Error(result.error ?? 'Salvataggio fallito');
    revision = result.revision ?? revision;
    savedState = serialized();
    updateDirtyState();
    showToast(result.message ?? 'Stage salvato.');
    return true;
  } catch (error) {
    updateDirtyState();
    showToast(error instanceof Error ? error.message : String(error), true);
    return false;
  } finally {
    saveButton.disabled = false;
  }
}

async function publishStage(): Promise<void> {
  const publishButton = element<HTMLButtonElement>('#publish');
  const saveButton = element<HTMLButtonElement>('#save');
  publishButton.disabled = true;
  saveButton.disabled = true;
  try {
    if (serialized() !== savedState && !(await saveStage())) return;
    publishButton.disabled = true;
    saveButton.disabled = true;
    dirtyState.textContent = 'Pubblicazione su GitHub…';
    const response = await fetch('/__stage-editor/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleId: activeModuleId }),
    });
    const result = await response.json() as { commit?: string; message?: string; error?: string };
    if (!response.ok) throw new Error(result.error ?? 'Pubblicazione fallita');
    updateDirtyState();
    showToast(`${result.message ?? 'Stage pubblicato.'}${result.commit ? ` Commit ${result.commit}.` : ''}`);
  } catch (error) {
    updateDirtyState();
    showToast(error instanceof Error ? error.message : String(error), true);
  } finally {
    publishButton.disabled = false;
    saveButton.disabled = false;
  }
}

function bindEvents(): void {
  moduleSelect.addEventListener('change', () => {
    activeModuleId = moduleSelect.value;
    selectedId = null;
    stageScroll.scrollTo({ left: 0, top: 0 });
    renderModule();
    updateDirtyState();
  });
  zoomInput.addEventListener('input', () => {
    zoom = Number(zoomInput.value) / 100;
    applyZoom();
    renderGuides(currentModule());
  });
  assetSearch.addEventListener('input', renderAssets);
  assetCategory.addEventListener('change', renderAssets);
  stageCanvas.addEventListener('pointerdown', (event) => {
    if (event.target === stageCanvas || event.target === ambientLayer || event.target === backgroundLayer) selectActor(null);
  });
  stageCanvas.addEventListener('dragover', (event) => event.preventDefault());
  stageCanvas.addEventListener('drop', (event) => {
    event.preventDefault();
    const assetPath = event.dataTransfer?.getData('application/x-palermo-asset');
    const entry = assets.find((candidate) => candidate.path === assetPath);
    if (!entry) return;
    const rect = stageCanvas.getBoundingClientRect();
    void addAsset(entry, (event.clientX - rect.left) / zoom, (event.clientY - rect.top) / zoom);
  });
  stageScroll.addEventListener('scroll', () => renderGuides(currentModule()), { passive: true });

  objectX.addEventListener('change', () => mutateSelected((actor) => { actor.position[0] = Number(objectX.value); }));
  objectY.addEventListener('change', () => mutateSelected((actor) => { actor.position[1] = Number(objectY.value); }));
  objectWidth.addEventListener('change', () => mutateSelected((actor) => {
    const ratio = actor.size[1] / actor.size[0];
    actor.size = [Math.max(1, Number(objectWidth.value)), Math.max(1, Math.round(Number(objectWidth.value) * ratio))];
  }));
  objectHeight.addEventListener('change', () => mutateSelected((actor) => {
    const ratio = actor.size[0] / actor.size[1];
    actor.size = [Math.max(1, Math.round(Number(objectHeight.value) * ratio)), Math.max(1, Number(objectHeight.value))];
  }));
  objectAlpha.addEventListener('input', () => {
    const actor = selectedActor();
    if (!actor) return;
    actor.alpha = Number(objectAlpha.value);
    renderAmbient();
  });
  objectAlpha.addEventListener('change', commitHistory);
  objectFlip.addEventListener('change', () => mutateSelected((actor) => { actor.flip_x = objectFlip.checked; }));

  element<HTMLButtonElement>('#duplicate').addEventListener('click', duplicateSelected);
  element<HTMLButtonElement>('#delete').addEventListener('click', deleteSelected);
  element<HTMLButtonElement>('#undo').addEventListener('click', () => restoreHistory(historyIndex - 1));
  element<HTMLButtonElement>('#redo').addEventListener('click', () => restoreHistory(historyIndex + 1));
  element<HTMLButtonElement>('#save').addEventListener('click', () => void saveStage());
  element<HTMLButtonElement>('#publish').addEventListener('click', () => void publishStage());
  element<HTMLButtonElement>('#toggle-guides').addEventListener('click', (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    button.classList.toggle('active');
    stageCanvas.classList.toggle('guides-off', !button.classList.contains('active'));
  });
  element<HTMLButtonElement>('#preview-game').addEventListener('click', (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    button.classList.toggle('active');
    stageCanvas.classList.toggle('preview-mode', button.classList.contains('active'));
  });

  document.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement;
    if (target.matches('input, select, textarea')) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      void saveStage();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      restoreHistory(historyIndex + (event.shiftKey ? 1 : -1));
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      duplicateSelected();
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      deleteSelected();
      return;
    }
    const delta = event.shiftKey ? 10 : 1;
    const movement: Record<string, [number, number]> = {
      ArrowLeft: [-delta, 0], ArrowRight: [delta, 0], ArrowUp: [0, -delta], ArrowDown: [0, delta],
    };
    const step = movement[event.key];
    if (step) {
      event.preventDefault();
      mutateSelected((actor) => {
        actor.position = [actor.position[0] + step[0], actor.position[1] + step[1]];
      });
    }
  });

  window.addEventListener('beforeunload', (event) => {
    if (serialized() !== savedState) event.preventDefault();
  });
}

async function loadEditor(): Promise<void> {
  const response = await fetch('/__stage-editor/state');
  if (!response.ok) throw new Error('Il server editor non è attivo. Riavvia npm run dev.');
  const payload = await response.json() as EditorPayload;
  stageData = payload.stage;
  revision = payload.revision;
  assets = payload.assets;
  activeModuleId = stageData.modules[0]?.id ?? '';
  savedState = serialized();
  editHistory = [savedState];
  historyIndex = 0;

  moduleSelect.replaceChildren(...stageData.modules.map((module) => {
    const option = document.createElement('option');
    option.value = module.id;
    option.textContent = `${module.id} — ${module.name}`;
    return option;
  }));
  const categories = [...new Set(assets.map((asset) => asset.category))].sort();
  for (const category of categories) {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    assetCategory.appendChild(option);
  }
  bindEvents();
  renderAssets();
  renderModule();
  updateDirtyState();
}

loadEditor().catch((error) => {
  dirtyState.textContent = 'Editor non disponibile';
  showToast(error instanceof Error ? error.message : String(error), true);
  console.error(error);
});
