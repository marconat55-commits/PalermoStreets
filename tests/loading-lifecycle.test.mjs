import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

function deferred() {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
}

function fixture() {
  const source = readFileSync('src/game/Game.ts', 'utf8').replace(/^import .*;\r?\n/gm, '').replace('export class Game', 'class Game');
  const attached = [];
  let createCalls = 0;
  class StageScene {
    root = {};
    destroyed = false;
    destroy() { this.destroyed = true; }
    static async create() { createCalls++; return new StageScene(); }
  }
  class TitleScene { root = {}; destroy() {} }
  const context = vm.createContext({
    Application: class { stage = { removeChildren() {}, addChild(x) { attached.push(x); } }; },
    Input: class {}, StageScene, TitleScene, console,
  });
  const Game = vm.runInContext(stripTypeScriptTypes(source) + '\nGame', context);
  const game = new Game();
  const selection = { selectedCharacterId: 'marco', setLoading() {}, setLoadingProgress() {}, destroy() {} };
  game.characterSelectScene = selection;
  game.scene = selection;
  game.catalog = { ensureCharacter: async () => {}, releaseCharacter() {} };
  game.preloadInitialStage = async () => {};
  return { game, selection, StageScene, attached, calls: () => createCalls };
}

test('Esc while resources load prevents abandoned stage attachment', async () => {
  const f = fixture();
  const gate = deferred();
  f.game.preloadInitialStage = () => gate.promise;
  const starting = f.game.startStage();
  f.game.showTitle();
  gate.resolve();
  await starting;
  assert.equal(f.calls(), 0);
  assert.equal(f.attached.length, 1);
});

test('Esc during scene construction destroys the abandoned scene and invalidates preload', async () => {
  const f = fixture();
  const gate = deferred();
  const entered = deferred();
  const stage = new f.StageScene();
  f.StageScene.create = () => { entered.resolve(); return gate.promise; };
  f.game.initialStagePreload = Promise.resolve();
  const starting = f.game.startStage();
  await entered.promise;
  f.game.showTitle();
  gate.resolve(stage);
  await starting;
  assert.equal(stage.destroyed, true);
  assert.equal(f.game.initialStagePreload, null);
  assert.equal(f.attached.length, 1);
});

test('returning from a stage invalidates completed resource progress', () => {
  const f = fixture();
  f.game.scene = new f.StageScene();
  f.game.initialStagePreload = Promise.resolve();
  f.game.initialStageLoadCompleted = 8;
  f.game.initialStageLoadTotal = 8;
  f.game.showTitle();
  assert.equal(f.game.initialStagePreload, null);
  assert.equal(f.game.initialStageLoadTotal, 0);
  assert.equal(f.game.initialStageLoadCompleted, 0);
});

test('the title preloads the default fighter before character confirmation', async () => {
  const f = fixture();
  const requested = [];
  f.game.catalog.ensureCharacter = async id => { requested.push(id); };
  f.game.showTitle();
  await Promise.resolve();
  assert.deepEqual(requested, ['marco']);
});

test('a new initial preload is shared even while the item catalog is pending', async () => {
  const f = fixture();
  delete f.game.preloadInitialStage;
  const gate = deferred();
  let calls = 0;
  f.game.loadInitialStageResources = () => { calls++; return gate.promise; };
  const first = f.game.preloadInitialStage();
  const second = f.game.preloadInitialStage();
  assert.equal(calls, 1);
  gate.resolve();
  await Promise.all([first, second]);
});

test('background reload waits for its previous unload to finish', async () => {
  const source = readFileSync('src/game/assets/AssetCatalog.ts', 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export class AssetCatalog', 'class AssetCatalog')
    .replaceAll('import.meta.env.PROD', 'false');
  const gate = deferred();
  const calls = [];
  const context = vm.createContext({
    Assets: { unload: () => gate.promise, load: async () => { calls.push('load'); return {}; } },
    publicUrl: x => x, console,
  });
  const Catalog = vm.runInContext(stripTypeScriptTypes(source) + '\nAssetCatalog', context);
  const catalog = new Catalog(async () => ({}));
  const unloading = catalog.unloadAsset('background.png');
  const loading = catalog.loadBackground('background.png');
  await Promise.resolve();
  assert.equal(calls.length, 0);
  gate.resolve();
  await Promise.all([unloading, loading]);
  assert.equal(calls.length, 1);
});
