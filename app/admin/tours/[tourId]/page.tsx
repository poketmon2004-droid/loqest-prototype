"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

type CaptureRecord = {
  id: string;
  sessionId: string;
  visitorId: string;
  tourId: string;
  attractionId: number;
  recognitionKey: string;
  landmarkName: string;
  result: "success" | "failure";
  stage: "location" | "landmark" | "completed" | "system";
  attemptNumber: number;
  distance: number | null;
  goodMatches: number | null;
  matchRatio: number | null;
  capturedAt: string;
};

const defaultAttractions: Attraction[] = [
  { id: 1, name: "안내판", category: "역사·문화", radius: 50, referenceImages: 12, firstSuccess: null, status: "공개", quality: "정상" },
  { id: 2, name: "캐릭터", category: "포토 미션", radius: 50, referenceImages: 15, firstSuccess: null, status: "공개", quality: "확인 필요" },
  { id: 3, name: "소망움집", category: "역사·문화", radius: 70, referenceImages: 11, firstSuccess: null, status: "공개", quality: "기준 이미지 개선" },
];

export default function AdminDashboardPage() {
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [captureRecords, setCaptureRecords] = useState<CaptureRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const storedAttractions = JSON.parse(
          localStorage.getItem("loqest_attractions") || "[]"
        ) as Attraction[];
        const attractionEdits = JSON.parse(
          localStorage.getItem("loqest_attraction_edits") || "{}"
        ) as Record<string, Partial<Attraction>>;
        const savedStatuses = JSON.parse(
          localStorage.getItem("loqest_attraction_statuses") || "{}"
        ) as Record<string, string>;
        const deletedIds = JSON.parse(
          localStorage.getItem("loqest_deleted_attraction_ids") || "[]"
        ) as number[];
        const recognitionRecords = JSON.parse(
          localStorage.getItem("loqest_recognition_test_records") || "{}"
        ) as Record<string, RecognitionTestRecord>;

        const combinedAttractions = [
          ...defaultAttractions,
          ...storedAttractions,
        ]
          .filter((attraction) => !deletedIds.includes(attraction.id))
          .map((attraction) => {
            const edited = {
              ...attraction,
              ...(attractionEdits[String(attraction.id)] ?? {}),
            };
            const record = recognitionRecords[String(attraction.id)];

            return {
              ...edited,
              status:
                savedStatuses[String(attraction.id)] ?? edited.status,
              quality: record?.quality ?? edited.quality,
              lastTestResult: record?.lastResult ?? "미실시",
              testCount: record?.totalTests ?? 0,
              lastTestedAt: record?.lastTestedAt ?? null,
            };
          });

        setAttractions(combinedAttractions);

        const response = await fetch(
          "/api/capture-records?tourId=amsa",
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("촬영 기록 API 조회에 실패했습니다.");
        }

        const responseBody = (await response.json()) as {
          records?: CaptureRecord[];
        };

        setCaptureRecords(
          Array.isArray(responseBody.records) ? responseBody.records : []
        );
      } catch (error) {
        console.error("대시보드 데이터를 불러오지 못했습니다.", error);
        setCaptureRecords([]);
      } finally {
        setLoaded(true);
      }
    }

    void loadDashboardData();
  }, []);

  const getStatusClass = (status: string) => {
    if (status === "정상") return styles.normal;
    if (status === "확인 필요" || status === "재테스트 필요") {
      return styles.warning;
    }
    if (status === "기준 이미지 개선") return styles.danger;
    return styles.neutral;
  };

  const formatDate = (date?: string | null) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const totalCount = attractions.length;
  const publicCount = attractions.filter((item) => item.status === "공개").length;
  const passedCount = attractions.filter((item) => item.lastTestResult === "통과").length;
  const readyCount = attractions.filter(
    (item) => item.status === "공개" && item.lastTestResult === "통과"
  ).length;
  const readyRate = totalCount === 0 ? 0 : Math.round((readyCount / totalCount) * 100);

  const alerts = attractions.filter(
    (item) =>
      item.lastTestResult === "미실시" ||
      item.lastTestResult === "실패" ||
      item.quality === "재테스트 필요" ||
      item.quality === "기준 이미지 개선" ||
      item.quality === "확인 필요"
  );

  const visitorIds = [
    ...new Set(captureRecords.map((record) => record.visitorId)),
  ];
  const participantCount = visitorIds.length;

  const successfulCaptureRecords = captureRecords.filter(
    (record) =>
      record.result === "success" && record.stage === "completed"
  );
  const authenticationSuccessCount = successfulCaptureRecords.length;

  const publicAttractionIds = attractions
    .filter((attraction) => attraction.status === "공개")
    .map((attraction) => attraction.id);

  const completedTouristCount = visitorIds.filter((visitorId) => {
    if (publicAttractionIds.length === 0) return false;

    const completedAttractionIds = new Set(
      successfulCaptureRecords
        .filter((record) => record.visitorId === visitorId)
        .map((record) => record.attractionId)
    );

    return publicAttractionIds.every((attractionId) =>
      completedAttractionIds.has(attractionId)
    );
  }).length;

  const tourCompletionRate =
    participantCount === 0
      ? null
      : Math.round((completedTouristCount / participantCount) * 100);

  const attractionCaptureSummaries = attractions.map((attraction) => {
    const records = captureRecords.filter(
      (record) => record.attractionId === attraction.id
    );
    const successfulRecords = records.filter(
      (record) =>
        record.result === "success" && record.stage === "completed"
    );
    const sessionIds = [...new Set(records.map((record) => record.sessionId))];
    const firstSuccessCount = sessionIds.filter((sessionId) =>
      records.some(
        (record) =>
          record.sessionId === sessionId &&
          record.result === "success" &&
          record.stage === "completed" &&
          record.attemptNumber === 1
      )
    ).length;
    const successfulSessionIds = [
      ...new Set(successfulRecords.map((record) => record.sessionId)),
    ];
    const attemptsUntilSuccess = records.filter((record) =>
      successfulSessionIds.includes(record.sessionId)
    ).length;
    const latestTimestamp = records.reduce((latest, record) => {
      const timestamp = new Date(record.capturedAt).getTime();
      return Number.isNaN(timestamp) ? latest : Math.max(latest, timestamp);
    }, 0);

    return {
      attraction,
      attempts: records.length,
      successes: successfulRecords.length,
      firstSuccessRate:
        sessionIds.length === 0
          ? null
          : Math.round((firstSuccessCount / sessionIds.length) * 100),
      averageShots:
        successfulSessionIds.length === 0
          ? null
          : attemptsUntilSuccess / successfulSessionIds.length,
      lastCapturedAt:
        latestTimestamp === 0 ? null : new Date(latestTimestamp).toISOString(),
    };
  });

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
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>L</span>
          <span>LOQEST Admin</span>
        </div>

        <p className={styles.menuTitle}>운영 메뉴</p>
        <nav className={styles.menu}>
          <Link href="/admin">
            투어 목록
          </Link>

          <Link
            href="/admin/tours/amsa"
            className={styles.activeMenu}
          >
            대시보드
          </Link>

          <Link href="/admin/attractions">
            인증 지점 관리
          </Link>

          <button type="button">
            참여자 현황
          </button>
        </nav>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1>암사동 선사유적지 투어</h1>
            <p>실제 등록 관광지 기준 운영 현황</p>
          </div>
          <Link href="/admin/attractions/new" className={styles.dashboardAction}>
            + 새 관광지 등록
          </Link>
        </header>

        <section className={styles.metrics}>
          <article className={styles.metricCard}>
            <span>전체 관광지</span>
            <strong>{loaded ? `${totalCount}곳` : "-"}</strong>
            <p>현재 등록된 관광지</p>
          </article>
          <article className={styles.metricCard}>
            <span>공개 중</span>
            <strong>{loaded ? `${publicCount}곳` : "-"}</strong>
            <p>사용자 화면 노출 상태</p>
          </article>
          <article className={styles.metricCard}>
            <span>테스트 통과</span>
            <strong>{loaded ? `${passedCount}곳` : "-"}</strong>
            <p>최근 관리자 인식 테스트 기준</p>
          </article>
        </section>

        <section className={styles.progressSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>관광지 공개 준비 현황</h2>
              <p>공개 상태이면서 최근 인식 테스트를 통과한 관광지 기준</p>
            </div>
            <span>준비 완료 {readyCount}곳 / 전체 {totalCount}곳</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressBar} style={{ width: `${readyRate}%` }} />
          </div>
          <div className={styles.progressLabels}>
            <span>검수 필요</span>
            <span>{readyRate}% 준비 완료</span>
          </div>
        </section>

        <section className={styles.tableSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>관광지 운영 상태</h2>
              <p>등록·수정·테스트 결과가 자동으로 반영됩니다.</p>
            </div>
            <Link href="/admin/attractions" className={styles.badge}>전체 관리</Link>
          </div>

          <div className={styles.tableWrapper}>
            <table>
              <thead>
                <tr>
                  <th>관광지</th>
                  <th>기준 이미지</th>
                  <th>최근 테스트</th>
                  <th>테스트 횟수</th>
                  <th>테스트 일시</th>
                  <th>인증 상태</th>
                  <th>공개 상태</th>
                </tr>
              </thead>
              <tbody>
                {attractions.map((attraction) => (
                  <tr key={attraction.id}>
                    <td>
                      <Link
                        href={`/admin/attractions/${attraction.id}`}
                        className={styles.attractionButton}
                      >
                        {attraction.name}
                      </Link>
                    </td>
                    <td>{attraction.referenceImages}장</td>
                    <td>{attraction.lastTestResult ?? "미실시"}</td>
                    <td>{attraction.testCount ?? 0}회</td>
                    <td>{formatDate(attraction.lastTestedAt)}</td>
                    <td>
                      <span className={`${styles.statusDot} ${getStatusClass(attraction.quality)}`} />
                      {attraction.quality}
                    </td>
                    <td>{attraction.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loaded && attractions.length === 0 && (
            <div className={styles.dashboardEmpty}>
              등록된 관광지가 없습니다.
            </div>
          )}
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
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className={styles.dashboardEmpty}>현재 조치가 필요한 관광지가 없습니다.</p>
          )}
        </section>

        <section className={styles.visitorSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>관광객 촬영·인증 현황</h2>
              <p>LOQEST 사용자 촬영 결과가 자동으로 집계됩니다.</p>
            </div>
            <span>실제 촬영 기록 {captureRecords.length}건</span>
          </div>
          <div className={styles.visitorMetrics}>
            <article>
              <span>참여 관광객</span>
              <strong>{loaded && participantCount > 0 ? `${participantCount}명` : "-"}</strong>
            </article>
            <article>
              <span>투어 완주율</span>
              <strong>{tourCompletionRate === null ? "-" : `${tourCompletionRate}%`}</strong>
            </article>
            <article>
              <span>관광객 인증 성공</span>
              <strong>
                {loaded && authenticationSuccessCount > 0
                  ? `${authenticationSuccessCount}건`
                  : "-"}
              </strong>
            </article>
          </div>

          <div className={styles.tableWrapper}>
            <table>
              <thead>
                <tr>
                  <th>관광지</th>
                  <th>촬영 시도</th>
                  <th>인증 성공</th>
                  <th>1회 성공률</th>
                  <th>평균 촬영</th>
                  <th>최근 촬영</th>
                </tr>
              </thead>
              <tbody>
                {attractionCaptureSummaries.map((summary) => (
                  <tr key={summary.attraction.id}>
                    <td>
                      <Link
                        href={`/admin/attractions/${summary.attraction.id}`}
                        className={styles.attractionButton}
                      >
                        {summary.attraction.name}
                      </Link>
                    </td>
                    <td>{summary.attempts > 0 ? `${summary.attempts}회` : "-"}</td>
                    <td>{summary.successes > 0 ? `${summary.successes}건` : "-"}</td>
                    <td>
                      {summary.firstSuccessRate === null
                        ? "-"
                        : `${summary.firstSuccessRate}%`}
                    </td>
                    <td>
                      {summary.averageShots === null
                        ? "-"
                        : `${summary.averageShots.toFixed(1)}회`}
                    </td>
                    <td>{formatDate(summary.lastCapturedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loaded && captureRecords.length === 0 && (
            <p className={styles.dashboardEmpty}>
              아직 저장된 관광객 촬영 기록이 없습니다.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}