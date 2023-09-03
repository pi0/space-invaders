// Based on original source from https://codepen.io/adelciotto/pen/WNzRYy
// By Anthony Del Ciotto <https://github.com/adelciotto>

export interface InvadersOptions {
  selector?: string;
  canvas?: HTMLCanvasElement;
  width?: number;
  height?: number;
}

export function startGame(options: InvadersOptions = {}) {
  // ###################################################################
  // Constants
  // ###################################################################
  const IS_CHROME =
    /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
  const CANVAS_WIDTH = options.width || 640;
  const CANVAS_HEIGHT = options.height || 640;
  const SPRITE_SHEET_SRC =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAEACAYAAAADRnAGAAACGUlEQVR42u3aSQ7CMBAEQIsn8P+/hiviAAK8zFIt5QbELiTHmfEYE3L9mZE9AAAAqAVwBQ8AAAD6THY5CgAAAKbfbPX3AQAAYBEEAADAuZrC6UUyfMEEAIBiAN8OePXnAQAAsLcmmKFPAQAAgHMbm+gbr3Sdo/LtcAAAANR6GywPAgBAM4D2JXAAABoBzBjA7AmlOx8AAEAzAOcDAADovTc4vQim6wUCABAYQG8QAADd4dPd2fRVYQAAANQG0B4HAABAawDnAwAA6AXgfAAAALpA2uMAAABwPgAAgPoAM9Ci/R4AAAD2dmqcEQIAIC/AiQGuAAYAAECcRS/a/cJXkUf2AAAAoBaA3iAAALrD+gIAAADY9baX/nwAAADNADwFAADo9YK0e5FMX/UFACA5QPSNEAAAAHKtCekmDAAAAADvBljtfgAAAGgMMGOrunvCy2uCAAAACFU6BwAAwF6AGQPa/XsAAADYB+B8AAAAtU+ItD4OAwAAAFVhAACaA0T7B44/BQAAANALwGMQAAAAADYO8If2+P31AgAAQN0SWbhFDwCAZlXgaO1xAAAA1FngnA8AACAeQPSNEAAAAM4CnC64AAAA4GzN4N9NSfgKEAAAAACszO26X8/X6BYAAAD0Anid8KcLAAAAAAAAAJBnwNEvAAAA9Jns1ygAAAAAAAAAAAAAAAAAAABAQ4COCENERERERERERBrnAa1sJuUVr3rsAAAAAElFTkSuQmCC";
  const LEFT_KEY = 37;
  const RIGHT_KEY = 39;
  const SHOOT_KEY = 32; /* space */
  const TEXT_BLINK_FREQ = 500;
  const PLAYER_CLIP_RECT = { x: 0, y: 204, w: 62, h: 32 };
  const ALIEN_BOTTOM_ROW = [
    { x: 0, y: 0, w: 51, h: 34 },
    { x: 0, y: 102, w: 51, h: 34 },
  ];
  const ALIEN_MIDDLE_ROW = [
    { x: 0, y: 137, w: 50, h: 33 },
    { x: 0, y: 170, w: 50, h: 34 },
  ];
  const ALIEN_TOP_ROW = [
    { x: 0, y: 68, w: 50, h: 32 },
    { x: 0, y: 34, w: 50, h: 32 },
  ];
  const ALIEN_X_MARGIN = 40;
  const ALIEN_SQUAD_WIDTH = 11 * ALIEN_X_MARGIN;

  type ClipRect = { x: number; y: number; w: number; h: number };

  // ###################################################################
  // Utility functions & classes
  //
  // ###################################################################
  function getRandomArbitrary(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  function clamp(num: number, min: number, max: number) {
    return Math.min(Math.max(num, min), max);
  }

  function valueInRange(value: number, min: number, max: number) {
    return value <= max && value >= min;
  }

  function checkRectCollision(A: ClipRect, B: ClipRect) {
    const xOverlap =
      valueInRange(A.x, B.x, B.x + B.w) || valueInRange(B.x, A.x, A.x + A.w);

    const yOverlap =
      valueInRange(A.y, B.y, B.y + B.h) || valueInRange(B.y, A.y, A.y + A.h);
    return xOverlap && yOverlap;
  }

  class Point2D {
    x: number;
    y: number;

    constructor(x: number, y: number) {
      this.x = typeof x === "undefined" ? 0 : x;
      this.y = typeof y === "undefined" ? 0 : y;
    }

    set(x: number, y: number) {
      this.x = x;
      this.y = y;
    }
  }

  class Rect {
    x: number;
    y: number;
    w: number;
    h: number;

    constructor(x: number, y: number, w: number, h: number) {
      this.x = typeof x === "undefined" ? 0 : x;
      this.y = typeof y === "undefined" ? 0 : y;
      this.w = typeof w === "undefined" ? 0 : w;
      this.h = typeof h === "undefined" ? 0 : h;
    }

    set(x: number, y: number, w: number, h: number) {
      this.x = x;
      this.y = y;
      this.w = w;
      this.h = h;
    }
  }

  // ###################################################################
  // Globals
  // ###################################################################
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let spriteSheetImg: HTMLImageElement;
  let bulletImg: HTMLImageElement;
  let keyStates: boolean[] = [];
  let prevKeyStates: boolean[] = [];
  let lastTime = 0;
  let player: Player;
  let aliens: Enemy[] = [];
  let particleManager: ParticleExplosion;
  let updateAlienLogic = false;
  let alienDirection = -1;
  let alienYDown = 0;
  let alienCount = 0;
  let wave = 1;
  let hasGameStarted = false;

  // ###################################################################
  // Entities
  // ###################################################################
  class BaseSprite {
    img: HTMLImageElement;
    position: Point2D;
    scale: Point2D;
    bounds: Rect;
    doLogic: boolean;
    constructor(img: HTMLImageElement, x: number, y: number) {
      this.img = img;
      this.position = new Point2D(x, y);
      this.scale = new Point2D(1, 1);
      this.bounds = new Rect(x, y, this.img.width, this.img.height);
      this.doLogic = true;
    }

    update(dt: number) {}

    _updateBounds() {
      this.bounds.set(
        this.position.x,
        this.position.y,
        ~~(0.5 + this.img.width * this.scale.x),
        ~~(0.5 + this.img.height * this.scale.y),
      );
    }

    _drawImage() {
      ctx.drawImage(this.img, this.position.x, this.position.y);
    }

    draw(resized: boolean) {
      this._updateBounds();
      this._drawImage();
    }
  }

  class SheetSprite extends BaseSprite {
    clipRect: ClipRect;

    constructor(
      sheetImg: HTMLImageElement,
      clipRect: ClipRect,
      x: number,
      y: number,
    ) {
      super(sheetImg, x, y);
      this.clipRect = clipRect;
      this.bounds.set(x, y, this.clipRect.w, this.clipRect.h);
    }

    update(dt: any) {}

    _updateBounds() {
      const w = ~~(0.5 + this.clipRect.w * this.scale.x);
      const h = ~~(0.5 + this.clipRect.h * this.scale.y);
      this.bounds.set(this.position.x - w / 2, this.position.y - h / 2, w, h);
    }

    _drawImage() {
      ctx.save();
      ctx.transform(
        this.scale.x,
        0,
        0,
        this.scale.y,
        this.position.x,
        this.position.y,
      );
      ctx.drawImage(
        this.img,
        this.clipRect.x,
        this.clipRect.y,
        this.clipRect.w,
        this.clipRect.h,
        ~~(0.5 + -this.clipRect.w * 0.5),
        ~~(0.5 + -this.clipRect.h * 0.5),
        this.clipRect.w,
        this.clipRect.h,
      );
      ctx.restore();
    }

    draw(resized: boolean) {
      super.draw(resized);
    }
  }

  class Player extends SheetSprite {
    lives: number;
    xVel: number;
    bullets: any[];
    bulletDelayAccumulator: number;
    score: number;
    constructor() {
      super(
        spriteSheetImg,
        PLAYER_CLIP_RECT,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT - 70,
      );
      this.scale.set(0.85, 0.85);
      this.lives = 3;
      this.xVel = 0;
      this.bullets = [];
      this.bulletDelayAccumulator = 0;
      this.score = 0;
    }

    reset() {
      this.lives = 3;
      this.score = 0;
      this.position.set(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 70);
    }

    shoot() {
      const bullet = new Bullet(
        this.position.x,
        this.position.y - this.bounds.h / 2,
        1,
        1000,
      );
      this.bullets.push(bullet);
      playSound("shoot");
    }

    handleInput() {
      if (isKeyDown(LEFT_KEY)) {
        this.xVel = -175;
      } else if (isKeyDown(RIGHT_KEY)) {
        this.xVel = 175;
      } else this.xVel = 0;

      if (wasKeyPressed(SHOOT_KEY)) {
        if (this.bulletDelayAccumulator > 0.5) {
          this.shoot();
          this.bulletDelayAccumulator = 0;
        }
      }
    }

    updateBullets(dt: number) {
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        let bullet = this.bullets[i];
        if (bullet.alive) {
          bullet.update(dt);
        } else {
          this.bullets.splice(i, 1);
          bullet = undefined;
        }
      }
    }

    update(dt: number) {
      // update time passed between shots
      this.bulletDelayAccumulator += dt;

      // apply x vel
      this.position.x += this.xVel * dt;

      // cap player position in screen bounds
      this.position.x = clamp(
        this.position.x,
        this.bounds.w / 2,
        CANVAS_WIDTH - this.bounds.w / 2,
      );
      this.updateBullets(dt);
    }

    draw(resized: boolean) {
      super.draw(resized);

      // draw bullets
      for (let i = 0, len = this.bullets.length; i < len; i++) {
        const bullet = this.bullets[i];
        if (bullet.alive) {
          bullet.draw(resized);
        }
      }
    }
  }

  class Bullet extends BaseSprite {
    direction: number;
    speed: number;
    alive: boolean;

    constructor(x: number, y: number, direction: number, speed: number) {
      super(bulletImg, x, y);
      this.direction = direction;
      this.speed = speed;
      this.alive = true;
    }

    update(dt: number) {
      this.position.y -= this.speed * this.direction * dt;

      if (this.position.y < 0) {
        this.alive = false;
      }
    }

    draw(resized: boolean) {
      super.draw(resized);
    }
  }

  class Enemy extends SheetSprite {
    clipRects: ClipRect[];
    onFirstState: boolean;
    stepDelay: number;
    stepAccumulator: number;
    doShoot: boolean;
    bullet?: Bullet;
    alive: boolean;

    constructor(clipRects: ClipRect[], x: number, y: number) {
      super(spriteSheetImg, clipRects[0], x, y);
      this.clipRects = clipRects;
      this.scale.set(0.5, 0.5);
      this.alive = true;
      this.onFirstState = true;
      this.stepDelay = 1; // try 2 secs to start with...
      this.stepAccumulator = 0;
      this.doShoot = false;
      this.bullet = undefined;
    }

    toggleFrame() {
      this.onFirstState = !this.onFirstState;
      this.clipRect = this.onFirstState ? this.clipRects[0] : this.clipRects[1];
    }

    shoot() {
      this.bullet = new Bullet(
        this.position.x,
        this.position.y + this.bounds.w / 2,
        -1,
        500,
      );
    }

    update(dt: number) {
      this.stepAccumulator += dt;

      if (this.stepAccumulator >= this.stepDelay) {
        if (this.position.x < this.bounds.w / 2 + 20 && alienDirection < 0) {
          updateAlienLogic = true;
        }
        if (
          alienDirection === 1 &&
          this.position.x > CANVAS_WIDTH - this.bounds.w / 2 - 20
        ) {
          updateAlienLogic = true;
        }
        if (this.position.y > CANVAS_WIDTH - 50) {
          reset();
        }

        const fireTest = Math.floor(Math.random() * (this.stepDelay + 1));
        if (getRandomArbitrary(0, 1000) <= 5 * (this.stepDelay + 1)) {
          this.doShoot = true;
        }
        this.position.x += 10 * alienDirection;
        this.toggleFrame();
        this.stepAccumulator = 0;
      }
      this.position.y += alienYDown;

      if (this.bullet && this.bullet.alive) {
        this.bullet.update(dt);
      } else {
        this.bullet = undefined;
      }
    }

    draw(resized: boolean) {
      super.draw(resized);
      if (this.bullet !== undefined && this.bullet.alive) {
        this.bullet.draw(resized);
      }
    }
  }

  class ParticleExplosion {
    particlePool: any[];
    particles: any[];

    constructor() {
      this.particlePool = [];
      this.particles = [];
    }

    draw() {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const particle = this.particles[i];
        particle.moves++;
        particle.x += particle.xunits;
        particle.y += particle.yunits + particle.gravity * particle.moves;
        particle.life--;

        if (particle.life <= 0) {
          if (this.particlePool.length < 100) {
            this.particlePool.push(this.particles.splice(i, 1));
          } else {
            this.particles.splice(i, 1);
          }
        } else {
          ctx.globalAlpha = particle.life / particle.maxLife;
          ctx.fillStyle = particle.color;
          ctx.fillRect(particle.x, particle.y, particle.width, particle.height);
          ctx.globalAlpha = 1;
        }
      }
    }

    createExplosion(
      x: number,
      y: number,
      color: string,
      number: number,
      width: number,
      height: number,
      spd: number,
      grav: number,
      lif: number,
    ) {
      for (let i = 0; i < number; i++) {
        const angle = Math.floor(Math.random() * 360);
        const speed = Math.floor((Math.random() * spd) / 2) + spd;
        const life = Math.floor(Math.random() * lif) + lif / 2;
        const radians = (angle * Math.PI) / 180;
        const xunits = Math.cos(radians) * speed;
        const yunits = Math.sin(radians) * speed;

        if (this.particlePool.length > 0) {
          const tempParticle = this.particlePool.pop();
          tempParticle.x = x;
          tempParticle.y = y;
          tempParticle.xunits = xunits;
          tempParticle.yunits = yunits;
          tempParticle.life = life;
          tempParticle.color = color;
          tempParticle.width = width;
          tempParticle.height = height;
          tempParticle.gravity = grav;
          tempParticle.moves = 0;
          tempParticle.alpha = 1;
          tempParticle.maxLife = life;
          this.particles.push(tempParticle);
        } else {
          this.particles.push({
            x: x,
            y: y,
            xunits: xunits,
            yunits: yunits,
            life: life,
            color: color,
            width: width,
            height: height,
            gravity: grav,
            moves: 0,
            alpha: 1,
            maxLife: life,
          });
        }
      }
    }
  }

  // ###################################################################
  // Initialization functions
  // ###################################################################
  function initCanvas() {
    if (options.canvas) {
      canvas = options.canvas;
    } else {
      const selector = options.selector || "#invaders";
      const el = document.querySelector(selector) || document.body;
      canvas = document.createElement("canvas");
      el.appendChild(canvas);
    }

    // Set canvas properties
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Get Context
    ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

    // turn off image smoothing
    setImageSmoothing(false);

    // create our main sprite sheet img
    spriteSheetImg = new Image();
    spriteSheetImg.src = SPRITE_SHEET_SRC;
    preDrawImages();

    // add event listeners and initially resize
    window.addEventListener("resize", resize);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
  }

  function preDrawImages() {
    const canvas = drawIntoCanvas(2, 8, (ctx) => {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    });
    bulletImg = new Image();
    bulletImg.src = canvas.toDataURL();
  }

  function setImageSmoothing(value: boolean) {
    ctx["imageSmoothingEnabled"] = value;
    // @ts-ignore
    ctx["mozImageSmoothingEnabled"] = value;
    // @ts-ignore
    ctx["oImageSmoothingEnabled"] = value;
    // @ts-ignore
    ctx["webkitImageSmoothingEnabled"] = value;
    // @ts-ignore
    ctx["msImageSmoothingEnabled"] = value;
  }

  function initGame() {
    aliens = [];
    player = new Player();
    particleManager = new ParticleExplosion();
    setupAlienFormation();
    drawBottomHud();
  }

  function setupAlienFormation() {
    alienCount = 0;
    for (let i = 0, len = 5 * 11; i < len; i++) {
      const gridX = i % 11;
      const gridY = Math.floor(i / 11);
      let clipRects: ClipRect[] = [];
      switch (gridY) {
        case 0:
        case 1:
          clipRects = ALIEN_BOTTOM_ROW;
          break;
        case 2:
        case 3:
          clipRects = ALIEN_MIDDLE_ROW;
          break;
        case 4:
          clipRects = ALIEN_TOP_ROW;
          break;
      }
      aliens.push(
        new Enemy(
          clipRects,
          CANVAS_WIDTH / 2 -
            ALIEN_SQUAD_WIDTH / 2 +
            ALIEN_X_MARGIN / 2 +
            gridX * ALIEN_X_MARGIN,
          CANVAS_HEIGHT / 3.25 - gridY * 40,
        ),
      );
      alienCount++;
    }
  }

  function reset() {
    aliens = [];
    setupAlienFormation();
    player.reset();
  }

  function init() {
    initCanvas();
    keyStates = [];
    prevKeyStates = [];
    resize();
  }

  // ###################################################################
  // Helpful input functions
  // ###################################################################
  function isKeyDown(key: number) {
    return keyStates[key];
  }

  function wasKeyPressed(key: number) {
    return !prevKeyStates[key] && keyStates[key];
  }

  // ###################################################################
  // Drawing & Update functions
  // ###################################################################
  function updateAliens(dt: number) {
    if (updateAlienLogic) {
      updateAlienLogic = false;
      alienDirection = -alienDirection;
      alienYDown = 25;
    }

    for (let i = aliens.length - 1; i >= 0; i--) {
      let alien: Enemy | undefined = aliens[i];
      if (!alien.alive) {
        aliens.splice(i, 1);
        alien = undefined;
        alienCount--;
        if (alienCount < 1) {
          wave++;
          setupAlienFormation();
        }
        return;
      }

      alien.stepDelay = (alienCount * 20 - wave * 10) / 1000;
      if (alien.stepDelay <= 0.05) {
        alien.stepDelay = 0.05;
      }
      alien.update(dt);

      if (alien.doShoot) {
        alien.doShoot = false;
        alien.shoot();
        const rand = String(Math.round(Math.random() * 3 + 1)) as
          | "1"
          | "2"
          | "3";
        playSound(`fastinvader${rand}`);
      }
    }
    alienYDown = 0;
  }

  function resolveBulletEnemyCollisions() {
    const bullets = player.bullets;

    for (let i = 0, len = bullets.length; i < len; i++) {
      const bullet = bullets[i];
      for (let j = 0, alen = aliens.length; j < alen; j++) {
        const alien = aliens[j];
        if (checkRectCollision(bullet.bounds, alien.bounds)) {
          alien.alive = bullet.alive = false;
          playSound("invaderkilled");
          particleManager.createExplosion(
            alien.position.x,
            alien.position.y,
            "white",
            70,
            5,
            5,
            3,
            0.15,
            50,
          );
          player.score += 25;
        }
      }
    }
  }

  function resolveBulletPlayerCollisions() {
    for (let i = 0, len = aliens.length; i < len; i++) {
      const alien = aliens[i];
      if (
        alien.bullet &&
        checkRectCollision(alien.bullet.bounds, player.bounds)
      ) {
        if (player.lives === 0) {
          hasGameStarted = false;
        } else {
          playSound("explosion");
          alien.bullet.alive = false;
          particleManager.createExplosion(
            player.position.x,
            player.position.y,
            "green",
            100,
            8,
            8,
            6,
            0.001,
            40,
          );
          player.position.set(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 70);
          player.lives--;
          break;
        }
      }
    }
  }

  function resolveCollisions() {
    resolveBulletEnemyCollisions();
    resolveBulletPlayerCollisions();
  }

  function updateGame(dt: number) {
    player.handleInput();
    prevKeyStates = keyStates.slice();
    player.update(dt);
    updateAliens(dt);
    resolveCollisions();
  }

  function drawIntoCanvas(
    width: number,
    height: number,
    drawFunc: (ctx: CanvasRenderingContext2D) => void,
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    drawFunc(ctx);
    return canvas;
  }

  function fillText(
    text: string,
    x: number,
    y: number,
    color?: string,
    fontSize?: number,
  ) {
    if (typeof color !== "undefined") ctx.fillStyle = color;
    if (typeof fontSize !== "undefined") ctx.font = fontSize + "px Play";
    ctx.fillText(text, x, y);
  }

  function fillCenteredText(
    text: string,
    x: number,
    y: number,
    color?: string,
    fontSize?: number,
  ) {
    const metrics = ctx.measureText(text);
    fillText(text, x - metrics.width / 2, y, color, fontSize);
  }

  function fillBlinkingText(
    text: string,
    x: number,
    y: number,
    blinkFreq: number,
    color?: string,
    fontSize?: number,
  ) {
    if (~~(0.5 + Date.now() / blinkFreq) % 2) {
      fillCenteredText(text, x, y, color, fontSize);
    }
  }

  function drawBottomHud() {
    ctx.fillStyle = "#02ff12";
    ctx.fillRect(0, CANVAS_HEIGHT - 30, CANVAS_WIDTH, 2);
    fillText(player.lives + " x ", 10, CANVAS_HEIGHT - 7.5, "white", 20);
    ctx.drawImage(
      spriteSheetImg,
      player.clipRect.x,
      player.clipRect.y,
      player.clipRect.w,
      player.clipRect.h,
      45,
      CANVAS_HEIGHT - 23,
      player.clipRect.w * 0.5,
      player.clipRect.h * 0.5,
    );
    fillText("CREDIT: ", CANVAS_WIDTH - 115, CANVAS_HEIGHT - 7.5);
    fillCenteredText("SCORE: " + player.score, CANVAS_WIDTH / 2, 20);
    fillBlinkingText(
      "00",
      CANVAS_WIDTH - 25,
      CANVAS_HEIGHT - 7.5,
      TEXT_BLINK_FREQ,
    );
  }

  function drawAliens(resized: boolean) {
    for (let i = 0; i < aliens.length; i++) {
      const alien = aliens[i];
      alien.draw(resized);
    }
  }

  function drawGame(resized: boolean) {
    player.draw(resized);
    drawAliens(resized);
    particleManager.draw();
    drawBottomHud();
  }

  function drawStartScreen() {
    fillCenteredText(
      "Space Invaders",
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2.75,
      "#FFFFFF",
      36,
    );
    fillBlinkingText(
      "Press enter to play!",
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      500,
      "#FFFFFF",
      36,
    );
  }

  function animate() {
    const now = window.performance.now();
    let dt = now - lastTime;
    if (dt > 100) dt = 100;
    if (wasKeyPressed(13) && !hasGameStarted) {
      initGame();
      hasGameStarted = true;
    }

    if (hasGameStarted) {
      updateGame(dt / 1000);
    }

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (hasGameStarted) {
      drawGame(false);
    } else {
      drawStartScreen();
    }
    lastTime = now;
    requestAnimationFrame(animate);
  }

  // ###################################################################
  // Event Listener functions
  // ###################################################################
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // calculate the scale factor to keep a correct aspect ratio
    const scaleFactor = Math.min(w / CANVAS_WIDTH, h / CANVAS_HEIGHT);

    if (IS_CHROME) {
      canvas.width = CANVAS_WIDTH * scaleFactor;
      canvas.height = CANVAS_HEIGHT * scaleFactor;
      setImageSmoothing(false);
      ctx.transform(scaleFactor, 0, 0, scaleFactor, 0, 0);
    } else {
      // resize the canvas css properties
      canvas.style.width = CANVAS_WIDTH * scaleFactor + "px";
      canvas.style.height = CANVAS_HEIGHT * scaleFactor + "px";
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    e.preventDefault();
    keyStates[e.keyCode] = true;
  }

  function onKeyUp(e: KeyboardEvent) {
    e.preventDefault();
    keyStates[e.keyCode] = false;
  }

  // ###################################################################
  // Touch Support
  // ###################################################################
  type TouchPos = { x: number; y: number };
  let touchStart: TouchPos;

  document.addEventListener("touchstart", (e) => {
    touchStart = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    if (hasGameStarted) {
      player.shoot();
    } else {
      initGame();
      hasGameStarted = true;
    }
  });

  document.addEventListener("touchmove", (e) => {
    const touchCurrent = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    const deltaX = touchCurrent.x - touchStart.x;
    if (deltaX > 0) {
      keyStates[RIGHT_KEY] = true;
      keyStates[LEFT_KEY] = false;
    } else if (deltaX < 0) {
      keyStates[LEFT_KEY] = true;
      keyStates[RIGHT_KEY] = false;
    }
  });

  document.addEventListener("touchend", (e) => {
    keyStates[LEFT_KEY] = false;
    keyStates[RIGHT_KEY] = false;
  });

  // ###################################################################
  // Start game!
  // ###################################################################
  const styleEl = document.createElement("link");
  styleEl.rel = "stylesheet";
  styleEl.href = "https://fonts.googleapis.com/css?family=Play:400,700";

  document.head.appendChild(styleEl);

  init();
  animate();

  // ###################################################################
  // Sounds
  // ###################################################################
  const soundSprite = {
    shoot: [0, 350],
    explosion: [400, 775],
    invaderkilled: [1150, 350],
    fastinvader1: [1550, 100],
    fastinvader2: [1650, 100],
    fastinvader3: [1750, 100],
  } as const;

  const audio = new Audio(getSoundData());
  let audioStopTime: number | undefined;
  let audioStopTimeout: ReturnType<typeof setTimeout> | undefined;
  audio.addEventListener("timeupdate", () => {
    if (audioStopTime && audio.currentTime >= audioStopTime) {
      audio.pause();
    }
  });

  async function playSound(name: keyof typeof soundSprite) {
    if (audioStopTimeout) {
      clearTimeout(audioStopTimeout);
    }
    audio.pause();
    const [start, len] = soundSprite[name];
    audio.currentTime = start / 1000;
    audioStopTime = (start + len) / 1000;
    audio.play();
    audioStopTimeout = setTimeout(() => {
      audio.pause();
    }, len);
  }
}

