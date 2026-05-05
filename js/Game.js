import { VisionSystem } from './VisionSystem.js';
import { NPC } from './entities/NPC.js';
import { RandomAI } from './ai/RandomAI.js';
import { JumpscareManager } from './effects/JumpscareManager.js';
import { GroundText } from './effects/GroundText.js';
import { HeartParticles } from './effects/HeartParticles.js';
import { ItemSpawner } from './ItemSpawner.js';
import { ItemEffects } from './ItemEffects.js';
import { Tombstone } from './entities/Tombstone.js';
import { Ghost } from './entities/Ghost.js';

const MAX_OUT_OF_VISION_MS = 6000;
const WARNING_THRESHOLD_MS = 2000;
const VISION_RADIUS_RATIO = 0.18;
const VISION_RADIUS_MIN = 100;
const LOVE_MIN_RADIUS = 35;
const LOVE_SLOWDOWN = 0.7;
const POST_LOVE_HOLD = 3.0;
const TOMBSTONE_SPAWN_MIN = 3; // seconds
const TOMBSTONE_SPAWN_MAX = 5;
const MAX_TOMBSTONES = 5;
const GHOST_TIMER_PENALTY = 500; // ms added to failure timer if ghost explodes in vision

export class Game {
  constructor(app) {
    this.app = app;
    this.state = 'playing';

    // Raw input position
    this.rawMouseX = app.screen.width / 2;
    this.rawMouseY = app.screen.height / 2;
    this._prevRawX = this.rawMouseX;
    this._prevRawY = this.rawMouseY;

    // Effective vision position (after modifiers / drift)
    this.mouseX = this.rawMouseX;
    this.mouseY = this.rawMouseY;

    this.visionRadius = Math.max(VISION_RADIUS_MIN, Math.min(app.screen.width, app.screen.height) * VISION_RADIUS_RATIO);

    this.outOfVisionTimer = 0;
    this._warningFlicker = 0;

    // Love / post-love
    this._inLove = false;
    this._postLoveTimer = 0;
    this._loveSpawnedText = false;
    this._loveTextDelay = 0;
    this._initialTextSpawned = false;
    this._initialTextTimer = 1.2;
    this._startDelay = 1.0; // NPC frozen for 1s at game start

    // Effects state
    this._mouseModifiers = [];
    this._visionDrift = null;
    this._flyingItems = [];

    // Tombstones & ghosts
    this.tombstones = [];
    this.ghosts = [];
    this.bloodSplatters = [];
    this._tombstoneTimer = TOMBSTONE_SPAWN_MIN + Math.random() * (TOMBSTONE_SPAWN_MAX - TOMBSTONE_SPAWN_MIN);

    this._buildLayers();
    this._setupInput();
    this._setupResize();

    this.vision = new VisionSystem(this.app, this.layers.overlay, this.mouseX, this.mouseY, this.visionRadius);
    this.npc = new NPC(this.app.screen.width / 2, this.app.screen.height / 2);
    this.layers.npcLayer.addChild(this.npc.display);

    this.groundText = new GroundText(this.layers.groundTextLayer, this.layers.groundTextOverlay);
    this.hearts = new HeartParticles(this.layers.particleLayer);

    this.itemSpawner = new ItemSpawner(this.app, this.groundText);
    this.itemEffects = new ItemEffects();

    this.ai = new RandomAI();
    this.jumpscare = new JumpscareManager(this.app, this.layers.jumpscareLayer, () => this.restart());

    this._setupTimerDisplay();

    this.app.ticker.add((delta) => this._update(delta));
  }

  // ---- Layers ----

