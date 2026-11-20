"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { clearAdminApiKey, getAdminApiKey } from "@/lib/adminApiKey";
import styles from "./TourSelector.module.css";

type Tour = {
  id: string;
  name: string;
  region: string;
};

export default function TourSelector() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [search, setSearch] = useState("");
  const [regionFilter,setRegionFilter] = useState("all");
  const [loaded, setLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadTours() {
      try {
        const adminKey = getAdminApiKey();

        if (!adminKey) {
          throw new Error("관리자 API 키를 확인해주세요.");
        }

        const response = await fetch("/api/tours?includeHidden=true", {
          headers: {
            "x-admin-api-key": adminKey,
          },
          cache: "no-store",
        });

        if (response.status === 401) {
          clearAdminApiKey();
          throw new Error(
            "관리자 API 키가 올바르지 않습니다. 새로고침 후 다시 입력해주세요.",
          );
        }

        const result = (await response.json()) as {
          tours?: Tour[];
          message?: string;
        };

        if (!response.ok || !Array.isArray(result.tours)) {
          throw new Error(
            result.message || "투어 목록을 불러오지 못했습니다.",
          );
        }

        setTours(result.tours);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "투어 목록을 불러오지 못했습니다.",
        );
      } finally {
        setLoaded(true);
      }
    }

    void loadTours();
  }, []);

  const filteredTours = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return tours;
    }

    return tours.filter((tour) =>
      `${tour.name} ${tour.region}`.toLowerCase().includes(keyword),
    );
  }, [tours, search]);

  const regionOptions=[...new Set(tours.map(t=>t.region.split(" ")[0]).filter(Boolean))].sort();
  const visibleTours=filteredTours.filter(t=>regionFilter==="all"||t.region.startsWith(regionFilter));

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>LOQEST · ADMIN CONSOLE</p><h1>투어 목록</h1><span>관리할 투어를 선택해주세요.</span></div>
      </header>
      <Link href="/admin/tours/new" className={styles.createBanner}>
        <span className={styles.createPlus}>＋</span><span><strong>새 투어 등록하기</strong><small>새로운 관광 투어를 만들고 퀘스트를 추가해보세요.</small></span><span className={styles.createArrow}>등록하기</span>
      </Link>
      <section className={styles.card}>
        <header className={styles.listHeader}><div><h2>기존 투어 관리</h2><p>지역 또는 투어명으로 검색하세요.</p></div><span>{visibleTours.length}개 투어</span></header>
        <div className={styles.controls}>
          <select value={regionFilter} onChange={e=>setRegionFilter(e.target.value)} aria-label="지역 필터"><option value="all">전체 지역</option>{regionOptions.map(region=><option key={region} value={region}>{region}</option>)}</select>
          <input value={search} onChange={event=>setSearch(event.target.value)} placeholder="투어명 또는 관광지 검색" aria-label="투어 검색" />
        </div>
        {errorMessage?<div className={styles.empty}><strong>불러오지 못했습니다.</strong><p>{errorMessage}</p></div>:!loaded?<div className={styles.empty}>투어 목록을 불러오는 중입니다.</div>:visibleTours.length===0?<div className={styles.empty}><strong>조건에 맞는 투어가 없습니다.</strong><p>검색어나 지역 필터를 변경해주세요.</p></div>:
        <div className={styles.tourList}>{visibleTours.map(tour=><article className={styles.tourItem} key={tour.id}><div><strong>{tour.name}</strong><p>{tour.region||"지역 미입력"}</p></div><Link href={`/admin/tours/${encodeURIComponent(tour.id)}`} className={styles.selectButton}>관리하기</Link></article>)}</div>}
      </section>
    </main>
  );
}
