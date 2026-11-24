import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { findGuestSession } from "@/lib/guestParticipation";

export const dynamic = "force-dynamic";

// Informational progress only. Client-reported recognition must NEVER
// be treated as verified eligibility for a financial coupon.
export async function GET(request: NextRequest) {
  const tourId = request.nextUrl.searchParams.get("tourId");
  if (!tourId || !/^[a-zA-Z0-9_-]{1,100}$/.test(tourId)) {
    return NextResponse.json({ message: "투어 ID가 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const sessionId = await findGuestSession(request);
    const { data: attractions, error: attractionsError } = await supabaseAdmin
      .from("attractions")
      .select("id")
      .eq("tour_id", tourId)
      .eq("status", "공개");
    if (attractionsError) throw attractionsError;

    const publicIds = new Set((attractions ?? []).map(item => Number(item.id)));
    let completedIds: number[] = [];

    if (sessionId) {
      const { data: stamps, error: stampsError } = await supabaseAdmin
        .from("visitor_stamps")
        .select("attraction_id")
        .eq("session_id", sessionId)
        .eq("tour_id", tourId);
      if (stampsError) throw stampsError;
      completedIds = [...new Set((stamps ?? [])
        .map(item => Number(item.attraction_id))
        .filter(id => publicIds.has(id)))];
    }

    const questCount = publicIds.size;
    return NextResponse.json({
      tourId,
      participationId: sessionId,
      progress: {
        completedAttractionIds: completedIds,
        completedCount: completedIds.length,
        questCount,
        allQuestsCompleted: questCount > 0 && completedIds.length === questCount,
      },
      verification: {
        status: "client_reported",
        eligibleForCoupon: false,
        reason: "랜드마크 인식은 현재 브라우저에서 판정하며 금전적 쿠폰의 서버 검증이 구현되지 않았습니다.",
      },
      coupon: { integrationStatus: "not_connected", issuanceEnabled: false },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Guest participation summary failed", error);
    return NextResponse.json({ message: "참여 정보를 불러오지 못했습니다." }, { status: 500 });
  }
}
