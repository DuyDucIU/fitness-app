import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { parse } from 'yaml';
import { z } from 'zod';
import { PrismaClient } from '../../src/generated/prisma/client';
import { MUSCLES } from './muscles';

/** Nạp catalog bài tập chung (D6): free-exercise-db đã ghim commit + allowlist catalog.yaml. */

const SeedExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  equipment: z.string().nullable(),
  mechanic: z.enum(['compound', 'isolation']).nullable(),
  category: z.string(),
  primaryMuscles: z.array(z.string()),
  secondaryMuscles: z.array(z.string()),
});

const CatalogSchema = z.array(
  z.object({
    id: z.string(),
    nameVi: z.string(),
    aliases: z.array(z.string()).default([]),
    metricType: z
      .enum(['weight_reps', 'reps', 'duration', 'distance'])
      .optional(),
  }),
);

/** Không dấu, chữ thường — khớp cột exercise_aliases.alias_normalized (UC03). */
export function normalizeAlias(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/** Có dấu tiếng Việt -> 'vi', còn lại 'en'. */
function detectLang(text: string): 'vi' | 'en' {
  return /[^\u0000-\u007F]/.test(text) ? 'vi' : 'en';
}

async function main(): Promise<void> {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) throw new Error('Thiếu DATABASE_URL');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const dataDir = join(__dirname, 'data');
  const source = z
    .array(SeedExerciseSchema)
    .parse(JSON.parse(readFileSync(join(dataDir, 'exercises.json'), 'utf8')));
  const sourceById = new Map(source.map((e) => [e.id, e]));
  const catalog = CatalogSchema.parse(
    parse(readFileSync(join(__dirname, 'catalog.yaml'), 'utf8')),
  );

  // Báo lỗi ngay nếu allowlist có id sai hoặc trùng.
  const seen = new Set<string>();
  for (const entry of catalog) {
    if (!sourceById.has(entry.id)) {
      throw new Error(
        `catalog.yaml: id "${entry.id}" không có trong free-exercise-db đã ghim`,
      );
    }
    if (seen.has(entry.id))
      throw new Error(`catalog.yaml: id "${entry.id}" bị trùng`);
    seen.add(entry.id);
  }

  try {
    const muscleIds = new Map<string, number>();
    for (const [code, info] of Object.entries(MUSCLES)) {
      const muscle = await prisma.muscle.upsert({
        where: { code },
        create: { code, ...info },
        update: info,
      });
      muscleIds.set(code, muscle.id);
    }

    for (const entry of catalog) {
      const raw = sourceById.get(entry.id)!;
      const metricType =
        entry.metricType ??
        (raw.category === 'cardio' || raw.category === 'stretching'
          ? 'duration'
          : 'weight_reps');

      const muscleLinks = [
        ...raw.primaryMuscles.map((code) => ({
          code,
          role: 'primary' as const,
        })),
        ...raw.secondaryMuscles.map((code) => ({
          code,
          role: 'secondary' as const,
        })),
      ].map(({ code, role }) => {
        const muscleId = muscleIds.get(code);
        if (muscleId === undefined)
          throw new Error(
            `Nhóm cơ "${code}" (bài ${raw.id}) chưa có trong muscles.ts`,
          );
        return { muscleId, role };
      });

      const aliasTexts = [
        ...new Set([raw.name, entry.nameVi, ...entry.aliases]),
      ];

      await prisma.$transaction(async (tx) => {
        const exercise = await tx.exercise.upsert({
          where: {
            source_sourceRef: { source: 'free_exercise_db', sourceRef: raw.id },
          },
          create: {
            source: 'free_exercise_db',
            sourceRef: raw.id,
            nameEn: raw.name,
            nameVi: entry.nameVi,
            equipment: raw.equipment,
            mechanic: raw.mechanic,
            metricType,
            license: 'Unlicense',
          },
          update: {
            nameEn: raw.name,
            nameVi: entry.nameVi,
            equipment: raw.equipment,
            mechanic: raw.mechanic,
            metricType,
          },
        });
        // Chạy lại seed phải cho kết quả giống nhau: thay toàn bộ liên kết cơ và alias chung.
        await tx.exerciseMuscle.deleteMany({
          where: { exerciseId: exercise.id },
        });
        await tx.exerciseMuscle.createMany({
          data: muscleLinks.map((link) => ({
            exerciseId: exercise.id,
            ...link,
          })),
        });
        await tx.exerciseAlias.deleteMany({
          where: { exerciseId: exercise.id, ownerId: null },
        });
        await tx.exerciseAlias.createMany({
          data: aliasTexts.map((alias) => ({
            exerciseId: exercise.id,
            alias,
            aliasNormalized: normalizeAlias(alias),
            lang: detectLang(alias),
          })),
        });
      });
    }

    console.log(
      `Seed xong: ${muscleIds.size} nhóm cơ, ${catalog.length} bài tập.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
