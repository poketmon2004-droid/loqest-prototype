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

function authorized(request: NextRequest) {
  return Boolean(
    process.env.ADMIN_API_KEY &&
    request.headers.get("x-admin-api-key") ===
    process.env.ADMIN_API_KEY
  );
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

  const { count } = await supabaseAdmin
    .from("attractions")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("tour_id", id);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        message:
          "등록된 퀘스트를 먼저 삭제해야 투어를 삭제할 수 있습니다.",
      },
      {
        status: 409,
      }
    );
  }

  const { error } = await supabaseAdmin
    .from("tours")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      {
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    message: "투어가 삭제되었습니다.",
  });
}