import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueueOp, SyncQueueItem, Todo } from '@/src/types/todo';
import { newId } from '@/src/utils/todoFactory';

const QUEUE_KEY = 'web_queue_v1';

async function readQueue(): Promise<SyncQueueItem[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SyncQueueItem[];
  } catch {
    return [];
  }
}

async function writeQueue(items: SyncQueueItem[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export async function enqueue(todo: Todo, op: QueueOp): Promise<void> {
  const items = (await readQueue()).filter((item) => item.todoId !== todo.id);
  items.push({
    id: newId(),
    todoId: todo.id,
    op,
    payload: JSON.stringify(todo),
    createdAt: new Date().toISOString(),
  });
  await writeQueue(items);
}

export async function listQueue(): Promise<SyncQueueItem[]> {
  const items = await readQueue();
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function removeQueueItem(id: string): Promise<void> {
  await writeQueue((await readQueue()).filter((item) => item.id !== id));
}

export async function clearQueueForTodo(todoId: string): Promise<void> {
  await writeQueue((await readQueue()).filter((item) => item.todoId !== todoId));
}
