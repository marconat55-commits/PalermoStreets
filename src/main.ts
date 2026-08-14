import './style.css';
import { Game } from './game/Game';
import { RigLab } from './riglab/RigLab';

async function bootstrap(): Promise<void> {
  const host = document.querySelector<HTMLElement>('#app');
  if (!host) throw new Error('Elemento #app non trovato');
  if (new URLSearchParams(window.location.search).has('riglab')) {
    const rigLab = new RigLab();
    await rigLab.init(host);
    return;
  }
  const game = new Game();
  await game.init(host);
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  const host = document.querySelector<HTMLElement>('#app');
  if (host) {
    host.innerHTML = `<pre style="color:#fff;background:#200;padding:24px;white-space:pre-wrap">Errore avvio Palermo Streets PixiJS:\n${String(error)}</pre>`;
  }
});
