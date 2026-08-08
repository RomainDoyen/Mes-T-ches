import { createId } from '@/lib/utils/dates';
import type { OutboxEntry } from './types';

const USER_KEY = 'auth:user';

function outboxKey(userId: string): string {
  return `sync:outbox:${userId}`;
}

async function getUserId(): Promise<string | null> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return null;
  const stored = await chrome.storage.local.get([USER_KEY]);
  const user = stored[USER_KEY] as { id: string } | undefined;
  return user?.id ?? null;
}

export async function enqueueOutbox(
  entry: Omit<OutboxEntry, 'id'>,
): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  const key = outboxKey(userId);
  const stored = await chrome.storage.local.get([key]);
  const list = (stored[key] as OutboxEntry[] | undefined) ?? [];
  const next: OutboxEntry = { ...entry, id: createId() };
  await chrome.storage.local.set({ [key]: [...list, next] });
}

export async function listOutbox(): Promise<OutboxEntry[]> {
  const userId = await getUserId();
  if (!userId) return [];

  const key = outboxKey(userId);
  const stored = await chrome.storage.local.get([key]);
  return (stored[key] as OutboxEntry[] | undefined) ?? [];
}

export async function removeOutbox(ids: string[]): Promise<void> {
  const userId = await getUserId();
  if (!userId || ids.length === 0) return;

  const key = outboxKey(userId);
  const stored = await chrome.storage.local.get([key]);
  const list = (stored[key] as OutboxEntry[] | undefined) ?? [];
  const drop = new Set(ids);
  await chrome.storage.local.set({
    [key]: list.filter((entry) => !drop.has(entry.id)),
  });
}
