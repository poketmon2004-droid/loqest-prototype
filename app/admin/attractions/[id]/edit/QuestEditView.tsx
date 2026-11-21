"use client";

import {
    ChangeEvent,
    FormEvent,
    useEffect,
    useState,
} from "react";
import Link from "next/link";
import NextImage from "next/image";
import { resizeImage } from "@/lib/image/resizeImage";
import { useParams, useRouter } from "next/navigation";
import {
    clearAdminApiKey,
    getAdminApiKey,
} from "@/lib/adminApiKey";
import styles from "../../new/AttractionForm.module.css";
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

type EditForm = {
    name: string;
    category: string;
    address: string;
    description: string;
    latitude: string;
    longitude: string;
    radius: string;
    availableTime: string;
    landmarkThreshold: string;
    guideMessage: string;
    status: string;
};

type AttractionApiResponse = {
    id: number;
    name: string;
    category: string;
    address?: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    radius: number;
    available_time?: string;
    landmark_threshold?: number;
    guide_message?: string;
    first_success?: number | null;
    status: string;
    quality?: string;
    referenceImages?: ReferenceImage[];
    tour_id?: string;
};

function getAdminHeaders() {
    const adminKey = getAdminApiKey();

    if (!adminKey) {
        throw new Error(
            "관리자 API 키가 없습니다. 새로고침 후 다시 입력해주세요."
        );
    }

    return {
        "Content-Type": "application/json",
        "x-admin-api-key": adminKey,
    };
}

