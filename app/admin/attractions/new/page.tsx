"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import { resizeImage } from "@/lib/image/resizeImage";
import {
  clearAdminApiKey,
  getAdminApiKey,
} from "@/lib/adminApiKey";
import AdminBackButton from "@/components/AdminBackButton";
import styles from "./AttractionForm.module.css";
import savingStyles from "@/components/TourEditor.module.css";

type Step = 1 | 2 | 3;

type AttractionFormData = {
  name: string;
  description: string;
  category: string;
  latitude: string;
  longitude: string;
  radius: string;
};

type ReferenceImage = {
  id: string;
  name: string;
  dataUrl: string;
  file: File;
};

const initialForm: AttractionFormData = {
  name: "",
  description: "",
  category: "역사·문화",
  latitude: "",
  longitude: "",
  radius: "50",
};

const steps = [
  { number: 1, title: "퀘스트 정보 및 위치" },
  { number: 2, title: "랜드마크 이미지 등록" },
  { number: 3, title: "최종 확인" },
];
const CATEGORY_ICONS: Record<string, string> = {
  "역사·문화": "🗺️",
  "자연·생태": "🌿",
  "축제·행사": "🎉",
  "체험·레저": "🎯",
  "지역상권": "🛍️",
  "기타": "✨",
};

export default function NewAttractionPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] =
    useState<AttractionFormData>(initialForm);

  const [referenceImages, setReferenceImages] =
    useState<ReferenceImage[]>([]);

  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // A synchronous lock prevents rapid submissions before React disables the button.
  const submitLocked = useRef(false);
  // Stable request identity is reused if registration needs to be retried.
  const registrationId = useRef<string | null>(null);

  const [tourId, setTourId] = useState("amsa");
  const [tourName, setTourName] =
    useState("선택한 관광지");

  useEffect(() => {
    const selectedTourId =
      new URLSearchParams(window.location.search).get("tourId") ||
      localStorage.getItem("loqest_active_tour_id") ||
      "amsa";

    const frameId = window.requestAnimationFrame(() => {
      setTourId(selectedTourId);
    });

    localStorage.setItem(
      "loqest_active_tour_id",
      selectedTourId,
    );

    const adminKey = getAdminApiKey();
    if (adminKey) {
      void fetch(
        `/api/tours/${selectedTourId}?includeHidden=true`,
        {
          headers: {
            "x-admin-api-key": adminKey,
          },
          cache: "no-store",
        },
      ).then(async (response) => {
        if (!response.ok) return;

        const result = (await response.json()) as {
          tour?: { name: string };
        };

        if (result.tour) {
          setTourName(result.tour.name);
        }
      });
    }

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const updateForm = (
    field: keyof AttractionFormData,
    value: string,
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrorMessage("");
  };


  const handleReferenceImages = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setErrorMessage("");
    setIsProcessing(true);

    try {
      const convertedImages = await Promise.all(
        files.map(async (file, index) => ({
          id: `${Date.now()}-${index}-${file.name}`,
          name: file.name,
          dataUrl: await resizeImage(file),
          file,
        })),
      );

      setReferenceImages((previous) => [
        ...previous,
        ...convertedImages,
      ]);
    } catch {
      setErrorMessage(
        "일부 이미지를 처리하지 못했습니다. 다시 선택해주세요.",
      );
    } finally {
      setIsProcessing(false);
      event.target.value = "";
    }
  };

  const removeReferenceImage = (id: string) => {
    setReferenceImages((previous) =>
      previous.filter((image) => image.id !== id),
    );
  };

  const goNext = () => {
    if (!form.name.trim()) {
      setErrorMessage("퀘스트명을 입력해주세요.");
      return;
    }
    if (!form.description.trim()) {
      setErrorMessage("관광객에게 보여줄 퀘스트 설명을 입력해주세요.");
      return;
    }

    if (!form.latitude.trim() || !form.longitude.trim()) { setErrorMessage("인증 위치의 위도와 경도를 입력해주세요.");return; }
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    const radius = Number(form.radius);

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      setErrorMessage(
        "위도를 -90부터 90 사이로 입력해주세요.",
      );
      return;
    }

    if (
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      setErrorMessage(
        "경도를 -180부터 180 사이로 입력해주세요.",
      );
      return;
    }

    if (!Number.isFinite(radius) || radius < 10) {
      setErrorMessage(
        "GPS 인증 반경을 10m 이상으로 입력해주세요.",
      );
      return;
    }

    setErrorMessage("");
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goReview = () => {if(referenceImages.length===0){setErrorMessage("랜드마크 이미지를 한 장 이상 등록해주세요.");return;}setErrorMessage("");setStep(3);window.scrollTo({top:0,behavior:"smooth"});};

  const goPrevious = () => {
    setErrorMessage("");
    setStep(previous => previous === 3 ? 2 : 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (submitLocked.current) return;
    if(step===1){goNext();return;}
    if(step===2){goReview();return;}

    if (referenceImages.length === 0) {
      setErrorMessage(
        "인식 테스트에 사용할 랜드마크 이미지를 한 장 이상 등록해주세요.",
      );
      return;
    }

    if (!window.confirm(`"${form.name.trim()}" 퀘스트를 등록하시겠습니까?\n등록 후 비공개 상태로 저장됩니다.`)) return;

    submitLocked.current = true;
    registrationId.current ??= crypto.randomUUID();

    const newAttraction = {
      recognitionKey: `quest-${registrationId.current}`,
      tourId,
      name: form.name.trim(),
      category: form.category,
      icon: CATEGORY_ICONS[form.category] || "📍",

      // 화면에서 입력받지 않고 자동 적용
      address: "",
      description: form.description.trim(),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      radius: Number(form.radius),
      availableTime: "상시",
      landmarkThreshold: 70,
      guideMessage:
        "가이드라인에 맞춰 관광지와 함께 촬영해주세요.",
      status: "비공개",
    };

    try {
      const adminKey = getAdminApiKey();

      if (!adminKey) {
        throw new Error(
          "관리자 API 키가 없습니다. 새로고침 후 다시 입력해주세요.",
        );
      }

      setErrorMessage("");
      setIsProcessing(true);
      setIsSaving(true);

      const requestBody = new window.FormData();

      requestBody.append(
        "attraction",
        JSON.stringify(newAttraction),
      );

      // 미리보기에서 축소한 이미지를 실제 업로드에도 사용합니다.
      for (const image of referenceImages) {
        const compressedImage = await fetch(image.dataUrl).then((result) =>
          result.blob(),
        );
        const jpegName = image.name.replace(/\.[^.]+$/, "") + ".jpg";
        requestBody.append("images", compressedImage, jpegName);
      }

      const response = await fetch("/api/attractions", {
        method: "POST",
        headers: {
          "x-admin-api-key": adminKey,
        },
        body: requestBody,
      });

      const responseText = await response.text();
      let result: { attraction?: { id: number }; message?: string } = {};
      try {
        result = JSON.parse(responseText);
      } catch {
        if (!response.ok) {
          throw new Error(
            response.status === 413
              ? "랜드마크 이미지 용량이 서버 업로드 제한을 초과했습니다. 이미지 수를 줄여 다시 시도해주세요."
              : `서버가 정상적인 응답을 보내지 않았습니다. (HTTP ${response.status})`,
          );
        }
        throw new Error("서버 응답을 확인할 수 없습니다.");
      }

      if (response.status === 401) {
        clearAdminApiKey();

        throw new Error(
          "관리자 API 키가 올바르지 않습니다. 다시 등록해주세요.",
        );
      }

      if (!response.ok || !result.attraction) {
        throw new Error(
          result.message ||
          "퀘스트를 저장하지 못했습니다.",
        );
      }

      localStorage.setItem(`loqest_new_quest_${tourId}`, String(result.attraction.id));
      router.replace(`/admin/tours/${encodeURIComponent(tourId)}`);
    } catch (error) {
      submitLocked.current = false;
      setIsSaving(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "퀘스트를 저장하지 못했습니다.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.page}>
      <AdminBackButton />

      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{tourName}</p>
          <h1>새 퀘스트 등록</h1>
          <p className={styles.headerDescription}>
            퀘스트 정보와 인증에 사용할 사진을 등록합니다.
          </p>
        </div>
      </header>

      <div className={styles.stepper}>
        {steps.map((item) => (
          <div
            key={item.number}
            className={`${styles.stepItem} ${step === item.number
              ? styles.activeStep
              : ""
              } ${step > item.number
                ? styles.completedStep
                : ""
              }`}
          >
            <span>
              {step > item.number ? "✓" : item.number}
            </span>

            <strong>{item.title}</strong>
          </div>
        ))}
      </div>

      <form
        className={styles.formLayout}
        onSubmit={handleSubmit}
      >
        <section className={styles.formCard}>
          {step === 1 && (
            <>
              <div className={styles.sectionTitle}>
                <span>1</span>

                <div>
                  <h2>퀘스트 정보 및 위치</h2>
                  <p>
                    퀘스트 정보와 촬영이 가능한 위치를
                    설정합니다.
                  </p>
                </div>
              </div>

              <div className={styles.questPreviewCard}>
                <div className={styles.questPreviewBanner}>미리보기</div>
                <div className={styles.questPreviewIcon}>{CATEGORY_ICONS[form.category] || "📍"}</div>
                <div className={styles.questPreviewContent}><strong>{form.name || "퀘스트명을 입력해주세요."}</strong><p>{form.description || "퀘스트 설명이 표시됩니다."}</p></div>
              </div>
              <div className={styles.inputEmphasis}>
                <h3>퀘스트 기본 정보</h3>
                <label className={styles.field}>퀘스트명
                  <input type="text" value={form.name} onChange={event=>updateForm("name",event.target.value)} placeholder="예: 선사유적지 안내판" required/>
                </label>
                <label className={styles.field}>안내 문구
                  <input type="text" value={form.description} onChange={event=>updateForm("description",event.target.value)} placeholder="관광객에게 보여줄 설명을 입력해 주세요." required/>
                </label>
              <div className={styles.categorySetting}>
                <label className={styles.field}>
                  카테고리
                  <select
                    value={form.category}
                    onChange={(event) =>
                      updateForm("category", event.target.value)
                    }
                  >
                    <option>역사·문화</option>
                    <option>자연·생태</option>
                    <option>축제·행사</option>
                    <option>체험·레저</option>
                    <option>지역상권</option>
                    <option>기타</option>
                  </select>

                  <small>
                    선택한 카테고리에 맞춰 카드 아이콘이 자동으로
                    변경됩니다.
                  </small>
                </label>
              </div>

              </div>

          <div className={styles.compactSection}>
            <div className={styles.locationHeader}>
              <div>
                <h3>인증 위치</h3>
                <p>
                  관광객이 촬영할 장소의 위치를 설정합니다.
                </p>
              </div>
            </div>

            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                위도
                <input
                  type="number"
                  step="any"
                  value={form.latitude}
                  placeholder="37.560000"
                  onChange={(event) =>
                    updateForm(
                      "latitude",
                      event.target.value,
                    )
                  }
                  required
                />
              </label>

              <label className={styles.field}>
                경도
                <input
                  type="number"
                  step="any"
                  value={form.longitude}
                  placeholder="127.130000"
                  onChange={(event) =>
                    updateForm(
                      "longitude",
                      event.target.value,
                    )
                  }
                  required
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
                        event.target.value,
                      )
                    }
                  />
                  <span>m</span>
                </div>

                <small>
                  설정한 반경 안에서만 촬영할 수
                  있습니다.
                </small>
              </label>
            </div>
          </div>
        </>
          )}

        {step === 2 && (
          <>
            <div className={styles.sectionTitle}>
              <span>2</span>

              <div>
                <h2>랜드마크 이미지 등록</h2>
                <p>
                  실제 촬영 사진과 비교할 이미지를
                  등록합니다.
                </p>
              </div>
            </div>

            <div className={styles.uploadArea}>
              <div className={styles.uploadHeader}>
                <div>
                  <h3>사진 등록</h3>
                  <p>
                    서로 다른 각도와 거리에서 촬영한
                    사진을 등록해주세요.
                  </p>
                </div>

                <strong>
                  {referenceImages.length}장 등록
                </strong>
              </div>

              <label className={styles.fileButton}>
                + 랜드마크 이미지 선택
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleReferenceImages}
                  disabled={isProcessing}
                />
              </label>

              {isProcessing && (
                <p className={styles.uploadCount}>
                  이미지를 처리하고 있습니다.
                </p>
              )}

              {referenceImages.length === 0 ? (
                <div className={styles.emptyImageState}>
                  <strong>
                    아직 등록된 이미지가 없습니다.
                  </strong>
                  <p>
                    인식 정확도를 위해 여러 각도의
                    사진을 등록해주세요.
                  </p>
                </div>
              ) : (
                <div
                  className={styles.imagePreviewGrid}
                >
                  {referenceImages.map((image) => (
                    <article
                      key={image.id}
                      className={
                        styles.imagePreviewItem
                      }
                    >
                      <NextImage
                        src={image.dataUrl}
                        alt={image.name}
                      width={640}
                                        height={480}
                                        unoptimized
                                        />

                      <button
                        type="button"
                        onClick={() =>
                          removeReferenceImage(image.id)
                        }
                        aria-label={`${image.name} 삭제`}
                      >
                        ×
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {step === 3 && (
          <section className={styles.reviewCard}>
            <h2>최종 확인</h2>
            <div className={styles.questPreviewCard}>
              <div className={styles.questPreviewBanner}>미리보기</div>
              <div className={styles.questPreviewIcon}>{CATEGORY_ICONS[form.category]||"📍"}</div>
              <div className={styles.questPreviewContent}><strong>{form.name}</strong><p>{form.description}</p></div>
            </div>
            <div className={styles.reviewDetails}>
              <p><b>카테고리</b>{form.category}</p><p><b>인증 위치</b>{form.latitude}, {form.longitude}</p>
              <p><b>인증 반경</b>{form.radius}m</p><p><b>랜드마크 이미지</b>{referenceImages.length}장</p>
            </div>
            <p className={styles.privateNotice}>등록된 퀘스트는 비공개 상태로 저장됩니다. 인식 테스트를 마친 뒤 공개할 수 있습니다.</p>
          </section>
        )}

        {errorMessage && (
          <p className={styles.errorMessage}>
            {errorMessage}
          </p>
        )}

        <div className={styles.formActions}>
          {step === 1 ? (
            <span />
          ) : (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={goPrevious}
              disabled={isProcessing}
            >
              이전단계
            </button>
          )}

          {step === 1 ? (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={goNext}
            >
              다음단계
            </button>
          ) : step === 2 ? (
            <button type="button" className={styles.primaryButton} onClick={goReview} disabled={isProcessing || referenceImages.length === 0}>다음단계</button>
          ) : (
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={
                isProcessing ||
                referenceImages.length === 0
              }
            >
              {isProcessing
                ? "저장 중..."
                : "퀘스트 등록하기"}
            </button>
          )}
        </div>
      </section>
    </form >
    {isSaving && (
      <div className={savingStyles.modalBackdrop} role="dialog" aria-modal="true" aria-label="퀘스트 등록 중" aria-live="polite">
        <div className={savingStyles.modal}>
          <div className={savingStyles.savingSpinner} aria-hidden="true" />
          <h2>퀘스트를 등록하고 있어요</h2>
          <p>잠시만 기다려 주세요. 등록이 끝나면 해당 투어 관리 화면으로 자동 이동합니다.</p>
        </div>
      </div>
    )}
    </div >
  );
}
