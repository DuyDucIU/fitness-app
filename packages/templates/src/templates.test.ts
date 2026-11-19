import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseProgramTemplate } from './schema';

const programsDir = join(process.cwd(), 'programs');
const files = readdirSync(programsDir).filter((f) => f.endsWith('.yaml'));

describe('chương trình mẫu', () => {
  it('có ít nhất một chương trình', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s hợp lệ theo schema', (file) => {
    const template = parseProgramTemplate(
      readFileSync(join(programsDir, file), 'utf8'),
    );
    expect(template.days.length).toBeGreaterThan(0);
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
    expect(() => parseProgramTemplate(bad)).toThrow();
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
    expect(() => parseProgramTemplate(bad)).toThrow();
  });
});
