"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getAdminApiKey } from "@/lib/adminApiKey";
import styles from "./AdminSidebar.module.css";

export default function AdminSidebar() {
  const pathname = usePathname();
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const parts = pathname.split("/").filter(Boolean);
    const isGlobal = pathname === "/admin" || pathname === "/admin/tours/new";
    if (isGlobal) {
      setSelected(null);
      return;
    }
    const tourFromPath = parts[1] === "tours" && parts[2] && parts[2] !== "new" ? decodeURIComponent(parts[2]) : "";
    const tourFromQuery = new URLSearchParams(window.location.search).get("tourId") || "";
    const tourId = tourFromPath || tourFromQuery || localStorage.getItem("loqest_active_tour_id") || "";
    if (!tourId) {
      setSelected(null);
      return;
    }
    let cancelled = false;
    localStorage.setItem("loqest_active_tour_id", tourId);
    setSelected({ id: tourId, name: "선택한 투어" });
    const key = getAdminApiKey();
    void fetch(`/api/tours/${encodeURIComponent(tourId)}?includeHidden=true`, {
      headers: key ? { "x-admin-api-key": key } : {},
      cache: "no-store",
    }).then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (cancelled) return;
        if (data?.tour?.name) setSelected({ id: tourId, name: data.tour.name });
      }).catch(() => {});
    return () => { cancelled = true; };
  }, [pathname]);

  const active = (path: string) => pathname === path || (path !== "/admin" && pathname.startsWith(path + "/"));
  return (
    <aside className={styles.sidebar}>
      <Link href="/admin" className={styles.logo}>
        <span className={styles.logoMark}>L</span>
        <span>LOQEST <small>ADMIN CONSOLE</small></span>
      </Link>
      <p className={styles.menuTitle}>전체 관리</p>
      <nav className={styles.menu} aria-label="관리자 운영 메뉴">
        <Link href="/admin" className={!selected && pathname === "/admin" ? styles.activeMenu : ""}>▦ &nbsp; 투어 목록</Link>
        <Link href="/admin/tours/new" className={active("/admin/tours/new") ? styles.activeMenu : ""}>＋ &nbsp; 새 투어 등록</Link>
        {selected && (
          <>
            <p className={styles.tourCaption}>선택한 투어</p>
            <Link className={styles.tourName} href={`/admin/tours/${selected.id}`}>{selected.name}</Link>
            <Link href={`/admin/participants?tourId=${encodeURIComponent(selected.id)}`} className={pathname === "/admin/participants" ? styles.activeMenu : ""}>♙ &nbsp; 참여자·인증 현황</Link>
          </>
        )}
      </nav>
    </aside>
  );
}