  _buildLayers() {
    this.layers = {};
    this.layers.background = new PIXI.Container();
    this.layers.groundTextLayer = new PIXI.Container();
    this.layers.bloodLayer = new PIXI.Container();
    this.layers.tombstoneLayer = new PIXI.Container();
    this.layers.ghostLayer = new PIXI.Container();
    this.layers.itemLayer = new PIXI.Container();
    this.layers.npcLayer = new PIXI.Container();
    this.layers.particleLayer = new PIXI.Container();
    this.layers.overlay = new PIXI.Container();
    this.layers.groundTextOverlay = new PIXI.Container();
    this.layers.jumpscareLayer = new PIXI.Container();
    this.layers.uiLayer = new PIXI.Container();

    const bg = new PIXI.Graphics();
    bg.beginFill(0x0a0a0a);
    bg.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
    bg.endFill();
    this.layers.background.addChild(bg);

    this.app.stage.addChild(this.layers.background);
    this.app.stage.addChild(this.layers.bloodLayer);
    this.app.stage.addChild(this.layers.groundTextLayer);
    this.app.stage.addChild(this.layers.tombstoneLayer);
    this.app.stage.addChild(this.layers.ghostLayer);
    this.app.stage.addChild(this.layers.itemLayer);
    this.app.stage.addChild(this.layers.npcLayer);
    this.app.stage.addChild(this.layers.particleLayer);
    this.app.stage.addChild(this.layers.overlay);
    this.app.stage.addChild(this.layers.groundTextOverlay);
    this.app.stage.addChild(this.layers.jumpscareLayer);
    this.app.stage.addChild(this.layers.uiLayer);
  }

  // ---- Input ----

