"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DeprecatedQuestListRedirect() {
  const router = useRouter();

  useEffect(() => {
    const tourId = new URLSearchParams(window.location.search).get("tourId")
      || localStorage.getItem("loqest_active_tour_id");
    router.replace(tourId ? `/admin/tours/${encodeURIComponent(tourId)}` : "/admin");
  }, [router]);

  return <main style={{ padding: 24 }}>투어 대시보드로 이동 중입니다.</main>;
}
