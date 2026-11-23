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
  needsImageTest?: boolean;
};

type RecognitionTestRecord = { approved: boolean };

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
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState("");

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const adminKey = getAdminApiKey();
        if (!adminKey) return;

        const headers = { "x-admin-api-key": adminKey };
        localStorage.setItem("loqest_active_tour_id", tourId);
        const [tourResponse, attractionsResponse, recordsResponse] = await Promise.all([
          fetch(`/api/tours/${tourId}?includeHidden=true`, { headers, cache: "no-store" }),
          fetch(`/api/attractions?tourId=${encodeURIComponent(tourId)}&includeHidden=true`, { headers, cache: "no-store" }),
          fetch(`/api/recognition-test-records?tourId=${encodeURIComponent(tourId)}`, { headers, cache: "no-store" }),
        ]);

        if (tourResponse.status === 401 || attractionsResponse.status === 401 || recordsResponse.status === 401) {
          clearAdminApiKey();
          throw new Error(
            "관리자 API 키가 올바르지 않습니다. 새로고침 후 다시 입력해주세요."
          );
        }

        if (!tourResponse.ok || !attractionsResponse.ok || !recordsResponse.ok) {
          throw new Error("대시보드 API 조회에 실패했습니다.");
        }

        const tourBody = (await tourResponse.json()) as { tour?: Tour };
        const attractionsBody = (await attractionsResponse.json()) as {
          attractions?: ApiAttraction[];
        };
        const recordsBody = (await recordsResponse.json()) as { records?: Record<string, RecognitionTestRecord> };
        const recognitionRecords = recordsBody.records ?? {};
        const apiAttractions = Array.isArray(attractionsBody.attractions)
          ? attractionsBody.attractions
          : [];
        setTour(tourBody.tour ?? null);

        setAttractions(
          apiAttractions.map((attraction) => {
            const record = recognitionRecords[String(attraction.id)];
            const hasImages = Array.isArray(attraction.referenceImages) && attraction.referenceImages.length > 0;

            const requiresRetest = attraction.quality === "재테스트 필요";
            const isTestApproved = !requiresRetest && record?.approved === true;

            return {
              ...attraction,
              referenceImages: Array.isArray(attraction.referenceImages)
                ? attraction.referenceImages.length
                : 0,
              firstSuccess: null,
              quality: attraction.quality,
              needsImageTest: !hasImages || !isTestApproved,
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

  async function toggleTourStatus() {
    if (!tour || statusSaving) return;
    const nextStatus = tour.status === "공개" ? "비공개" : "공개";
    const description = nextStatus === "공개"
      ? "이 투어를 공개할까요? 공개된 퀘스트가 관광객 화면에 표시됩니다."
      : "이 투어를 비공개로 전환할까요? 관광객의 투어 목록에서 보이지 않게 됩니다.";
    if (!window.confirm(description)) return;

    setStatusError("");
    setStatusSaving(true);
    try {
      const adminKey = getAdminApiKey();
      if (!adminKey) throw new Error("관리자 API 키가 없습니다. 관리자 화면을 새로고침해 주세요.");
      const response = await fetch(`/api/tours/${encodeURIComponent(tourId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-admin-api-key": adminKey },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await response.json() as { tour?: { status: string }; message?: string };
      if (response.status === 401) {
        clearAdminApiKey();
        throw new Error("관리자 API 키가 올바르지 않습니다.");
      }
      if (!response.ok || result.tour?.status !== nextStatus) {
        throw new Error(result.message || "공개 상태를 변경하지 못했습니다.");
      }
      setTour((previous) => previous ? { ...previous, status: nextStatus } : previous);
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "공개 상태를 변경하지 못했습니다.");
    } finally {
      setStatusSaving(false);
    }
  }

  const totalCount = attractions.length;
  const publicCount = attractions.filter((item) => item.status === "공개").length;
  const alerts = attractions.filter((item) => item.needsImageTest);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1>{tour?.name ?? "투어 운영 대시보드"}</h1>
            <p>{tour?.region ? `${tour.region} · ` : ""}등록된 퀘스트 기준 운영 현황</p>
          </div>
        </header>

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

        <section className={styles.tourActions}>
          <div className={styles.tourActionsSummary}>
            <strong>투어 운영 관리</strong>
            <p>투어의 공개 상태를 확인하고 바로 변경할 수 있어요.</p>
            <div className={styles.tourStatusRow} aria-live="polite">
              <span className={styles.tourStatusLabel}>현재 공개 상태</span>
              {tour ? (
                <span className={`${styles.tourStatusBadge} ${tour.status === "공개" ? styles.tourStatusPublic : styles.tourStatusPrivate}`}>
                  <span className={styles.tourStatusDot} aria-hidden="true" />
                  {tour.status === "공개" ? "공개 중" : "비공개"}
                </span>
              ) : <span className={styles.tourStatusLabel}>불러오는 중</span>}
            </div>
            {statusError && <p className={styles.tourStatusError} role="alert">{statusError}</p>}
          </div>
          <div className={styles.tourActionButtons}>
            <button type="button" className={`${styles.tourStatusButton} ${tour?.status === "공개" ? styles.tourHideButton : styles.tourPublishButton}`}
              onClick={toggleTourStatus} disabled={!tour || !loaded || statusSaving}>
              {statusSaving ? "변경 중..." : tour?.status === "공개" ? "비공개로 전환" : "투어 공개하기"}
            </button>
            <Link href={`/admin/tours/${encodeURIComponent(tourId)}/edit`} className={styles.tourEdit}>투어 정보 수정</Link>
          </div>
        </section>

        <section className={styles.questListSection}>
          <div className={styles.questListHeader}>
            <div><h2>이 투어의 퀘스트</h2><p>퀘스트별 등록·테스트·공개 현황을 확인하세요.</p></div>
            <Link href={`/admin/attractions/new?tourId=${encodeURIComponent(tourId)}`} className={styles.newQuestButton}>+ 새 퀘스트 추가</Link>
          </div>
          <div className={styles.questListBody}>
            {attractions.length===0?<p className={styles.dashboardEmpty}>아직 등록된 퀘스트가 없습니다. 새 퀘스트를 추가해보세요.</p>:
              [...attractions].sort((a,b)=>b.id-a.id).map(attraction=><article className={`${styles.questListRow} ${attraction.needsImageTest?styles.newQuestRow:""}`} key={attraction.id}>
                <span className={styles.questCategoryIcon}>{{"역사·문화":"🗺️","자연·생태":"🌿","축제·행사":"🎉","체험·레저":"🎯","지역상권":"🛍️","기타":"✨"}[attraction.category]||"📍"}</span>
                <div className={styles.questListContent}><strong>{attraction.name}</strong>{attraction.needsImageTest&&<span className={styles.newBadge}>테스트 필요</span>}<p>{attraction.status}</p></div>
                <div className={styles.questRowActions}>
                  {attraction.needsImageTest&&<Link className={styles.questTestLink} href={`/landmark-test?attractionId=${encodeURIComponent(String(attraction.id))}`}>이미지 인식 테스트</Link>}
                  <Link className={styles.questManageLink} href={`/admin/attractions/${attraction.id}`}>관리하기</Link>
                </div>
              </article>)}
          </div>
        </section>

      </main>
    </div>
  );
}
