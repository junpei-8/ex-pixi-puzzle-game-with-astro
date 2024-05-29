import { Tween, Easing as TweenEasing } from '@tweenjs/tween.js';
import {
  Application,
  Assets,
  Container,
  FederatedPointerEvent,
  Sprite,
  Texture,
} from 'pixi.js';
import { atom } from 'nanostores';
import PuzzlePiece1PngImgPath from '../images/1.png?url';
import PuzzlePiece2PngImgPath from '../images/2.png?url';
import PuzzlePiece3PngImgPath from '../images/3.png?url';
import PuzzlePiece4PngImgPath from '../images/4.png?url';
import PuzzlePiece5PngImgPath from '../images/5.png?url';
import PuzzlePiece6PngImgPath from '../images/6.png?url';
import PuzzlePiece7PngImgPath from '../images/7.png?url';
import PuzzlePiece8PngImgPath from '../images/8.png?url';
import PuzzlePiece9PngImgPath from '../images/9.png?url';
import PuzzlePieceClickMp3Sound from '../sounds/click.mp3?url';
import PuzzleClearMp3Sound from '../sounds/clear.mp3?url';

export function loadPuzzlePieceImages() {
  return Assets.load([
    PuzzlePiece1PngImgPath,
    PuzzlePiece2PngImgPath,
    PuzzlePiece3PngImgPath,
    PuzzlePiece4PngImgPath,
    PuzzlePiece5PngImgPath,
    PuzzlePiece6PngImgPath,
    PuzzlePiece7PngImgPath,
    PuzzlePiece8PngImgPath,
    PuzzlePiece9PngImgPath,
  ]).then((assets) => Object.values(assets) as Texture[]);
}

export async function renderPuzzleGrid(
  app: Application,
  screen: Container,
  loadingPieceImgs: Promise<Texture[]>
) {
  const images = await loadingPieceImgs;
  const puzzle = new Puzzle(app, images);
  screen.addChild(puzzle);
}

class Puzzle extends Container {
  // prettier-ignore
  readonly piecePoints = [
		atom({ id: 1, x: -155, y: -155 }), atom({ id: 2, x: 0, y: -155 }), atom({ id: 3, x: 155, y: -155 }),
		atom({ id: 4, x: -155, y: 0    }), atom({ id: 5, x: 0, y: 0    }), atom({ id: 6, x: 155, y: 0    }),
		atom({ id: 7, x: -155, y: 155  }), atom({ id: 8, x: 0, y: 155  }), atom({ id: 9, x: 155, y: 155  }),
	]

  constructor(app: Application, pieceImages: Texture[]) {
    super();

    this.x = app.screen.width / 2;
    this.y = app.screen.height / 2;

    this.sortableChildren = true;

    const clickSound = new Audio(PuzzlePieceClickMp3Sound);
    clickSound.volume = 0.4;
    clickSound.load();

    const clearSound = new Audio(PuzzleClearMp3Sound);
    clearSound.volume = 0.2;
    clearSound.load();

    const piecePoints = this.piecePoints;
    const pieces = this.shuffleImages(piecePoints).map(
      (piecePoint, index) =>
        new PuzzlePiece(
          piecePoints,
          piecePoint,
          pieceImages[index],
          clickSound,
          clearSound
        )
    );

    this.addChild(...pieces);
  }

  shuffleImages<T>(images: T[]) {
    for (let i = images.length - 1; i > 0; i--) {
      const ii = Math.floor(Math.random() * (i + 1));
      [images[i], images[ii]] = [images[ii], images[i]];
    }
    return images;
  }
}

class PuzzlePiece extends Sprite {
  dragging = false;

  pointerDownPoint: { x: number; y: number } | null = null;

  get left() {
    return this.x - this.width / 2;
  }
  get right() {
    return this.x + this.width / 2;
  }
  get top() {
    return this.y - this.height / 2;
  }
  get bottom() {
    return this.y + this.height / 2;
  }

  constructor(
    public points: Puzzle['piecePoints'],
    public point: Puzzle['piecePoints'][number],
    public image: Texture,
    public clickSound: HTMLAudioElement,
    public clearSound: HTMLAudioElement
  ) {
    super(image);

    this.anchor.set(0.5);
    this.scale.set(0.5);

    this.resetPoint();
    point.subscribe(() => this.resetPoint());

    this.interactive = true;

    this.on('pointerdown', this.onPointerDown, this);
    this.on('pointermove', this.onPointerMove, this);
    this.on('pointerup', this.onPointerUp, this);
  }

  onPointerDown(event: FederatedPointerEvent) {
    const newPoint = event.global;
    this.pointerDownPoint = { x: newPoint.x, y: newPoint.y };
    this.dragging = true;
    this.zIndex = 1;
    this.clickSound.play();
  }

  onPointerMove(event: FederatedPointerEvent) {
    const pointerDownPoint = this.pointerDownPoint;
    if (!this.dragging || !pointerDownPoint) return;

    const newPoint = event.global;

    const offsetX = newPoint.x - pointerDownPoint.x;
    const offsetY = newPoint.y - pointerDownPoint.y;

    const point = this.point.get();
    this.x = point.x + offsetX;
    this.y = point.y + offsetY;
  }

  onPointerUp() {
    this.dragging = false;
    this.zIndex = 0;

    const points = this.points;

    const currentPointSignal = this.point;
    const overlappedPointSignal = points.find((point) => {
      const { x, y } = point.get();
      return (
        this.left <= x && this.right >= x && this.top <= y && this.bottom >= y
      );
    });

    if (!overlappedPointSignal) {
      this.resetPoint();
      return;
    }

    // ポジションを入れ替える
    const currentPoint = currentPointSignal.get();
    const overlappedPoint = overlappedPointSignal.get();
    overlappedPointSignal.set(currentPoint);
    currentPointSignal.set(overlappedPoint);

    // すべてのポジションが正しいか確認
    const isAllCorrect = points.every((point, index) => {
      const { id } = point.get();
      return id === index + 1;
    });

    if (isAllCorrect) {
      this.clearSound.play();
      setTimeout(() => window.alert('クリア！'), 240);
    }
  }

  resetPoint() {
    const tween = new Tween(this);
    const point = this.point.get();
    tween.to({ x: point.x, y: point.y }, 240);
    tween.easing(TweenEasing.Quadratic.Out);
    tween.onStart(() => (this.zIndex = 1));
    tween.onComplete(() => (this.zIndex = 0));
    tween.start();
  }
}
