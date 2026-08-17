"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./AttractionList.module.css";

type Attraction = {
  id: number;
  name: string;
  category: string;
  radius: number;
  referenceImages: number;
  firstSuccess: number | null;
  status: string;
  quality: string;
  lastTestResult?: "통과" | "실패" | "미실시";
};

type RecognitionTestRecord = {
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  recentResults: boolean[];
  lastResult: "통과" | "실패";
  lastTestedAt: string;
  quality: "정상" | "확인 필요" | "기준 이미지 개선";
};

const defaultAttractions: Attraction[] = [
  { id: 1, name: "안내판", category: "역사·문화", radius: 50, referenceImages: 12, firstSuccess: 76, status: "공개", quality: "정상" },
  { id: 2, name: "캐릭터", category: "포토 미션", radius: 50, referenceImages: 15, firstSuccess: 68, status: "공개", quality: "확인 필요" },
  { id: 3, name: "소망움집", category: "역사·문화", radius: 70, referenceImages: 11, firstSuccess: 31, status: "공개", quality: "기준 이미지 개선" },
];

export default function AttractionListPage() {
  const [attractions, setAttractions] = useState<Attraction[]>(defaultAttractions);

  useEffect(() => {
    try {
      const storedAttractions = JSON.parse(localStorage.getItem("loqest_attractions") || "[]") as Attraction[];
      const attractionEdits = JSON.parse(localStorage.getItem("loqest_attraction_edits") || "{}") as Record<string, Partial<Attraction>>;
      const savedStatuses = JSON.parse(localStorage.getItem("loqest_attraction_statuses") || "{}") as Record<string, string>;
      const deletedIds = JSON.parse(localStorage.getItem("loqest_deleted_attraction_ids") || "[]") as number[];
      const recognitionRecords = JSON.parse(localStorage.getItem("loqest_recognition_test_records") || "{}") as Record<string, RecognitionTestRecord>;

      const combinedAttractions = [...defaultAttractions, ...storedAttractions]
        .filter((attraction) => !deletedIds.includes(attraction.id))
        .map((attraction) => {
          const edited = { ...attraction, ...(attractionEdits[String(attraction.id)] ?? {}) };
          const record = recognitionRecords[String(attraction.id)];

          return {
            ...edited,
            status: savedStatuses[String(attraction.id)] ?? edited.status,
            quality: record?.quality ?? edited.quality,
            lastTestResult: record?.lastResult ?? "미실시",
          };
        });

      setAttractions(combinedAttractions);
    } catch (error) {
      console.error("관광지 데이터를 불러오지 못했습니다.", error);
    }
  }, []);

  const getQualityClass = (quality: string) => {
    if (quality === "정상") return styles.normal;
    if (quality === "확인 필요") return styles.warning;
    if (quality === "기준 이미지 개선") return styles.danger;
    return styles.neutral;
  };

  const getTestClass = (result?: string) => {
    if (result === "통과") return styles.testPassed;
    if (result === "실패") return styles.testFailed;
    return styles.testNotRun;
  };

  const publishedCount = attractions.filter((item) => item.status === "공개").length;
  const improvementCount = attractions.filter((item) => item.quality === "기준 이미지 개선").length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>LOQEST Admin</p>
          <h1>관광지 관리</h1>
          <p className={styles.description}>등록된 관광지와 인증 상태를 관리합니다.</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/admin" className={styles.secondaryButton}>대시보드</Link>
          <Link href="/admin/attractions/new" className={styles.primaryButton}>+ 새 관광지 등록</Link>
        </div>
      </header>

      <section className={styles.summary}>
        <article><span>전체 관광지</span><strong>{attractions.length}곳</strong></article>
        <article><span>공개 중</span><strong>{publishedCount}곳</strong></article>
        <article><span>개선 필요</span><strong>{improvementCount}곳</strong></article>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <h2>등록 관광지</h2>
          <p>상세 페이지에서 위치, 기준 이미지와 관리 기능을 확인할 수 있습니다.</p>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.simpleTable}>
            <thead>
              <tr>
                <th>관광지</th>
                <th>카테고리</th>
                <th>인증 상태</th>
                <th>최근 테스트</th>
                <th>공개 상태</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {attractions.map((attraction) => (
                <tr key={attraction.id}>
                  <td>
                    <Link href={`/admin/attractions/${attraction.id}`} className={styles.attractionName}>
                      {attraction.name}
                    </Link>
                  </td>
                  <td>{attraction.category}</td>
                  <td>
                    <span className={`${styles.statusDot} ${getQualityClass(attraction.quality)}`} />
                    {attraction.quality}
                  </td>
                  <td>
                    <span className={`${styles.testResult} ${getTestClass(attraction.lastTestResult)}`}>
                      {attraction.lastTestResult ?? "미실시"}
                    </span>
                  </td>
                  <td>
                    <span className={attraction.status === "공개" ? styles.published : styles.draft}>
                      {attraction.status}
                    </span>
                  </td>
                  <td>
                    <Link href={`/admin/attractions/${attraction.id}`} className={styles.detailsButton}>
                      상세보기
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}