"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  clearAdminApiKey,
  getAdminApiKey,
} from "@/lib/adminApiKey";
import AdminBackButton from "@/components/AdminBackButton";
import styles from "./AttractionForm.module.css";

type Step = 1 | 2;

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
  { number: 2, title: "기준 이미지 등록" },
];
const CATEGORY_ICONS: Record<string, string> = {
  "역사·문화": "🗺️",
  "자연·생태": "🌿",
  "축제·행사": "🎉",
  "체험·레저": "🎯",
  "지역상권": "🛍️",
};

const resizeImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const maxSize = 1000;
        const scale = Math.min(
          1,
          maxSize / Math.max(image.width, image.height),
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
          canvas.height,
        );

        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };

      image.onerror = () =>
        reject(new Error("이미지를 불러오지 못했습니다."));

      image.src = String(reader.result);
    };

    reader.onerror = () =>
      reject(new Error("파일을 읽지 못했습니다."));

    reader.readAsDataURL(file);
  });

export default function NewAttractionPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] =
    useState<AttractionFormData>(initialForm);

  const [referenceImages, setReferenceImages] =
    useState<ReferenceImage[]>([]);

  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [tourId, setTourId] = useState("amsa");
  const [tourName, setTourName] =
    useState("선택한 관광지");

  useEffect(() => {
    const selectedTourId =
      new URLSearchParams(window.location.search).get("tourId") ||
      localStorage.getItem("loqest_active_tour_id") ||
      "amsa";

    setTourId(selectedTourId);

    localStorage.setItem(
      "loqest_active_tour_id",
      selectedTourId,
    );

    const adminKey = getAdminApiKey();
    if (!adminKey) return;

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

  const goPrevious = () => {
    setErrorMessage("");
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (referenceImages.length === 0) {
      setErrorMessage(
        "인식 테스트에 사용할 기준 이미지를 한 장 이상 등록해주세요.",
      );
      return;
    }

    const newAttraction = {
      tourId,
      name: form.name.trim(),
      category: form.category,

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

      const requestBody = new window.FormData();

      requestBody.append(
        "attraction",
        JSON.stringify(newAttraction),
      );

      referenceImages.forEach((image) => {
        requestBody.append("images", image.file);
      });

      const response = await fetch("/api/attractions", {
        method: "POST",
        headers: {
          "x-admin-api-key": adminKey,
        },
        body: requestBody,
      });

      const result = (await response.json()) as {
        attraction?: { id: number };
        message?: string;
      };

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

      router.push(
        `/landmark-test?attractionId=${result.attraction.id}`,
      );
    } catch (error) {
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
                <div className={styles.questPreviewIcon}>
                  {CATEGORY_ICONS[form.category] || "📍"}
                </div>

                <div className={styles.questPreviewContent}>
                  <label className={styles.previewInputWrapper}>
                    <span className={styles.previewNumber}>1</span>

                    <input
                      type="text"
                      className={styles.previewNameInput}
                      value={form.name}
                      placeholder="퀘스트명을 입력해주세요."
                      onChange={(event) =>
                        updateForm("name", event.target.value)
                      }
                      aria-label="퀘스트명"
                      required
                    />
                  </label>

                  <label className={styles.previewInputWrapper}>
                    <span
                      className={`${styles.previewNumber} ${styles.secondNumber}`}
                    >
                      2
                    </span>

                    <input
                      type="text"
                      className={styles.previewDescriptionInput}
                      value={form.description}
                      placeholder="예: 유적지 지도를 찾아보세요"
                      onChange={(event) =>
                        updateForm("description", event.target.value)
                      }
                      aria-label="퀘스트 설명"
                      required
                    />
                  </label>
                </div>
              </div>

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
                  </select>

                  <small>
                    선택한 카테고리에 맞춰 카드 아이콘이 자동으로
                    변경됩니다.
                  </small>
                </label>
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
                <h2>기준 이미지 등록</h2>
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
                + 기준 이미지 선택
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
                      <img
                        src={image.dataUrl}
                        alt={image.name}
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
              이전
            </button>
          )}

          {step === 1 ? (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={goNext}
            >
              다음 단계
            </button>
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
                : "저장하고 인식 테스트하기"}
            </button>
          )}
        </div>
      </section>
    </form >
    </div >
  );
}