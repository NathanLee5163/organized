import type { QueueOp, SyncQueueItem, Todo } from '@/src/types/todo';
import { getDb } from '@/src/db/database';
import { newId } from '@/src/utils/todoFactory';

export async function enqueue(todo: Todo, op: QueueOp): Promise<void> {
  const db = await getDb();
  // Drop stale ops for this todo so create/update can't resurrect a delete.
  await db.runAsync('DELETE FROM sync_queue WHERE todo_id = ?', [todo.id]);
  await db.runAsync(
    `INSERT INTO sync_queue (id, todo_id, op, payload, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [newId(), todo.id, op, JSON.stringify(todo), new Date().toISOString()]
  );
}

export async function listQueue(): Promise<SyncQueueItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    todo_id: string;
    op: string;
    payload: string;
    created_at: string;
  }>('SELECT * FROM sync_queue ORDER BY created_at ASC');

  return rows.map((row) => ({
    id: row.id,
    todoId: row.todo_id,
    op: row.op as QueueOp,
    payload: row.payload,
    createdAt: row.created_at,
  }));
}

export async function removeQueueItem(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
}

export async function clearQueueForTodo(todoId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM sync_queue WHERE todo_id = ?', [todoId]);
}
