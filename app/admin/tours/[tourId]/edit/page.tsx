"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { clearAdminApiKey, getAdminApiKey } from "@/lib/adminApiKey";
import styles from "../../new/TourForm.module.css";

export default function EditTourPage() {
  const params = useParams();
  const router = useRouter();
  const tourId = String(params.tourId);
  const [form, setForm] = useState({ name: "", shortName: "", region: "", description: "", badgeName: "", status: "비공개" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const adminKey = getAdminApiKey();
        if (!adminKey) throw new Error("관리자 API 키를 확인해주세요.");
        const response = await fetch(`/api/tours/${tourId}?includeHidden=true`, { headers: { "x-admin-api-key": adminKey }, cache: "no-store" });
        const result = await response.json() as { tour?: { name: string; short_name: string; region: string; description: string; badge_name: string; status: string }; message?: string };
        if (!response.ok || !result.tour) throw new Error(result.message || "투어를 불러오지 못했습니다.");
        setForm({ name: result.tour.name, shortName: result.tour.short_name, region: result.tour.region, description: result.tour.description, badgeName: result.tour.badge_name, status: result.tour.status });
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "투어를 불러오지 못했습니다.");
      } finally { setLoading(false); }
    }
    void load();
  }, [tourId]);

  const update = (field: keyof typeof form, value: string) => setForm((previous) => ({ ...previous, [field]: value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const adminKey = getAdminApiKey();
    if (!adminKey) return setErrorMessage("관리자 API 키를 확인해주세요.");
    setSaving(true); setErrorMessage("");
    try {
      const response = await fetch(`/api/tours/${tourId}`, { method: "PUT", headers: { "content-type": "application/json", "x-admin-api-key": adminKey }, body: JSON.stringify(form) });
      const result = await response.json() as { message?: string };
      if (response.status === 401) clearAdminApiKey();
      if (!response.ok) throw new Error(result.message || "투어를 수정하지 못했습니다.");
      router.push(`/admin/tours/${tourId}`);
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : "투어를 수정하지 못했습니다."); }
    finally { setSaving(false); }
  };

  if (loading) return <main className={styles.page}><section className={styles.card}>투어 정보를 불러오는 중입니다.</section></main>;

  return (
    <main className={styles.page}>
      <header className={styles.header}><div><p>투어 관리</p><h1>투어 정보 수정</h1><span>투어의 이름, 지역, 공개 상태를 변경합니다.</span></div><Link href={`/admin/tours/${tourId}`} className={styles.backButton}>← 대시보드</Link></header>
      <form className={styles.card} onSubmit={submit}>
        <div className={styles.grid}>
          <label>투어명<input value={form.name} onChange={(e) => update("name", e.target.value)} required /></label>
          <label>짧은 이름<input value={form.shortName} onChange={(e) => update("shortName", e.target.value)} required /></label>
          <label>투어 ID<input value={tourId} disabled /><small>투어 ID는 등록 후 변경할 수 없습니다.</small></label>
          <label>지역<input value={form.region} onChange={(e) => update("region", e.target.value)} required /></label>
          <label className={styles.full}>투어 소개<textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={4} required /></label>
          <label>완주 뱃지명<input value={form.badgeName} onChange={(e) => update("badgeName", e.target.value)} /></label>
          <label>공개 상태<select value={form.status} onChange={(e) => update("status", e.target.value)}><option>비공개</option><option>공개</option></select></label>
        </div>
        {errorMessage && <p className={styles.error}>{errorMessage}</p>}
        <div className={styles.actions}><Link href={`/admin/tours/${tourId}`} className={styles.cancel}>취소</Link><button disabled={saving}>{saving ? "저장 중..." : "수정 내용 저장"}</button></div>
      </form>
    </main>
  );
}
