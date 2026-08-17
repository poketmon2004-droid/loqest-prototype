"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./AttractionForm.module.css";

type Step = 1 | 2 | 3 | 4;

type FormData = {
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

type ReferenceImage = {
  id: string;
  name: string;
  dataUrl: string;
};

const initialForm: FormData = {
  name: "",
  category: "역사·문화",
  address: "",
  description: "",
  latitude: "",
  longitude: "",
  radius: "50",
  availableTime: "상시",
  landmarkThreshold: "70",
  guideMessage: "가이드라인에 맞춰 관광지와 함께 촬영해주세요.",
  status: "임시저장",
};

const steps = [
  { number: 1, title: "기본정보" },
  { number: 2, title: "위치 인증" },
  { number: 3, title: "기준 이미지" },
  { number: 4, title: "확인 및 등록" },
];

const resizeImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const maxSize = 1000;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");

        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("이미지 처리에 실패했습니다."));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };

      image.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
      image.src = String(reader.result);
    };

    reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });

export default function NewAttractionPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(initialForm);
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [imageError, setImageError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const updateForm = (field: keyof FormData, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleReferenceImages = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setImageError("");
    setIsProcessing(true);

    try {
      const convertedImages = await Promise.all(
        files.map(async (file, index) => ({
          id: `${Date.now()}-${index}-${file.name}`,
          name: file.name,
          dataUrl: await resizeImage(file),
        }))
      );

      setReferenceImages((previous) => [...previous, ...convertedImages]);
    } catch {
      setImageError("일부 이미지를 처리하지 못했습니다. 다시 선택해주세요.");
    } finally {
      setIsProcessing(false);
      event.target.value = "";
    }
  };

  const removeReferenceImage = (id: string) => {
    setReferenceImages((previous) =>
      previous.filter((image) => image.id !== id)
    );
  };

  const goNext = () => {
    if (step < 4) setStep((step + 1) as Step);
  };

  const goPrevious = () => {
    if (step > 1) setStep((step - 1) as Step);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (referenceImages.length === 0) {
      setStep(3);
      setImageError("랜드마크 판별에 사용할 기준 이미지를 등록해주세요.");
      return;
    }

    const newAttraction = {
      id: Date.now(),
      name: form.name || "이름 없는 관광지",
      category: form.category,
      address: form.address,
      description: form.description,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      radius: Number(form.radius),
      availableTime: form.availableTime,
      landmarkThreshold: Number(form.landmarkThreshold),
      guideMessage: form.guideMessage,
      referenceImages: referenceImages.length,
      referenceImageData: referenceImages,
      firstSuccess: null,
      status: form.status,
      quality: "운영 전",
    };

    try {
      const savedAttractions = JSON.parse(
        localStorage.getItem("loqest_attractions") || "[]"
      );

      localStorage.setItem(
        "loqest_attractions",
        JSON.stringify([...savedAttractions, newAttraction])
      );

      router.push("/admin/attractions");
    } catch {
      setImageError(
        "브라우저 저장 공간이 부족합니다. 이미지 수를 줄이거나 용량이 작은 사진을 사용해주세요."
      );
      setStep(3);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>관광지 관리</p>
          <h1>새 관광지 등록</h1>
          <p className={styles.headerDescription}>
            관광지 위치와 랜드마크 인증에 사용할 기준 이미지를 등록합니다.
          </p>
        </div>

        <Link href="/admin/attractions" className={styles.backLink}>
          관광지 목록으로 돌아가기
        </Link>
      </header>

      <div className={styles.stepper}>
        {steps.map((item) => (
          <button
            key={item.number}
            type="button"
            className={`${styles.stepItem} ${
              step === item.number ? styles.activeStep : ""
            } ${step > item.number ? styles.completedStep : ""}`}
            onClick={() => setStep(item.number as Step)}
          >
            <span>{step > item.number ? "✓" : item.number}</span>
            <strong>{item.title}</strong>
          </button>
        ))}
      </div>

      <form className={styles.formLayout} onSubmit={handleSubmit}>
        <section className={styles.formCard}>
          {step === 1 && (
            <>
              <div className={styles.sectionTitle}>
                <span>1</span>
                <div>
                  <h2>관광지 기본정보</h2>
                  <p>사용자 화면에 표시할 관광지 정보를 입력합니다.</p>
                </div>
              </div>

              <div className={styles.fieldGrid}>
                <label className={styles.field}>
                  관광지명
                  <input
                    type="text"
                    value={form.name}
                    placeholder="예: 암사동 선사유적지 안내판"
                    onChange={(event) => updateForm("name", event.target.value)}
                    required
                  />
                </label>

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
                </label>

                <label className={`${styles.field} ${styles.fullField}`}>
                  주소
                  <input
                    type="text"
                    value={form.address}
                    placeholder="관광지 주소를 입력해주세요."
                    onChange={(event) =>
                      updateForm("address", event.target.value)
                    }
                    required
                  />
                </label>

                <label className={`${styles.field} ${styles.fullField}`}>
                  관광지 소개
                  <textarea
                    value={form.description}
                    placeholder="관광지를 간단하게 소개해주세요."
                    rows={5}
                    onChange={(event) =>
                      updateForm("description", event.target.value)
                    }
                  />
                </label>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className={styles.sectionTitle}>
                <span>2</span>
                <div>
                  <h2>위치 인증 설정</h2>
                  <p>GPS 인증에 사용할 중심 좌표와 반경을 설정합니다.</p>
                </div>
              </div>

              <div className={styles.mapPlaceholder}>
                <span>지도 영역</span>
                <p>추후 지도 API를 연결해 위치 핀을 지정합니다.</p>
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
                      updateForm("latitude", event.target.value)
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
                      updateForm("longitude", event.target.value)
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
                        updateForm("radius", event.target.value)
                      }
                    />
                    <span>m</span>
                  </div>
                  <small>해당 반경에 들어오면 촬영이 활성화됩니다.</small>
                </label>

                <label className={styles.field}>
                  촬영 가능 시간
                  <select
                    value={form.availableTime}
                    onChange={(event) =>
                      updateForm("availableTime", event.target.value)
                    }
                  >
                    <option>상시</option>
                    <option>관광지 운영시간</option>
                    <option>직접 설정</option>
                  </select>
                </label>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className={styles.sectionTitle}>
                <span>3</span>
                <div>
                  <h2>랜드마크 기준 이미지</h2>
                  <p>현장 사진과 비교할 기준 이미지를 여러 장 등록합니다.</p>
                </div>
              </div>

              <div className={styles.fieldGrid}>
                <label className={`${styles.field} ${styles.fullField}`}>
                  기준 이미지 선택
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleReferenceImages}
                    disabled={isProcessing}
                  />
                  <small>
                    서로 다른 각도·거리·조명에서 촬영한 사진을 등록해주세요.
                  </small>
                </label>

                {isProcessing && (
                  <p className={styles.uploadCount}>이미지를 처리하고 있습니다.</p>
                )}

                {imageError && (
                  <p className={styles.errorMessage}>{imageError}</p>
                )}

                {referenceImages.length > 0 && (
                  <div className={`${styles.fullField} ${styles.imagePreviewGrid}`}>
                    {referenceImages.map((image) => (
                      <article key={image.id} className={styles.imagePreviewItem}>
                        <img src={image.dataUrl} alt={image.name} />
                        <div>
                          <span title={image.name}>{image.name}</span>
                          <button
                            type="button"
                            onClick={() => removeReferenceImage(image.id)}
                          >
                            삭제
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                <label className={styles.field}>
                  랜드마크 인식 기준
                  <div className={styles.rangeHeader}>
                    <span>인증 기준값</span>
                    <strong>{form.landmarkThreshold}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={form.landmarkThreshold}
                    onChange={(event) =>
                      updateForm("landmarkThreshold", event.target.value)
                    }
                  />
                </label>

                <label className={`${styles.field} ${styles.fullField}`}>
                  촬영 안내 문구
                  <textarea
                    value={form.guideMessage}
                    rows={3}
                    onChange={(event) =>
                      updateForm("guideMessage", event.target.value)
                    }
                  />
                </label>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className={styles.sectionTitle}>
                <span>4</span>
                <div>
                  <h2>확인 및 등록</h2>
                  <p>입력한 정보를 확인하고 관광지를 저장합니다.</p>
                </div>
              </div>

              <div className={styles.fieldGrid}>
                <label className={styles.field}>
                  공개 상태
                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateForm("status", event.target.value)
                    }
                  >
                    <option>임시저장</option>
                    <option>공개</option>
                    <option>비공개</option>
                  </select>
                </label>
              </div>

              <div className={styles.preview}>
                <p className={styles.previewLabel}>등록 내용 미리보기</p>
                <div className={styles.previewCard}>
                  <div className={styles.previewImage}>
                    {referenceImages[0] ? (
                      <img
                        src={referenceImages[0].dataUrl}
                        alt="첫 번째 기준 이미지"
                      />
                    ) : (
                      "기준 이미지"
                    )}
                  </div>

                  <div>
                    <span>{form.category}</span>
                    <h3>{form.name || "관광지명이 표시됩니다."}</h3>
                    <p>{form.description || "관광지 소개가 표시됩니다."}</p>
                    <div className={styles.previewInfo}>
                      <span>GPS {form.radius}m</span>
                      <span>기준 이미지 {referenceImages.length}장</span>
                      <span>{form.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={goPrevious}
              disabled={step === 1}
            >
              이전
            </button>

            {step < 4 ? (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={goNext}
              >
                다음 단계
              </button>
            ) : (
              <button type="submit" className={styles.primaryButton}>
                관광지 저장
              </button>
            )}
          </div>
        </section>

        <aside className={styles.summaryCard}>
          <p className={styles.summaryTitle}>등록 진행 상황</p>
          <div className={styles.summaryList}>
            <div>
              <span>관광지명</span>
              <strong>{form.name || "미입력"}</strong>
            </div>
            <div>
              <span>인증 반경</span>
              <strong>{form.radius}m</strong>
            </div>
            <div>
              <span>기준 이미지</span>
              <strong>{referenceImages.length}장</strong>
            </div>
            <div>
              <span>공개 상태</span>
              <strong>{form.status}</strong>
            </div>
          </div>

          <p className={styles.summaryHelp}>
            포즈는 인증 시 시스템에서 랜덤으로 제시되며, 인증 성공 시 디지털
            스탬프가 자동 적립됩니다.
          </p>
        </aside>
      </form>
    </div>
  );
}