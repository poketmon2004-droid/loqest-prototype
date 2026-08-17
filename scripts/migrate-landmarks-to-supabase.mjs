import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error(".env.local의 Supabase 환경변수를 확인해주세요.");
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const landmarks = [
  { attractionId: 1, folder: "inform" },
  { attractionId: 2, folder: "character" },
  { attractionId: 3, folder: "wish" },
];

for (const landmark of landmarks) {
  const sourceDirectory = path.join(
    process.cwd(),
    "public",
    "landmarks",
    landmark.folder,
    "reference"
  );
  const fileNames = (await readdir(sourceDirectory))
    .filter((name) => /\.(jpe?g|png|webp)$/i.test(name))
    .sort();

  for (const [index, fileName] of fileNames.entries()) {
    const sourcePath = path.join(sourceDirectory, fileName);
    const storagePath = `${landmark.attractionId}/${fileName}`;
    const file = await readFile(sourcePath);
    const extension = path.extname(fileName).toLowerCase();
    const contentType = extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg";

    const { error: uploadError } = await supabase.storage
      .from("landmark-references")
      .upload(storagePath, file, { contentType, upsert: true });
    if (uploadError) throw uploadError;

    const { error: rowError } = await supabase
      .from("attraction_reference_images")
      .upsert(
        {
          attraction_id: landmark.attractionId,
          storage_path: storagePath,
          original_name: fileName,
          sort_order: index,
        },
        { onConflict: "storage_path" }
      );
    if (rowError) throw rowError;

    console.log(`[${landmark.folder}] ${index + 1}/${fileNames.length} ${fileName}`);
  }
}

console.log("기존 기준 이미지의 Supabase 이전이 완료되었습니다.");
