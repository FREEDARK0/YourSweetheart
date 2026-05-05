import { Item } from './entities/Item.js';

const FLY_DURATION = 0.55; // seconds for item box spawn animation

/**
 * 道具激活效果管理器。
 * 每个 activate() 方法返回 true 表示效果接管了帧逻辑（如飞行动画），
 * 返回 false 表示效果是即时的。
 */
export class ItemEffects {
  constructor() {
    this._activeEffects = [];
  }

  /**
   * @param {Item} item — 被激活的道具
   * @param {object} ctx — { game, spawner, app }
   */
  activate(item, ctx) {
    switch (item.type) {
      case 'box':
        this._activateBox(item, ctx);
        break;
      case 'portrait':
        this._activatePortrait(item, ctx);
        break;
      case 'bottle':
        this._activateBottle(item, ctx);
        break;
      case 'heart':
        this._activateHeart(item, ctx);
        break;
    }
  }

  // ---- Box: spawn another item nearby with arc animation ----
  _activateBox(boxItem, ctx) {
    const { game, spawner, app } = ctx;
    spawner.removeItem(boxItem);

    // Pick a target position near the box (50–120px away, random direction)
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 70;
    const tx = boxItem.x + Math.cos(angle) * dist;
    const ty = boxItem.y + Math.sin(angle) * dist;
    const clampedX = Math.max(30, Math.min(app.screen.width - 30, tx));
    const clampedY = Math.max(30, Math.min(app.screen.height - 30, ty));

    // Choose new item type (low chance for another box)
    let newType;
    const roll = Math.random();
    if (roll < 0.10) {
      newType = 'box';
    } else if (roll < 0.40) {
      newType = 'portrait';
    } else if (roll < 0.70) {
      newType = 'bottle';
    } else {
      newType = 'heart';
    }

    const newItem = new Item(newType, boxItem.x, boxItem.y);
    newItem.display.x = boxItem.x;
    newItem.display.y = boxItem.y;
    spawner.items.push(newItem);

    // Animate: bezier arc from box position to target
    const midX = (boxItem.x + clampedX) / 2;
    const midY = Math.min(boxItem.y, clampedY) - 50 - Math.random() * 40;
    const cpx = midX + (Math.random() - 0.5) * 40;
    const cpy = midY;

    const anim = {
      item: newItem,
      startX: boxItem.x,
      startY: boxItem.y,
      endX: clampedX,
      endY: clampedY,
      cpx,
      cpy,
      elapsed: 0,
      duration: FLY_DURATION,
      done: false,
    };

    // Add to game's animation list
    game._flyingItems = game._flyingItems || [];
    game._flyingItems.push(anim);

    // Make item invisible during flight? No, animate its display position.
    // The item should show during flight.
  }

  // ---- Portrait: random mouse axis swap/reverse for 2 seconds ----
  _activatePortrait(item, ctx) {
    const { game } = ctx;
    game._mouseModifiers = game._mouseModifiers || [];
    game._mouseModifiers = game._mouseModifiers.filter(m => m.type !== 'portrait');

    // Random transform: swap axes, invert x, invert y
    const mode = Math.floor(Math.random() * 4);
    let scaleX = 1, scaleY = 1, swap = false;
    switch (mode) {
      case 0: scaleX = -1; break;                       // invert X
      case 1: scaleY = -1; break;                       // invert Y
      case 2: scaleX = -1; scaleY = -1; break;           // invert both
      case 3: swap = true; break;                        // swap axes
    }

    game._mouseModifiers.push({
      type: 'portrait',
      timer: 2.0,
      scaleX,
      scaleY,
      swap,
    });
  }

  // ---- Bottle: drift + delay on vision for 2 seconds ----
  _activateBottle(item, ctx) {
    const { game } = ctx;
    game._visionDrift = {
      timer: 2.0,
      driftX: 0,
      driftY: 0,
      targetDriftX: 0,
      targetDriftY: 0,
      changeTimer: 0,
    };
  }

  // ---- Heart: recover 2 seconds on failure timer ----
  _activateHeart(item, ctx) {
    const { game } = ctx;
    game.outOfVisionTimer = Math.max(0, game.outOfVisionTimer - 2000);
  }

  /** Call every frame from Game._update. */
  update(dt, game) {
    // Update flying items
    if (game._flyingItems) {
      for (let i = game._flyingItems.length - 1; i >= 0; i--) {
        const anim = game._flyingItems[i];
        anim.elapsed += dt;
        const t = Math.min(1, anim.elapsed / anim.duration);
        // Ease-out cubic bezier
        const ease = 1 - Math.pow(1 - t, 3);

        // Quadratic bezier: B(t) = (1-t)²P0 + 2(1-t)t P1 + t²P2
        const u = 1 - ease;
        const bx = u * u * anim.startX + 2 * u * ease * anim.cpx + ease * ease * anim.endX;
        const by = u * u * anim.startY + 2 * u * ease * anim.cpy + ease * ease * anim.endY;

        anim.item.display.x = bx;
        anim.item.display.y = by;
        anim.item.x = bx;
        anim.item.y = by;

        // Rotation during flight
        anim.item.display.rotation = Math.sin(ease * Math.PI * 3) * 0.5;

        if (t >= 1) {
          anim.item.display.rotation = 0;
          anim.item.display.x = anim.endX;
          anim.item.display.y = anim.endY;
          anim.item.x = anim.endX;
          anim.item.y = anim.endY;
          game._flyingItems.splice(i, 1);
        }
      }
    }

    // Update mouse modifiers
    if (game._mouseModifiers) {
      for (let i = game._mouseModifiers.length - 1; i >= 0; i--) {
        game._mouseModifiers[i].timer -= dt;
        if (game._mouseModifiers[i].timer <= 0) {
          game._mouseModifiers.splice(i, 1);
        }
      }
    }

    // Update vision drift
    if (game._visionDrift) {
      game._visionDrift.timer -= dt;
      game._visionDrift.changeTimer -= dt;

      if (game._visionDrift.changeTimer <= 0) {
        game._visionDrift.changeTimer = 0.3 + Math.random() * 0.5;
        const mag = 40 + Math.random() * 60;
        const angle = Math.random() * Math.PI * 2;
        game._visionDrift.targetDriftX = Math.cos(angle) * mag;
        game._visionDrift.targetDriftY = Math.sin(angle) * mag;
      }

      // Smooth drift
      const lerp = 0.06;
      game._visionDrift.driftX += (game._visionDrift.targetDriftX - game._visionDrift.driftX) * lerp;
      game._visionDrift.driftY += (game._visionDrift.targetDriftY - game._visionDrift.driftY) * lerp;

      if (game._visionDrift.timer <= 0) {
        game._visionDrift = null;
      }
    }
  }

  clear(game) {
    if (game._flyingItems) game._flyingItems = [];
    if (game._mouseModifiers) game._mouseModifiers = [];
    game._visionDrift = null;
  }
}
