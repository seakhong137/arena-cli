import { getDb } from './db.js';
import { chatMessages } from './schema.js';
import { desc, eq, gt, and, isNull, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export interface ChatMessage {
  id: string;
  agentId: string | null;
  agentName: string | null;
  type: 'analysis' | 'debate' | 'critique' | 'elimination' | 'system' | 'farewell';
  content: string;
  targetAgentId: string | null;
  targetAsset: string | null;
  timestamp: Date;
  scanCycleId: string | null;
}

/**
 * Save a chat message
 */
export async function saveChatMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<string> {
  const db = getDb();
  const id = randomUUID();

  await db.insert(chatMessages).values({
    id,
    agentId: msg.agentId,
    agentName: msg.agentName,
    type: msg.type,
    content: msg.content,
    targetAgentId: msg.targetAgentId,
    targetAsset: msg.targetAsset,
    scanCycleId: msg.scanCycleId,
  });

  return id;
}

/**
 * Get recent chat messages
 */
export async function getChatMessages(limit = 100, after?: Date): Promise<ChatMessage[]> {
  const db = getDb();

  const rows = after
    ? await db.select().from(chatMessages).where(gt(chatMessages.timestamp, after)).orderBy(chatMessages.timestamp).limit(limit)
    : await db.select().from(chatMessages).orderBy(desc(chatMessages.timestamp)).limit(limit);

  return rows.map((r) => ({
    id: r.id,
    agentId: r.agentId,
    agentName: r.agentName,
    type: r.type as ChatMessage['type'],
    content: r.content,
    targetAgentId: r.targetAgentId,
    targetAsset: r.targetAsset,
    timestamp: r.timestamp,
    scanCycleId: r.scanCycleId,
  }));
}

/**
 * Get recent messages from a specific scan cycle
 */
export async function getCycleMessages(scanCycleId: string): Promise<ChatMessage[]> {
  const db = getDb();

  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.scanCycleId, scanCycleId))
    .orderBy(chatMessages.timestamp);

  return rows.map((r) => ({
    id: r.id,
    agentId: r.agentId,
    agentName: r.agentName,
    type: r.type as ChatMessage['type'],
    content: r.content,
    targetAgentId: r.targetAgentId,
    targetAsset: r.targetAsset,
    timestamp: r.timestamp,
    scanCycleId: r.scanCycleId,
  }));
}

/**
 * Get recent context messages for an agent to read before responding
 */
export async function getContextMessages(
  currentAgentId: string,
  asset: string,
  limit = 10
): Promise<ChatMessage[]> {
  const db = getDb();

  const rows = await db
    .select()
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.targetAsset, asset),
        isNull(chatMessages.scanCycleId) // global discussion, not a specific cycle
      )
    )
    .orderBy(desc(chatMessages.timestamp))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    agentId: r.agentId,
    agentName: r.agentName,
    type: r.type as ChatMessage['type'],
    content: r.content,
    targetAgentId: r.targetAgentId,
    targetAsset: r.targetAsset,
    timestamp: r.timestamp,
    scanCycleId: r.scanCycleId,
  }));
}

/**
 * Clear old messages (maintenance)
 */
export async function clearOldMessages(olderThanHours = 24): Promise<number> {
  const db = getDb();
  const cutoffMs = Date.now() - olderThanHours * 60 * 60 * 1000;

  const result = await db
    .delete(chatMessages)
    .where(sql`${chatMessages.timestamp} < ${cutoffMs}`);

  return result.changes;
}
