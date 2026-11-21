"use client";

import Link from "next/link";
import Image from "next/image";
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

        // Once a quest has been published, hiding it does not invalidate its test.
        // A reference-image change explicitly invalidates this approval.
        const previouslyPublished = localStorage.getItem(
            `loqest_previously_published_${attraction.id}`
        ) === "true";
        const requiresRetest = attraction.quality === "재테스트 필요";
        const hasSuccessfulTest = (testRecord?.successfulTests ?? 0) > 0;

        if (nextStatus === "공개" && (
            !referenceImages.length ||
            requiresRetest ||
            (!previouslyPublished && !hasSuccessfulTest)
        )) {
            window.alert("기준 이미지 등록 후 인식 테스트를 통과해야 공개할 수 있습니다.");
            return;
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
            if (nextStatus === "비공개" && attraction.status === "공개") {
                localStorage.setItem(`loqest_previously_published_${attraction.id}`, "true");
            }
            if (nextStatus === "공개") {
                localStorage.setItem(`loqest_previously_published_${attraction.id}`, "true");
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
        const deleteConfirmation = window.prompt(`'${attraction.name}' 퀘스트를 삭제하면 복구할 수 없습니다.\n\n삭제하려면 "삭제"를 정확히 입력해주세요.`);
        if (deleteConfirmation === null) return;
        if (deleteConfirmation !== "삭제") {
            window.alert("확인 문구가 일치하지 않아 삭제하지 않았습니다.");
            return;
        }

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

    const hasImages = referenceImages.length>0;
    const hasPassedTest=(testRecord?.successfulTests ?? 0)>0;
    const isRetestRequired=attraction.quality==="재테스트 필요";
    const hasPublicationApproval=typeof window!=="undefined" && localStorage.getItem(`loqest_previously_published_${attraction.id}`)==="true";
    const readyForPublish=hasImages && !isRetestRequired && (hasPassedTest || hasPublicationApproval);
    const needsAction = !hasImages ? "기준 이미지가 필요해요" : !readyForPublish ? "인식 테스트가 필요해요" : attraction.status!=="공개" ? "공개할 준비가 끝났어요" : "";
    const explanation=!hasImages ? "퀘스트 기준 이미지를 한 장 이상 등록해주세요." : !hasPassedTest ? "기준 이미지를 확인하고 실제 사진으로 인식 테스트를 진행해주세요." : "테스트를 통과했습니다. 관광객에게 공개할 수 있습니다.";
    const icons:Record<string,string>={"역사·문화":"🗺️","자연·생태":"🌿","축제·행사":"🎉","체험·레저":"🎯","지역상권":"🛍️","기타":"✨"};

    return (
      <main className={styles.simplePage}>
        <header className={styles.simpleHeader}>
          <div>
            <Link href={`/admin/attractions?tourId=${encodeURIComponent(attraction.tourId)}`} className={styles.simpleBack}>← 퀘스트 목록</Link>
            <p className={styles.eyebrow}>퀘스트 관리</p>
            <h1>{attraction.name}</h1>
            <span className={`${styles.statusBadge} ${attraction.status==="공개"?styles.publishedBadge:styles.unpublishedBadge}`}>{attraction.status}</span>
          </div>
        </header>
        {needsAction && <section className={`${styles.actionNotice} ${readyForPublish ? styles.actionSuccess : styles.actionPending}`}>
          <div><strong>{needsAction}</strong><p>{explanation}</p></div>
          {hasImages&&!readyForPublish&&<Link href={`/landmark-test?attractionId=${attraction.id}`} className={styles.primaryButton}>인식 테스트하기</Link>}
          {!hasImages&&<Link href={`/admin/attractions/${attraction.id}/images`} className={styles.primaryButton}>기준 이미지 등록</Link>}
        </section>}
        <section className={styles.simpleCard}>
          <div className={styles.simpleCardHeader}><h2>퀘스트 기본 정보</h2>
            <Link href={`/admin/attractions/${attraction.id}/edit`} className={styles.blueEditButton}>정보 수정</Link>
          </div>
          <dl className={styles.simpleDetails}>
            <div><dt>카테고리</dt><dd>{attraction.category}</dd></div>
            <div><dt>안내 문구</dt><dd>{attraction.description||"-"}</dd></div>
            <div><dt>위도 · 경도</dt><dd>{attraction.latitude??"-"} · {attraction.longitude??"-"}</dd></div>
            <div><dt>GPS 인증 반경</dt><dd>{attraction.radius}m</dd></div>
            <div><dt>기준 이미지</dt><dd>{referenceImages.length}장 등록 <Link href={`/admin/attractions/${attraction.id}/images`} className={styles.moreLink}>이미지 관리</Link> <button type="button" className={styles.moreLink} onClick={()=>setDetailsOpen(open=>!open)}>{detailsOpen?"접기 ↑":"자세히 보기 ↓"}</button></dd></div>
          </dl>
          {detailsOpen&&<div className={styles.imagePanel}>
            <div className={styles.simpleCardHeader}><h3>등록된 기준 이미지</h3><Link href={`/admin/attractions/${attraction.id}/images`} className={styles.blueEditButton}>이미지 관리</Link></div>
            {referenceImages.length>0?<div className={styles.simpleImageGrid}>{referenceImages.map((source,index)=><Image key={index} src={source} alt={`기준 이미지 ${index+1}`} width={200} height={150} unoptimized/>)}</div>:<p>등록된 이미지가 없습니다.</p>}
          </div>}
        </section>
        <section className={styles.simpleCard}>
          <div className={styles.simpleCardHeader}><h2>인식 테스트 결과</h2><span className={hasPassedTest?styles.passedLabel:styles.pendingLabel}>{testRecord?.lastResult||"미실시"}</span></div>
          <div className={styles.testSummary}><span>전체 {testRecord?.totalTests||0}회</span><span>성공 {testRecord?.successfulTests||0}회</span><span>실패 {testRecord?.failedTests||0}회</span><span>최근 {formatDate(testRecord?.lastTestedAt)}</span></div>
          <Link href={`/landmark-test?attractionId=${attraction.id}`} className={styles.secondaryButton}>인식 테스트 진행하기</Link>
        </section>
        <section className={styles.largeActions}>
          <button type="button" className={attraction.status==="공개"?styles.hideAction:styles.publishAction} onClick={toggleStatus} aria-disabled={attraction.status!=="공개"&&!readyForPublish}>
            {attraction.status==="공개"?"비공개로 전환":"공개하기"}
          </button>
          <button type="button" className={styles.deleteAction} onClick={deleteAttraction}>퀘스트 삭제</button>
        </section>
      </main>
    );
}
