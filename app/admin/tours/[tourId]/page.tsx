"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { clearAdminApiKey, getAdminApiKey } from "@/lib/adminApiKey";
import styles from "../../AdminDashboard.module.css";

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
  testCount?: number;
  lastTestedAt?: string | null;
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

type ApiAttraction = Omit<Attraction, "referenceImages"> & {
  referenceImages?: unknown[];
};

type Tour = { id: string; name: string; region: string; description: string; status: string };

export default function AdminDashboardPage() {
  const params = useParams();
  const tourId = String(params.tourId || "amsa");
  const [tour, setTour] = useState<Tour | null>(null);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const adminKey = getAdminApiKey();
        if (!adminKey) return;

        const headers = { "x-admin-api-key": adminKey };
        const recognitionRecords = JSON.parse(
          localStorage.getItem("loqest_recognition_test_records") || "{}"
        ) as Record<string, RecognitionTestRecord>;

        localStorage.setItem("loqest_active_tour_id", tourId);
        const [tourResponse, attractionsResponse] = await Promise.all([
          fetch(`/api/tours/${tourId}?includeHidden=true`, { headers, cache: "no-store" }),
          fetch(`/api/attractions?tourId=${encodeURIComponent(tourId)}&includeHidden=true`, { headers, cache: "no-store" }),
        ]);

        if (tourResponse.status === 401 || attractionsResponse.status === 401) {
          clearAdminApiKey();
          throw new Error(
            "관리자 API 키가 올바르지 않습니다. 새로고침 후 다시 입력해주세요."
          );
        }

        if (!tourResponse.ok || !attractionsResponse.ok) {
          throw new Error("대시보드 API 조회에 실패했습니다.");
        }

        const tourBody = (await tourResponse.json()) as { tour?: Tour };
        const attractionsBody = (await attractionsResponse.json()) as {
          attractions?: ApiAttraction[];
        };
        const apiAttractions = Array.isArray(attractionsBody.attractions)
          ? attractionsBody.attractions
          : [];
        setTour(tourBody.tour ?? null);

        setAttractions(
          apiAttractions.map((attraction) => {
            const record = recognitionRecords[String(attraction.id)];

            return {
              ...attraction,
              referenceImages: Array.isArray(attraction.referenceImages)
                ? attraction.referenceImages.length
                : 0,
              firstSuccess: null,
              quality: record?.quality ?? attraction.quality,
              lastTestResult: record?.lastResult ?? "미실시",
              testCount: record?.totalTests ?? 0,
              lastTestedAt: record?.lastTestedAt ?? null,
            };
          })
        );
      } catch (error) {
        console.error("대시보드 데이터를 불러오지 못했습니다.", error);
      } finally {
        setLoaded(true);
      }
    }

    void loadDashboardData();
  }, [tourId]);

  const getStatusClass = (status: string) => {
    if (status === "정상") return styles.normal;
    if (status === "확인 필요" || status === "재테스트 필요") {
      return styles.warning;
    }
    if (status === "기준 이미지 개선") return styles.danger;
    return styles.neutral;
  };

  const totalCount = attractions.length;
  const publicCount = attractions.filter((item) => item.status === "공개").length;
  const alerts = attractions.filter(
    (item) =>
      item.lastTestResult === "미실시" ||
      item.lastTestResult === "실패" ||
      item.quality === "재테스트 필요" ||
      item.quality === "기준 이미지 개선" ||
      item.quality === "확인 필요"
  );

  const getAlertDescription = (attraction: Attraction) => {
    if (attraction.quality === "재테스트 필요") {
      return "기준 이미지가 변경되어 인식 테스트가 필요합니다.";
    }
    if (attraction.quality === "기준 이미지 개선") {
      return "최근 테스트 실패가 반복되어 기준 이미지 개선이 필요합니다.";
    }
    if (attraction.lastTestResult === "실패") {
      return "최근 인식 테스트에 실패했습니다.";
    }
    if (attraction.lastTestResult === "미실시") {
      return "아직 관리자 인식 테스트를 실시하지 않았습니다.";
    }
    return "인식 조건과 기준 이미지를 확인해주세요.";
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <a href="/admin" className={styles.backToSelection}>
              ← 투어 목록으로 돌아가기
            </a>
            <h1>{tour?.name ?? "투어 운영 대시보드"}</h1>
            <p>{tour?.region ? `${tour.region} · ` : ""}등록된 퀘스트 기준 운영 현황</p>
          </div>
        </header>

        <section className={styles.tourActions}>
          <div><strong>투어 운영 관리</strong><p>현재 투어의 정보를 수정하고 퀘스트를 관리하세요.</p></div>
          <Link href={`/admin/tours/${tourId}/edit`} className={styles.tourEdit}>투어 정보 수정</Link>
        </section>

        <section className={styles.metrics}>
          <article className={styles.metricCard}>
            <span>전체 퀘스트</span>
            <strong>{loaded ? `${totalCount}곳` : "-"}</strong>
            <p>현재 등록된 인증 지점</p>
          </article>
          <article className={styles.metricCard}>
            <span>공개 중</span>
            <strong>{loaded ? `${publicCount}곳` : "-"}</strong>
            <p>사용자 화면 노출 상태</p>
          </article>
          <article
            className={`${styles.metricCard} ${alerts.length > 0 ? styles.attentionMetric : styles.normalMetric
              }`}
          >
            <span>확인 필요</span>
            <strong>{loaded ? `${alerts.length}곳` : "-"}</strong>
            <p>
              {loaded && alerts.length === 0
                ? "현재 확인이 필요한 항목이 없습니다."
                : "테스트 또는 이미지 점검 필요"}
            </p>
          </article>
        </section>

        <section className={styles.questListSection}>
          <div className={styles.questListHeader}>
            <div><h2>이 투어의 퀘스트</h2><p>퀘스트별 등록·테스트·공개 현황을 확인하세요.</p></div>
            <Link href={`/admin/attractions/new?tourId=${encodeURIComponent(tourId)}`} className={styles.newQuestButton}>+ 새 퀘스트 추가</Link>
          </div>
          <div className={styles.questListBody}>
            {attractions.length===0?<p className={styles.dashboardEmpty}>아직 등록된 퀘스트가 없습니다. 새 퀘스트를 추가해보세요.</p>:
              attractions.map(attraction=><article className={styles.questListRow} key={attraction.id}>
                <span className={styles.questCategoryIcon}>{{"역사·문화":"🗺️","자연·생태":"🌿","축제·행사":"🎉","체험·레저":"🎯","지역상권":"🛍️","기타":"✨"}[attraction.category]||"📍"}</span>
                <div className={styles.questListContent}><strong>{attraction.name}</strong><p>{attraction.category} · {attraction.status} · {attraction.lastTestResult==="통과"?"테스트 통과":"테스트 필요"}</p></div>
                <Link className={styles.questManageLink} href={`/admin/attractions/${attraction.id}`}>관리하기</Link>
              </article>)}
          </div>
          <Link href={`/admin/attractions?tourId=${encodeURIComponent(tourId)}`} className={styles.allQuestsLink}>전체 퀘스트 관리로 이동</Link>
        </section>

        <section className={styles.alertSection}>
          <div className={styles.sectionHeader}>
            <h2>운영 알림</h2>
            <span>조치 필요 {alerts.length}건</span>
          </div>

          {alerts.length > 0 ? (
            <div className={styles.alertGrid}>
              {alerts.slice(0, 6).map((attraction) => (
                <article className={styles.alertItem} key={attraction.id}>
                  <span className={`${styles.statusDot} ${getStatusClass(attraction.quality)}`} />
                  <div>
                    <strong>{attraction.name}</strong>
                    <p>{getAlertDescription(attraction)}</p>
                    <Link href={`/admin/attractions/${attraction.id}`} className={styles.alertAction}>
                      확인하기
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className={styles.dashboardEmpty}>현재 조치가 필요한 퀘스트가 없습니다.</p>
          )}
        </section>

      </main>
    </div>
  );
}
