import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchFacultyCourseReviews, type BackendCourse } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { btnOutline, Empty, fmtDate, PageHeader, RequireRole } from "@/components/studio/ui";
export const Route = createFileRoute("/faculty/")({ component: () => <RequireRole roles={["reviewer"]}><Queue /></RequireRole> });
function Queue() {
 const {user} = useAuth();
 const [rows,setRows] = useState<BackendCourse[]>([]);
 const [error,setError] = useState(""); const [loading,setLoading] = useState(true); const [retry,setRetry] = useState(0);
 useEffect(()=>{let active=true; setLoading(true);setError("");setRows([]);fetchFacultyCourseReviews().then(v=>{if(active)setRows(v)}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Unable to load reviews")}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[user?.id,retry]);
 return <div><PageHeader eyebrow="Faculty review" title="Review queue" subtitle="Courses assigned to you for publication review." actions={<button className={btnOutline} onClick={()=>setRetry(v=>v+1)}>Refresh</button>}/><div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{loading?<p>Loading reviews…</p>:error?<Empty title="Unable to load reviews" body={error}/>:!rows.length?<Empty title="No pending reviews"/>:<ul className="divide-y divide-border rounded-xl border border-border bg-card">{rows.map(s=><li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-4"><div className="flex-1"><p className="font-semibold">{s.title}</p><p className="text-xs text-muted-foreground">{s.category} · Updated {fmtDate(s.updated_at)}</p></div><span className="text-sm">{s.status.replace(/_/g," ")}</span><Link className={btnOutline} to="/faculty/review/$id" params={{id:s.id}}>Review</Link></li>)}</ul>}</div></div>;
}
