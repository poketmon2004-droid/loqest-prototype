"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { clearAdminApiKey, getAdminApiKey } from "@/lib/adminApiKey";
import styles from "./ParticipantsAnalytics.module.css";

type Attraction={id:number;name:string;status:string};
type RecordItem={id:string;sessionId:string;visitorId:string;attractionId:number;result:"success"|"failure";stage:"location"|"landmark"|"completed"|"system";attemptNumber:number;capturedAt:string};
const dateText=(value:string)=>{const d=new Date(value);return Number.isNaN(d.getTime())?"-":d.toLocaleString("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});};
const stageText:Record<RecordItem["stage"],string>={location:"위치 인증",landmark:"랜드마크",completed:"퀘스트 완료",system:"시스템"};
export default function ParticipantsPage(){
 const params=useSearchParams();const tourId=params.get("tourId")||"";
 const [attractions,setAttractions]=useState<Attraction[]>([]);
 const [records,setRecords]=useState<RecordItem[]>([]);
 const [tourName,setTourName]=useState("선택한 투어");
 const [selected,setSelected]=useState<number|null>(null);
 const [filter,setFilter]=useState("all");const [days,setDays]=useState("7");
 const [loading,setLoading]=useState(true);const [error,setError]=useState("");
 useEffect(()=>{if(!tourId){setLoading(false);return;}let active=true;setLoading(true);
  const key=getAdminApiKey();if(!key){setError("관리자 API 키를 확인해주세요.");setLoading(false);return;}
  const headers={"x-admin-api-key":key};
  void Promise.all([fetch(`/api/attractions?tourId=${encodeURIComponent(tourId)}&includeHidden=true`,{headers,cache:"no-store"}),fetch(`/api/capture-records?tourId=${encodeURIComponent(tourId)}`,{headers,cache:"no-store"}),fetch(`/api/tours/${encodeURIComponent(tourId)}?includeHidden=true`,{headers,cache:"no-store"})])
   .then(async([ar,rr,tr])=>{if([ar,rr,tr].some(r=>r.status===401)){clearAdminApiKey();throw Error("관리자 API 키가 올바르지 않습니다.");}if(!ar.ok||!rr.ok)throw Error("인증 데이터를 불러오지 못했습니다.");
    const a=await ar.json(),r=await rr.json(),t=tr.ok?await tr.json():null;return {a:a.attractions||[],r:r.records||[],name:t?.tour?.name||"선택한 투어"};})
   .then(v=>{if(!active)return;setAttractions(v.a);setRecords(v.r);setTourName(v.name);setSelected(prev=>prev&&v.a.some((a:Attraction)=>a.id===prev)?prev:v.a[0]?.id??null);})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:"조회에 실패했습니다.");})
   .finally(()=>{if(active)setLoading(false);});return()=>{active=false;};
 },[tourId]);
 const success=(r:RecordItem)=>r.result==="success"&&r.stage==="completed";
 const visitorIds=useMemo(()=>new Set(records.map(r=>r.visitorId)),[records]);
 const successRecords=useMemo(()=>records.filter(success),[records]);
 const publicIds=attractions.filter(a=>a.status==="공개").map(a=>a.id);
 const completedVisitors=[...visitorIds].filter(id=>publicIds.length>0&&publicIds.every(qid=>successRecords.some(r=>r.visitorId===id&&r.attractionId===qid))).length;
 const completionRate=visitorIds.size?Math.round(completedVisitors/visitorIds.size*100):null;
 const summaries=attractions.map(a=>{const rec=records.filter(r=>r.attractionId===a.id);const completed=rec.filter(success);const sessions=new Set(rec.map(r=>r.sessionId));const successfulSessionIds=new Set(completed.map(r=>r.sessionId));
   const firstSuccesses=[...sessions].filter(id=>rec.some(r=>r.sessionId===id&&success(r)&&r.attemptNumber===1)).length;
   const shotsForSuccess=rec.filter(r=>successfulSessionIds.has(r.sessionId)).length;
   return {...a,attempts:rec.length,successes:completed.length,rate:rec.length?Math.round(completed.length/rec.length*100):null,firstRate:sessions.size?Math.round(firstSuccesses/sessions.size*100):null,average:successfulSessionIds.size?shotsForSuccess/successfulSessionIds.size:null};});
 const chosen=summaries.find(s=>s.id===selected);
 const now=Date.now(),windowMs=Number(days)*86400000;
 const scoped=records.filter(r=>r.attractionId===selected&&(days==="all"||new Date(r.capturedAt).getTime()>=now-windowMs));
 const filtered=scoped.filter(r=>filter==="all"||(filter==="success"?success(r):!success(r))).sort((a,b)=>new Date(b.capturedAt).getTime()-new Date(a.capturedAt).getTime());
 const daily=Array.from({length:days==="all"?14:Math.min(Number(days),30)},(_,i)=>{const at=new Date();at.setHours(0,0,0,0);at.setDate(at.getDate()-(days==="all"?13:Number(days)-1-i));const key=at.toLocaleDateString("en-CA");const dayRecords=scoped.filter(r=>{const d=new Date(r.capturedAt);return !Number.isNaN(d.getTime())&&d.getFullYear()===at.getFullYear()&&d.getMonth()===at.getMonth()&&d.getDate()===at.getDate();});return {label:`${at.getMonth()+1}/${at.getDate()}`,count:dayRecords.length,success:dayRecords.filter(success).length,key};});
 const maxCount=Math.max(1,...daily.map(d=>d.count));
 const csvDownload=()=>{const headers=["퀘스트","방문자 ID","세션 ID","인증 단계","결과","시도","촬영 일시"];const csv=[headers,...filtered.map(r=>[chosen?.name||"",r.visitorId,r.sessionId,stageText[r.stage],success(r)?"성공":"실패",String(r.attemptNumber),r.capturedAt])].map(row=>row.map(cell=>`"${String(cell).replace(/"/g,'""')}"`).join(",")).join("\r\n");const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="loqest-capture-records.csv";link.click();URL.revokeObjectURL(url);};
 if(!tourId)return <main className={styles.page}><h1>투어를 먼저 선택해주세요.</h1><Link href="/admin">투어 목록으로</Link></main>;
 return <main className={styles.page}>
  <header className={styles.header}><div><p>LOQEST · ANALYTICS</p><h1>참여자·인증 현황</h1><span>{tourName} · 실제 촬영 기록 기준</span></div><Link href={`/admin/tours/${encodeURIComponent(tourId)}`} className={styles.back}>투어 관리로</Link></header>
  {error&&<div className={styles.error}>{error}</div>}
  <section className={styles.metrics}>
   <article><span>촬영 참여자</span><strong>{loading?"-":visitorIds.size.toLocaleString()+"명"}</strong><p>고유 참여자 수</p></article>
   <article><span>촬영 시도</span><strong>{loading?"-":records.length.toLocaleString()+"회"}</strong><p>투어 전체 촬영 기록</p></article>
   <article><span>인증 성공</span><strong>{loading?"-":successRecords.length.toLocaleString()+"건"}</strong><p>퀘스트 완료 인증</p></article>
   <article><span>투어 완주율</span><strong>{completionRate===null?"-":completionRate+"%"}</strong><p>공개 퀘스트 모두 완료</p></article>
  </section>
  <section className={styles.card}><header className={styles.sectionTitle}><div><h2>전체 퀘스트 비교</h2><p>인증 현황을 비교하고 퀘스트를 선택하면 아래 상세 분석이 변경됩니다.</p></div></header>
   <div className={styles.scroll}><table><thead><tr><th>퀘스트</th><th>촬영 시도</th><th>인증 성공</th><th>인증 성공률</th><th>1회 성공률</th><th>평균 촬영</th><th>상세 분석</th></tr></thead>
    <tbody>{summaries.map(s=><tr key={s.id} className={selected===s.id?styles.selectedRow:""}><td><strong>{s.name}</strong></td><td>{s.attempts}회</td><td>{s.successes}건</td><td>{s.rate===null?"-":s.rate+"%"}</td><td>{s.firstRate===null?"-":s.firstRate+"%"}</td><td>{s.average===null?"-":s.average.toFixed(1)+"회"}</td><td><button className={styles.tableAction} onClick={()=>{setSelected(s.id);setFilter("all");}}>분석 보기</button></td></tr>)}</tbody>
   </table>{!loading&&summaries.length===0&&<p className={styles.empty}>등록된 퀘스트가 없습니다.</p>}</div>
  </section>
  <section className={styles.detail}>
   <header className={styles.sectionTitle}><div><h2>퀘스트별 촬영·인증 분석</h2><p>퀘스트별로 인증 성공과 실패를 확인하세요.</p></div>
    <div className={styles.filters}><select aria-label="분석할 퀘스트" value={selected??""} onChange={e=>setSelected(Number(e.target.value))}>{attractions.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><select aria-label="분석 기간" value={days} onChange={e=>setDays(e.target.value)}><option value="7">최근 7일</option><option value="14">최근 14일</option><option value="30">최근 30일</option><option value="all">전체 기간 (최근 14일 그래프)</option></select></div>
   </header>
   <h3>{chosen?.name||"퀘스트를 선택해주세요."}</h3>
   <div className={styles.questMetrics}>
    <article><span>촬영 시도</span><strong>{scoped.length}회</strong></article>
    <article><span>인증 성공</span><strong>{scoped.filter(success).length}건</strong></article>
    <article><span>인증 성공률</span><strong>{scoped.length?Math.round(scoped.filter(success).length/scoped.length*100)+"%":"-"}</strong></article>
    <article><span>인증 실패</span><strong>{scoped.length-scoped.filter(success).length}건</strong></article>
   </div>
   <div className={styles.chartCard}><h3>일자별 촬영·인증 추이</h3><div className={styles.chart} role="img" aria-label="날짜별 촬영 시도와 인증 성공을 나타내는 막대 그래프">
    {daily.map(d=><div className={styles.chartColumn} key={d.key}><div className={styles.chartBars}><span className={styles.attemptBar} style={{height:`${Math.max(1,d.count/maxCount*100)}%`}} title={`촬영 ${d.count}회`}/><span className={styles.successBar} style={{height:`${Math.max(1,d.success/maxCount*100)}%`}} title={`성공 ${d.success}건`}/></div><small>{d.label}</small></div>)}
   </div><p className={styles.legend}><span>■ 촬영 시도</span><span>■ 인증 성공</span></p></div>
  </section>
  <section className={styles.card}><header className={styles.sectionTitle}><div><h2>선택 퀘스트의 최근 인증 기록</h2><p>{chosen?.name||"선택 없음"} · {filtered.length}건 표시</p></div><div className={styles.filters}>
   <select aria-label="인증 결과 필터" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">전체 결과</option><option value="success">성공</option><option value="failure">실패</option></select>
   <button onClick={csvDownload} className={styles.download}>CSV 다운로드</button></div></header>
   <div className={styles.scroll}><table><thead><tr><th>촬영 일시</th><th>참여자 ID</th><th>인증 단계</th><th>시도</th><th>결과</th></tr></thead><tbody>
    {filtered.slice(0,100).map(r=><tr key={r.id}><td>{dateText(r.capturedAt)}</td><td>{r.visitorId.slice(0,14)}…</td><td>{stageText[r.stage]}</td><td>{r.attemptNumber}회</td><td><span className={success(r)?styles.passed:styles.failed}>{success(r)?"성공":"실패"}</span></td></tr>)}
   </tbody></table>{!loading&&filtered.length===0&&<p className={styles.empty}>해당 조건의 촬영 기록이 없습니다.</p>}{filtered.length>100&&<p className={styles.empty}>화면에는 최근 100건만 표시됩니다. 전체 필터 결과는 CSV로 내보낼 수 있습니다.</p>}</div>
  </section>
 </main>;
}
