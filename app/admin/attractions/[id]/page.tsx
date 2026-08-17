"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import styles from "./detail.module.css";

type ReferenceImage = {
    id: string;
    name: string;
    dataUrl: string;
};

type Attraction = {
    id: number;
    name: string;
    category: string;
    address?: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    radius: number;
    availableTime?: string;
    landmarkThreshold?: number;
    guideMessage?: string;
    referenceImages: number;
    referenceImageData?: ReferenceImage[];
    firstSuccess: number | null;
    status: string;
    quality: string;
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
    {
        id: 1,
        name: "안내판",
        category: "역사·문화",
        address: "서울특별시 강동구 암사동",
        description: "암사동 선사유적지 안내판",
        latitude: 37.5607,
        longitude: 127.1304,
        radius: 50,
        availableTime: "상시",
        landmarkThreshold: 40,
        guideMessage: "가이드라인에 맞춰 안내판과 함께 촬영해주세요.",
        referenceImages: 12,
        firstSuccess: 76,
        status: "공개",
        quality: "정상",
    },
    {
        id: 2,
        name: "캐릭터",
        category: "포토 미션",
        address: "서울특별시 강동구 암사동",
        description: "암사동 선사유적지 캐릭터 조형물",
        latitude: 37.5607,
        longitude: 127.1304,
        radius: 50,
        availableTime: "상시",
        landmarkThreshold: 45,
        guideMessage: "가이드라인에 맞춰 캐릭터와 함께 촬영해주세요.",
        referenceImages: 15,
        firstSuccess: 68,
        status: "공개",
        quality: "확인 필요",
    },
    {
        id: 3,
        name: "소망움집",
        category: "역사·문화",
        address: "서울특별시 강동구 암사동",
        description: "암사동 선사유적지 소망움집",
        latitude: 37.5607,
        longitude: 127.1304,
        radius: 70,
        availableTime: "상시",
        landmarkThreshold: 45,
        guideMessage: "가이드라인에 맞춰 소망움집과 함께 촬영해주세요.",
        referenceImages: 11,
        firstSuccess: 31,
        status: "공개",
        quality: "기준 이미지 개선",
    },
];

const defaultReferenceImages: Record<string, string[]> = {
    "1": [
        "/landmarks/inform/reference/KakaoTalk_20260813_072237513.jpg",
        "/landmarks/inform/reference/KakaoTalk_20260813_072237513_01.jpg",
        "/landmarks/inform/reference/KakaoTalk_20260813_072237513_03.jpg",
        "/landmarks/inform/reference/KakaoTalk_20260813_072237513_05.jpg",
        "/landmarks/inform/reference/KakaoTalk_20260813_123330386_11.jpg",
        "/landmarks/inform/reference/KakaoTalk_20260813_123330386_13.jpg",
        "/landmarks/inform/reference/KakaoTalk_20260813_123330386_15.jpg",
        "/landmarks/inform/reference/KakaoTalk_20260813_123330386_16.jpg",
        "/landmarks/inform/reference/KakaoTalk_20260813_123330386_18.jpg",
    ],
    "2": [
        "/landmarks/character/reference/KakaoTalk_20260813_072216328.jpg",
        "/landmarks/character/reference/KakaoTalk_20260813_072216328_01.jpg",
        "/landmarks/character/reference/KakaoTalk_20260813_123330386_19.jpg",
        "/landmarks/character/reference/KakaoTalk_20260813_123330386_21.jpg",
        "/landmarks/character/reference/KakaoTalk_20260813_123330386_23.jpg",
        "/landmarks/character/reference/KakaoTalk_20260813_123330386_25.jpg",
        "/landmarks/character/reference/KakaoTalk_20260813_123330386_26.jpg",
        "/landmarks/character/reference/KakaoTalk_20260813_123330386_27.jpg",
        "/landmarks/character/reference/KakaoTalk_20260813_123331048.jpg",
        "/landmarks/character/reference/KakaoTalk_20260813_123331048_01.jpg",
    ],
    "3": [
        "/landmarks/wish/reference/KakaoTalk_20260813_072216328_02.jpg",
        "/landmarks/wish/reference/KakaoTalk_20260813_072216328_03.jpg",
        "/landmarks/wish/reference/KakaoTalk_20260813_072216328_05.jpg",
        "/landmarks/wish/reference/KakaoTalk_20260813_123330386.jpg",
        "/landmarks/wish/reference/KakaoTalk_20260813_123330386_01.jpg",
        "/landmarks/wish/reference/KakaoTalk_20260813_123330386_03.jpg",
        "/landmarks/wish/reference/KakaoTalk_20260813_123330386_04.jpg",
        "/landmarks/wish/reference/KakaoTalk_20260813_123330386_06.jpg",
        "/landmarks/wish/reference/KakaoTalk_20260813_123330386_07.jpg",
        "/landmarks/wish/reference/KakaoTalk_20260813_123330386_09.jpg",
        "/landmarks/wish/reference/KakaoTalk_20260813_123330386_10.jpg",
    ],
};

