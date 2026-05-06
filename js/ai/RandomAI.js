import { BaseAI } from './BaseAI.js';

const IDLE = 'idle';
const WANDER = 'wander';
const SPRINT = 'sprint';
const LOVE = 'love';

/**
 * 随机游走 AI — 病娇行为模式：
 * - 随机方向漫步
 * - 偶尔停顿
 * - 偶尔冲刺
 * - 停顿时有概率进入"示爱阶段"：静止、视野缩小、心形粒子
 */
export class RandomAI extends BaseAI {
  constructor() {
    super();
    this._state = WANDER;
    this._stateTimer = 0;
    this._dirX = 0;
    this._dirY = 0;
    this._pickNewDirection();
  }

  _pickNewDirection() {
    const angle = Math.random() * Math.PI * 2;
    this._dirX = Math.cos(angle);
    this._dirY = Math.sin(angle);
  }

  reset() {
    this._state = WANDER;
    this._stateTimer = 0;
    this._pickNewDirection();
  }

  update(npc, dt, context) {
    this._stateTimer -= dt;

    if (this._stateTimer <= 0 && this._state !== LOVE) {
      this._transition(npc);
    }

    let speed = 0;
    switch (this._state) {
      case IDLE:
        speed = 0;
        break;
      case LOVE:
        speed = 0;
        // Count down love state timer
        if (npc.loveTimer !== undefined) {
          npc.loveTimer -= dt;
          if (npc.loveTimer <= 0) {
            npc.inLoveState = false;
            npc._loveEnded = true;
            this._state = WANDER;
            this._stateTimer = 1.0 + Math.random() * 2.0;
            this._pickNewDirection();
          }
        }
        break;
      case WANDER:
        speed = npc.speed;
        this._dirX += (Math.random() - 0.5) * 0.3 * dt;
        this._dirY += (Math.random() - 0.5) * 0.3 * dt;
        break;
      case SPRINT:
        speed = npc.speed * 2.5;
        break;
    }

    const len = Math.sqrt(this._dirX * this._dirX + this._dirY * this._dirY);
    if (len > 0) {
      this._dirX /= len;
      this._dirY /= len;
    }

    npc.x += this._dirX * speed * dt;
    npc.y += this._dirY * speed * dt;

    // Occasionally glance toward player (outside LOVE state)
    if (context && context.worldState && this._state !== IDLE && this._state !== LOVE) {
      const px = context.worldState.playerX;
      const py = context.worldState.playerY;
      const dx = px - npc.x;
      const dy = py - npc.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0 && Math.random() < 0.02) {
        this._dirX += (dx / dist) * 0.06;
        this._dirY += (dy / dist) * 0.06;
      }
    }

    // Occasionally move toward nearest item
    if (context && context.items && context.items.length > 0 && this._state !== LOVE) {
      if (Math.random() < 0.03) {
        let nearest = null;
        let nearestDist = Infinity;
        for (const item of context.items) {
          const dx = item.x - npc.x;
          const dy = item.y - npc.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < nearestDist) {
            nearestDist = d;
            nearest = item;
          }
        }
        if (nearest && nearestDist > 0) {
          const attractStrength = this._state === SPRINT ? 0.08 : 0.04;
          this._dirX += ((nearest.x - npc.x) / nearestDist) * attractStrength;
          this._dirY += ((nearest.y - npc.y) / nearestDist) * attractStrength;
        }
      }
    }
  }

  _transition(npc) {
    const roll = Math.random();
    if (roll < 0.20) {
      // 20% chance to idle — 30% of those become LOVE state
      if (Math.random() < 0.40) {
        this._state = LOVE;
        const loveDuration = 3 + Math.random() * 3; // 3–6 seconds
        this._stateTimer = loveDuration;
        npc.inLoveState = true;
        npc.loveTimer = loveDuration;
        npc._loveJustStarted = true;
      } else {
        this._state = IDLE;
        this._stateTimer = 0.4 + Math.random() * 1.2;
      }
    } else if (roll < 0.30) {
      this._state = SPRINT;
      this._stateTimer = 0.3 + Math.random() * 0.7;
      this._pickNewDirection();
    } else {
      this._state = WANDER;
      this._stateTimer = 1.0 + Math.random() * 2.5;
      this._pickNewDirection();
    }
  }
}
