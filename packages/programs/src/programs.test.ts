import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseProgram } from './schema';

const dataDir = join(process.cwd(), 'data');
const files = readdirSync(dataDir).filter((f) => f.endsWith('.yaml'));

describe('chương trình mẫu', () => {
  it('có ít nhất một chương trình', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s hợp lệ theo schema', (file) => {
    const program = parseProgram(readFileSync(join(dataDir, file), 'utf8'));
    expect(program.days.length).toBeGreaterThan(0);
  });

  it('từ chối repMin > repMax', () => {
    const bad = `
id: x
name: { en: x, vi: x }
experienceLevel: beginner
daysPerWeek: 3
equipmentAccess: gym
goal: general
days:
  - name: { en: A, vi: A }
    exercises:
      - { exercise: Squat, sets: 3, repMin: 10, repMax: 5 }
`;
    expect(() => parseProgram(bad)).toThrow();
  });

  it('từ chối tên thiếu bản tiếng Việt', () => {
    const bad = `
id: x
name: { en: x }
experienceLevel: beginner
daysPerWeek: 3
equipmentAccess: gym
goal: general
days:
  - name: { en: A, vi: A }
    exercises:
      - { exercise: Squat, sets: 3, repMin: 5, repMax: 8 }
`;
    expect(() => parseProgram(bad)).toThrow();
  });
});
