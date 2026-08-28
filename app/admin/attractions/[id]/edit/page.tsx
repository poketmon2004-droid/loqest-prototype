"use client";

import {
    ChangeEvent,
    FormEvent,
    useEffect,
    useState,
} from "react";
import Link from "next/link";
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

const resizeImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const image = new Image();

            image.onload = () => {
                const maxSize = 1000;
                const scale = Math.min(
                    1,
                    maxSize / Math.max(image.width, image.height)
                );

                const canvas = document.createElement("canvas");

                canvas.width = Math.round(image.width * scale);
                canvas.height = Math.round(image.height * scale);

                const context = canvas.getContext("2d");

                if (!context) {
                    reject(new Error("이미지 처리에 실패했습니다."));
                    return;
                }

                context.drawImage(
                    image,
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

                resolve(canvas.toDataURL("image/jpeg", 0.72));
            };

            image.onerror = () => {
                reject(new Error("이미지를 불러오지 못했습니다."));
            };

            image.src = String(reader.result);
        };

        reader.onerror = () => {
            reject(new Error("파일을 읽지 못했습니다."));
        };

        reader.readAsDataURL(file);
    });

export default function EditAttractionPage() {
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
            setErrorMessage("랜드마크 판별에 사용할 기준 이미지를 한 장 이상 남겨주세요.");
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
                        href={`/admin/attractions?tourId=${originalAttraction?.tourId ?? "amsa"}`}
                        className={styles.backLink}
                    >
                        퀘스트 목록으로 돌아가기
                    </Link>
                </section>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <AdminBackButton />
                    <p className={styles.eyebrow}>
                        퀘스트 관리
                    </p>

                    <h1>관광지 수정</h1>

                    <p className={styles.headerDescription}>
                        관광지 정보와 기준 이미지를 수정합니다.
                    </p>
                </div>

            </header>

            <form
                className={styles.formLayout}
                onSubmit={handleSubmit}
            >
                <section className={styles.formCard}>
                    <div className={styles.sectionTitle}>
                        <span>✓</span>

                        <div>
                            <h2>{form.name}</h2>
                            <p>
                                수정한 내용은 저장 후 목록에 반영됩니다.
                            </p>
                        </div>
                    </div>

                    <div className={styles.fieldGrid}>
                        <label className={styles.field}>
                            퀘스트명

                            <input
                                type="text"
                                value={form.name}
                                onChange={(event) =>
                                    updateForm(
                                        "name",
                                        event.target.value
                                    )
                                }
                                required
                            />
                        </label>

                        <label className={styles.field}>
                            카테고리

                            <select
                                value={form.category}
                                onChange={(event) =>
                                    updateForm(
                                        "category",
                                        event.target.value
                                    )
                                }
                            >
                                <option>역사·문화</option>
                                <option>자연·생태</option>
                                <option>축제·행사</option>
                                <option>체험·레저</option>
                                <option>지역상권</option>
                                <option>포토 미션</option>
                            </select>
                        </label>

                        <label
                            className={`${styles.field} ${styles.fullField}`}
                        >
                            주소

                            <input
                                type="text"
                                value={form.address}
                                onChange={(event) =>
                                    updateForm(
                                        "address",
                                        event.target.value
                                    )
                                }
                            />
                        </label>

                        <label
                            className={`${styles.field} ${styles.fullField}`}
                        >
                            관광지 소개

                            <textarea
                                value={form.description}
                                rows={4}
                                onChange={(event) =>
                                    updateForm(
                                        "description",
                                        event.target.value
                                    )
                                }
                            />
                        </label>

                        <label className={styles.field}>
                            위도

                            <input
                                type="number"
                                step="any"
                                value={form.latitude}
                                onChange={(event) =>
                                    updateForm(
                                        "latitude",
                                        event.target.value
                                    )
                                }
                            />
                        </label>

                        <label className={styles.field}>
                            경도

                            <input
                                type="number"
                                step="any"
                                value={form.longitude}
                                onChange={(event) =>
                                    updateForm(
                                        "longitude",
                                        event.target.value
                                    )
                                }
                            />
                        </label>

                        <label className={styles.field}>
                            GPS 인증 반경

                            <div className={styles.inputWithUnit}>
                                <input
                                    type="number"
                                    min="10"
                                    value={form.radius}
                                    onChange={(event) =>
                                        updateForm(
                                            "radius",
                                            event.target.value
                                        )
                                    }
                                />

                                <span>m</span>
                            </div>
                        </label>

                        <label className={styles.field}>
                            촬영 가능 시간

                            <select
                                value={form.availableTime}
                                onChange={(event) =>
                                    updateForm(
                                        "availableTime",
                                        event.target.value
                                    )
                                }
                            >
                                <option>상시</option>
                                <option>관광지 운영시간</option>
                                <option>직접 설정</option>
                            </select>
                        </label>

                        <label className={styles.field}>
                            랜드마크 인식 기준

                            <div className={styles.rangeHeader}>
                                <span>인증 기준값</span>

                                <strong>
                                    {form.landmarkThreshold}%
                                </strong>
                            </div>

                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={form.landmarkThreshold}
                                onChange={(event) =>
                                    updateForm(
                                        "landmarkThreshold",
                                        event.target.value
                                    )
                                }
                            />
                        </label>

                        <label className={styles.field}>
                            공개 상태

                            <select
                                value={form.status}
                                onChange={(event) =>
                                    updateForm(
                                        "status",
                                        event.target.value
                                    )
                                }
                            >
                                <option>임시저장</option>
                                <option>공개</option>
                                <option>비공개</option>
                            </select>
                        </label>

                        <label
                            className={`${styles.field} ${styles.fullField}`}
                        >
                            촬영 안내 문구

                            <textarea
                                value={form.guideMessage}
                                rows={3}
                                onChange={(event) =>
                                    updateForm(
                                        "guideMessage",
                                        event.target.value
                                    )
                                }
                            />
                        </label>

                        <label
                            className={`${styles.field} ${styles.fullField}`}
                        >
                            기준 이미지 추가

                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleReferenceImages}
                                disabled={isProcessing}
                            />

                            <small>
                                기존 이미지에 새 이미지를 추가할 수 있습니다.
                            </small>
                        </label>

                        {isProcessing && (
                            <p className={styles.uploadCount}>
                                이미지를 처리하고 있습니다.
                            </p>
                        )}

                        {errorMessage && (
                            <p className={styles.errorMessage}>
                                {errorMessage}
                            </p>
                        )}

                        {referenceImages.length > 0 && (
                            <div
                                className={`${styles.fullField} ${styles.imagePreviewGrid}`}
                            >
                                {referenceImages.map((image) => (
                                    <article
                                        key={image.id}
                                        className={styles.imagePreviewItem}
                                    >
                                        <img
                                            src={image.dataUrl}
                                            alt={image.name}
                                        />

                                        <div>
                                            <span title={image.name}>
                                                {image.name}
                                            </span>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeReferenceImage(image.id)
                                                }
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className={styles.formActions}>
                        <Link
                            href={`/admin/attractions?tourId=${originalAttraction.tourId}`}
                            className={styles.secondaryButton}
                        >
                            취소
                        </Link>

                        <button
                            type="submit"
                            className={styles.primaryButton}
                            disabled={isProcessing}
                        >
                            {isProcessing
                                ? "저장 중..."
                                : referenceImagesChanged
                                    ? "저장하고 다시 테스트"
                                    : "수정 내용 저장"}
                        </button>
                    </div>
                </section>

                <aside className={styles.summaryCard}>
                    <p className={styles.summaryTitle}>
                        수정 내용
                    </p>

                    <div className={styles.summaryList}>
                        <div>
                            <span>퀘스트명</span>
                            <strong>{form.name}</strong>
                        </div>

                        <div>
                            <span>인증 반경</span>
                            <strong>{form.radius}m</strong>
                        </div>

                        <div>
                            <span>기준 이미지</span>
                            <strong>
                                {referenceImages.length}장
                            </strong>
                        </div>

                        <div>
                            <span>공개 상태</span>
                            <strong>{form.status}</strong>
                        </div>
                    </div>
                </aside>
            </form>
        </div>
    );
}