  _setupInput() {
    const setRaw = (cx, cy) => {
      const rect = this.app.view.getBoundingClientRect();
      this.rawMouseX = (cx - rect.left) * (this.app.screen.width / rect.width);
      this.rawMouseY = (cy - rect.top) * (this.app.screen.height / rect.height);
    };

    this.app.view.addEventListener('mousemove', (e) => setRaw(e.clientX, e.clientY));
    this.app.view.addEventListener('touchmove', (e) => {
      e.preventDefault();
      setRaw(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    this.app.view.addEventListener('touchstart', (e) => {
      e.preventDefault();
      setRaw(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
  }

  // ---- Resize ----

  _setupResize() {
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.app.renderer.resize(w, h);
      this.visionRadius = Math.max(VISION_RADIUS_MIN, Math.min(w, h) * VISION_RADIUS_RATIO);
      const keepRadius = (this._inLove || this._postLoveTimer > 0);
      this.vision.resize(w, h, keepRadius ? this.vision.currentRadius : this.visionRadius);

      this.layers.background.removeChildren();
      const bg = new PIXI.Graphics();
      bg.beginFill(0x0a0a0a);
      bg.drawRect(0, 0, w, h);
      bg.endFill();
      this.layers.background.addChild(bg);
    });
  }

  _setupTimerDisplay() {
    // Dark bar behind timer
    this.timerBg = new PIXI.Graphics();
    this.layers.uiLayer.addChild(this.timerBg);

    this.timerText = new PIXI.Text('', {
      fontFamily: 'Courier New, monospace',
      fontSize: 28,
      fill: '#ff3333',
      fontWeight: 'bold',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.timerText.alpha = 0.85;
    this.timerText.anchor.set(0.5, 0);
    this.layers.uiLayer.addChild(this.timerText);
  }

  // ---- Main update ----

  _update(delta) {
    if (this.state !== 'playing') return;

    const dt = delta / 60;
    const dtMs = dt * 1000;

    // --- Compute effective mouse position ---
    this._updateMousePosition(dt);

    // --- Initial message ---
    if (!this._initialTextSpawned) {
      this._initialTextTimer -= dt;
      if (this._initialTextTimer <= 0) {
        this.groundText.spawn('达令，你要永远注视着我哦', this.npc.x, this.npc.y - 30,
          { fontSize: 26, duration: 3000, visibleOutsideVision: true });
        this._initialTextSpawned = true;
      }
    }

    // --- Post-love countdown ---
    if (this._postLoveTimer > 0) {
      this._postLoveTimer -= dt;
      if (this._postLoveTimer <= 0) {
        this._postLoveTimer = 0;
        this.vision.setTargetRadius(this.visionRadius);
      }
    }

    // --- Item spawning ---
    this.itemSpawner.update(dt, dtMs, this.mouseX, this.mouseY, this.vision.currentRadius);
    this._updateItems(dt);

    // --- Item effects ---
    this.itemEffects.update(dt, this);

    // --- Tombstone spawning ---
    this._updateTombstones(dt, dtMs);

    // --- Ghost updates ---
    this._updateGhosts(dt);

    // --- Gather nearest item positions for AI ---
    const items = this.itemSpawner.getItems();
    const itemPositions = items.map(i => ({ x: i.x, y: i.y, type: i.type }));

    // --- Update AI (frozen during start delay) ---
    if (this._startDelay > 0) {
      this._startDelay -= dt;
    } else {
      const context = {
        worldState: {
          playerX: this.mouseX,
          playerY: this.mouseY,
          visionRadius: this.vision.currentRadius,
          screenW: this.app.screen.width,
          screenH: this.app.screen.height,
        },
        items: itemPositions,
      };
      this.ai.update(this.npc, dt, context);
    }

    // Clamp NPC
    this.npc.x = Math.max(20, Math.min(this.app.screen.width - 20, this.npc.x));
    this.npc.y = Math.max(20, Math.min(this.app.screen.height - 20, this.npc.y));
    this.npc.display.x = this.npc.x;
    this.npc.display.y = this.npc.y;

    // --- Love state ---
    this._handleLoveState(dt, dtMs);

    // --- Vision ---
    this.vision.update(this.mouseX, this.mouseY);

    // --- Effects ---
    this.groundText.update(dtMs);
    this.hearts.update(dtMs);

    // --- NPC visibility & timer ---
    const npcInVision = this.vision.isInVision(this.npc.x, this.npc.y);
    if (!npcInVision) {
      const rate = this._inLove ? LOVE_SLOWDOWN : 1.0;
      this.outOfVisionTimer += dtMs * rate;
      this.npc.setVisible(false);
    } else {
      // Timer does NOT auto-reset — it stays frozen while NPC is in vision
      this.npc.setVisible(true);
    }

    this._updateTimerUI();

    if (this.outOfVisionTimer >= MAX_OUT_OF_VISION_MS) {
      this._endGame();
    }
  }

  // ---- Mouse position with modifiers / drift ----

  _updateMousePosition(dt) {
    // Compute raw delta
    let dX = this.rawMouseX - this._prevRawX;
    let dY = this.rawMouseY - this._prevRawY;
    this._prevRawX = this.rawMouseX;
    this._prevRawY = this.rawMouseY;

    // Apply portrait modifiers (axis swap / invert)
    for (const mod of this._mouseModifiers) {
      if (mod.type === 'portrait') {
        let ndX = dX, ndY = dY;
        if (mod.swap) { ndX = dY; ndY = dX; }
        ndX *= mod.scaleX;
        ndY *= mod.scaleY;
        dX = ndX;
        dY = ndY;
      }
    }

    // Target = current + modified delta
    let targetX = this.mouseX + dX;
    let targetY = this.mouseY + dY;

    // Clamp
    targetX = Math.max(0, Math.min(this.app.screen.width, targetX));
    targetY = Math.max(0, Math.min(this.app.screen.height, targetY));

    // Bottle drift
    let lerpSpeed = 1.0; // instant by default
    if (this._visionDrift) {
      lerpSpeed = 0.18; // moderate delay, less pull than before
      targetX += this._visionDrift.driftX;
      targetY += this._visionDrift.driftY;
    }

    // Smooth follow
    this.mouseX += (targetX - this.mouseX) * lerpSpeed;
    this.mouseY += (targetY - this.mouseY) * lerpSpeed;
    this.mouseX = Math.max(0, Math.min(this.app.screen.width, this.mouseX));
    this.mouseY = Math.max(0, Math.min(this.app.screen.height, this.mouseY));
  }

  // ---- Items ----

  _updateItems(dt) {
    const items = this.itemSpawner.getItems();
    for (const item of items) {
      if (!item.active) continue;

      // Add to display if new
      if (!item.display.parent) {
        this.layers.itemLayer.addChild(item.display);
      }

      const inVision = this.vision.isInVision(item.x, item.y);
      item.setVisible(inVision);

      const result = item.update(dt, inVision);
      if (result === 'activate') {
        const ctx = { game: this, spawner: this.itemSpawner, app: this.app };
        this.itemEffects.activate(item, ctx);

        // Remove item from scene
        if (item.display.parent) {
          item.display.parent.removeChild(item.display);
        }
        this.itemSpawner.removeItem(item);
      }
    }
  }

  // ---- Tombstones ----

  _updateTombstones(dt, dtMs) {
    // Spawning
    this._tombstoneTimer -= dt;
    if (this._tombstoneTimer <= 0 && this.tombstones.length < MAX_TOMBSTONES) {
      this._tombstoneTimer = TOMBSTONE_SPAWN_MIN + Math.random() * (TOMBSTONE_SPAWN_MAX - TOMBSTONE_SPAWN_MIN);
      const pos = this._findTombstonePos();
      if (pos) {
        const t = new Tombstone(pos.x, pos.y);
        this.tombstones.push(t);
        this.layers.tombstoneLayer.addChild(t.display);
        this.groundText.spawn('安息吧', pos.x, pos.y + 10,
          { fontSize: 18, duration: 1800, visibleOutsideVision: true });
      }
    }

    // Update existing tombstones
    for (let i = this.tombstones.length - 1; i >= 0; i--) {
      const t = this.tombstones[i];
      if (!t.active) continue;

      const inVision = this.vision.isInVision(t.x, t.y);
      t.setVisible(inVision);

      const result = t.update(dt, inVision);
      if (result === 'activate') {
        // Remove tombstone, spawn ghost
        if (t.display.parent) t.display.parent.removeChild(t.display);
        this.tombstones.splice(i, 1);
        this._spawnGhost(t.x, t.y);
      }
    }
  }

  _findTombstonePos() {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const m = 40;
    for (let i = 0; i < 25; i++) {
      const x = m + Math.random() * (w - m * 2);
      const y = m + Math.random() * (h - m * 2);
      const dvx = x - this.mouseX;
      const dvy = y - this.mouseY;
      if (Math.sqrt(dvx * dvx + dvy * dvy) < this.vision.currentRadius + 30) continue;
      let tooClose = false;
      for (const t of this.tombstones) {
        const dx = x - t.x;
        const dy = y - t.y;
        if (Math.sqrt(dx * dx + dy * dy) < 70) { tooClose = true; break; }
      }
      if (!tooClose) return { x, y };
    }
    return null;
  }

  _spawnGhost(x, y) {
    const ghost = new Ghost(x, y);
    this.ghosts.push(ghost);
    this.layers.ghostLayer.addChild(ghost.display);
  }

  // ---- Ghosts ----

  _updateGhosts(dt) {
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const g = this.ghosts[i];
      if (g.state === 'dead') {
        if (g.display.parent) g.display.parent.removeChild(g.display);
        this.ghosts.splice(i, 1);
        continue;
      }

      const result = g.update(dt, this.mouseX, this.mouseY,
        this.vision.currentRadius, this.mouseX, this.mouseY);

      // Ghost visible only in vision (seeking ghosts are invisible until in vision)
      const inVision = this.vision.isInVision(g.x, g.y);
      g.setVisible(inVision || g.state === 'attacking' || g.state === 'exploding');

      if (result && result.type === 'ghostExplode') {
        this._handleGhostExplosion(g, result);
      }
    }
  }

  _handleGhostExplosion(ghost, result) {
    // Blood splatter
    const splatter = new PIXI.Graphics();
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 25;
      const sx = ghost.x + Math.cos(angle) * dist;
      const sy = ghost.y + Math.sin(angle) * dist;
      splatter.beginFill(0x990000, 0.7);
      splatter.drawEllipse(sx, sy, 4 + Math.random() * 6, 2 + Math.random() * 4);
      splatter.endFill();
    }
    // Central pool
    splatter.beginFill(0x770000, 0.5);
    splatter.drawEllipse(ghost.x, ghost.y, 14, 8);
    splatter.endFill();
    this.layers.bloodLayer.addChild(splatter);
    this.bloodSplatters.push(splatter);

    // Penalty if explosion happened in vision
    if (result.inVision) {
      this.outOfVisionTimer += GHOST_TIMER_PENALTY;
    }

    // Remove ghost
    ghost.state = 'dead';
  }

  // ---- Love state ----
    if (this.npc._loveJustStarted) {
      this.npc._loveJustStarted = false;
      this._inLove = true;
      this._postLoveTimer = 0;
      this._loveSpawnedText = false;
      this._loveTextDelay = 0;

      this.vision.setGlowColor(0xff6699, 0.45);
      this.hearts.start(this.npc.x, this.npc.y - 10);
    }

    if (!this._inLove) return;

    this.hearts.setPosition(this.npc.x, this.npc.y - 10);

    if (!this._loveSpawnedText) {
      this._loveTextDelay += dt;
      if (this._loveTextDelay > 0.5) {
        this.groundText.spawn('看着我', this.npc.x, this.npc.y - 30,
          { fontSize: 28, duration: 2500, visibleOutsideVision: true });
        this._loveSpawnedText = true;
        this._loveTextDelay = 0;
      }
    }

    if (this.vision.isInVision(this.npc.x, this.npc.y)) {
      const ct = this.vision.targetRadius;
      this.vision.setTargetRadius(Math.max(LOVE_MIN_RADIUS, ct - 22 * dt));
    }

    if (this.npc._loveEnded) {
      this.npc._loveEnded = false;
      this._inLove = false;
      this._loveTextDelay = 0;
      this.vision.setGlowColor(0x333333, 0.25);
      this._postLoveTimer = POST_LOVE_HOLD;
      this.hearts.stop();
    }
  }

  // ---- Timer UI ----

  _updateTimerUI() {
    const remaining = Math.max(0, MAX_OUT_OF_VISION_MS - this.outOfVisionTimer);
    const seconds = (remaining / 1000).toFixed(1);
    const cx = this.app.screen.width / 2;

    this.timerText.text = `离开视野: ${seconds}s`;
    this.timerText.x = cx;
    this.timerText.y = 14;

    // Background bar
    const barW = 260;
    const barH = 44;
    this.timerBg.clear();
    this.timerBg.beginFill(0x000000, 0.55);
    this.timerBg.drawRoundedRect(cx - barW / 2, 8, barW, barH, 6);
    this.timerBg.endFill();

    if (remaining <= WARNING_THRESHOLD_MS && remaining > 0) {
      this._warningFlicker += 0.1;
      const flick = Math.sin(this._warningFlicker * 8) * 0.5 + 0.5;
      this.timerText.alpha = 0.6 + flick * 0.4;
      this.timerText.style.fill = flick > 0.5 ? '#ff0000' : '#ff6666';
      this.timerText.style.fontSize = flick > 0.5 ? 34 : 30;
    } else {
      this.timerText.alpha = 0.85;
      this.timerText.style.fontSize = 28;
      this.timerText.style.fill = '#ff3333';
    }

    if (this._inLove && remaining > WARNING_THRESHOLD_MS) {
      this.timerText.style.fill = '#ff6699';
    }
  }

  _endGame() {
    this.state = 'gameover';
    this.timerText.visible = false;
    this.timerBg.visible = false;
    this.npc.setVisible(false);
    this.hearts.stop();
    this.jumpscare.trigger();
  }

  // ---- Restart ----

  restart() {
    this.state = 'playing';
    this.outOfVisionTimer = 0;
    this._warningFlicker = 0;
    this._inLove = false;
    this._postLoveTimer = 0;
    this._loveSpawnedText = false;
    this._loveTextDelay = 0;
    this._initialTextSpawned = false;
    this._initialTextTimer = 1.2;
    this._startDelay = 1.0;

    // Reset mouse state
    this.rawMouseX = this.app.screen.width / 2;
    this.rawMouseY = this.app.screen.height / 2;
    this._prevRawX = this.rawMouseX;
    this._prevRawY = this.rawMouseY;
    this.mouseX = this.rawMouseX;
    this.mouseY = this.rawMouseY;

    // Clean NPC
    this.npc.inLoveState = false;
    this.npc._loveJustStarted = false;
    this.npc._loveEnded = false;
    this.npc.loveTimer = undefined;
    this.npc.x = this.app.screen.width / 2;
    this.npc.y = this.app.screen.height / 2;
    this.npc.display.x = this.npc.x;
    this.npc.display.y = this.npc.y;
    this.npc.setVisible(true);
    this.timerText.visible = true;
    this.timerBg.visible = true;

    // Reset vision
    this.vision.reset();
    this.vision.setTargetRadius(this.visionRadius);
    this.vision.setGlowColor(0x333333, 0.25);

    // Reset effects
    this.itemEffects.clear(this);
    this._mouseModifiers = [];
    this._visionDrift = null;
    this._flyingItems = [];

    // Reset items
    this.itemSpawner.clear();
    this.layers.itemLayer.removeChildren();

    // Reset tombstones & ghosts
    this.tombstones = [];
    this.ghosts = [];
    this.bloodSplatters = [];
    this._tombstoneTimer = TOMBSTONE_SPAWN_MIN + Math.random() * (TOMBSTONE_SPAWN_MAX - TOMBSTONE_SPAWN_MIN);
    this.layers.tombstoneLayer.removeChildren();
    this.layers.ghostLayer.removeChildren();
    this.layers.bloodLayer.removeChildren();

    // Reset texts & particles
    this.groundText.clear();
    this.hearts.clear();
  }
}
