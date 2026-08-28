import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function isAuthorized(_request: NextRequest) {
  return true;
}

function imageUrl(storagePath: string) {
  if (storagePath.startsWith("/") || storagePath.startsWith("http")) return storagePath;
  return supabaseAdmin.storage.from("landmark-references").getPublicUrl(storagePath).data.publicUrl;
}

export async function GET(request: NextRequest) {
  const tourId = request.nextUrl.searchParams.get("tourId") || "amsa";
  const includeHidden = request.nextUrl.searchParams.get("includeHidden") === "true";

  let query = supabaseAdmin
    .from("attractions")
    .select("*, attraction_reference_images(*)")
    .eq("tour_id", tourId)
    .order("id");

  if (!includeHidden) query = query.eq("status", "공개");
  if (includeHidden && !isAuthorized(request)) {
    return NextResponse.json({ message: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ message: "관광지를 불러오지 못했습니다." }, { status: 500 });

  const attractions = (data ?? []).map((item) => ({
    ...item,
    referenceImages: (item.attraction_reference_images ?? [])
      .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
      .map((image: { id: number; original_name: string; storage_path: string }) => ({
        id: image.id,
        name: image.original_name,
        path: image.storage_path,
        url: imageUrl(image.storage_path),
      })),
    attraction_reference_images: undefined,
  }));

  return NextResponse.json({ attractions });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "관리자 인증에 실패했습니다." }, { status: 401 });
  }

  const formData = await request.formData();
  const raw = formData.get("attraction");
  if (typeof raw !== "string") {
    return NextResponse.json({ message: "관광지 정보가 없습니다." }, { status: 400 });
  }

  const input = JSON.parse(raw);
  const recognitionKey = String(input.recognitionKey || `landmark-${Date.now()}`)
    .toLowerCase().replace(/[^a-z0-9-]/g, "-");

  const { data: attraction, error } = await supabaseAdmin.from("attractions").insert({
    tour_id: input.tourId || "amsa",
    recognition_key: recognitionKey,
    name: input.name,
    category: input.category,
    address: input.address || "",
    description: input.description || "",
    latitude: Number(input.latitude),
    longitude: Number(input.longitude),
    radius: Number(input.radius),
    available_time: input.availableTime || "상시",
    landmark_threshold: Number(input.landmarkThreshold),
    guide_message: input.guideMessage || "",
    icon: input.icon || "📍",
    mission: input.mission || input.name,
    status: input.status,
    quality: "운영 전",
  }).select().single();

  if (error || !attraction) {
    return NextResponse.json({ message: error?.message || "관광지를 저장하지 못했습니다." }, { status: 500 });
  }

  const files = formData.getAll("images").filter((value): value is File => value instanceof File);
  const uploadedPaths: string[] = [];

  try {
    for (const [index, file] of files.entries()) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${attraction.id}/${Date.now()}-${index}-${safeName}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("landmark-references")
        .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
      if (uploadError) throw uploadError;
      uploadedPaths.push(path);
      const { error: imageError } = await supabaseAdmin.from("attraction_reference_images").insert({
        attraction_id: attraction.id,
        storage_path: path,
        original_name: file.name,
        sort_order: index,
      });
      if (imageError) throw imageError;
    }
  } catch (uploadError) {
    if (uploadedPaths.length) {
      await supabaseAdmin.storage.from("landmark-references").remove(uploadedPaths);
    }
    await supabaseAdmin.from("attractions").delete().eq("id", attraction.id);
    return NextResponse.json({ message: "기준 이미지 저장 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ attraction }, { status: 201 });
}
