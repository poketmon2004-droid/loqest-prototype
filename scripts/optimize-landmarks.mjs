import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceRoot = path.resolve("public/landmarks");
const outputRoot = path.resolve("public/landmarks-optimized");

async function findJpgFiles(directory) {
  const entries = await fs.readdir(directory, {
    withFileTypes: true,
  });

  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findJpgFiles(fullPath)));
      continue;
    }

    if (/\.(jpg|jpeg)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function optimizeImages() {
  await fs.rm(outputRoot, {
    recursive: true,
    force: true,
  });

  const files = await findJpgFiles(sourceRoot);

  for (const sourcePath of files) {
    const relativePath = path.relative(sourceRoot, sourcePath);
    const outputPath = path.join(outputRoot, relativePath);

    await fs.mkdir(path.dirname(outputPath), {
      recursive: true,
    });

    await sharp(sourcePath)
      .rotate()
      .resize({
        width: 1200,
        height: 1200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 80,
        mozjpeg: true,
      })
      .toFile(outputPath);

    console.log(`완료: ${relativePath}`);
  }

  console.log(`총 ${files.length}장 압축 완료`);
  console.log("결과 폴더: public/landmarks-optimized");
}

optimizeImages().catch((error) => {
  console.error(error);
  process.exit(1);
});