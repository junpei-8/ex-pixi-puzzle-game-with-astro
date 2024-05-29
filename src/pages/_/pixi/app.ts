import { update as updateTween } from '@tweenjs/tween.js';
import { Application } from 'pixi.js';
import { loadBackground, renderBackground } from './assets';
import { loadPuzzlePieceImages, renderPuzzleGrid } from './puzzle';
import { createMainScreen } from './screen';

export async function init(element: Element) {
  // Preload する関数を呼び出す
  const loadingBackground = loadBackground();
  const loadingPuzzlePieceImages = loadPuzzlePieceImages();

  // Application を初期化
  const app = new Application();

  const initializing = app.init({ resizeTo: window });

  const mainScreen = createMainScreen();

  await initializing;

  await Promise.all([
    renderBackground(app, mainScreen, loadingBackground),
    renderPuzzleGrid(app, mainScreen, loadingPuzzlePieceImages),
  ]);

  // メインスクリーンをアプリケーションに追加
  app.stage.addChild(mainScreen);

  // Application へレンダリング
  app.canvas.classList.add('pixi');
  element.appendChild(app.canvas);

  // Tween Animation を待機させる
  app.ticker.add(() => updateTween());
}
