import { Buffer } from "node:buffer";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Context = { params: Promise<{ id: string }> };

type ReferenceImageInput = {
  id?: string;
  name?: string;
  dataUrl?: string;
  path?: string;
};

type StoredReferenceImage = {
  id: number;
  storage_path: string;
};

function authorized(request: NextRequest) {
  return Boolean(
    process.env.ADMIN_API_KEY &&
      request.headers.get("x-admin-api-key") === process.env.ADMIN_API_KEY
  );
}

function publicUrl(path: string) {
  if (path.startsWith("/") || path.startsWith("http")) return path;

  return supabaseAdmin.storage
    .from("landmark-references")
    .getPublicUrl(path).data.publicUrl;
}

function safeFileName(name: string) {
  const extension = name.split(".").pop()?.toLowerCase();
  const safeExtension = extension?.match(/^[a-z0-9]+$/) ? extension : "jpg";
  return `${crypto.randomUUID()}.${safeExtension}`;
}

function decodeDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) {
    throw new Error("지원하지 않는 이미지 형식입니다.");
  }

  return {
    contentType: match[1],
    bytes: Buffer.from(match[2], "base64"),
  };
}

async function load(id: string) {
  return supabaseAdmin
    .from("attractions")
    .select("*, attraction_reference_images(*)")
    .eq("id", id)
    .single();
}

export async function GET(request: NextRequest, context: Context) {
  if (!authorized(request)) {
    return NextResponse.json(
      { message: "관리자 인증이 필요합니다." },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  const { data, error } = await load(id);

  if (error || !data) {
    return NextResponse.json(
      { message: "관광지를 찾지 못했습니다." },
      { status: 404 }
    );
  }

  const images = (data.attraction_reference_images ?? [])
    .sort(
      (a: { sort_order: number }, b: { sort_order: number }) =>
        a.sort_order - b.sort_order
    )
    .map(
      (image: {
        id: number;
        original_name: string;
        storage_path: string;
      }) => ({
        id: String(image.id),
        name: image.original_name,
        dataUrl: publicUrl(image.storage_path),
        path: image.storage_path,
      })
    );

  return NextResponse.json({
    attraction: {
      ...data,
      referenceImages: images,
      attraction_reference_images: undefined,
    },
  });
}

export async function PUT(request: NextRequest, context: Context) {
  if (!authorized(request)) {
    return NextResponse.json(
      { message: "관리자 인증에 실패했습니다." },
      { status: 401 }
    );
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const referenceImages = Array.isArray(body.referenceImages)
      ? (body.referenceImages as ReferenceImageInput[])
      : [];

    const { data: attraction, error: updateError } = await supabaseAdmin
      .from("attractions")
      .update({
        name: body.name,
        category: body.category,
        address: body.address || "",
        description: body.description || "",
        latitude: Number(body.latitude),
        longitude: Number(body.longitude),
        radius: Number(body.radius),
        available_time: body.availableTime || "상시",
        landmark_threshold: Number(body.landmarkThreshold),
        guide_message: body.guideMessage || "",
        status: body.status,
        quality: body.referenceImagesChanged ? "재테스트 필요" : body.quality,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { message: updateError.message },
        { status: 500 }
      );
    }

    const { data: storedImages, error: storedImagesError } =
      await supabaseAdmin
        .from("attraction_reference_images")
        .select("id, storage_path")
        .eq("attraction_id", id);

    if (storedImagesError) {
      return NextResponse.json(
        { message: storedImagesError.message },
        { status: 500 }
      );
    }

    const retainedIds = new Set(
      referenceImages
        .filter((image) => image.path && image.id)
        .map((image) => Number(image.id))
        .filter(Number.isFinite)
    );

    const existingImages = (storedImages ?? []) as StoredReferenceImage[];
    const removedImages = existingImages.filter(
      (image) => !retainedIds.has(Number(image.id))
    );

    if (removedImages.length > 0) {
      const removedIds = removedImages.map((image) => image.id);
      const { error: deleteRowsError } = await supabaseAdmin
        .from("attraction_reference_images")
        .delete()
        .in("id", removedIds);

      if (deleteRowsError) {
        return NextResponse.json(
          { message: deleteRowsError.message },
          { status: 500 }
        );
      }

      const storagePaths = removedImages
        .map((image) => image.storage_path)
        .filter(
          (path: string) =>
            !path.startsWith("/") && !path.startsWith("http")
        );

      if (storagePaths.length > 0) {
        const { error: storageDeleteError } = await supabaseAdmin.storage
          .from("landmark-references")
          .remove(storagePaths);

        if (storageDeleteError) {
          console.error(storageDeleteError);
        }
      }
    }

    for (const [index, image] of referenceImages.entries()) {
      if (image.path && image.id) {
        const { error: orderError } = await supabaseAdmin
          .from("attraction_reference_images")
          .update({ sort_order: index })
          .eq("id", Number(image.id))
          .eq("attraction_id", id);

        if (orderError) {
          return NextResponse.json(
            { message: orderError.message },
            { status: 500 }
          );
        }

        continue;
      }

      if (!image.dataUrl) continue;

      const { contentType, bytes } = decodeDataUrl(image.dataUrl);
      const storagePath = `${id}/${safeFileName(image.name || "image.jpg")}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("landmark-references")
        .upload(storagePath, bytes, {
          contentType,
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json(
          { message: uploadError.message },
          { status: 500 }
        );
      }

      const { error: insertError } = await supabaseAdmin
        .from("attraction_reference_images")
        .insert({
          attraction_id: Number(id),
          original_name: image.name || "image.jpg",
          storage_path: storagePath,
          sort_order: index,
        });

      if (insertError) {
        await supabaseAdmin.storage
          .from("landmark-references")
          .remove([storagePath]);

        return NextResponse.json(
          { message: insertError.message },
          { status: 500 }
        );
      }
    }

    const { data: refreshed, error: refreshError } = await load(id);

    if (refreshError || !refreshed) {
      return NextResponse.json({ attraction });
    }

    return NextResponse.json({ attraction: refreshed });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "관광지 수정 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  if (!authorized(request)) {
    return NextResponse.json(
      { message: "관리자 인증에 실패했습니다." },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  const { data: images } = await supabaseAdmin
    .from("attraction_reference_images")
    .select("storage_path")
    .eq("attraction_id", id);

  const storagePaths = (
    (images ?? []) as Array<{ storage_path: string }>
  )
    .map((image) => image.storage_path)
    .filter(
      (path: string) =>
        !path.startsWith("/") && !path.startsWith("http")
    );

  if (storagePaths.length) {
    await supabaseAdmin.storage
      .from("landmark-references")
      .remove(storagePaths);
  }

  const { error } = await supabaseAdmin
    .from("attractions")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: "관광지가 삭제되었습니다." });
}