import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ensureGuestSession, setGuestCookie } from "@/lib/guestParticipation";

export const dynamic = "force-dynamic";

function isAuthorized(_request: NextRequest) {
  // Prototype placeholder: production authorization must be implemented before public service.
  void _request;
  return true;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { message: "관리자 인증이 필요합니다." },
      { status: 401 }
    );
  }

  try {
    const tourId = request.nextUrl.searchParams.get("tourId") || "amsa";

    const { data, error } = await supabaseAdmin
      .from("capture_records")
      .select("*")
      .eq("tour_id", tourId)
      .order("captured_at", { ascending: false });

    if (error) {
      console.error(error);

      return NextResponse.json(
        { message: "촬영 기록을 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    const records = (data ?? []).map((record) => ({
      id: record.id,
      sessionId: record.session_id,
      visitorId: record.visitor_id,
      tourId: record.tour_id,
      attractionId: Number(record.attraction_id),
      recognitionKey: record.recognition_key,
      landmarkName: record.landmark_name,
      result: record.result,
      stage: record.stage,
      attemptNumber: record.attempt_number,
      distance: record.distance,
      goodMatches: record.good_matches,
      matchRatio: record.match_ratio,
      capturedAt: record.captured_at,
    }));

    return NextResponse.json({ records });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (
      !body.tourId ||
      !body.attractionId ||
      !body.visitorId ||
      !body.sessionId ||
      !body.recognitionKey ||
      !body.landmarkName ||
      !body.result ||
      !body.stage ||
      !body.attemptNumber
    ) {
      return NextResponse.json(
        { message: "필수 촬영 기록이 누락되었습니다." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("capture_records")
      .insert({
        tour_id: body.tourId,
        attraction_id: body.attractionId,
        visitor_id: body.visitorId,
        session_id: body.sessionId,
        recognition_key: body.recognitionKey,
        landmark_name: body.landmarkName,
        result: body.result,
        stage: body.stage,
        attempt_number: body.attemptNumber,
        distance: body.distance ?? null,
        good_matches: body.goodMatches ?? null,
        match_ratio: body.matchRatio ?? null,
        captured_at: body.capturedAt ?? new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error(error);

      return NextResponse.json(
        { message: "촬영 기록을 저장하지 못했습니다." },
        { status: 500 }
      );
    }

    // Maintain separate, informational guest stamp progress after a reported
    // successful capture. This record is client-reported, NOT coupon eligibility.
    // Keep capture audit logging independent of guest session failures.
    let guestToken: string | null = null;
    if (body.result === "success" && body.stage === "completed") {
      try {
        const { data: attraction, error: attractionError } = await supabaseAdmin
          .from("attractions").select("id, tour_id")
          .eq("id", Number(body.attractionId)).eq("tour_id", String(body.tourId))
          .maybeSingle();
        if (attractionError) throw attractionError;
        if (attraction) {
          const session = await ensureGuestSession(request);
          guestToken = session.newToken;
          const { error: stampError } = await supabaseAdmin.from("visitor_stamps").upsert({
            session_id: session.id,
            tour_id: String(body.tourId),
            attraction_id: Number(body.attractionId),
            evidence: "client_reported",
          }, { onConflict: "session_id,attraction_id", ignoreDuplicates: true });
          if (stampError) throw stampError;
        }
      } catch (stampError) {
        console.error("Guest stamp persistence failed", stampError);
      }
    }

    const response = NextResponse.json(
      { message: "촬영 기록이 저장되었습니다.", record: data },
      { status: 201 }
    );
    return setGuestCookie(response, guestToken);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
