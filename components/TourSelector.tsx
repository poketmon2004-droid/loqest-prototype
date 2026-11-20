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

  const visibleTours=filteredTours.filter(t=>regionFilter==="all"||t.region.startsWith(regionFilter));
  const regions=[...new Set(tours.map(t=>t.region.split(" ")[0]).filter(Boolean))].sort();
  return (
    <main className={styles.page}>
      <div className={styles.eyebrow}>TOUR MANAGEMENT</div>
      <h1 className={styles.homeTitle}>관리할 투어를 선택하세요</h1>
      <p className={styles.homeSub}>기존 투어를 찾아 관리하거나 새로운 투어를 등록할 수 있어요.</p>
      <Link href="/admin/tours/new" className={styles.createFeature}>
        <span aria-hidden="true" className={styles.featureIcon}>+</span>
        <span className={styles.featureText}>
          <strong>새로운 투어를 등록하시겠어요?</strong>
          <small>새로운 지역의 여행 코스를 만들고, 퀘스트를 등록해 보세요.</small>
          <span className={styles.featureLink}>+ 새 투어 등록하기</span>
        </span>
      </Link>
      <section className={styles.searchPanel}>
        <h2 className={styles.searchTitle}>기존 투어 관리</h2>
        <p className={styles.searchSub}>지역을 선택하거나 투어명을 검색하세요.</p>
        <div className={styles.regionFilters} role="group" aria-label="지역 필터">
          <button type="button" className={regionFilter==="all"?styles.regionFilterActive:styles.regionFilter} onClick={()=>setRegionFilter("all")}>전체</button>
          {regions.map(region=><button type="button" key={region} className={regionFilter===region?styles.regionFilterActive:styles.regionFilter} onClick={()=>setRegionFilter(region)}>{region}</button>)}
        </div>
        <input className={styles.searchbox} value={search} type="search" onChange={e=>setSearch(e.target.value)} placeholder="투어명 또는 지역 검색" aria-label="투어 검색"/>
        <div className={styles.listHead}><strong>투어 목록</strong><small>{visibleTours.length}개 투어</small></div>
        {errorMessage?<p className={styles.empty}>{errorMessage}</p>:!loaded?<p className={styles.empty}>투어 목록을 불러오는 중입니다.</p>:visibleTours.length===0?<p className={styles.empty}>조건에 맞는 투어가 없습니다.</p>:
          <div>{visibleTours.map(tour=><article className={styles.tourRow} key={tour.id}>
            <span className={styles.tourPin} aria-hidden="true">⌖</span>
            <div className={styles.tourDesc}><strong>{tour.name}</strong><small>{tour.region||"지역 미입력"}</small></div>
            <Link className={styles.openTour} href={`/admin/tours/${encodeURIComponent(tour.id)}`}>관리하기</Link>
          </article>)}</div>}
      </section>
    </main>
  );
}
