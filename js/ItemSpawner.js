import { Item } from './entities/Item.js';

const SPAWN_MIN = 5;  // seconds
const SPAWN_MAX = 8;
const MAX_ITEMS = 10;
const MIN_DIST_BETWEEN = 80;
const MIN_DIST_FROM_VISION = 30; // extra padding outside vision

// Horror texts that appear when items spawn
const SPAWN_TEXTS = [
  '嘻嘻', '的的的的的', '看看看', '找到你了',
  '来玩吧', '别走', '好痛', '救我',
  '░▒▓', // block chars
  'ΨΦΩ', // greek
  'æƒœ',       // garbled
];

export class ItemSpawner {
  constructor(app, groundText) {
    this.app = app;
    this.groundText = groundText;
    this.items = [];
    this._timer = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
  }

  /** @returns {Item[]} */
  getItems() {
    return this.items;
  }

  update(dt, dtMs, visionX, visionY, visionRadius) {
    this._timer -= dt;

    if (this._timer <= 0 && this.items.length < MAX_ITEMS) {
      this._timer = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
      this._spawnItem(visionX, visionY, visionRadius);
    }

    // Update existing items (gaze tracking is done in Game)
  }

  _spawnItem(vx, vy, vr) {
    const pos = this._findPosition(vx, vy, vr);
    if (!pos) return;

    const type = this._rollType();
    const item = new Item(type, pos.x, pos.y);
    this.items.push(item);

    // Spawn horror text at item position (visible outside vision)
    const text = SPAWN_TEXTS[Math.floor(Math.random() * SPAWN_TEXTS.length)];
    // 30% chance to garble a random character
    let displayText = text;
    if (Math.random() < 0.3) {
      const chars = text.split('');
      const idx = Math.floor(Math.random() * chars.length);
      chars[idx] = String.fromCharCode(0x2200 + Math.floor(Math.random() * 0x60));
      displayText = chars.join('');
    }
    this.groundText.spawn(displayText, pos.x, pos.y + 10,
      { fontSize: 22, duration: 1800, visibleOutsideVision: true });

    return item;
  }

  _findPosition(vx, vy, vr) {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const margin = 40;

    // Try up to 30 times to find a valid position
    for (let attempt = 0; attempt < 30; attempt++) {
      const x = margin + Math.random() * (w - margin * 2);
      const y = margin + Math.random() * (h - margin * 2);

      // Not inside player's vision
      const dx = x - vx;
      const dy = y - vy;
      if (Math.sqrt(dx * dx + dy * dy) < vr + MIN_DIST_FROM_VISION) continue;

      // Not too close to other items
      let tooClose = false;
      for (const item of this.items) {
        const ix = x - item.x;
        const iy = y - item.y;
        if (Math.sqrt(ix * ix + iy * iy) < MIN_DIST_BETWEEN) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      return { x, y };
    }
    return null; // couldn't find a spot
  }

  _rollType() {
    const roll = Math.random();
    if (roll < 0.30) return 'box';
    if (roll < 0.55) return 'portrait';
    if (roll < 0.80) return 'bottle';
    return 'heart';
  }

  removeItem(item) {
    const idx = this.items.indexOf(item);
    if (idx >= 0) {
      this.items.splice(idx, 1);
    }
  }

  clear() {
    this.items = [];
    this._timer = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
  }
}
