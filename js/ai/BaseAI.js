/**
 * AI 接口基类 — 所有 NPC AI 行为必须实现此接口。
 * 为未来 GOAP 框架预留：context 可传入 worldState 等全局信息。
 */
export class BaseAI {
  /**
   * @param {object} npc — NPC 实例（含 x, y, speed 等）
   * @param {number} delta — 帧间隔（秒）
   * @param {object} [context] — 世界上下文（为 GOAP 预留）
   */
  update(npc, delta, context) {
    throw new Error('AI.update() must be implemented by subclass');
  }
}
