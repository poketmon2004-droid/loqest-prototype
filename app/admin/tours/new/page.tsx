"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAdminApiKey, getAdminApiKey } from "@/lib/adminApiKey";
import AdminBackButton from "@/components/AdminBackButton";
import styles from "./TourForm.module.css";

const PROVINCES = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

export default function NewTourPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    id: "",
    name: "",
    province: "서울",
    region: "",
    description: "",
    status: "비공개",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (field: keyof typeof form, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrorMessage("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const adminKey = getAdminApiKey();

    if (!adminKey) {
      setErrorMessage("관리자 API 키를 확인해주세요.");
      return;
    }

    const fullRegion = [form.province.trim(), form.region.trim()]
      .filter(Boolean)
      .join(" ");

    setSaving(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/tours", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-api-key": adminKey,
        },
        body: JSON.stringify({ ...form, region: fullRegion }),
      });

      const result = (await response.json()) as {
        tour?: { id: string };
        message?: string;
      };

      if (response.status === 401) {
        clearAdminApiKey();
        throw new Error("관리자 API 키가 올바르지 않습니다.");
      }

      if (!response.ok || !result.tour) {
        throw new Error(result.message || "관광지를 저장하지 못했습니다.");
      }

      localStorage.setItem("loqest_active_tour_id", result.tour.id);
      router.push(`/admin/tours/${result.tour.id}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "관광지를 저장하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className={styles.page}>
      <AdminBackButton />

      <header className={styles.header}>
        <div>
          <h1>새 관광지 등록</h1>
        </div>
      </header>

      <form className={styles.visualEditor} onSubmit={submit}>
        <div className={styles.editorTop}>
          <h2>네 가지 항목을 입력해주세요.</h2>

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
                onChange={(event) => update("province", event.target.value)}
                required
              >
                {PROVINCES.map((province) => (
                  <option key={province} value={province}>
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
                onChange={(event) => update("region", event.target.value)}
                placeholder="강동구"
                required
              />
            </label>
          </div>

          <label
            className={`${styles.inlineField} ${styles.editField} ${styles.editFieldThree}`}
            aria-label="관광지명"
          >
            <span className={styles.editNumber}>3</span>
            <input
              className={styles.inlineTitle}
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder="관광지명을 입력해주세요"
              required
            />
          </label>

          <label
            className={`${styles.inlineField} ${styles.editField} ${styles.editFieldFour}`}
            aria-label="관광지 소개"
          >
            <span className={styles.editNumber}>4</span>
            <textarea
              className={styles.inlineDescription}
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="관광객에게 보여줄 관광지 소개를 입력해주세요."
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
              <span className={styles.settingLabel}>투어 ID</span>
              <input
                className={styles.largeSettingInput}
                value={form.id}
                onChange={(event) =>
                  update(
                    "id",
                    event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                  )
                }
                placeholder="예: amsa"
                required
              />
              <small>영문 소문자·숫자·하이픈만 사용할 수 있습니다.</small>
            </label>

            <div className={styles.settingCard}>
              <span className={styles.settingLabel}>공개 상태</span>
              <div className={styles.statusButtons}>
                <button
                  type="button"
                  className={
                    form.status === "비공개"
                      ? styles.activeHiddenButton
                      : styles.statusButton
                  }
                  onClick={() => update("status", "비공개")}
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
                  onClick={() => update("status", "공개")}
                >
                  공개
                </button>
              </div>
              <small>공개 상태일 때 관광객 검색 결과에 표시됩니다.</small>
            </div>
          </div>
        </section>

        {errorMessage && <p className={styles.error}>{errorMessage}</p>}

        <div className={styles.editorActions}>
          <Link href="/admin" className={styles.editorCancel}>
            취소
          </Link>
          <button type="submit" disabled={saving}>
            {saving ? "저장 중..." : "관광지 등록"}
          </button>
        </div>
      </form>
    </main>
  );
}
