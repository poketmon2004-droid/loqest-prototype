"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminApiKey, clearAdminApiKey } from "@/lib/adminApiKey";
import styles from "./TourEditor.module.css";

type FormData = { name: string; province: string; region: string; description: string };
type Tour = FormData & { status: string };
const provinces = ["서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"];
const initial: FormData = {name:"",province:"서울",region:"",description:""};

export default function TourEditor({tourId}: {tourId?:string}) {
  const router = useRouter();
  const [form,setForm] = useState<FormData>(initial);
  const [step,setStep] = useState(1);
  const [loading,setLoading] = useState(Boolean(tourId));
  const [saving,setSaving] = useState(false);
  const [deleting,setDeleting] = useState(false);
  const [status,setStatus] = useState("비공개");
  const [error,setError] = useState("");
  const [successId,setSuccessId] = useState("");
  useEffect(()=>{
    if(!tourId) return;
    let cancelled=false;
    const key=getAdminApiKey();
    if(!key){setError("관리자 API 키를 확인해주세요.");setLoading(false);return;}
    void fetch(`/api/tours/${encodeURIComponent(tourId)}?includeHidden=true`,{headers:{"x-admin-api-key":key},cache:"no-store"})
      .then(async res=>{if(res.status===401){clearAdminApiKey();throw Error("관리자 API 키가 올바르지 않습니다.");}
        const body=await res.json();if(!res.ok||!body.tour)throw Error(body.message||"투어를 불러오지 못했습니다.");return body.tour as Tour;})
      .then(tour=>{if(cancelled)return;const province=tour.province||"서울";const region=tour.region?.startsWith(province)?tour.region.slice(province.length).trim():tour.region;setForm({name:tour.name,description:tour.description||"",province,region:region||""});setStatus(tour.status||"비공개");})
      .catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:"투어를 불러오지 못했습니다.");})
      .finally(()=>{if(!cancelled)setLoading(false);});
    return ()=>{cancelled=true;};
  },[tourId]);
  const update=(key:keyof FormData,value:string)=>{setForm(f=>({...f,[key]:value}));setError("");};
  const cancelHref=tourId?`/admin/tours/${encodeURIComponent(tourId)}`:"/admin";
  const canContinue=Boolean(form.name.trim()&&form.description.trim()&&form.region.trim()&&form.description.length<=50);
  const fullRegion=[form.province.trim(),form.region.trim()].filter(Boolean).join(" ");
  const submit=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    if(step===1){if(!canContinue){setError("투어 이름, 소개(50자 이내), 지역을 입력해주세요.");return;}setStep(2);return;}
    if(!canContinue)return;
    const key=getAdminApiKey();
    if(!key){setError("관리자 API 키를 확인해주세요.");return;}
    setSaving(true);setError("");
    try{
      const url=tourId?`/api/tours/${encodeURIComponent(tourId)}`:"/api/tours";
      const response=await fetch(url,{method:tourId?"PUT":"POST",headers:{"content-type":"application/json","x-admin-api-key":key},body:JSON.stringify({...form,region:fullRegion,status:tourId?status:"비공개"})});
      const result=await response.json();
      if(response.status===401){clearAdminApiKey();throw Error("관리자 API 키가 올바르지 않습니다.");}
      if(!response.ok)throw Error(result.message||"투어를 저장하지 못했습니다.");
      const savedId=tourId||result.tour?.id;
      if(!savedId)throw Error("등록된 투어 ID를 확인할 수 없습니다.");
      localStorage.setItem("loqest_active_tour_id",savedId);
      if(tourId){router.push(`/admin/tours/${encodeURIComponent(savedId)}`);router.refresh();}
      else setSuccessId(savedId);
    }catch(e){setError(e instanceof Error?e.message:"저장 중 오류가 발생했습니다.");}
    finally{setSaving(false);}
  };
  const deleteTour=async()=>{
    if(!tourId)return;
    const nameToConfirm=window.prompt(`이 투어를 삭제하면 관련 퀘스트, 기준 이미지, 인증 기록도 삭제되고 복구할 수 없습니다.\n\n삭제하려면 "${form.name}"을(를) 정확히 입력해주세요.`);
    if(nameToConfirm===null)return;
    if(nameToConfirm!==form.name){window.alert("투어 이름이 일치하지 않아 삭제하지 않았습니다.");return;}
    const key=getAdminApiKey();if(!key){setError("관리자 API 키를 확인해주세요.");return;}
    setDeleting(true);setError("");
    try{const res=await fetch(`/api/tours/${encodeURIComponent(tourId)}`,{method:"DELETE",headers:{"x-admin-api-key":key}});
      if(!res.ok){const body=await res.json();throw Error(body.message||"투어 삭제에 실패했습니다.");}
      localStorage.removeItem("loqest_active_tour_id");router.push("/admin");router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"투어 삭제에 실패했습니다.");setDeleting(false);}
  };
  if(loading)return <main className={styles.page}><p>투어 정보를 불러오는 중입니다.</p></main>;
  return <main className={styles.page}>
    <header className={styles.heading}>
      <div><p className={styles.eyebrow}>LOQEST ADMIN · TOUR</p><h1>{tourId?"투어 정보 수정":"새 투어 등록"}</h1>
      <p>관광객에게 보일 투어를 설정해 주세요.</p></div>
      <Link href={cancelHref} className={styles.cancelTop}>취소</Link>
    </header>
    <div className={styles.steps}><span className={step===1?styles.current:""}>1　투어 정보 입력</span><span className={step===2?styles.current:""}>2　최종 확인</span></div>
    <form onSubmit={submit} className={styles.form}>
      <section className={styles.previewBox}>
        <h2>관광객에게 이렇게 보여요</h2>
        <div className={styles.previewCard}>
          <p>{fullRegion||"지역을 선택해 주세요"}</p>
          <h3>{form.name||"새 투어 이름"}</h3>
          <p>{form.description||"관광객에게 보여줄 투어 소개가 여기에 표시됩니다."}</p>
          <div className={styles.explore}>탐험하기</div>
        </div>
      </section>
      {step===1?<div className={styles.fields}>
        <section className={styles.blueCard}><h2>투어 기본 정보</h2>
          <label>투어 이름<input required value={form.name} onChange={e=>update("name",e.target.value)} placeholder="예: 암사동 선사유적 투어" maxLength={100}/></label>
          <label>투어 소개 (최대 50자)<textarea required rows={3} maxLength={50} value={form.description} onChange={e=>update("description",e.target.value)} placeholder="투어를 간단하게 소개해 주세요."/></label>
          <p className={styles.counter}>{form.description.length}/50자</p>
        </section>
        <section className={styles.grayCard}><h2>운영 지역 설정</h2>
          <div className={styles.regionGrid}>
            <label>시·도<select value={form.province} onChange={e=>update("province",e.target.value)}>{provinces.map(p=><option key={p} value={p}>{p}</option>)}</select></label>
            <label>시·군·구<input required value={form.region} onChange={e=>update("region",e.target.value)} placeholder="예: 강동구"/></label>
          </div>
        </section>
        {tourId&&<section className={styles.managementCard}>
          <h2>투어 운영 설정</h2>
          <p className={styles.managementHelp}>공개 상태를 선택한 뒤 '다음단계'에서 확인하고 저장하세요.</p>
          <div className={styles.managementSetting}>
            <div>
              <strong>투어 공개 상태</strong>
              <p>관광객에게 투어를 보여줄지 설정합니다.</p>
            </div>
            <div className={styles.statusActions} role="group" aria-label="투어 공개 상태">
              <button type="button" className={status==="공개"?styles.published:styles.secondary} aria-pressed={status==="공개"} onClick={()=>setStatus("공개")}>공개</button>
              <button type="button" className={status==="비공개"?styles.hidden:styles.secondary} aria-pressed={status==="비공개"} onClick={()=>setStatus("비공개")}>비공개</button>
            </div>
          </div>
          <div className={styles.managementSetting}>
            <div>
              <strong>투어 삭제</strong>
              <p>이 투어의 퀘스트와 인증 기록까지 삭제됩니다. 되돌릴 수 없습니다.</p>
            </div>
            <button type="button" className={styles.danger} onClick={deleteTour} disabled={deleting||saving}>{deleting?"삭제 중...":"투어 삭제"}</button>
          </div>
        </section>}
      </div>:<section className={styles.confirmCard}>
        <h2>등록 정보를 확인해 주세요</h2>
        <dl><div><dt>투어 이름</dt><dd>{form.name}</dd></div><div><dt>투어 소개</dt><dd>{form.description}</dd></div><div><dt>운영 지역</dt><dd>{fullRegion}</dd></div>{tourId&&<div><dt>공개 상태</dt><dd>{status}</dd></div>}</dl>
      </section>}
      {error&&<p className={styles.error} role="alert">{error}</p>}
      <footer className={styles.actions}>
        {step===1?<Link className={styles.secondary} href={cancelHref}>취소</Link>:<button type="button" className={styles.secondary} onClick={()=>setStep(1)}>이전단계</button>}
        <button className={styles.primary} disabled={saving||deleting||!canContinue}>{saving?"저장 중...":step===1?"다음단계":tourId?"변경사항 저장":"투어 등록하기"}</button>
      </footer>
    </form>
    {successId&&<div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label="투어 등록 완료">
      <div className={styles.modal}>
        <div className={styles.successIcon}>✓</div>
        <h2>새 관광지 등록을 완료했어요!</h2>
        <p>이제 퀘스트를 추가하러 가세요.</p>
        <button onClick={()=>router.push(`/admin/attractions/new?tourId=${encodeURIComponent(successId)}`)}>퀘스트 추가하러 가기</button>
        <Link href={`/admin/tours/${encodeURIComponent(successId)}`}>투어 관리 화면으로</Link>
      </div>
    </div>}
  </main>;
}
