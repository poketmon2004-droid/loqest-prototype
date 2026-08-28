import {
  NextRequest,
  NextResponse,
} from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

function authorized(_request: NextRequest) {
  return true;
}

export async function GET(
  request: NextRequest,
  context: Context
) {
  const includeHidden =
    request.nextUrl.searchParams.get(
      "includeHidden"
    ) === "true";

  if (includeHidden && !authorized(request)) {
    return NextResponse.json(
      {
        message: "관리자 인증이 필요합니다.",
      },
      {
        status: 401,
      }
    );
  }

  const { id } = await context.params;

  let query = supabaseAdmin
    .from("tours")
    .select("*")
    .eq("id", id);

  if (!includeHidden) {
    query = query.eq("status", "공개");
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return NextResponse.json(
      {
        message: "투어를 찾지 못했습니다.",
      },
      {
        status: 404,
      }
    );
  }

  return NextResponse.json({
    tour: data,
  });
}

export async function PUT(
  request: NextRequest,
  context: Context
) {
  if (!authorized(request)) {
    return NextResponse.json(
      {
        message: "관리자 인증에 실패했습니다.",
      },
      {
        status: 401,
      }
    );
  }

  const { id } = await context.params;
  const input = await request.json();

  const { data, error } = await supabaseAdmin
    .from("tours")
    .update({
      name: String(input.name || "").trim(),
      short_name: String(input.name || "").trim(),
      province: String(
        input.province || ""
      ).trim(),
      region: String(input.region || "").trim(),
      description: String(
        input.description || ""
      ).trim(),
      status:
        input.status === "공개"
          ? "공개"
          : "비공개",
      badge_name: `${String(input.name || "").trim()} 탐험가`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      {
        message:
          error?.message ||
          "투어를 수정하지 못했습니다.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    tour: data,
  });
}

export async function DELETE(
  request: NextRequest,
  context: Context,
) {
  if (!authorized(request)) {
    return NextResponse.json(
      {
        message: "관리자 인증에 실패했습니다.",
      },
      {
        status: 401,
      },
    );
  }

  const { id } = await context.params;

  try {
    // 삭제할 관광지 내부 퀘스트 확인
    const {
      data: attractions,
      error: attractionLoadError,
    } = await supabaseAdmin
      .from("attractions")
      .select("id")
      .eq("tour_id", id);

    if (attractionLoadError) {
      throw attractionLoadError;
    }

    const attractionIds = (attractions ?? []).map(
      (attraction) => attraction.id,
    );

    let storagePaths: string[] = [];

    if (attractionIds.length > 0) {
      // 기준 이미지 저장 경로 확인
      const {
        data: referenceImages,
        error: referenceLoadError,
      } = await supabaseAdmin
        .from("attraction_reference_images")
        .select("storage_path")
        .in("attraction_id", attractionIds);

      if (referenceLoadError) {
        throw referenceLoadError;
      }

      storagePaths = (referenceImages ?? [])
        .map((image) => image.storage_path)
        .filter(
          (path: string) =>
            !path.startsWith("/") &&
            !path.startsWith("http"),
        );

      // 참여자 인증 기록 삭제
      const { error: recordDeleteError } =
        await supabaseAdmin
          .from("capture_records")
          .delete()
          .eq("tour_id", id);

      if (recordDeleteError) {
        throw recordDeleteError;
      }

      // 기준 이미지 DB 기록 삭제
      const { error: imageDeleteError } =
        await supabaseAdmin
          .from("attraction_reference_images")
          .delete()
          .in("attraction_id", attractionIds);

      if (imageDeleteError) {
        throw imageDeleteError;
      }

      // 내부 퀘스트 삭제
      const { error: attractionDeleteError } =
        await supabaseAdmin
          .from("attractions")
          .delete()
          .eq("tour_id", id);

      if (attractionDeleteError) {
        throw attractionDeleteError;
      }

      // Supabase Storage 기준 이미지 삭제
      if (storagePaths.length > 0) {
        const { error: storageDeleteError } =
          await supabaseAdmin.storage
            .from("landmark-references")
            .remove(storagePaths);

        if (storageDeleteError) {
          console.error(storageDeleteError);
        }
      }
    }

    // 관광지 자체 삭제
    const { error: tourDeleteError } =
      await supabaseAdmin
        .from("tours")
        .delete()
        .eq("id", id);

    if (tourDeleteError) {
      throw tourDeleteError;
    }

    return NextResponse.json({
      message:
        "관광지와 내부 퀘스트가 모두 삭제되었습니다.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "관광지를 삭제하지 못했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}