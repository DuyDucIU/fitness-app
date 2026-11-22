import { afterEach, describe, expect, it } from 'vitest';

import { db } from './db';

afterEach(async () => {
  await db.outbox.clear();
  await db.syncState.clear();
});

describe('outbox', () => {
  it('cấp seq tăng dần theo thứ tự ghi', async () => {
    const event = {
      op: 'upsert' as const,
      payload: {},
      createdAt: 0,
      attempts: 0,
    };
    await db.outbox.add({ ...event, entity: 'set_logs', entityId: 'a' });
    await db.outbox.add({ ...event, entity: 'set_logs', entityId: 'b' });

    const events = await db.outbox.orderBy('seq').toArray();
    expect(events.map((e) => e.entityId)).toEqual(['a', 'b']);
    expect(events[0].seq).toBeLessThan(events[1].seq);
  });

  it('tra được sự kiện theo [entity+entityId]', async () => {
    await db.outbox.add({
      entity: 'set_logs',
      entityId: 'a',
      op: 'upsert',
      payload: null,
      createdAt: 0,
      attempts: 0,
    });

    const found = await db.outbox
      .where('[entity+entityId]')
      .equals(['set_logs', 'a'])
      .first();
    expect(found?.op).toBe('upsert');
  });
});
