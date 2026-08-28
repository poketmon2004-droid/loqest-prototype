"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearAdminApiKey, getAdminApiKey } from "@/lib/adminApiKey";
import TourSelector from "@/components/TourSelector";
import styles from "../AdminDashboard.module.css";
import AdminBackButton from "@/components/AdminBackButton";

type Attraction = {
  id: number;
  name: string;
  status: string;
};

type CaptureRecord = {
  id: string;
  sessionId: string;
  visitorId: string;
  attractionId: number;
  result: "success" | "failure";
  stage: "location" | "landmark" | "completed" | "system";
  attemptNumber: number;
  capturedAt: string;
};

export default function ParticipantsPage() {
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [records, setRecords] = useState<CaptureRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [tourName, setTourName] = useState("선택한 투어");
  const [selectionMode, setSelectionMode] = useState<boolean | null>(null);

  useEffect(() => {
    async function loadParticipants() {
      try {
        const tourId = new URLSearchParams(window.location.search).get("tourId");
        if (!tourId) {
          setSelectionMode(true);
          return;
        }
        setSelectionMode(false);
        const adminKey = getAdminApiKey();
        if (!adminKey) throw new Error("관리자 API 키를 확인해주세요.");
        localStorage.setItem("loqest_active_tour_id", tourId);
        const headers = { "x-admin-api-key": adminKey };
        const [tourResponse, attractionsResponse, recordsResponse] = await Promise.all([
          fetch(`/api/tours/${tourId}?includeHidden=true`, { headers, cache: "no-store" }),
          fetch(`/api/attractions?tourId=${encodeURIComponent(tourId)}&includeHidden=true`, { headers, cache: "no-store" }),
          fetch(`/api/capture-records?tourId=${encodeURIComponent(tourId)}`, { headers, cache: "no-store" }),
        ]);

        if (attractionsResponse.status === 401 || recordsResponse.status === 401) {
          clearAdminApiKey();
          throw new Error("관리자 API 키가 올바르지 않습니다. 새로고침 후 다시 입력해주세요.");
        }
        if (!attractionsResponse.ok || !recordsResponse.ok) {
          throw new Error("참여자 인증 현황을 불러오지 못했습니다.");
        }

        const attractionsBody = (await attractionsResponse.json()) as { attractions?: Attraction[] };
        const recordsBody = (await recordsResponse.json()) as { records?: CaptureRecord[] };
        if (tourResponse.ok) {
          const tourBody = await tourResponse.json() as { tour?: { name: string } };
          if (tourBody.tour) setTourName(tourBody.tour.name);
        }
        setAttractions(Array.isArray(attractionsBody.attractions) ? attractionsBody.attractions : []);
        setRecords(Array.isArray(recordsBody.records) ? recordsBody.records : []);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "참여자 인증 현황을 불러오지 못했습니다.");
      } finally {
        setLoaded(true);
      }
    }
    void loadParticipants();
  }, []);

  const visitorIds = [...new Set(records.map((record) => record.visitorId))];
  const successfulRecords = records.filter(
    (record) => record.result === "success" && record.stage === "completed",
  );
  const publicAttractionIds = attractions
    .filter((attraction) => attraction.status === "공개")
    .map((attraction) => attraction.id);
  const completedVisitors = visitorIds.filter((visitorId) => {
    if (publicAttractionIds.length === 0) return false;
    const completedIds = new Set(
      successfulRecords
        .filter((record) => record.visitorId === visitorId)
        .map((record) => record.attractionId),
    );
    return publicAttractionIds.every((id) => completedIds.has(id));
  }).length;
  const completionRate = visitorIds.length === 0
    ? null
    : Math.round((completedVisitors / visitorIds.length) * 100);

  const summaries = attractions.map((attraction) => {
    const attractionRecords = records.filter((record) => record.attractionId === attraction.id);
    const successes = attractionRecords.filter(
      (record) => record.result === "success" && record.stage === "completed",
    );
    const sessionIds = [...new Set(attractionRecords.map((record) => record.sessionId))];
    const firstSuccesses = sessionIds.filter((sessionId) =>
      attractionRecords.some(
        (record) => record.sessionId === sessionId && record.result === "success" &&
          record.stage === "completed" && record.attemptNumber === 1,
      ),
    ).length;
    const successfulSessionIds = [...new Set(successes.map((record) => record.sessionId))];
    const attemptsUntilSuccess = attractionRecords.filter((record) =>
      successfulSessionIds.includes(record.sessionId),
    ).length;
    const latestTimestamp = attractionRecords.reduce((latest, record) => {
      const timestamp = new Date(record.capturedAt).getTime();
      return Number.isNaN(timestamp) ? latest : Math.max(latest, timestamp);
    }, 0);

    return {
      attraction,
      attempts: attractionRecords.length,
      successes: successes.length,
      firstSuccessRate: sessionIds.length === 0 ? null : Math.round((firstSuccesses / sessionIds.length) * 100),
      averageShots: successfulSessionIds.length === 0 ? null : attemptsUntilSuccess / successfulSessionIds.length,
      lastCapturedAt: latestTimestamp === 0 ? null : new Date(latestTimestamp).toISOString(),
    };
  });

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat("ko-KR", {
      month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    }).format(new Date(date));
  };

  if (selectionMode === null) {
    return <div className={styles.page}><main className={styles.main}>투어 목록을 준비하는 중입니다.</main></div>;
  }
  if (selectionMode) return <TourSelector mode="participants" />;

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <AdminBackButton />
        </header>

        <section className={styles.metrics}>
          <article className={styles.metricCard}><span>촬영 참여자</span><strong>{loaded ? `${visitorIds.length}명` : "-"}</strong><p>촬영을 한 고유 참여자</p></article>
          <article className={styles.metricCard}><span>인증 성공</span><strong>{loaded ? `${successfulRecords.length}건` : "-"}</strong><p>퀘스트 인증 완료 기록</p></article>
          <article className={styles.metricCard}><span>투어 완주율</span><strong>{completionRate === null ? "-" : `${completionRate}%`}</strong><p>공개 퀘스트를 모두 완료한 비율</p></article>
        </section>

        <section className={styles.tableSection}>
          <div className={styles.sectionHeader}>
            <div><h2>퀘스트별 촬영 결과</h2><p>관광객이 실제로 촬영한 기록만 집계됩니다.</p></div>
            <span>전체 촬영 기록 {records.length}건</span>
          </div>
          {errorMessage ? (
            <p className={styles.dashboardEmpty}>{errorMessage}</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table>
                <thead><tr><th>퀘스트</th><th>촬영 시도</th><th>인증 성공</th><th>1회 성공률</th><th>평균 촬영</th><th>최근 촬영</th></tr></thead>
                <tbody>
                  {summaries.map((summary) => (
                    <tr key={summary.attraction.id}>
                      <td><Link href={`/admin/attractions/${summary.attraction.id}`} className={styles.attractionButton}>{summary.attraction.name}</Link></td>
                      <td>{summary.attempts ? `${summary.attempts}회` : "-"}</td>
                      <td>{summary.successes ? `${summary.successes}건` : "-"}</td>
                      <td>{summary.firstSuccessRate === null ? "-" : `${summary.firstSuccessRate}%`}</td>
                      <td>{summary.averageShots === null ? "-" : `${summary.averageShots.toFixed(1)}회`}</td>
                      <td>{formatDate(summary.lastCapturedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {loaded && !errorMessage && records.length === 0 && (
            <p className={styles.dashboardEmpty}>아직 저장된 촬영 참여 기록이 없습니다.</p>
          )}
        </section>
      </main>
    </div>
  );
}
