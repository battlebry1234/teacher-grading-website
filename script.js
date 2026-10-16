
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const STORAGE = { reports: "gradenova_reports_v1", rubrics: "gradenova_rubrics_v1", prefs: "gradenova_prefs_v1", backend: "gradenova_backend_url_v1" };
  const DEFAULT_RUBRIC = { id: "default", name: "Balanced general rubric", text: "Accuracy and understanding — 40 points\nEvidence / working / examples — 25 points\nReasoning and explanation — 25 points\nClarity and organization — 10 points", builtin: true };
  let currentReport = null, toastTimer = null;
  const safeRead = (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; } };
  const reports = () => safeRead(STORAGE.reports, []);
  const rubrics = () => safeRead(STORAGE.rubrics, []);
  const prefs = () => ({ theme: "light", density: "comfortable", animations: true, tone: "Encouraging and constructive", confirmSave: true, showTips: true, ...safeRead(STORAGE.prefs, {}) });
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { toast("Could not save. Browser storage may be full or disabled."); return false; } };
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  function toast(message) { const el = $("toast"); el.textContent = message; el.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 3200); }
  function showPage(name) {
    const valid = ["dashboard","grader","history","rubrics","settings"].includes(name) ? name : "dashboard";
    document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === `page-${valid}`));
    document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.page === valid));
    const labels = {dashboard:"Overview",grader:"AI Grading",history:"Grade history",rubrics:"Rubric builder",settings:"Settings"};
    $("crumb").textContent = labels[valid];
    $("sidebar").classList.remove("open");
    if (valid === "history") renderHistory();
    if (valid === "rubrics") renderRubrics();
    window.scrollTo({top:0,behavior:prefs().animations ? "smooth" : "auto"});
  }
  document.addEventListener("click", e => {
    const target = e.target.closest("[data-page]");
    if (target) { e.preventDefault(); showPage(target.dataset.page); }
  });
  $("mobileMenu").addEventListener("click", () => $("sidebar").classList.toggle("open"));
  function applyPrefs() {
    const p = prefs();
    document.body.dataset.theme = p.theme;
    document.body.classList.toggle("compact", p.density === "compact");
    document.body.classList.toggle("no-motion", !p.animations);
    $("themeSelect").value = p.theme; $("densitySelect").value = p.density;
    $("animationsToggle").checked = p.animations; $("defaultTone").value = p.tone;
    $("confirmSave").checked = p.confirmSave; $("showTips").checked = p.showTips;
    $("feedbackTone").value = p.tone;
  }
  function savePrefs() {
    const p = { theme:$("themeSelect").value, density:$("densitySelect").value, animations:$("animationsToggle").checked, tone:$("defaultTone").value, confirmSave:$("confirmSave").checked, showTips:$("showTips").checked };
    write(STORAGE.prefs,p); applyPrefs(); toast("Preferences saved.");
  }
  $("savePreferences").addEventListener("click", savePrefs);
  $("themeSelect").addEventListener("change", () => { const p=prefs(); p.theme=$("themeSelect").value; write(STORAGE.prefs,p); applyPrefs(); });
  $("densitySelect").addEventListener("change", () => { const p=prefs(); p.density=$("densitySelect").value; write(STORAGE.prefs,p); applyPrefs(); });
  $("animationsToggle").addEventListener("change", () => { const p=prefs(); p.animations=$("animationsToggle").checked; write(STORAGE.prefs,p); applyPrefs(); });
  $("themeQuick").addEventListener("click", () => { const p=prefs(); p.theme=p.theme==="dark"?"light":"dark"; write(STORAGE.prefs,p); applyPrefs(); });
  function backendUrl() { return (localStorage.getItem(STORAGE.backend) || "").trim().replace(/\/+$/,""); }
  function validBackendUrl(value) { try { const u = new URL(value); return ["https:","http:"].includes(u.protocol) && u.hostname && !u.username && !u.password; } catch { return false; } }
  function setConnection(state, message) { const el=$("connection"); el.className=`connection ${state}`; el.innerHTML=`<i></i> ${esc(message)}`; }
  async function checkHealth(silent=false) {
    const base=backendUrl();
    if (!base) { setConnection("bad","Backend not connected"); if(!silent) $("backendMessage").textContent="Add your deployed Render service URL first."; return false; }
    try {
      const res=await fetch(`${base}/api/health`,{method:"GET",headers:{"Accept":"application/json"}});
      const data=await res.json().catch(()=>null);
      if(!res.ok || !data || data.ok!==true) throw new Error((data&&data.error)||`Backend responded with HTTP ${res.status}.`);
      setConnection("ok","Backend connected"); if(!silent){$("backendMessage").className="settings-message success";$("backendMessage").textContent="Connection successful. GradeNova can reach your backend.";} return true;
    } catch(err) {
      setConnection("bad","Backend unavailable"); if(!silent){$("backendMessage").className="settings-message error";$("backendMessage").textContent=`Could not connect: ${err.message}. Check the URL, Render service status, and CORS settings.`;} return false;
    }
  }
  $("backendUrl").value=backendUrl();
  $("saveBackend").addEventListener("click", () => {
    const val=$("backendUrl").value.trim().replace(/\/+$/,"");
    if(!validBackendUrl(val)){ $("backendMessage").className="settings-message error"; $("backendMessage").textContent="Enter a valid backend URL such as https://your-service.onrender.com"; return; }
    localStorage.setItem(STORAGE.backend,val); toast("Backend URL saved in this browser."); checkHealth();
  });
  $("testBackend").addEventListener("click", () => checkHealth());
  $("studentWork").addEventListener("input", () => $("charCount").textContent=`${$("studentWork").value.length.toLocaleString()} / 30,000`);
  function displayError(message) { const el=$("gradeError"); el.hidden=false; el.textContent=message; }
  function friendlyError(status, data) {
    const detail = data && (data.error || data.message || data.detail);
    if(status===404) return "The backend route was not found. Redeploy the matching server.py to Render and check the service URL.";
    if(status===429) return "The AI service is busy or the API quota was reached. Wait a moment and check your Gemini API quota.";
    if(status===401 || status===403) return "The backend could not authenticate with Gemini. Check GEMINI_API_KEY in Render environment variables.";
    if(status>=500) return detail ? `Backend error: ${detail}` : "The backend had a problem. Check Render logs for the exact error.";
    return detail ? String(detail) : `The server returned HTTP ${status} without a readable error message.`;
  }
  $("gradeForm").addEventListener("submit", async e => {
    e.preventDefault(); $("gradeError").hidden=true; $("reportPanel").hidden=true; currentReport=null;
    const base=backendUrl();
    if(!base){displayError("Your site is online, but grading needs a backend. Open Settings → Backend connection, paste your deployed Render URL, save it, and test the connection.");showPage("grader");return;}
    if(!validBackendUrl(base)){displayError("The saved backend URL is invalid. Open Settings and correct it.");return;}
    const work=$("studentWork").value.trim(), title=$("assignmentTitle").value.trim(), max=Number($("maxPoints").value);
    if(!title || !work){displayError("Add an assignment title and student work before grading.");return;}
    if(!Number.isFinite(max)||max<1||max>1000){displayError("Maximum points must be between 1 and 1,000.");return;}
    if(work.length>30000){displayError("Student work exceeds the 30,000 character limit.");return;}
    const payload={title,subject:$("subject").value,grade_level:$("gradeLevel").value,max_points:max,feedback_tone:$("feedbackTone").value,instructions:$("instructions").value.trim(),rubric:$("rubric").value.trim(),student_work:work};
    const button=$("gradeButton"); button.disabled=true; button.innerHTML="<span>◌</span> Preparing grading draft…";
    try {
      const res=await fetch(`${base}/api/grade`,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(payload)});
      const data=await res.json().catch(()=>null);
      if(!res.ok) throw new Error(friendlyError(res.status,data));
      if(!data || data.ok!==true || !data.report || typeof data.report!=="object") throw new Error("The backend response was not in the expected JSON format. Redeploy the coordinated server.py and requirements.txt from this project.");
      currentReport={...data.report,id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),title,subject:payload.subject,grade_level:payload.grade_level,max_points:max,created_at:new Date().toISOString(),status:"Draft — not yet saved"};
      renderReport(currentReport); $("reportPanel").hidden=false; $("reportPanel").scrollIntoView({behavior:prefs().animations?"smooth":"auto",block:"start"});
    } catch(err) {
      displayError(err instanceof TypeError ? "Could not reach the backend. Check the Render URL, confirm the service is running, and verify that CORS allows your GitHub Pages site. If Render is waking from sleep, wait a moment and try again." : err.message || "Unexpected grading error. Check the Render logs.");
    } finally {button.disabled=false;button.innerHTML="<span>✦</span> Generate grading draft <span>→</span>";}
  });
  function renderReport(r) {
    $("reportTitle").textContent=r.title||"Grading report"; $("reportSubtitle").textContent=`${r.subject||"General"} · ${new Date(r.created_at||Date.now()).toLocaleString()} · Review before saving`;
    const score=Number(r.score), max=Number(r.max_points)||100, valid=Number.isFinite(score);
    const pct=valid?Math.max(0,Math.min(100,score/max*100)):null;
    const breakdown=Array.isArray(r.breakdown)?r.breakdown:[];
    const list=(arr)=>Array.isArray(arr)&&arr.length?`<ul>${arr.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:"<p>Not provided.</p>";
    $("reportContent").innerHTML=`<div class="score-banner"><div class="score-circle">${valid?`${esc(score)}<small style="font-size:10px">/${esc(max)}</small>`:"—"}</div><div><h3>${valid?`${pct.toFixed(0)}% · ${esc(r.performance_level||"Suggested result")}`:"Score needs teacher review"}</h3><p>${esc(r.score_rationale||"Review the suggested result and adjust it to your rubric.")}</p></div></div><div class="report-columns"><div><div class="report-block"><h3>✦ What went well</h3>${list(r.strengths)}</div><div class="report-block"><h3>↗ Next steps</h3>${list(r.improvements)}</div></div><div><div class="report-block"><h3>Score breakdown</h3>${breakdown.length?breakdown.map(b=>`<div class="criterion"><span>${esc(b.criterion||"Criterion")}<br><small>${esc(b.feedback||"")}</small></span><b>${esc(b.points_awarded??"—")} / ${esc(b.points_possible??"—")}</b></div>`).join(""):"<p>No breakdown supplied. Review the score manually.</p>"}</div><div class="report-block"><h3>Feedback draft</h3><p id="feedbackText">${esc(r.feedback||"No feedback was returned. Review the work and write feedback before sharing.")}</p></div><div class="report-block"><h3>Teacher review notes</h3>${list(r.teacher_review_notes)}</div></div></div>`;
  }
  $("copyFeedback").addEventListener("click", async () => {if(!currentReport)return;try{await navigator.clipboard.writeText(currentReport.feedback||"");toast("Feedback copied.");}catch{toast("Clipboard access was blocked by the browser.");}});
  $("saveReport").addEventListener("click", () => {if(!currentReport)return;const list=reports();list.unshift({...currentReport,status:"Saved"});if(write(STORAGE.reports,list)){currentReport.status="Saved";updateDashboard();renderHistory();toast("Report saved to this browser.");}});
  function renderHistory() {
    const q=($("historySearch").value||"").toLowerCase(), list=reports().filter(r=>(r.title||"").toLowerCase().includes(q));
    $("historyList").innerHTML=list.length?list.map(r=>`<div class="history-row"><div class="history-score">${Number.isFinite(Number(r.score))?esc(r.score):"—"}</div><div class="history-info"><b>${esc(r.title||"Untitled assignment")}</b><small>${esc(r.subject||"General")} · ${new Date(r.created_at||Date.now()).toLocaleString()} · ${esc(r.max_points||100)} points possible</small></div><div class="row-actions"><button class="mini-btn" data-open-report="${esc(r.id)}">View</button><button class="mini-btn" data-delete-report="${esc(r.id)}">Delete</button></div></div>`).join(""):`<div class="empty-list"><b>No reports found.</b>Grade a submission and save its report to build your history.</div>`;
  }
  $("historySearch").addEventListener("input",renderHistory);
  $("historyList").addEventListener("click",e=>{
    const view=e.target.closest("[data-open-report]"), del=e.target.closest("[data-delete-report]");
    if(view){const r=reports().find(x=>x.id===view.dataset.openReport);if(r){currentReport=r;renderReport(r);$("reportPanel").hidden=false;showPage("grader");$("reportPanel").scrollIntoView({behavior:"smooth"});}}
    if(del){const next=reports().filter(x=>x.id!==del.dataset.deleteReport);write(STORAGE.reports,next);renderHistory();updateDashboard();toast("Report deleted.");}
  });
  $("clearHistory").addEventListener("click",()=>{if(prefs().confirmSave&&!confirm("Delete all saved GradeNova reports from this browser? This cannot be undone."))return;write(STORAGE.reports,[]);renderHistory();updateDashboard();toast("History cleared.");});
  $("exportHistory").addEventListener("click",()=>downloadJSON("gradenova-history.json",{exported_at:new Date().toISOString(),reports:reports()}));
  function downloadJSON(filename,obj){const blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);toast("Export prepared.");}
  $("rubricForm").addEventListener("submit",e=>{e.preventDefault();const name=$("rubricName").value.trim(),text=$("rubricText").value.trim();if(!name||!text){$("rubricError").hidden=false;$("rubricError").textContent="Enter a rubric name and criteria.";return;}const list=rubrics();list.unshift({id:String(Date.now()),name,text});if(write(STORAGE.rubrics,list)){ $("rubricName").value="";$("rubricText").value="";$("rubricError").hidden=true;renderRubrics();updateDashboard();toast("Rubric saved.");}});
  function renderRubrics(){const list=[DEFAULT_RUBRIC,...rubrics()];$("rubricList").innerHTML=list.map(r=>`<div class="rubric-row"><span class="launch-icon violet">▤</span><div><b>${esc(r.name)}</b><small>${esc(r.text.split("\n").slice(0,2).join(" · "))}${r.text.split("\n").length>2?"…":""}</small></div><button class="mini-btn" data-apply-rubric="${esc(r.id)}">Use</button>${r.builtin?"":`<button class="mini-btn" data-remove-rubric="${esc(r.id)}">×</button>`}</div>`).join("");}
  $("rubricList").addEventListener("click",e=>{const use=e.target.closest("[data-apply-rubric]"),del=e.target.closest("[data-remove-rubric]");if(use){const r=[DEFAULT_RUBRIC,...rubrics()].find(x=>x.id===use.dataset.applyRubric);if(r){$("rubric").value=r.text;showPage("grader");toast("Rubric added to grading studio.");}}if(del){write(STORAGE.rubrics,rubrics().filter(r=>r.id!==del.dataset.removeRubric));renderRubrics();updateDashboard();toast("Rubric removed.");}});
  $("clearLocalData").addEventListener("click",()=>{if(confirm("Clear GradeNova reports, rubrics, and preferences from this browser? Your backend URL will be kept.")){Object.values(STORAGE).filter(k=>k!==STORAGE.backend).forEach(k=>localStorage.removeItem(k));applyPrefs();renderRubrics();renderHistory();updateDashboard();toast("Local GradeNova data cleared.");}});
  function updateDashboard(){const rs=reports(),scored=rs.filter(r=>Number.isFinite(Number(r.score))&&Number.isFinite(Number(r.max_points))&&Number(r.max_points)>0);$("statGraded").textContent=rs.length;$("statAverage").textContent=scored.length?`${Math.round(scored.reduce((s,r)=>s+Number(r.score)/Number(r.max_points)*100,0)/scored.length)}%`:"—";$("statRubrics").textContent=1+rubrics().length;$("recentList").innerHTML=rs.length?rs.slice(0,4).map(r=>`<div class="history-row"><div class="history-score">${Number.isFinite(Number(r.score))?esc(r.score):"—"}</div><div class="history-info"><b>${esc(r.title||"Untitled assignment")}</b><small>${new Date(r.created_at||Date.now()).toLocaleDateString()} · ${esc(r.subject||"General")}</small></div><button class="mini-btn" data-recent-open="${esc(r.id)}">View</button></div>`).join(""):`<div class="empty-state"><span>✦</span><b>Your next great lesson starts here.</b><p>Grade a submission to see reports here.</p><button class="btn btn-primary" data-page="grader">Grade first submission</button></div>`;}
  $("recentList").addEventListener("click",e=>{const b=e.target.closest("[data-recent-open]");if(!b)return;const r=reports().find(x=>x.id===b.dataset.recentOpen);if(r){currentReport=r;renderReport(r);$("reportPanel").hidden=false;showPage("grader");$("reportPanel").scrollIntoView({behavior:"smooth"});}});
  $("todayDate").textContent=new Date().toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric",year:"numeric"});
  applyPrefs();renderRubrics();renderHistory();updateDashboard();checkHealth(true);
  // Render may sleep on free hosting; recheck when the tab becomes active.
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkHealth(true);});
})();
