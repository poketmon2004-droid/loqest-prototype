import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type ApprovalRow = { attraction_id: number; approved: boolean };

function serialize(row: ApprovalRow) {
  return { attractionId: row.attraction_id, approved: row.approved };
}

// NOTE: All existing admin routes use temporary public-access authentication.
// Secure the admin API before production use.
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("attractionId");
  const tourId = request.nextUrl.searchParams.get("tourId");

  if (!id && !tourId) {
    return NextResponse.json({ message: "퀘스트 또는 투어를 지정해주세요." }, { status: 400 });
  }

  let query = supabaseAdmin.from("recognition_test_records").select("attraction_id, approved");
  if (id) {
    if (!/^\d+$/.test(id)) {
      return NextResponse.json({ message: "잘못된 퀘스트 번호입니다." }, { status: 400 });
    }
    query = query.eq("attraction_id", Number(id));
  } else {
    const { data: quests, error } = await supabaseAdmin
      .from("attractions").select("id").eq("tour_id", tourId!);
    if (error) {
      return NextResponse.json({ message: "투어 퀘스트를 불러오지 못했습니다." }, { status: 500 });
    }
    const ids = (quests ?? []).map(quest => quest.id);
    if (ids.length === 0) return NextResponse.json({ records: {} });
    query = query.in("attraction_id", ids);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Recognition approval fetch failed", error);
    return NextResponse.json({ message: "테스트 승인 상태를 불러오지 못했습니다." }, { status: 503 });
  }
  const records = Object.fromEntries(
    ((data ?? []) as ApprovalRow[]).map(row => [String(row.attraction_id), serialize(row)])
  );
  return NextResponse.json({ records });
}

export async function POST(request: NextRequest) {
  let input: { attractionId?: unknown; goodMatches?: unknown; matchRatio?: unknown };
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ message: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const attractionId = Number(input.attractionId);
  const goodMatches = Number(input.goodMatches);
  const matchRatio = Number(input.matchRatio);
  if (!Number.isSafeInteger(attractionId) || attractionId <= 0 ||
      !Number.isInteger(goodMatches) || goodMatches < 0 || goodMatches > 100000 ||
      !Number.isFinite(matchRatio) || matchRatio < 0 || matchRatio > 100) {
    return NextResponse.json({ message: "테스트 값이 올바르지 않습니다." }, { status: 400 });
  }

  const { data: attraction, error: attractionError } = await supabaseAdmin
    .from("attractions").select("id, quality, landmark_threshold").eq("id", attractionId).single();
  if (attractionError || !attraction) {
    return NextResponse.json({ message: "퀘스트를 찾지 못했습니다." }, { status: 404 });
  }

  // The ORB test is evaluated in the browser; retain the existing thresholds.
  const passed = goodMatches >= 45 &&
    matchRatio >= (Number(attraction.landmark_threshold) || 30);

  // Failed admin tests do not change the existing approval or create test logs.
  if (!passed) {
    return NextResponse.json({ passed: false });
  }

  const { error: saveError } = await supabaseAdmin
    .from("recognition_test_records")
    .upsert(
      { attraction_id: attractionId, approved: true, updated_at: new Date().toISOString() },
      { onConflict: "attraction_id" }
    );
  if (saveError) {
    console.error("Recognition approval save failed", saveError);
    return NextResponse.json({ message: "테스트 통과 승인을 저장하지 못했습니다." }, { status: 503 });
  }

  if (attraction.quality === "재테스트 필요") {
    const { error: qualityError } = await supabaseAdmin
      .from("attractions").update({ quality: "정상" }).eq("id", attractionId);
    if (qualityError) {
      console.error("Recognition retest status reset failed", qualityError);
      return NextResponse.json({ message: "테스트는 통과했지만 재테스트 상태 변경에 실패했습니다." }, { status: 500 });
    }
  }
  return NextResponse.json({ passed: true, record: { attractionId, approved: true } });
}
