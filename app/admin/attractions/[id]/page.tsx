"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { clearAdminApiKey, getAdminApiKey } from "@/lib/adminApiKey";
import styles from "./detail.module.css";

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
            router.push("/admin/attractions");
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