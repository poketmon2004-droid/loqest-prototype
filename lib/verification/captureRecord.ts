type CaptureRecord = {
  id: string;
  sessionId: string;
  visitorId: string;
  tourId: string;
  attractionId: number;
  recognitionKey: string;
  landmarkName: string;
  result: "success" | "failure";
  stage: "location" | "landmark" | "completed" | "system";
  attemptNumber: number;
  distance: number | null;
  goodMatches: number | null;
  matchRatio: number | null;
  capturedAt: string;
};

export async function saveCaptureRecord({
    result,
    stage,
    attemptNumber,
    distance = null,
    goodMatches = null,
    matchRatio = null,
  }: {
    result: CaptureRecord["result"];
    stage: CaptureRecord["stage"];
    attemptNumber: number;
    distance?: number | null;
    goodMatches?: number | null;
    matchRatio?: number | null;
  }, context: {
    skipLocationVerification: boolean;
    captureSessionIdRef: { current: string };
    tourId: string;
    attractionId: number;
    recognitionKey: string;
    landmarkName: string;
  }) {
    const { skipLocationVerification, captureSessionIdRef, tourId, attractionId, recognitionKey, landmarkName } = context;
    // 관리자 테스트 촬영은 실제 관광객 통계에 포함하지 않습니다.
    if (skipLocationVerification || typeof window === "undefined") {
     return;
    }

    try {
     let visitorId = localStorage.getItem("loqest_visitor_id");

     if (!visitorId) {
       visitorId = `visitor-${Date.now()}-${Math.random()
         .toString(36)
         .slice(2, 9)}`;

       localStorage.setItem("loqest_visitor_id", visitorId);
     }

     if (!captureSessionIdRef.current) {
       captureSessionIdRef.current = `session-${Date.now()}-${Math.random()
         .toString(36)
         .slice(2, 9)}`;
     }

     const newRecord: CaptureRecord = {
       id: `capture-${Date.now()}-${Math.random()
         .toString(36)
         .slice(2, 9)}`,
       sessionId: captureSessionIdRef.current,
       visitorId,
       tourId,
       attractionId,
       recognitionKey,
       landmarkName,
       result,
       stage,
       attemptNumber,
       distance,
       goodMatches,
       matchRatio,
       capturedAt: new Date().toISOString(),
     };

     const response = await fetch("/api/capture-records", {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
       },
       body: JSON.stringify(newRecord),
     });

     if (!response.ok) {
       const responseBody = await response.json().catch(() => null);
       throw new Error(
         responseBody?.message ?? "촬영 기록 API 저장에 실패했습니다."
       );
     }

     console.log("LOQEST Supabase 촬영 기록 저장:", newRecord);
    } catch (storageError) {
     console.error("Supabase에 촬영 기록을 저장하지 못했습니다.", storageError);
    }
  }
