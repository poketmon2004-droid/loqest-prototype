import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type RecordRow = {
  attraction_id: number;
  total_tests: number;
  successful_tests: number;
  failed_tests: number;
  recent_results: boolean[];
  last_result: "통과" | "실패" | null;
  last_tested_at: string | null;
  quality: string;
  approved: boolean;
};

function serialize(row: RecordRow) {
  return {
    attractionId: row.attraction_id,
    totalTests: row.total_tests,
    successfulTests: row.successful_tests,
    failedTests: row.failed_tests,
    recentResults: row.recent_results,
    lastResult: row.last_result,
    lastTestedAt: row.last_tested_at,
    quality: row.quality,
    approved: row.approved,
  };
}

// NOTE: Admin authentication is currently in temporary public-access mode across
// the existing project. Lock down all admin routes before public production use.
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("attractionId");
  const tourId = request.nextUrl.searchParams.get("tourId");

  if (!id && !tourId) {
    return NextResponse.json({ message: "퀘스트 또는 투어를 지정해주세요." }, { status: 400 });
  }

  let query = supabaseAdmin.from("recognition_test_records").select("*");
  if (id) {
    if (!/^\d+$/.test(id)) return NextResponse.json({ message: "잘못된 퀘스트 번호입니다." }, { status: 400 });
    query = query.eq("attraction_id", Number(id));
  } else {
    const { data: quests, error } = await supabaseAdmin.from("attractions").select("id").eq("tour_id", tourId!);
    if (error) return NextResponse.json({ message: "투어 퀘스트를 불러오지 못했습니다." }, { status: 500 });
    const ids = (quests ?? []).map((quest) => quest.id);
    if (ids.length === 0) return NextResponse.json({ records: {} });
    query = query.in("attraction_id", ids);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Recognition records fetch failed", error);
    return NextResponse.json({ message: "서버 테스트 기록을 불러오지 못했습니다. Supabase 마이그레이션을 확인해주세요." }, { status: 503 });
  }
  const records = Object.fromEntries(((data ?? []) as RecordRow[]).map(row => [String(row.attraction_id), serialize(row)]));
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

  // The existing ORB UI requires 45 good matches and uses the quest's ratio threshold.
  const passed = goodMatches >= 45 && matchRatio >= (Number(attraction.landmark_threshold) || 30);
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("recognition_test_records").select("*").eq("attraction_id", attractionId).maybeSingle();
  if (lookupError) {
    console.error("Recognition record lookup failed", lookupError);
    return NextResponse.json({ message: "테스트 기록 테이블을 확인해주세요." }, { status: 503 });
  }
  const previous = existing as RecordRow | null;
  const recentResults = [...(Array.isArray(previous?.recent_results) ? previous.recent_results : []), passed].slice(-3);
  const failures = recentResults.filter(result => !result).length;
  const quality = failures >= 2 ? "기준 이미지 개선" : passed ? "정상" : "확인 필요";
  const now = new Date().toISOString();
  const { data: saved, error: saveError } = await supabaseAdmin
    .from("recognition_test_records")
    .upsert({
      attraction_id: attractionId,
      total_tests: (previous?.total_tests ?? 0) + 1,
      successful_tests: (previous?.successful_tests ?? 0) + (passed ? 1 : 0),
      failed_tests: (previous?.failed_tests ?? 0) + (passed ? 0 : 1),
      recent_results: recentResults,
      last_result: passed ? "통과" : "실패",
      last_tested_at: now,
      quality,
      approved: Boolean(previous?.approved) || passed,
      updated_at: now,
    }, { onConflict: "attraction_id" }).select("*").single();

  if (saveError || !saved) {
    console.error("Recognition record save failed", saveError);
    return NextResponse.json({ message: "서버에 테스트 결과를 저장하지 못했습니다." }, { status: 503 });
  }

  if (passed && attraction.quality === "재테스트 필요") {
    const { error: qualityError } = await supabaseAdmin.from("attractions")
      .update({ quality: "정상" }).eq("id", attractionId);
    if (qualityError) {
      console.error("Recognition approval quality update failed", qualityError);
      return NextResponse.json({ message: "테스트 기록은 저장되었지만 재테스트 상태를 변경하지 못했습니다." }, { status: 500 });
    }
  }
  return NextResponse.json({ passed, record: serialize(saved as RecordRow) });
}