export default function AttractionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const attractionId = Number(params.id);

    const [attraction, setAttraction] = useState<Attraction | null>(null);
    const [testRecord, setTestRecord] =
        useState<RecognitionTestRecord | null>(null);
    const [referenceImages, setReferenceImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
            const recognitionRecords = JSON.parse(
                localStorage.getItem("loqest_recognition_test_records") || "{}"
            ) as Record<string, RecognitionTestRecord>;

            const baseAttraction =
                storedAttractions.find((item) => item.id === attractionId) ??
                defaultAttractions.find((item) => item.id === attractionId);

            if (!baseAttraction) {
                setLoading(false);
                return;
            }

            const mergedAttraction = {
                ...baseAttraction,
                ...(attractionEdits[String(attractionId)] ?? {}),
                status:
                    savedStatuses[String(attractionId)] ?? baseAttraction.status,
            };

            const record = recognitionRecords[String(attractionId)] ?? null;
            if (record) mergedAttraction.quality = record.quality;

            setAttraction(mergedAttraction);
            setTestRecord(record);
            setReferenceImages(
                mergedAttraction.referenceImageData?.length
                    ? mergedAttraction.referenceImageData.map((image) => image.dataUrl)
                    : defaultReferenceImages[String(attractionId)] ?? []
            );
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [attractionId]);

    const toggleStatus = () => {
        if (!attraction) {
            return;
        }

        const nextStatus =
            attraction.status === "공개"
                ? "비공개"
                : "공개";

        if (nextStatus === "공개") {
            if (!testRecord) {
                window.alert(
                    "인식 테스트를 완료한 후 공개할 수 있습니다."
                );
                return;
            }

            if (testRecord.lastResult !== "통과") {
                window.alert(
                    "최근 인식 테스트를 통과한 후 공개할 수 있습니다."
                );
                return;
            }
        }

        const savedStatuses = JSON.parse(
            localStorage.getItem(
                "loqest_attraction_statuses"
            ) || "{}"
        ) as Record<string, string>;

        savedStatuses[String(attraction.id)] =
            nextStatus;

        localStorage.setItem(
            "loqest_attraction_statuses",
            JSON.stringify(savedStatuses)
        );

        setAttraction({
            ...attraction,
            status: nextStatus,
        });
    };

    const deleteAttraction = () => {
        if (!attraction) return;
        if (!window.confirm(`'${attraction.name}' 관광지를 삭제할까요?`)) return;

        const storedAttractions = JSON.parse(
            localStorage.getItem("loqest_attractions") || "[]"
        ) as Attraction[];
        localStorage.setItem(
            "loqest_attractions",
            JSON.stringify(storedAttractions.filter((item) => item.id !== attraction.id))
        );

        if (defaultAttractions.some((item) => item.id === attraction.id)) {
            const deletedIds = JSON.parse(
                localStorage.getItem("loqest_deleted_attraction_ids") || "[]"
            ) as number[];
            localStorage.setItem(
                "loqest_deleted_attraction_ids",
                JSON.stringify([...new Set([...deletedIds, attraction.id])])
            );
        }

        [
            "loqest_attraction_statuses",
            "loqest_attraction_edits",
            "loqest_recognition_test_records",
        ].forEach((key) => {
            const data = JSON.parse(localStorage.getItem(key) || "{}") as Record<
                string,
                unknown
            >;
            delete data[String(attraction.id)];
            localStorage.setItem(key, JSON.stringify(data));
        });

        router.push("/admin/attractions");
    };

    const formatDate = (date?: string) => {
        if (!date) return "미실시";
        return new Intl.DateTimeFormat("ko-KR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(date));
    };

    if (loading) return <main className={styles.page}>불러오는 중...</main>;

    if (!attraction) {
        return (
            <main className={styles.page}>
                <section className={styles.notFound}>
                    <h1>관광지를 찾을 수 없습니다.</h1>
                    <Link href="/admin/attractions">목록으로 돌아가기</Link>
                </section>
            </main>
        );
    }

    return (
        <main className={styles.page}>
            <header className={styles.header}>
                <div>
                    <Link href="/admin/attractions" className={styles.backLink}>
                        ← 관광지 목록
                    </Link>
                    <p className={styles.eyebrow}>관광지 상세</p>
                    <div className={styles.titleRow}>
                        <h1>{attraction.name}</h1>
                        <span className={styles.statusBadge}>{attraction.status}</span>
                    </div>
                    <p>{attraction.description || "등록된 관광지 설명이 없습니다."}</p>
                </div>

                <div className={styles.actions}>
                    <Link
                        href={`/landmark-test?attractionId=${attraction.id}`}
                        className={styles.primaryButton}
                    >
                        인식 테스트
                    </Link>
                    <Link
                        href={`/admin/attractions/${attraction.id}/edit`}
                        className={styles.secondaryButton}
                    >
                        정보 수정
                    </Link>
                    <button className={styles.secondaryButton} onClick={toggleStatus}>
                        {attraction.status === "공개" ? "비공개로 전환" : "공개하기"}
                    </button>
                    <button className={styles.deleteButton} onClick={deleteAttraction}>
                        삭제
                    </button>
                </div>
            </header>

            <section className={styles.metrics}>
                <article><span>인증 상태</span><strong>{attraction.quality}</strong></article>
                <article><span>최근 테스트</span><strong>{testRecord?.lastResult ?? "미실시"}</strong></article>
                <article><span>테스트 횟수</span><strong>{testRecord?.totalTests ?? 0}회</strong></article>
                <article><span>1회 성공률</span><strong>{attraction.firstSuccess === null ? "-" : `${attraction.firstSuccess}%`}</strong></article>
            </section>

            <div className={styles.contentGrid}>
                <section className={styles.card}>
                    <h2>기본 정보</h2>
                    <dl className={styles.infoList}>
                        <div><dt>카테고리</dt><dd>{attraction.category}</dd></div>
                        <div><dt>주소</dt><dd>{attraction.address || "미입력"}</dd></div>
                        <div><dt>위도</dt><dd>{attraction.latitude ?? "미입력"}</dd></div>
                        <div><dt>경도</dt><dd>{attraction.longitude ?? "미입력"}</dd></div>
                        <div><dt>GPS 반경</dt><dd>{attraction.radius}m</dd></div>
                        <div><dt>촬영 가능 시간</dt><dd>{attraction.availableTime ?? "상시"}</dd></div>
                        <div><dt>인식 기준</dt><dd>{attraction.landmarkThreshold ?? 70}%</dd></div>
                        <div><dt>촬영 안내</dt><dd>{attraction.guideMessage || "미입력"}</dd></div>
                    </dl>
                </section>

                <section className={styles.card}>
                    <h2>인식 테스트 현황</h2>
                    <dl className={styles.infoList}>
                        <div><dt>최근 결과</dt><dd>{testRecord?.lastResult ?? "미실시"}</dd></div>
                        <div><dt>성공</dt><dd>{testRecord?.successfulTests ?? 0}회</dd></div>
                        <div><dt>실패</dt><dd>{testRecord?.failedTests ?? 0}회</dd></div>
                        <div><dt>최근 테스트 일시</dt><dd>{formatDate(testRecord?.lastTestedAt)}</dd></div>
                    </dl>
                    <div className={styles.recentResults}>
                        {(testRecord?.recentResults ?? []).map((result, index) => (
                            <span key={index} className={result ? styles.pass : styles.fail}>
                                {result ? "통과" : "실패"}
                            </span>
                        ))}
                        {!testRecord && <span className={styles.emptyText}>테스트 기록이 없습니다.</span>}
                    </div>
                </section>
            </div>

            <section className={styles.card}>
                <div className={styles.cardHeader}>
                    <div>
                        <h2>기준 이미지</h2>
                        <p>랜드마크 인식에 연결된 이미지 {referenceImages.length}장</p>
                    </div>
                    <Link href={`/admin/attractions/${attraction.id}/edit`} className={styles.secondaryButton}>
                        이미지 관리
                    </Link>
                </div>

                {referenceImages.length > 0 ? (
                    <div className={styles.imageGrid}>
                        {referenceImages.map((source, index) => (
                            <img key={`${source}-${index}`} src={source} alt={`${attraction.name} 기준 이미지 ${index + 1}`} />
                        ))}
                    </div>
                ) : (
                    <p className={styles.emptyText}>등록된 실제 기준 이미지가 없습니다.</p>
                )}
            </section>
        </main>
    );
}