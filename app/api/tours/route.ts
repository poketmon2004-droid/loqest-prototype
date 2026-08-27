import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  return Boolean(
    process.env.ADMIN_API_KEY &&
      request.headers.get("x-admin-api-key") === process.env.ADMIN_API_KEY,
  );
}

export async function GET(request: NextRequest) {
  const includeHidden = request.nextUrl.searchParams.get("includeHidden") === "true";
  if (includeHidden && !authorized(request)) {
    return NextResponse.json({ message: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  let query = supabaseAdmin.from("tours").select("*").order("created_at");
  if (!includeHidden) query = query.eq("status", "공개");
  const { data: tours, error } = await query;
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  const tourIds = (tours ?? []).map((tour) => tour.id);
  const { data: attractions, error: attractionError } = tourIds.length
    ? await supabaseAdmin.from("attractions").select("tour_id, status").in("tour_id", tourIds)
    : { data: [], error: null };
  if (attractionError) {
    return NextResponse.json({ message: attractionError.message }, { status: 500 });
  }

  const result = (tours ?? []).map((tour) => {
    const quests = (attractions ?? []).filter((item) => item.tour_id === tour.id);
    return {
      ...tour,
      questCount: quests.length,
      publicQuestCount: quests.filter((item) => item.status === "공개").length,
    };
  });
  return NextResponse.json({ tours: result });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ message: "관리자 인증에 실패했습니다." }, { status: 401 });
  }

  try {
    const input = await request.json();
    const id = String(input.id || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (!id || !input.name) {
      return NextResponse.json({ message: "투어 ID와 투어명을 입력해주세요." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.from("tours").insert({
      id,
      name: String(input.name).trim(),
      short_name: String(input.shortName || input.name).trim(),
      region: String(input.region || "").trim(),
      description: String(input.description || "").trim(),
      status: input.status === "공개" ? "공개" : "비공개",
      badge_name: String(input.badgeName || `${input.name} 탐험가`).trim(),
    }).select().single();

    if (error || !data) {
      const duplicate = error?.code === "23505";
      return NextResponse.json(
        { message: duplicate ? "이미 사용 중인 투어 ID입니다." : error?.message || "투어를 저장하지 못했습니다." },
        { status: duplicate ? 409 : 500 },
      );
    }
    return NextResponse.json({ tour: data }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "투어 정보를 확인해주세요." }, { status: 400 });
  }
}
