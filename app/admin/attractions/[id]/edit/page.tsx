"use client";

import {
    ChangeEvent,
    FormEvent,
    useEffect,
    useState,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import styles from "../../new/AttractionForm.module.css";

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
        landmarkThreshold: 70,
        guideMessage:
            "가이드라인에 맞춰 안내판과 함께 촬영해주세요.",
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
        landmarkThreshold: 70,
        guideMessage:
            "가이드라인에 맞춰 캐릭터와 함께 촬영해주세요.",
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
        landmarkThreshold: 70,
        guideMessage:
            "가이드라인에 맞춰 소망움집과 함께 촬영해주세요.",
        referenceImages: 11,
        firstSuccess: 31,
        status: "공개",
        quality: "기준 이미지 개선",
    },
];

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
        try {
            const storedAttractions = JSON.parse(
                localStorage.getItem("loqest_attractions") || "[]"
            ) as Attraction[];

            const attractionEdits = JSON.parse(
                localStorage.getItem("loqest_attraction_edits") || "{}"
            ) as Record<string, Partial<Attraction>>;

            const storedAttraction = storedAttractions.find(
                (attraction) => attraction.id === attractionId
            );

            const defaultAttraction = defaultAttractions.find(
                (attraction) => attraction.id === attractionId
            );

            const baseAttraction =
                storedAttraction ?? defaultAttraction;

            if (!baseAttraction) {
                setErrorMessage("관광지 정보를 찾지 못했습니다.");
                setLoading(false);
                return;
            }

            const attraction = {
                ...baseAttraction,
                ...(attractionEdits[String(attractionId)] ?? {}),
            };

            setOriginalAttraction(attraction);

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
                availableTime: attraction.availableTime ?? "상시",
                landmarkThreshold: String(
                    attraction.landmarkThreshold ?? 70
                ),
                guideMessage:
                    attraction.guideMessage ??
                    "가이드라인에 맞춰 관광지와 함께 촬영해주세요.",
                status: attraction.status,
            });

            setReferenceImages(
                attraction.referenceImageData ?? []
            );
        } catch (error) {
            console.error(error);
            setErrorMessage(
                "관광지 정보를 불러오지 못했습니다."
            );
        } finally {
            setLoading(false);
        }
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

    const handleSubmit = (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (!form || !originalAttraction) {
            return;
        }

        const updatedAttraction: Attraction = {
            ...originalAttraction,
            id: attractionId,
            name: form.name,
            category: form.category,
            address: form.address,
            description: form.description,
            latitude: Number(form.latitude),
            longitude: Number(form.longitude),
            radius: Number(form.radius),
            availableTime: form.availableTime,
            landmarkThreshold: Number(
                form.landmarkThreshold
            ),
            guideMessage: form.guideMessage,
            referenceImages: referenceImages.length,
            referenceImageData: referenceImages,
            status: referenceImagesChanged
                ? "비공개"
                : form.status,

            quality: referenceImagesChanged
                ? "재테스트 필요"
                : originalAttraction.quality,
        };

        try {
            const storedAttractions = JSON.parse(
                localStorage.getItem("loqest_attractions") || "[]"
            ) as Attraction[];

            const storedIndex = storedAttractions.findIndex(
                (attraction) => attraction.id === attractionId
            );

            if (storedIndex >= 0) {
                const updatedStoredAttractions = [
                    ...storedAttractions,
                ];

                updatedStoredAttractions[storedIndex] =
                    updatedAttraction;

                localStorage.setItem(
                    "loqest_attractions",
                    JSON.stringify(updatedStoredAttractions)
                );
            } else {
                const attractionEdits = JSON.parse(
                    localStorage.getItem(
                        "loqest_attraction_edits"
                    ) || "{}"
                ) as Record<string, Partial<Attraction>>;

                attractionEdits[String(attractionId)] =
                    updatedAttraction;

                localStorage.setItem(
                    "loqest_attraction_edits",
                    JSON.stringify(attractionEdits)
                );
            }

            const savedStatuses = JSON.parse(
                localStorage.getItem(
                    "loqest_attraction_statuses"
                ) || "{}"
            ) as Record<string, string>;

            savedStatuses[String(attractionId)] =
                updatedAttraction.status;
            localStorage.setItem(
                "loqest_attraction_statuses",
                JSON.stringify(savedStatuses)
            );

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

            router.push("/admin/attractions");
        } catch (error) {
            console.error(error);

            setErrorMessage(
                "저장 공간이 부족하거나 데이터를 저장하지 못했습니다."
            );
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
                        href="/admin/attractions"
                        className={styles.backLink}
                    >
                        관광지 목록으로 돌아가기
                    </Link>
                </section>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <p className={styles.eyebrow}>
                        관광지 관리
                    </p>

                    <h1>관광지 수정</h1>

                    <p className={styles.headerDescription}>
                        관광지 정보와 기준 이미지를 수정합니다.
                    </p>
                </div>

                <Link
                    href="/admin/attractions"
                    className={styles.backLink}
                >
                    관광지 목록으로 돌아가기
                </Link>
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
                            관광지명

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
                            href="/admin/attractions"
                            className={styles.secondaryButton}
                        >
                            취소
                        </Link>

                        <button
                            type="submit"
                            className={styles.primaryButton}
                        >
                            수정 내용 저장
                        </button>
                    </div>
                </section>

                <aside className={styles.summaryCard}>
                    <p className={styles.summaryTitle}>
                        수정 내용
                    </p>

                    <div className={styles.summaryList}>
                        <div>
                            <span>관광지명</span>
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