export function QuestEditView({ imageMode = false }: { imageMode?: boolean }) {
    const router = useRouter();
    const params = useParams();

    const attractionId = Number(params.id);

    const [form, setForm] = useState<EditForm | null>(null);
    const [originalAttraction, setOriginalAttraction] =
        useState<Attraction | null>(null);

    const [referenceImages, setReferenceImages] = useState<
        ReferenceImage[]
    >([]);

    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showReferenceImages, setShowReferenceImages] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [
        referenceImagesChanged,
        setReferenceImagesChanged,
    ] = useState(false);

    useEffect(() => {
        const fetchAttraction = async () => {
            setLoading(true);
            setErrorMessage("");

            try {
                const response = await fetch(
                    `/api/attractions/${attractionId}`,
                    {
                        method: "GET",
                        headers: getAdminHeaders(),
                        cache: "no-store",
                    }
                );

                if (response.status === 401) {
                    clearAdminApiKey();
                    throw new Error(
                        "관리자 API 키가 올바르지 않습니다. 새로고침 후 다시 입력해주세요."
                    );
                }

                const result = (await response.json()) as {
                    attraction?: AttractionApiResponse;
                    message?: string;
                };

                if (!response.ok || !result.attraction) {
                    throw new Error(
                        result.message ??
                        "관광지 정보를 불러오지 못했습니다."
                    );
                }

                const data = result.attraction;
                const images = data.referenceImages ?? [];
                const attraction: Attraction = {
                    id: Number(data.id),
                    name: data.name,
                    category: data.category,
                    address: data.address ?? "",
                    description: data.description ?? "",
                    latitude: data.latitude,
                    longitude: data.longitude,
                    radius: Number(data.radius),
                    availableTime: data.available_time ?? "상시",
                    landmarkThreshold:
                        data.landmark_threshold ?? 70,
                    guideMessage:
                        data.guide_message ??
                        "가이드라인에 맞춰 관광지와 함께 촬영해주세요.",
                    referenceImages: images.length,
                    referenceImageData: images,
                    firstSuccess: data.first_success ?? null,
                    status: data.status,
                    quality: data.quality ?? "확인 필요",
                    tourId: data.tour_id ?? "amsa",
                };

                setOriginalAttraction(attraction);
                setReferenceImages(images);
                setForm({
                    name: attraction.name,
                    category: attraction.category,
                    address: attraction.address ?? "",
                    description: attraction.description ?? "",
                    latitude:
                        attraction.latitude === undefined
                            ? ""
                            : String(attraction.latitude),
                    longitude:
                        attraction.longitude === undefined
                            ? ""
                            : String(attraction.longitude),
                    radius: String(attraction.radius),
                    availableTime:
                        attraction.availableTime ?? "상시",
                    landmarkThreshold: String(
                        attraction.landmarkThreshold ?? 70
                    ),
                    guideMessage:
                        attraction.guideMessage ??
                        "가이드라인에 맞춰 관광지와 함께 촬영해주세요.",
                    status: attraction.status,
                });
            } catch (error) {
                console.error(error);
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "관광지 정보를 불러오지 못했습니다."
                );
            } finally {
                setLoading(false);
            }
        };

        void fetchAttraction();
    }, [attractionId]);

    const updateForm = (
        field: keyof EditForm,
        value: string
    ) => {
        setForm((previous) =>
            previous
                ? {
                    ...previous,
                    [field]: value,
                }
                : previous
        );
    };

    const handleReferenceImages = async (
        event: ChangeEvent<HTMLInputElement>
    ) => {
        const files = Array.from(event.target.files ?? []);

        if (files.length === 0) {
            return;
        }

        setErrorMessage("");
        setIsProcessing(true);

        try {
            const convertedImages = await Promise.all(
                files.map(async (file, index) => ({
                    id: `${Date.now()}-${index}-${file.name}`,
                    name: file.name,
                    dataUrl: await resizeImage(file),
                }))
            );

            setReferenceImages((previous) => [
                ...previous,
                ...convertedImages,
            ]);

            setReferenceImagesChanged(true);
        } catch {
            setErrorMessage(
                "일부 이미지를 처리하지 못했습니다."
            );
        } finally {
            setIsProcessing(false);
            event.target.value = "";
        }
    };

    const removeReferenceImage = (id: string) => {
        setReferenceImages((previous) =>
            previous.filter((image) => image.id !== id)
        );

        setReferenceImagesChanged(true);
    };

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (!form || !originalAttraction) {
            return;
        }

        if (referenceImages.length === 0) {
            setErrorMessage("랜드마크 판별에 사용할 랜드마크 이미지를 한 장 이상 남겨주세요.");
            return;
        }

        const latitude = Number(form.latitude);
        const longitude = Number(form.longitude);
        const radius = Number(form.radius);
        const threshold = Number(form.landmarkThreshold);
        if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
            !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
            setErrorMessage("위도와 경도를 올바른 범위로 입력해주세요.");
            return;
        }
        if (!Number.isFinite(radius) || radius < 10) {
            setErrorMessage("GPS 인증 반경은 10m 이상으로 입력해주세요.");
            return;
        }
        if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
            setErrorMessage("랜드마크 인식 기준은 0~100 사이로 입력해주세요.");
            return;
        }

        if (!window.confirm(`"${form.name.trim()}" 퀘스트의 변경사항을 저장하시겠습니까?${referenceImagesChanged ? "\n랜드마크 이미지 변경으로 비공개 상태가 되고 재테스트가 필요합니다." : ""}`)) return;

        setErrorMessage("");
        setIsProcessing(true);

        try {
            const response = await fetch(
                `/api/attractions/${attractionId}`,
                {
                    method: "PUT",
                    headers: getAdminHeaders(),
                    body: JSON.stringify({
                        name: form.name,
                        category: form.category,
                        address: form.address,
                        description: form.description,
                        latitude,
                        longitude,
                        radius,
                        availableTime: form.availableTime,
                        landmarkThreshold: threshold,
                        guideMessage: form.guideMessage,
                        status: referenceImagesChanged
                            ? "비공개"
                            : form.status,
                        quality: originalAttraction.quality,
                        referenceImages,
                        referenceImagesChanged,
                    }),
                }
            );

            if (response.status === 401) {
                clearAdminApiKey();
                throw new Error(
                    "관리자 API 키가 올바르지 않습니다. 새로고침 후 다시 입력해주세요."
                );
            }

            const result = (await response.json()) as {
                message?: string;
            };

            if (!response.ok) {
                throw new Error(
                    result.message ??
                    "관광지 정보를 저장하지 못했습니다."
                );
            }

            if (referenceImagesChanged) {
                localStorage.removeItem(`loqest_previously_published_${attractionId}`);
                const recognitionRecords = JSON.parse(
                    localStorage.getItem(
                        "loqest_recognition_test_records"
                    ) || "{}"
                ) as Record<string, unknown>;

                delete recognitionRecords[String(attractionId)];

                localStorage.setItem(
                    "loqest_recognition_test_records",
                    JSON.stringify(recognitionRecords)
                );
            }

            router.refresh();
            router.push(
                referenceImagesChanged
                    ? `/landmark-test?attractionId=${attractionId}`
                    : `/admin/attractions/${attractionId}?tourId=${originalAttraction.tourId}`
            );
        } catch (error) {
            console.error(error);

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "관광지 정보를 저장하지 못했습니다."
            );
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.page}>
                <section className={styles.formCard}>
                    관광지 정보를 불러오는 중입니다.
                </section>
            </div>
        );
    }

    if (!form || !originalAttraction) {
        return (
            <div className={styles.page}>
                <section className={styles.formCard}>
                    <h1>관광지를 찾을 수 없습니다.</h1>

                    <p>{errorMessage}</p>

                    <Link
                        href={`/admin/tours/${encodeURIComponent(originalAttraction?.tourId ?? "amsa")}`}
                        className={styles.backLink}
                    >
                        퀘스트 목록으로 돌아가기
                    </Link>
                </section>
            </div>
        );
    }

    return (
        <div className={`${styles.page} ${styles.editPage}`}>
            <AdminBackButton href={`/admin/attractions/${attractionId}?tourId=${encodeURIComponent(originalAttraction.tourId)}`} />
            <header className={styles.header}>
                <div>
                    <p className={styles.eyebrow}>퀘스트 관리</p>
                    <h1>{imageMode ? "랜드마크 이미지 관리" : "퀘스트 정보 수정"}</h1>
                    <p className={styles.headerDescription}>
                        {imageMode ? "등록된 랜드마크 이미지를 확인하고 추가하거나 삭제합니다." : "퀘스트 정보와 인증 위치를 수정합니다."}
                    </p>
                </div>
            </header>
            <form className={styles.formLayout} onSubmit={handleSubmit}>
                <section className={styles.formCard}>
                    {!imageMode ? (
                        <>
                            <div className={styles.inputEmphasis}>
                                <h3>퀘스트 기본 정보</h3>
                                <label className={styles.field}>
                                    퀘스트명
                                    <input type="text" required value={form.name} onChange={event=>updateForm("name",event.target.value)}
                                        placeholder="예: 선사유적지 안내판" />
                                </label>
                                <label className={styles.field}>
                                    안내 문구
                                    <input type="text" required value={form.description} onChange={event=>updateForm("description",event.target.value)}
                                        placeholder="관광객에게 보여줄 설명을 입력해 주세요." />
                                </label>
                                <div className={styles.categorySetting}>
                                    <label className={styles.field}>
                                        카테고리
                                        <select value={form.category} onChange={event=>updateForm("category",event.target.value)}>
                                            <option>역사·문화</option><option>자연·생태</option><option>축제·행사</option>
                                            <option>체험·레저</option><option>지역상권</option><option>기타</option>
                                            {form.category==="포토 미션" && <option>포토 미션</option>}
                                        </select>
                                        <small>선택한 카테고리에 맞춰 카드 아이콘이 자동으로 변경됩니다.</small>
                                    </label>
                                </div>
                            </div>
                            <div className={styles.compactSection}>
                                <div className={styles.locationHeader}>
                                    <h3>인증 위치</h3>
                                    <p>관광객이 촬영할 장소의 위치를 설정합니다.</p>
                                </div>
                                <div className={styles.fieldGrid}>
                                    <label className={styles.field}>위도
                                        <input type="number" step="any" required value={form.latitude}
                                            onChange={event=>updateForm("latitude",event.target.value)} placeholder="37.560000"/>
                                    </label>
                                    <label className={styles.field}>경도
                                        <input type="number" step="any" required value={form.longitude}
                                            onChange={event=>updateForm("longitude",event.target.value)} placeholder="127.130000"/>
                                    </label>
                                    <label className={styles.field}>GPS 인증 반경
                                        <div className={styles.inputWithUnit}>
                                            <input type="number" min="10" required value={form.radius}
                                                onChange={event=>updateForm("radius",event.target.value)}/>
                                            <span>m</span>
                                        </div>
                                        <small>설정한 반경 안에서만 촬영할 수 있습니다.</small>
                                    </label>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className={styles.uploadArea}>
                            <div className={styles.uploadHeader}>
                                <div><h3>랜드마크 이미지 등록</h3><p>기존 사진을 관리하거나 새로운 사진을 추가합니다.</p></div>
                                <strong>{referenceImages.length}장 등록</strong>
                            </div>
                            <label className={styles.fileButton}>+ 랜드마크 이미지 선택
                                <input type="file" accept="image/*" multiple onChange={handleReferenceImages} disabled={isProcessing}/>
                            </label>
                            {isProcessing && <p className={styles.uploadCount}>이미지를 처리하고 있습니다.</p>}
                            {referenceImages.length === 0 ? (
                                <div className={styles.emptyImageState}>
                                    <strong>등록된 랜드마크 이미지가 없습니다.</strong>
                                    <p>랜드마크 이미지를 한 장 이상 추가해 주세요.</p>
                                </div>
                            ) : (
                                <div className={styles.imageDisclosure}>
                                    <button type="button" className={styles.imageDisclosureButton}
                                        aria-expanded={showReferenceImages}
                                        onClick={()=>setShowReferenceImages(previous=>!previous)}>
                                        <span>기존 사진 확인</span>
                                        <span>{showReferenceImages?"접기 ↑":"사진 보기 ↓"}</span>
                                    </button>
                                    {showReferenceImages && (
                                        <div className={styles.imagePreviewGrid}>
                                            {referenceImages.map(image=>(
                                                <article key={image.id} className={styles.imagePreviewItem}>
                                                    <NextImage src={image.dataUrl} alt={image.name} width={640} height={480} unoptimized/>
                                                    <button type="button" aria-label={`${image.name} 삭제`}
                                                        onClick={()=>removeReferenceImage(image.id)}>×</button>
                                                </article>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    {errorMessage && <p className={styles.errorMessage} role="alert">{errorMessage}</p>}
                    <div className={styles.formActions}>
                        <Link href={`/admin/attractions/${attractionId}?tourId=${encodeURIComponent(originalAttraction.tourId)}`}
                            className={styles.secondaryButton}>취소</Link>
                        <button type="submit" className={styles.primaryButton} disabled={isProcessing}>
                            {isProcessing?"저장 중...":imageMode?"이미지 변경 저장":"변경사항 저장"}
                        </button>
                    </div>
                </section>
            </form>
        </div>
    );
}
