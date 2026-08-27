"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearAdminApiKey, getAdminApiKey } from "@/lib/adminApiKey";
import TourSelector from "@/components/TourSelector";
import styles from "./AttractionList.module.css";

type Attraction = {
  id: number;
  name: string;
  category: string;
  referenceImages: number;
  status: string;
  lastTestResult?: "통과" | "실패" | "미실시";
};

type RecognitionTestRecord = { lastResult: "통과" | "실패" };
type NextAction = {
  step: string;
  description: string;
  label: string;
  href: string;
  tone: "ready" | "attention" | "complete";
};

export default function AttractionListPage() {
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [tourId, setTourId] = useState("amsa");
  const [tourName, setTourName] = useState("선택한 투어");
  const [selectionMode, setSelectionMode] = useState<boolean | null>(null);

  useEffect(() => {
    const loadAttractions = async () => {
      try {
        const savedNotice = sessionStorage.getItem("loqest_admin_notice");
        if (savedNotice) {
          setNoticeMessage(savedNotice);
          sessionStorage.removeItem("loqest_admin_notice");
        }
        const selectedTourId = new URLSearchParams(window.location.search).get("tourId");
        if (!selectedTourId) {
          setSelectionMode(true);
          return;
        }
        setSelectionMode(false);
        const adminKey = getAdminApiKey();
        if (!adminKey) {
          setErrorMessage("관리자 API 키를 확인해주세요.");
          return;
        }
        setTourId(selectedTourId);
        localStorage.setItem("loqest_active_tour_id", selectedTourId);

        const recognitionRecords = JSON.parse(
          localStorage.getItem("loqest_recognition_test_records") || "{}",
        ) as Record<string, RecognitionTestRecord>;
        const headers = { "x-admin-api-key": adminKey };
        const [tourResponse, response] = await Promise.all([
          fetch(`/api/tours/${selectedTourId}?includeHidden=true`, { headers, cache: "no-store" }),
          fetch(`/api/attractions?tourId=${encodeURIComponent(selectedTourId)}&includeHidden=true`, { headers, cache: "no-store" }),
        ]);
        if (response.status === 401) {
          clearAdminApiKey();
          throw new Error("관리자 API 키가 올바르지 않습니다. 새로고침 후 다시 입력해주세요.");
        }
        if (!response.ok) throw new Error("퀘스트 데이터를 불러오지 못했습니다.");
        if (tourResponse.ok) {
          const tourResult = await tourResponse.json() as { tour?: { name: string } };
          if (tourResult.tour) setTourName(tourResult.tour.name);
        }

        const result = await response.json();
        const combinedAttractions = result.attractions.map(
          (attraction: Omit<Attraction, "referenceImages"> & { referenceImages: unknown[] }) => ({
            ...attraction,
            referenceImages: attraction.referenceImages.length,
            lastTestResult: recognitionRecords[String(attraction.id)]?.lastResult ?? "미실시",
          }),
        );
        setAttractions(combinedAttractions);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "퀘스트 데이터를 불러오지 못했습니다.");
      } finally {
        setLoaded(true);
      }
    };
    void loadAttractions();
  }, []);

  const getNextAction = (attraction: Attraction): NextAction => {
    if (attraction.referenceImages === 0) {
      return {
        step: "2단계 · 이미지 필요",
        description: "기준 이미지를 먼저 등록해주세요.",
        label: "이미지 등록",
        href: `/admin/attractions/${attraction.id}/edit?tourId=${tourId}`,
        tone: "attention",
      };
    }
    if (attraction.lastTestResult !== "통과") {
      return {
        step: "3단계 · 테스트 필요",
        description: attraction.lastTestResult === "실패" ? "이미지를 보완하거나 다시 테스트해주세요." : "실제 촬영으로 인식 여부를 확인해주세요.",
        label: "인식 테스트",
        href: `/landmark-test?attractionId=${attraction.id}`,
        tone: "attention",
      };
    }
    if (attraction.status !== "공개") {
      return {
        step: "공개 준비 완료",
        description: "테스트를 통과했습니다. 상세 화면에서 공개할 수 있습니다.",
        label: "공개 설정",
        href: `/admin/attractions/${attraction.id}`,
        tone: "ready",
      };
    }
    return {
      step: "정상 운영 중",
      description: "홈페이지에 공개되어 있습니다.",
      label: "정보 수정",
      href: `/admin/attractions/${attraction.id}/edit?tourId=${tourId}`,
      tone: "complete",
    };
  };

  const publishedCount = attractions.filter((item) => item.status === "공개").length;
  const actionNeededCount = attractions.filter((item) => getNextAction(item).tone === "attention").length;

  if (selectionMode === null) {
    return <div className={styles.page}>투어 목록을 준비하는 중입니다.</div>;
  }
  if (selectionMode) return <TourSelector mode="quests" />;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <a href="/admin/attractions" className={styles.backToSelection}>
            ← 투어 선택으로 돌아가기
          </a>
          <p className={styles.eyebrow}>LOQEST Admin</p>
          <h1>퀘스트 관리</h1>
          <p className={styles.description}>{tourName} 안의 퀘스트를 등록하고 공개 상태를 관리합니다.</p>
        </div>
        <Link href={`/admin/attractions/new?tourId=${tourId}`} className={styles.primaryButton}>+ 새 퀘스트 등록</Link>
      </header>

      {noticeMessage && (
        <div className={styles.successNotice} role="status">
          <span>✓</span>
          <div><strong>공개가 완료되었습니다.</strong><p>{noticeMessage}</p></div>
        </div>
      )}

      <section className={styles.workflow} aria-label="퀘스트 등록 순서">
        <article><span>1</span><div><strong>정보와 위치 입력</strong><p>퀘스트 기본 정보와 인증 범위를 설정합니다.</p></div></article>
        <article><span>2</span><div><strong>기준 이미지 등록</strong><p>여러 각도에서 촬영한 이미지를 등록합니다.</p></div></article>
        <article><span>3</span><div><strong>인식 테스트 후 공개</strong><p>테스트를 통과하면 홈페이지에 공개합니다.</p></div></article>
      </section>

      <section className={styles.summary}>
        <article><span>전체 퀘스트</span><strong>{attractions.length}곳</strong></article>
        <article><span>공개 중</span><strong>{publishedCount}곳</strong></article>
        <article><span>다음 작업 필요</span><strong>{actionNeededCount}곳</strong></article>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <h2>등록 퀘스트</h2>
          <p>상세보기에서 퀘스트 정보 수정, 이미지 등록, 인식 테스트와 공개 설정을 진행할 수 있습니다.</p>
        </div>

        {errorMessage ? (
          <div className={styles.messageState}><strong>불러오지 못했습니다.</strong><p>{errorMessage}</p></div>
        ) : !loaded ? (
          <div className={styles.messageState}><p>퀘스트 정보를 불러오는 중입니다.</p></div>
        ) : attractions.length === 0 ? (
          <div className={styles.messageState}>
            <strong>아직 등록된 퀘스트가 없습니다.</strong>
            <p>첫 퀘스트를 등록하면 이곳에서 진행 상태를 확인할 수 있습니다.</p>
            <Link href={`/admin/attractions/new?tourId=${tourId}`} className={styles.emptyAction}>첫 퀘스트 등록하기</Link>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.simpleTable}>
              <thead><tr><th>퀘스트</th><th>카테고리</th><th>공개 상태</th><th>현재 진행 상태</th><th>관리</th></tr></thead>
              <tbody>
                {attractions.map((attraction) => {
                  const action = getNextAction(attraction);
                  return (
                    <tr key={attraction.id}>
                      <td><Link href={`/admin/attractions/${attraction.id}`} className={styles.attractionName}>{attraction.name}</Link></td>
                      <td>{attraction.category}</td>
                      <td><span className={attraction.status === "공개" ? styles.published : styles.draft}>{attraction.status}</span></td>
                      <td><div className={styles.progressState}><strong className={styles[action.tone]}>{action.step}</strong><span>{action.description}</span></div></td>
                      <td>
                        <Link
                          href={`/admin/attractions/${attraction.id}`}
                          className={styles.detailLink}
                        >
                          상세보기
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
