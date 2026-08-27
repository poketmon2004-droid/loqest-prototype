"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAdminApiKey, getAdminApiKey } from "@/lib/adminApiKey";
import styles from "./TourForm.module.css";

export default function NewTourPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    id: "", name: "", shortName: "", region: "", description: "", badgeName: "", status: "비공개",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (field: keyof typeof form, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const adminKey = getAdminApiKey();
    if (!adminKey) return setErrorMessage("관리자 API 키를 확인해주세요.");
    setSaving(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/tours", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-api-key": adminKey },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as { tour?: { id: string }; message?: string };
      if (response.status === 401) {
        clearAdminApiKey();
        throw new Error("관리자 API 키가 올바르지 않습니다.");
      }
      if (!response.ok || !result.tour) throw new Error(result.message || "투어를 저장하지 못했습니다.");
      localStorage.setItem("loqest_active_tour_id", result.tour.id);
      router.push(`/admin/tours/${result.tour.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "투어를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div><p>투어 관리</p><h1>새 투어 등록</h1><span>큰 관광지 또는 지역 단위의 투어를 먼저 등록합니다.</span></div>
        <Link href="/admin" className={styles.backButton}>← 투어 목록</Link>
      </header>
      <form className={styles.card} onSubmit={submit}>
        <div className={styles.notice}><strong>투어를 만든 다음 내부 퀘스트를 추가할 수 있습니다.</strong><p>예: 암사동 선사유적지 투어 → 안내판·소망움집 퀘스트</p></div>
        <div className={styles.grid}>
          <label>투어명<input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="예: 광나루 한강공원 투어" required /></label>
          <label>짧은 이름<input value={form.shortName} onChange={(e) => update("shortName", e.target.value)} placeholder="예: 광나루" required /></label>
          <label>투어 ID<input value={form.id} onChange={(e) => update("id", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="예: gwangnaru" required /><small>영문 소문자·숫자·하이픈만 사용합니다.</small></label>
          <label>지역<input value={form.region} onChange={(e) => update("region", e.target.value)} placeholder="예: 서울 광진구" required /></label>
          <label className={styles.full}>투어 소개<textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={4} placeholder="사용자에게 보여줄 투어 소개를 입력해주세요." required /></label>
          <label>완주 뱃지명<input value={form.badgeName} onChange={(e) => update("badgeName", e.target.value)} placeholder="예: 광나루 탐험가" /></label>
          <label>공개 상태<select value={form.status} onChange={(e) => update("status", e.target.value)}><option>비공개</option><option>공개</option></select></label>
        </div>
        {errorMessage && <p className={styles.error}>{errorMessage}</p>}
        <div className={styles.actions}><Link href="/admin" className={styles.cancel}>취소</Link><button disabled={saving}>{saving ? "저장 중..." : "투어 등록하고 퀘스트 추가"}</button></div>
      </form>
    </main>
  );
}
