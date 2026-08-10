import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const PIPELINE_DIRECTORY_NAMES = [
  "input",
  "processing",
  "output",
  "results",
] as const;

export const createPipelineDirectories = async (root: string): Promise<void> => {
  await Promise.all(
    PIPELINE_DIRECTORY_NAMES.map((directory) =>
      mkdir(join(root, directory), { recursive: true }),
    ),
  );
};

export const clearPipelineDirectories = async (root: string): Promise<void> => {
  await Promise.all(
    PIPELINE_DIRECTORY_NAMES.map(async (directory) => {
      const directoryPath = join(root, directory);
      await rm(directoryPath, { recursive: true, force: true });
      await mkdir(directoryPath, { recursive: true });
    }),
  );
};

export const writeJsonAtomic = async (
  filePath: string,
  value: unknown,
): Promise<void> => {
  await mkdir(dirname(filePath), { recursive: true });

  const temporaryPath = `${filePath}.tmp-${randomUUID()}`;
  const serializedValue = `${JSON.stringify(value, null, 2)}\n`;

  try {
    await writeFile(temporaryPath, serializedValue, "utf8");
    await rename(temporaryPath, filePath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
};

export const readJson = async <T = unknown>(filePath: string): Promise<T> => {
  const serializedValue = await readFile(filePath, "utf8");
  return JSON.parse(serializedValue) as T;
};

export const moveStageFile = async (
  sourcePath: string,
  destinationPath: string,
  value: unknown,
): Promise<void> => {
  await writeJsonAtomic(destinationPath, value);
  await rm(sourcePath);
};
