"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { clearAdminApiKey, getAdminApiKey } from "@/lib/adminApiKey";
import styles from "./detail.module.css";
import AdminBackButton from "@/components/AdminBackButton";

type ReferenceImage = {
    id: string;
    name: string;
    dataUrl: string;
    path?: string;
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
    tourId: string;
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

export default function AttractionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const attractionId = Number(params.id);

    const [attraction, setAttraction] = useState<Attraction | null>(null);
    const [testRecord, setTestRecord] =
        useState<RecognitionTestRecord | null>(null);
    const [referenceImages, setReferenceImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [detailsOpen, setDetailsOpen] = useState(false);

    useEffect(() => {
        const loadAttraction = async () => {
            try {
                const adminKey = getAdminApiKey();
                if (!adminKey) return;
                const response = await fetch(`/api/attractions/${attractionId}`, { headers: { "x-admin-api-key": adminKey } });
                if (response.status === 401) {
                    clearAdminApiKey();
                    throw new Error("관리자 API 키가 올바르지 않습니다.");
                }
                if (!response.ok) throw new Error("관광지를 불러오지 못했습니다.");
                const result = await response.json();
                const item = result.attraction;
                const recognitionRecords = JSON.parse(
                    localStorage.getItem("loqest_recognition_test_records") || "{}"
                ) as Record<string, RecognitionTestRecord>;
                const record = recognitionRecords[String(attractionId)] ?? null;
                const mapped: Attraction = {
                    id: item.id, name: item.name, category: item.category, address: item.address,
                    description: item.description, latitude: item.latitude, longitude: item.longitude,
                    radius: item.radius, availableTime: item.available_time,
                    landmarkThreshold: Number(item.landmark_threshold), guideMessage: item.guide_message,
                    referenceImages: item.referenceImages.length, referenceImageData: item.referenceImages,
                    firstSuccess: null, status: item.status, quality: record?.quality ?? item.quality,
                    tourId: item.tour_id || "amsa",
                };
                setAttraction(mapped);
                setTestRecord(record);
                setReferenceImages(item.referenceImages.map((image: ReferenceImage) => image.dataUrl));
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        void loadAttraction();
    }, [attractionId]);

    const toggleStatus = async () => {
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

        const adminKey = getAdminApiKey();
        if (!adminKey) return;
        const response = await fetch(`/api/attractions/${attraction.id}`, {
            method: "PUT",
            headers: {
                "content-type": "application/json",
                "x-admin-api-key": adminKey,
            },
            body: JSON.stringify({
                name: attraction.name,
                category: attraction.category,
                address: attraction.address ?? "",
                description: attraction.description ?? "",
                latitude: attraction.latitude,
                longitude: attraction.longitude,
                radius: attraction.radius,
                availableTime: attraction.availableTime ?? "상시",
                landmarkThreshold: attraction.landmarkThreshold ?? 70,
                guideMessage: attraction.guideMessage ?? "",
                status: nextStatus,
                quality: attraction.quality,
                referenceImages: attraction.referenceImageData ?? [],
                referenceImagesChanged: false,
            }),
        });

        if (response.status === 401) {
            clearAdminApiKey();
            window.alert(
                "관리자 API 키가 올바르지 않습니다. 새로고침 후 다시 입력해주세요."
            );
            return;
        }

        if (response.ok) {
            if (nextStatus === "공개") {
                sessionStorage.setItem(
                    "loqest_admin_notice",
                    `'${attraction.name}' 관광지가 홈페이지에 공개되었습니다.`
                );
                router.push(`/admin/attractions?tourId=${attraction.tourId}`);
                return;
            }
            setAttraction({ ...attraction, status: nextStatus });
        } else {
            window.alert("공개 상태를 변경하지 못했습니다.");
        }
    };

    const deleteAttraction = async () => {
        if (!attraction) return;
        if (!window.confirm(`'${attraction.name}' 관광지를 삭제할까요?`)) return;

        const adminKey = getAdminApiKey();
        if (!adminKey) return;
        const response = await fetch(`/api/attractions/${attraction.id}`, {
            method: "DELETE",
            headers: { "x-admin-api-key": adminKey },
        });

        if (response.status === 401) {
            clearAdminApiKey();
            window.alert(
                "관리자 API 키가 올바르지 않습니다. 새로고침 후 다시 입력해주세요."
            );
            return;
        }

        if (response.ok) {
            router.push(`/admin/attractions?tourId=${attraction.tourId}`);
        } else {
            window.alert("관광지를 삭제하지 못했습니다.");
        }
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

    const hasImages = referenceImages.length > 0;
    const hasPassedTest = testRecord?.lastResult === "통과";
    const nextStep = !hasImages
        ? {
            title: "기준 이미지를 등록해주세요.",
            description: "여러 각도에서 촬영한 이미지를 등록하면 인식 테스트를 진행할 수 있습니다.",
            label: "이미지 등록",
            href: `/admin/attractions/${attraction.id}/edit`,
        }
        : !hasPassedTest
            ? {
                title: "인식 테스트를 진행해주세요.",
                description: "실제 촬영 환경에서 테스트를 통과하면 공개할 수 있습니다.",
                label: "인식 테스트",
                href: `/landmark-test?attractionId=${attraction.id}`,
            }
            : attraction.status !== "공개"
                ? {
                    title: "홈페이지에 공개할 준비가 끝났습니다.",
                    description: "공개하면 LOQEST 홈페이지에 이 관광지가 바로 표시됩니다.",
                    label: "지금 공개하기",
                    href: "",
                }
                : {
                    title: "정상적으로 운영 중입니다.",
                    description: "정보나 기준 이미지를 바꾸면 다시 테스트하는 것을 권장합니다.",
                    label: "정보 수정",
                    href: `/admin/attractions/${attraction.id}/edit`,
                };

    return (
        <main className={styles.page}>
            <header className={styles.header}>
                <div>
                    <AdminBackButton
                        href={`/admin/attractions?tourId=${attraction.tourId}`}
                    />
                    <p className={styles.eyebrow}>퀘스트 상세</p>
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

            <section className={`${styles.workflowCard} ${hasPassedTest && attraction.status !== "공개" ? styles.publishReady : ""}`}>
                <div className={styles.workflowSteps}>
                    <div className={styles.doneStep}><span>1</span><strong>정보·위치</strong></div>
                    <div className={hasImages ? styles.doneStep : styles.currentStep}><span>2</span><strong>기준 이미지</strong></div>
                    <div className={hasPassedTest ? styles.doneStep : hasImages ? styles.currentStep : styles.waitingStep}><span>3</span><strong>인식 테스트</strong></div>
                    <div className={attraction.status === "공개" ? styles.doneStep : hasPassedTest ? styles.currentStep : styles.waitingStep}><span>4</span><strong>공개</strong></div>
                </div>
                <div className={styles.nextGuide}>
                    <div><strong>{nextStep.title}</strong><p>{nextStep.description}</p></div>
                    {nextStep.href ? (
                        <Link href={nextStep.href} className={styles.primaryButton}>{nextStep.label}</Link>
                    ) : (
                        <button type="button" className={`${styles.primaryButton} ${styles.publishButton}`} onClick={toggleStatus}>{nextStep.label}</button>
                    )}
                </div>
            </section>

            <section className={styles.compactTestStatus}>
                <div className={styles.compactTestResult}>
                    <div>
                        <span>최근 인식 테스트</span>

                        <strong
                            className={
                                testRecord?.lastResult === "통과"
                                    ? styles.testPassed
                                    : styles.testPending
                            }
                        >
                            {testRecord?.lastResult ?? "미실시"}
                        </strong>
                    </div>

                    <p>
                        {testRecord
                            ? `총 ${testRecord.totalTests}회 · 성공 ${testRecord.successfulTests}회 · 실패 ${testRecord.failedTests}회`
                            : "아직 진행한 인식 테스트가 없습니다."}
                    </p>
                </div>

                <button
                    type="button"
                    className={styles.detailsToggle}
                    onClick={() =>
                        setDetailsOpen((previous) => !previous)
                    }
                    aria-expanded={detailsOpen}
                >
                    {detailsOpen
                        ? "상세 정보 접기 ↑"
                        : "상세 정보 보기 ↓"}
                </button>
            </section>

            {detailsOpen && (
                <section className={styles.detailsPanel}>
                    <div className={styles.contentGrid}>
                        <section className={styles.detailCard}>
                            <h2>기본 정보</h2>

                            <dl className={styles.infoList}>
                                <div>
                                    <dt>카테고리</dt>
                                    <dd>{attraction.category}</dd>
                                </div>

                                <div>
                                    <dt>위도</dt>
                                    <dd>{attraction.latitude ?? "미입력"}</dd>
                                </div>

                                <div>
                                    <dt>경도</dt>
                                    <dd>{attraction.longitude ?? "미입력"}</dd>
                                </div>

                                <div>
                                    <dt>GPS 반경</dt>
                                    <dd>{attraction.radius}m</dd>
                                </div>

                                <div>
                                    <dt>인식 기준</dt>
                                    <dd>
                                        {attraction.landmarkThreshold ?? 70}%
                                    </dd>
                                </div>
                            </dl>
                        </section>

                        <section className={styles.detailCard}>
                            <h2>인식 테스트 기록</h2>

                            <dl className={styles.infoList}>
                                <div>
                                    <dt>최근 결과</dt>
                                    <dd>
                                        {testRecord?.lastResult ?? "미실시"}
                                    </dd>
                                </div>

                                <div>
                                    <dt>성공</dt>
                                    <dd>
                                        {testRecord?.successfulTests ?? 0}회
                                    </dd>
                                </div>

                                <div>
                                    <dt>실패</dt>
                                    <dd>
                                        {testRecord?.failedTests ?? 0}회
                                    </dd>
                                </div>

                                <div>
                                    <dt>최근 테스트</dt>
                                    <dd>
                                        {formatDate(testRecord?.lastTestedAt)}
                                    </dd>
                                </div>
                            </dl>

                            <div className={styles.recentResults}>
                                {(testRecord?.recentResults ?? []).map(
                                    (result, index) => (
                                        <span
                                            key={index}
                                            className={
                                                result ? styles.pass : styles.fail
                                            }
                                        >
                                            {result ? "통과" : "실패"}
                                        </span>
                                    ),
                                )}

                                {!testRecord && (
                                    <span className={styles.emptyText}>
                                        테스트 기록이 없습니다.
                                    </span>
                                )}
                            </div>
                        </section>
                    </div>

                    <section className={styles.imageDetailCard}>
                        <div className={styles.cardHeader}>
                            <div>
                                <h2>기준 이미지</h2>
                                <p>
                                    등록된 기준 이미지 {referenceImages.length}장
                                </p>
                            </div>

                            <Link
                                href={`/admin/attractions/${attraction.id}/edit`}
                                className={styles.secondaryButton}
                            >
                                이미지 관리
                            </Link>
                        </div>

                        {referenceImages.length > 0 ? (
                            <div className={styles.imageGrid}>
                                {referenceImages.map((source, index) => (
                                    <img
                                        key={`${source}-${index}`}
                                        src={source}
                                        alt={`${attraction.name} 기준 이미지 ${index + 1
                                            }`}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className={styles.emptyText}>
                                등록된 기준 이미지가 없습니다.
                            </p>
                        )}
                    </section>
                </section>
            )}
        </main>

    );
}
