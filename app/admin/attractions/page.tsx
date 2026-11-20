"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearAdminApiKey, getAdminApiKey } from "@/lib/adminApiKey";
import TourSelector from "@/components/TourSelector";
import styles from "./AttractionList.module.css";
import AdminBackButton from "@/components/AdminBackButton";

type Attraction = {
  id: number;
  name: string;
  category: string;
  referenceImages: number;
  status: string;
  lastTestResult?: "통과" | "실패" | "미실시";
};

type RecognitionTestRecord = { lastResult: "통과" | "실패" };
export default function AttractionListPage() {
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [tourId, setTourId] = useState("amsa");
  const [newQuestId, setNewQuestId] = useState<number | null>(null);
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
        const idString=localStorage.getItem(`loqest_new_quest_${selectedTourId}`);
        const newId=idString?Number(idString):null;
        if(newId && recognitionRecords[String(newId)]){localStorage.removeItem(`loqest_new_quest_${selectedTourId}`);setNewQuestId(null);}
        else setNewQuestId(newId);
        setAttractions(combinedAttractions);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "퀘스트 데이터를 불러오지 못했습니다.");
      } finally {
        setLoaded(true);
      }
    };
    void loadAttractions();
  }, []);

  if (selectionMode === null) {
    return <div className={styles.page}>투어 목록을 준비하는 중입니다.</div>;
  }
  if (selectionMode) return <TourSelector />;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <AdminBackButton href={`/admin/tours/${tourId}`} />
          <p className={styles.eyebrow}>QUEST MANAGEMENT</p>
          <h1>퀘스트 관리</h1>
          <p className={styles.description}>{tourName}에 등록된 퀘스트를 관리하세요.</p>
        </div>
        <Link href={`/admin/attractions/new?tourId=${tourId}`} className={styles.primaryButton}>+ 새 퀘스트 등록</Link>
      </header>

      {noticeMessage && (
        <div className={styles.successNotice} role="status">
          <span>✓</span>
          <div><strong>공개가 완료되었습니다.</strong><p>{noticeMessage}</p></div>
        </div>
      )}

      <section className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <h2>이 투어의 퀘스트</h2>
          <p>선택한 투어에 속한 퀘스트만 표시됩니다.</p>
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
              <thead>
                <tr>
                  <th>퀘스트</th>
                  <th>상태</th>
                  <th>관리</th>
                </tr>
              </thead>

              <tbody>
                {[...attractions].sort((a,b)=>Number(b.id===newQuestId)-Number(a.id===newQuestId)).map((attraction) => {
                  const categoryIcon: Record<string,string> = { "역사·문화":"🗺️", "자연·생태":"🌿","축제·행사":"🎉","체험·레저":"🎯","지역상권":"🛍️","기타":"✨" };

                  return (
                    <tr key={attraction.id} className={attraction.id===newQuestId?styles.newQuestRow:""}>
                      <td>
                        <div className={styles.questInformation}>
                          <span className={styles.questIcon}>{categoryIcon[attraction.category] || "📍"}</span>
                          <div className={styles.questText}>
                          <div className={styles.questTitleRow}>

                            <Link
                              href={`/admin/attractions/${attraction.id}`}
                              className={styles.attractionName}
                            >
                              {attraction.name}
                            </Link>

                            {attraction.id===newQuestId && <span className={styles.newBadge}>NEW · 인식 테스트 필요</span>}
                            <span className={styles.questCategory}>
                              {attraction.category}
                            </span>
                          </div>

                          <span className={styles.questSubtitle}>{attraction.category} · 기준 이미지 {attraction.referenceImages}장</span>
                          </div>
                        </div>
                      </td>

                      <td><span className={attraction.status==="공개"?styles.published:styles.draft}>{attraction.status}</span></td>
                      <td>
                        <Link
                          href={`/admin/attractions/${attraction.id}`}
                          className={styles.detailLink}
                        >
                          관리하기
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
