"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";
import {
  clearAdminApiKey,
  getAdminApiKey,
} from "@/lib/adminApiKey";
import styles from "../../new/TourForm.module.css";
import AdminBackButton from "@/components/AdminBackButton";

const PROVINCES = [
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "경기",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
];

type TourResponse = {
  tour?: {
    name: string;
    province?: string;
    region: string;
    description: string;
    status: string;
  };
  message?: string;
};

function getDetailRegion(
  storedRegion: string,
  province: string
) {
  const trimmedRegion = storedRegion.trim();

  if (trimmedRegion.startsWith(province)) {
    return trimmedRegion
      .slice(province.length)
      .trim();
  }

  return trimmedRegion;
}

export default function EditTourPage() {
  const params = useParams();
  const router = useRouter();
  const tourId = String(params.tourId);

  const [form, setForm] = useState({
    name: "",
    province: "서울",
    region: "",
    description: "",
    status: "비공개",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    async function loadTour() {
      try {
        const adminKey = getAdminApiKey();

        if (!adminKey) {
          throw new Error(
            "관리자 API 키를 확인해주세요."
          );
        }

        const response = await fetch(
          `/api/tours/${tourId}?includeHidden=true`,
          {
            headers: {
              "x-admin-api-key": adminKey,
            },
            cache: "no-store",
          }
        );

        const result =
          (await response.json()) as TourResponse;

        if (response.status === 401) {
          clearAdminApiKey();

          throw new Error(
            "관리자 API 키가 올바르지 않습니다."
          );
        }

        if (!response.ok || !result.tour) {
          throw new Error(
            result.message ||
            "투어를 불러오지 못했습니다."
          );
        }

        const province =
          result.tour.province || "서울";

        setForm({
          name: result.tour.name,
          province,
          region: getDetailRegion(
            result.tour.region,
            province
          ),
          description:
            result.tour.description,
          status: result.tour.status,
        });
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "투어를 불러오지 못했습니다."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadTour();
  }, [tourId]);

  const update = (
    field: keyof typeof form,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const submit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const adminKey = getAdminApiKey();

    if (!adminKey) {
      setErrorMessage(
        "관리자 API 키를 확인해주세요."
      );
      return;
    }

    setSaving(true);
    setErrorMessage("");

    const fullRegion = [
      form.province.trim(),
      form.region.trim(),
    ]
      .filter(Boolean)
      .join(" ");

    try {
      const response = await fetch(
        `/api/tours/${tourId}`,
        {
          method: "PUT",
          headers: {
            "content-type": "application/json",
            "x-admin-api-key": adminKey,
          },
          body: JSON.stringify({
            ...form,
            region: fullRegion,
          }),
        }
      );

      const result = (await response.json()) as {
        message?: string;
      };

      if (response.status === 401) {
        clearAdminApiKey();
      }

      if (!response.ok) {
        throw new Error(
          result.message ||
          "투어를 수정하지 못했습니다."
        );
      }

      router.push(`/admin/tours/${tourId}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "투어를 수정하지 못했습니다."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          투어 정보를 불러오는 중입니다.
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <AdminBackButton />

      <header className={styles.header}>
        <div>
          <h1>관광지 정보 수정</h1>
        </div>

      </header>

      <form
        className={styles.visualEditor}
        onSubmit={submit}
      >
        <div className={styles.editorTop}>
          <div>

            <h2>네 가지 항목을 수정해주세요.</h2>
          </div>

          <span
            className={
              form.status === "공개"
                ? styles.editorPublished
                : styles.editorHidden
            }
          >
            {form.status}
          </span>
        </div>

        <article className={styles.editableTourCard}>
          <div className={styles.editableRegionRow}>
            <label
              className={`${styles.inlineField} ${styles.editField} ${styles.editFieldOne}`}
              aria-label="시도"
            >
              <span className={styles.editNumber}>1</span>

              <select
                className={styles.inlineProvince}
                value={form.province}
                onChange={(event) =>
                  update("province", event.target.value)
                }
                required
              >
                {PROVINCES.map((province) => (
                  <option
                    key={province}
                    value={province}
                  >
                    {province}
                  </option>
                ))}
              </select>
            </label>

            <label
              className={`${styles.inlineField} ${styles.editField} ${styles.editFieldTwo}`}
              aria-label="세부 지역"
            >
              <span className={styles.editNumber}>2</span>

              <input
                className={styles.inlineRegion}
                value={form.region}
                onChange={(event) =>
                  update("region", event.target.value)
                }
                placeholder="강동구"
                required
              />
            </label>
          </div>

          <label
            className={`${styles.inlineField} ${styles.editField} ${styles.editFieldThree}`}
            aria-label="투어명"
          >
            <span className={styles.editNumber}>3</span>

            <input
              className={styles.inlineTitle}
              value={form.name}
              onChange={(event) =>
                update("name", event.target.value)
              }
              placeholder="투어명을 입력해주세요"
              required
            />
          </label>

          <label
            className={`${styles.inlineField} ${styles.editField} ${styles.editFieldFour}`}
            aria-label="투어 소개"
          >
            <span className={styles.editNumber}>4</span>

            <textarea
              className={styles.inlineDescription}
              value={form.description}
              onChange={(event) =>
                update("description", event.target.value)
              }
              placeholder="관광객에게 보여줄 투어 소개를 입력해주세요."
              rows={3}
              required
            />
          </label>

          <div className={styles.editableExploreButton}>
            <span>탐험하기 →</span>
          </div>
        </article>

        <section className={styles.additionalSettings}>
          <div className={styles.settingsGrid}>
            <label className={styles.settingCard}>
              <span className={styles.settingLabel}>
                투어 ID
              </span>

              <input
                className={styles.largeSettingInput}
                value={tourId}
                disabled
              />

              <small>
                투어 ID는 변경할 수 없습니다.
              </small>
            </label>

            <div className={styles.settingCard}>
              <span className={styles.settingLabel}>
                공개 상태
              </span>

              <div className={styles.statusButtons}>
                <button
                  type="button"
                  className={
                    form.status === "비공개"
                      ? styles.activeHiddenButton
                      : styles.statusButton
                  }
                  onClick={() =>
                    update("status", "비공개")
                  }
                >
                  비공개
                </button>

                <button
                  type="button"
                  className={
                    form.status === "공개"
                      ? styles.activePublishedButton
                      : styles.statusButton
                  }
                  onClick={() =>
                    update("status", "공개")
                  }
                >
                  공개
                </button>
              </div>

              <small>
                공개 상태일 때 관광객 검색 결과에
                표시됩니다.
              </small>
            </div>
          </div>
        </section>

        {errorMessage && (
          <p className={styles.error}>
            {errorMessage}
          </p>
        )}

        <div className={styles.editorActions}>
          <Link
            href={`/admin/tours/${tourId}`}
            className={styles.editorCancel}
          >
            취소
          </Link>

          <button
            type="submit"
            disabled={saving}
          >
            {saving
              ? "저장 중..."
              : "수정 내용 저장"}
          </button>
        </div>
      </form>
    </main>
  );
}