function getSoundData() {
  return "data:audio/ogg;base64,T2dnUwACAAAAAAAAAAA79qUjAAAAAF92vQgBHgF2b3JiaXMAAAAAARErAAAAAAAAuIgAAAAAAACZAU9nZ1MAAAAAAAAAAAAAO/alIwEAAABJpEEXCy3///////////+1A3ZvcmJpcx0AAABYaXBoLk9yZyBsaWJWb3JiaXMgSSAyMDA3MDYyMgAAAAABBXZvcmJpcxJCQ1YBAAABAAxSFCElGVNKYwiVUlIpBR1jUFtHHWPUOUYhZBBTiEkZpXtPKpVYSsgRUlgpRR1TTFNJlVKWKUUdYxRTSCFT1jFloXMUS4ZJCSVsTa50FkvomWOWMUYdY85aSp1j1jFFHWNSUkmhcxg6ZiVkFDpGxehifDA6laJCKL7H3lLpLYWKW4q91xpT6y2EGEtpwQhhc+211dxKasUYY4wxxsXiUyiC0JBVAAABAABABAFCQ1YBAAoAAMJQDEVRgNCQVQBABgCAABRFcRTHcRxHkiTLAkJDVgEAQAAAAgAAKI7hKJIjSZJkWZZlWZameZaouaov+64u667t6roOhIasBADIAAAYhiGH3knMkFOQSSYpVcw5CKH1DjnlFGTSUsaYYoxRzpBTDDEFMYbQKYUQ1E45pQwiCENInWTOIEs96OBi5zgQGrIiAIgCAACMQYwhxpBzDEoGIXKOScggRM45KZ2UTEoorbSWSQktldYi55yUTkompbQWUsuklNZCKwUAAAQ4AAAEWAiFhqwIAKIAABCDkFJIKcSUYk4xh5RSjinHkFLMOcWYcowx6CBUzDHIHIRIKcUYc0455iBkDCrmHIQMMgEAAAEOAAABFkKhISsCgDgBAIMkaZqlaaJoaZooeqaoqqIoqqrleabpmaaqeqKpqqaquq6pqq5seZ5peqaoqp4pqqqpqq5rqqrriqpqy6ar2rbpqrbsyrJuu7Ks256qyrapurJuqq5tu7Js664s27rkearqmabreqbpuqrr2rLqurLtmabriqor26bryrLryratyrKua6bpuqKr2q6purLtyq5tu7Ks+6br6rbqyrquyrLu27au+7KtC7vourauyq6uq7Ks67It67Zs20LJ81TVM03X9UzTdVXXtW3VdW1bM03XNV1XlkXVdWXVlXVddWVb90zTdU1XlWXTVWVZlWXddmVXl0XXtW1Vln1ddWVfl23d92VZ133TdXVblWXbV2VZ92Vd94VZt33dU1VbN11X103X1X1b131htm3fF11X11XZ1oVVlnXf1n1lmHWdMLqurqu27OuqLOu+ruvGMOu6MKy6bfyurQvDq+vGseu+rty+j2rbvvDqtjG8um4cu7Abv+37xrGpqm2brqvrpivrumzrvm/runGMrqvrqiz7uurKvm/ruvDrvi8Mo+vquirLurDasq/Lui4Mu64bw2rbwu7aunDMsi4Mt+8rx68LQ9W2heHVdaOr28ZvC8PSN3a+AACAAQcAgAATykChISsCgDgBAAYhCBVjECrGIIQQUgohpFQxBiFjDkrGHJQQSkkhlNIqxiBkjknIHJMQSmiplNBKKKWlUEpLoZTWUmotptRaDKG0FEpprZTSWmopttRSbBVjEDLnpGSOSSiltFZKaSlzTErGoKQOQiqlpNJKSa1lzknJoKPSOUippNJSSam1UEproZTWSkqxpdJKba3FGkppLaTSWkmptdRSba21WiPGIGSMQcmck1JKSamU0lrmnJQOOiqZg5JKKamVklKsmJPSQSglg4xKSaW1kkoroZTWSkqxhVJaa63VmFJLNZSSWkmpxVBKa621GlMrNYVQUgultBZKaa21VmtqLbZQQmuhpBZLKjG1FmNtrcUYSmmtpBJbKanFFluNrbVYU0s1lpJibK3V2EotOdZaa0ot1tJSjK21mFtMucVYaw0ltBZKaa2U0lpKrcXWWq2hlNZKKrGVklpsrdXYWow1lNJiKSm1kEpsrbVYW2w1ppZibLHVWFKLMcZYc0u11ZRai621WEsrNcYYa2415VIAAMCAAwBAgAlloNCQlQBAFAAAYAxjjEFoFHLMOSmNUs45JyVzDkIIKWXOQQghpc45CKW01DkHoZSUQikppRRbKCWl1losAACgwAEAIMAGTYnFAQoNWQkARAEAIMYoxRiExiClGIPQGKMUYxAqpRhzDkKlFGPOQcgYc85BKRljzkEnJYQQQimlhBBCKKWUAgAAChwAAAJs0JRYHKDQkBUBQBQAAGAMYgwxhiB0UjopEYRMSielkRJaCylllkqKJcbMWomtxNhICa2F1jJrJcbSYkatxFhiKgAA7MABAOzAQig0ZCUAkAcAQBijFGPOOWcQYsw5CCE0CDHmHIQQKsaccw5CCBVjzjkHIYTOOecghBBC55xzEEIIoYMQQgillNJBCCGEUkrpIIQQQimldBBCCKGUUgoAACpwAAAIsFFkc4KRoEJDVgIAeQAAgDFKOSclpUYpxiCkFFujFGMQUmqtYgxCSq3FWDEGIaXWYuwgpNRajLV2EFJqLcZaQ0qtxVhrziGl1mKsNdfUWoy15tx7ai3GWnPOuQAA3AUHALADG0U2JxgJKjRkJQCQBwBAIKQUY4w5h5RijDHnnENKMcaYc84pxhhzzjnnFGOMOeecc4wx55xzzjnGmHPOOeecc84556CDkDnnnHPQQeicc845CCF0zjnnHIQQCgAAKnAAAAiwUWRzgpGgQkNWAgDhAACAMZRSSimllFJKqKOUUkoppZRSAiGllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimllFJKKaWUUkoppZRSSimVUkoppZRSSimllFJKKaUAIN8KBwD/BxtnWEk6KxwNLjRkJQAQDgAAGMMYhIw5JyWlhjEIpXROSkklNYxBKKVzElJKKYPQWmqlpNJSShmElGILIZWUWgqltFZrKam1lFIoKcUaS0qppdYy5ySkklpLrbaYOQelpNZaaq3FEEJKsbXWUmuxdVJSSa211lptLaSUWmstxtZibCWlllprqcXWWkyptRZbSy3G1mJLrcXYYosxxhoLAOBucACASLBxhpWks8LR4EJDVgIAIQEABDJKOeecgxBCCCFSijHnoIMQQgghREox5pyDEEIIIYSMMecghBBCCKGUkDHmHIQQQgghhFI65yCEUEoJpZRSSucchBBCCKWUUkoJIYQQQiillFJKKSGEEEoppZRSSiklhBBCKKWUUkoppYQQQiillFJKKaWUEEIopZRSSimllBJCCKGUUkoppZRSQgillFJKKaWUUkooIYRSSimllFJKCSWUUkoppZRSSikhlFJKKaWUUkoppQAAgAMHAIAAI+gko8oibDThwgMQAAAAAgACTACBAYKCUQgChBEIAAAAAAAIAPgAAEgKgIiIaOYMDhASFBYYGhweICIkAAAAAAAAAAAAAAAABE9nZ1MAAAAmAAAAAAAAO/alIwIAAACNn16AJ2p4cnF0fXRzd3RsaXNscW1wZWhmY2pqamhoZWlmZWVoZGNmZ2dkatqsV9/ryZFxWDrAwiAkXGj8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";
}

