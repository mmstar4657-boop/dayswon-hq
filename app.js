(() => {
const ST = ["New", "Contacted", "Proposal sent", "Won", "Lost"];
const SOURCES = ["Phone call", "WhatsApp", "Referral", "Email", "Site form", "Live chat", "Other"];
const $app = document.getElementById("app"), $tabs = document.getElementById("tabs"), $top = document.getElementById("topact");
let LEADS = [], SYNC = null, filter = "All", q = "", ME = null, USERS = [];
const uname = id => (USERS.find(u => u.id === id) || {}).name || "";
async function loadMe() { if (!ME) { ME = (await api("/api/me")).me; USERS = (await api("/api/users")).users; } }
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pc = s => "p-" + String(s).split(" ")[0];
const pad = n => String(n).padStart(2, "0");
const ymd = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const today = () => ymd(new Date());
const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
const fmtD = iso => { if (!iso) return ""; const d = new Date(iso); const y = d.getFullYear() !== new Date().getFullYear(); return d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(y ? { year: "numeric" } : {}) }); };
const fmtDT = iso => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const fmtF = s => { if (!s) return ""; const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); };
const money = n => "$" + Number(n || 0).toLocaleString("en-US");
const val = L => (L.value_setup || L.value_monthly) ? [L.value_setup ? money(L.value_setup) : "", L.value_monthly ? money(L.value_monthly) + "/mo" : ""].filter(Boolean).join(" + ") : "";
const ago = iso => { const h = (Date.now() - Date.parse(iso)) / 36e5; return h < 1 ? Math.max(1, Math.round(h * 60)) + " min" : h < 48 ? Math.round(h) + "h" : Math.round(h / 24) + " days"; };
const open = L => !["Won", "Lost"].includes(L.status);
const stale = L => L.status === "New" && Date.now() - Date.parse(L.created_at) > 864e5;
const due = L => open(L) && L.follow_up && L.follow_up <= today();
function toast(t) { const e = document.getElementById("toast"); e.textContent = t; e.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove("on"), 1800); }

const FN = "https://xgxswoaxalhdfjjxelyt.supabase.co/functions/v1/api", PK = "sb_publishable_O0fqxMtqt9gwXlNnHwTFCg_eGNQoo7W";
let SESS = null; try { SESS = JSON.parse(localStorage.getItem("dw_sess") || "null"); } catch {}
const saveSess = s => { SESS = s; if (s) localStorage.setItem("dw_sess", JSON.stringify(s)); else localStorage.removeItem("dw_sess"); };
let refreshing = null;
async function accessToken() {
  if (!SESS) return null;
  if (SESS.expires_at * 1000 - Date.now() > 90e3) return SESS.access_token;
  if (!refreshing) refreshing = (async () => { try { const r = await fetch(FN + "/refresh", { method: "POST", headers: { apikey: PK, "content-type": "application/json" }, body: JSON.stringify({ refresh_token: SESS.refresh_token }) }); const d = await r.json(); saveSess(d.ok ? d.session : null); } catch { } finally { refreshing = null; } })();
  await refreshing; return SESS && SESS.access_token;
}
async function api(path, opt = {}) {
  const t = await accessToken();
  const h = { apikey: PK }; if (t) h.authorization = "Bearer " + t; if (opt.body) h["content-type"] = "application/json";
  let r; try { r = await fetch(FN + path.replace(/^\/api/, ""), { method: opt.method || "GET", headers: h, body: opt.body ? JSON.stringify(opt.body) : undefined }); }
  catch (e) { throw new Error("Can't reach the server. Check your connection."); }
  let d = {}; try { d = await r.json(); } catch {}
  if (path === "/api/login" && d.session) saveSess(d.session);
  if (path === "/api/logout") saveSess(null);
  if (r.status === 401 && path !== "/api/login") { saveSess(null); showLogin(); throw new Error("login"); }
  if (!r.ok || d.ok === false) throw new Error(d.error || d.message || ("Error " + r.status));
  return d;
}

function showLogin() {
  ME = null; LEADS = [];
  $tabs.hidden = true; $top.innerHTML = "";
  $app.innerHTML = `<form class="login" id="lf"><h1>Sign in</h1><p>DaysWon HQ is private.</p>
    <input type="email" id="em" autocomplete="username" placeholder="Email" autocapitalize="off" autofocus>
    <input type="password" id="pw" autocomplete="current-password" placeholder="Password">
    <div class="err" id="le"></div><button class="btn" type="submit">Sign in</button></form>`;
  document.getElementById("lf").onsubmit = async e => {
    e.preventDefault(); const le = document.getElementById("le"); le.textContent = "";
    try { await api("/api/login", { method: "POST", body: { email: document.getElementById("em").value, password: document.getElementById("pw").value } }); ME = null; route(); }
    catch (x) { le.textContent = x.message; }
  };
}

function tabsOn(t) { $tabs.hidden = false; $tabs.querySelectorAll("a").forEach(a => a.classList.toggle("on", a.dataset.t === t)); }

function topMe() { $top.innerHTML = ME ? `<button onclick="location.hash='#/team'">${esc(ME.name)} ▾</button>` : ""; }

function card(L, why) {
  const cls = stale(L) ? "hot" : due(L) ? "due" : "";
  let badge = "";
  if (why === "stale" || (!why && stale(L))) badge = `<span class="pill b-red">Not contacted · ${ago(L.created_at)}</span>`;
  else if (L.follow_up && open(L)) badge = `<span class="pill ${L.follow_up < today() ? "b-red" : L.follow_up === today() ? "b-amb" : ""}">${L.follow_up < today() ? "Overdue · " : L.follow_up === today() ? "Today · " : "Follow up "}${fmtF(L.follow_up)}</span>`;
  const v = val(L);
  return `<a class="card ${cls}" href="#/lead/${L.id}">
    <div class="row"><span class="nm">${esc(L.name)}</span><span class="pill ${pc(L.status)}">${esc(L.status)}</span></div>
    ${L.company || L.business_type ? `<div class="biz">${esc([L.company, L.business_type].filter(Boolean).join(" · "))}</div>` : ""}
    ${L.service ? `<div class="want">${esc(L.service)}</div>` : ""}
    <div class="meta"><span>${esc(L.source || "")}</span><span>·</span><span>${fmtD(L.created_at)}</span>${L.assigned_to && USERS.length > 1 ? `<span>·</span><span>${esc(uname(L.assigned_to))}</span>` : ""}${v ? `<span>·</span><span>${esc(v)}</span>` : ""}${badge ? " " + badge : ""}</div></a>`;
}

async function board() {
  tabsOn("leads");
  topMe();
  if (!LEADS.length) $app.innerHTML = `<div class="loading">Loading leads…</div>`;
  try { const d = await api("/api/leads"); LEADS = d.leads; SYNC = d.sync; } catch (e) { if (e.message !== "login") $app.innerHTML = `<div class="loading">Couldn't load leads: ${esc(e.message)}</div>`; return; }
  drawBoard();
}

function drawBoard() {
  const todayList = [...LEADS.filter(due).map(L => [L, "due"]), ...LEADS.filter(L => stale(L) && !due(L)).map(L => [L, "stale"])];
  const counts = Object.fromEntries(ST.map(s => [s, LEADS.filter(L => L.status === s).length]));
  const openL = LEADS.filter(open);
  const pipeS = openL.reduce((a, L) => a + (L.value_setup || 0), 0), pipeM = openL.reduce((a, L) => a + (L.value_monthly || 0), 0);
  const wonM = LEADS.filter(L => L.status === "Won").reduce((a, L) => a + (L.value_monthly || 0), 0);
  const ql = q.toLowerCase();
  const match = L => !ql || [L.name, L.company, L.business_type, L.service, L.email, L.phone].join(" ").toLowerCase().includes(ql);
  let body = "";
  const shown = ST.filter(s => filter === "All" || filter === s);
  const groups = shown.map(s => { const ls = LEADS.filter(L => L.status === s && match(L)); return `<section><h2>${esc(s)} <span class="n">${ls.length}</span></h2>${ls.length ? ls.map(L => card(L)).join("") : `<div class="empty2">None</div>`}</section>`; }).join("");
  body = `<div class="today"><h2>Follow up today <span class="n">${todayList.length}</span></h2>${todayList.length ? todayList.map(([L, w]) => card(L, w)).join("") : `<div class="empty">Nothing due. You're on top of it.</div>`}</div>
   <div class="sum"><div><b>${openL.length}</b><span>Open leads</span></div>${ME.role === "owner" ? `<div><b>${pipeS || pipeM ? money(pipeS) : "–"}</b><span>${pipeM ? "+ " + money(pipeM) + "/mo in play" : "Setup in play"}</span></div><div><b>${money(wonM)}</b><span>Won /mo</span></div>` : `<div><b>${counts["Proposal sent"]}</b><span>Proposals out</span></div><div><b>${counts.Won}</b><span>Won</span></div>`}</div>
   <input class="search" id="q" type="search" placeholder="Search leads" value="${esc(q)}">
   <h2 style="margin-top:14px">Pipeline</h2>
   <div class="chips">${["All", ...ST].map(s => `<button class="chip ${filter === s ? "on" : ""}" data-f="${esc(s)}">${esc(s)}<i>${s === "All" ? LEADS.length : counts[s]}</i></button>`).join("")}</div>
   <div class="${filter === "All" ? "cols" : ""}">${groups}</div>
   <div class="syncl"><span>${SYNC ? (SYNC.ok ? "Website leads checked " + ago(SYNC.at) + " ago" : "Website check failed: " + esc(SYNC.error || "")) : ""}</span><button id="rs">Check now</button></div>`;
  $app.innerHTML = body + `<button class="fab" onclick="location.hash='#/add'">+ Add lead</button>`;
  $app.querySelectorAll(".chip").forEach(b => b.onclick = () => { filter = b.dataset.f; drawBoard(); });
  const qi = document.getElementById("q"); qi.oninput = () => { q = qi.value; const p = qi.selectionStart; drawBoard(); const n = document.getElementById("q"); n.focus(); n.setSelectionRange(p, p); };
  document.getElementById("rs").onclick = async () => { try { const d = await api("/api/sync", { method: "POST" }); toast(d.sync.ok ? (d.sync.added ? d.sync.added + " new lead(s)" : "No new website leads") : "Check failed"); board(); } catch (e) { toast(e.message); } };
}

function telOf(p) { return String(p || "").replace(/[^0-9+]/g, ""); }
function mailDraft(L) {
  const first = (L.name || "").split(" ")[0] || "there";
  const what = L.service ? " about " + L.service.replace(/\.$/, "") : "";
  const subj = "Following up" + (L.company ? " — " + L.company : "") + " | DaysWon";
  const body = `Hi ${first},\n\nThanks for reaching out to DaysWon${what}. I'd love to hear a bit more about how things run today and where the time goes, so I can show you what we'd set up for you.\n\nDo you have 15 minutes this week for a quick call? Just reply with a time that works.\n\nBest,\nMendel\nDaysWon`;
  return "mailto:" + encodeURIComponent(L.email) + "?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(body);
}
function smsDraft(L) { const first = (L.name || "").split(" ")[0] || ""; return "sms:" + telOf(L.phone) + "&body=" + encodeURIComponent(`Hi ${first}, this is Mendel from DaysWon. Thanks for reaching out! Do you have a few minutes to talk this week?`); }

async function leadPage(id) {
  tabsOn("leads"); topMe();
  $app.innerHTML = `<div class="loading">Loading…</div>`;
  let d; try { d = await api("/api/lead/" + id); } catch (e) { if (e.message !== "login") $app.innerHTML = `<button class="back" onclick="location.hash='#/'">‹ Leads</button><div class="loading">${esc(e.message)}</div>`; return; }
  const L = d.lead, notes = d.notes;
  const I = { call: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2"/>', text: '<path d="M4 5h16v11H9l-5 4z"/>', mail: '<path d="M3 6h18v12H3zM3 7l9 6 9-6"/>' };
  const ic = k => `<svg viewBox="0 0 24 24">${I[k]}</svg>`;
  const rows = [["Business", L.company], ["Type", L.business_type], ["Wants", L.service], ["Website", L.website ? `<a href="https://${esc(L.website.replace(/^https?:\/\//, ""))}" target="_blank" rel="noopener">${esc(L.website)}</a>` : "", true],
    ["Phone", L.phone], ["Email", L.email], ["Value", val(L)], ["Source", L.source], ["Came in", fmtDT(L.created_at)], ["First contact", L.contacted_at ? fmtDT(L.contacted_at) : "Not yet"]]
    .filter(r => r[1]).map(r => `<dt>${r[0]}</dt><dd>${r[2] ? r[1] : esc(r[1])}</dd>`).join("");
  $app.innerHTML = `<button class="back" onclick="history.length>1?history.back():location.hash='#/'">‹ Leads</button>
  <div class="hd"><div class="row"><div><div class="nm">${esc(L.name)}</div>${L.company ? `<div class="biz">${esc(L.company)}</div>` : ""}</div><span class="pill ${pc(L.status)}">${esc(L.status)}</span></div>
   <div class="acts"><a class="${L.phone ? "" : "off"}" href="tel:${esc(telOf(L.phone))}">${ic("call")}Call</a><a class="${L.phone ? "" : "off"}" href="${L.phone ? esc(smsDraft(L)) : "#"}">${ic("text")}Text</a><a class="${L.email ? "" : "off"}" href="${L.email ? esc(mailDraft(L)) : "#"}">${ic("mail")}Email</a></div></div>
  ${L.status === "New" ? `<div class="banner"><span>${stale(L) ? "Not contacted yet · came in " + ago(L.created_at) + " ago" : "Not contacted yet"}</span><button id="mc">Mark contacted</button></div>` : ""}
  <div class="sec"><h3>Status</h3><div class="stat">${ST.map(s => `<button class="${s === L.status ? "on" : ""}" data-s="${esc(s)}">${esc(s)}</button>`).join("")}</div></div>
  <div class="sec"><h3>Assigned to</h3><select id="as" class="sel">${USERS.map(u => `<option value="${u.id}" ${u.id === L.assigned_to ? "selected" : ""}>${esc(u.name)}${u.id === ME.id ? " (me)" : ""}</option>`).join("")}<option value="" ${L.assigned_to ? "" : "selected"}>Nobody</option></select></div>
  <div class="sec"><h3>Next follow-up</h3><div class="fu"><input type="date" id="fu" value="${esc(L.follow_up || "")}">
    <button data-d="1">Tomorrow</button><button data-d="3">+3 days</button><button data-d="7">+1 week</button>${L.follow_up ? `<button data-d="x">Clear</button>` : ""}</div>
    ${L.follow_up ? `<div class="meta" style="margin-top:8px">${L.follow_up < today() ? `<span class="pill b-red">Overdue</span>` : ""}<span>${fmtF(L.follow_up)}</span></div>` : ""}</div>
  <div class="sec"><h3>Details</h3><dl class="kv">${rows}</dl>
   ${L.message ? `<h3 style="margin-top:12px">What they wrote</h3><div style="white-space:pre-wrap;font-size:14px">${esc(L.message)}</div>` : ""}
   ${L.transcript ? `<details class="tr" style="margin-top:10px"><summary>Chat transcript</summary><pre>${esc(L.transcript)}</pre></details>` : ""}
   <div style="margin-top:10px"><button class="btn2" onclick="location.hash='#/edit/${L.id}'">Edit details</button></div></div>
  <div class="sec"><h3>Notes</h3><textarea id="nt" placeholder="What happened? e.g. Called, wants a demo Tuesday"></textarea>
   <div style="margin-top:8px"><button class="btn" id="an">Save note</button></div>
   <div style="margin-top:8px">${notes.map(n => `<div class="note ${n.kind === "log" ? "log" : ""}"><small>${n.user_name ? esc(n.user_name) + " · " : ""}${fmtDT(n.at)}</small>${esc(n.text)}</div>`).join("") || `<div class="empty2">No notes yet.</div>`}</div></div>`;
  const patch = async (b, msg) => { try { await api("/api/lead/" + id, { method: "PATCH", body: b }); toast(msg); LEADS = []; leadPage(id); } catch (e) { toast(e.message); } };
  $app.querySelectorAll(".stat button").forEach(b => b.onclick = () => patch({ status: b.dataset.s }, "Moved to " + b.dataset.s));
  const mc = document.getElementById("mc"); if (mc) mc.onclick = () => patch({ status: "Contacted" }, "Marked contacted");
  document.getElementById("as").onchange = e => patch({ assigned_to: e.target.value || null }, "Assigned");
  document.getElementById("fu").onchange = e => (e.target.value || "") === (L.follow_up || "") ? 0 : patch({ follow_up: e.target.value || null }, "Follow-up saved");
  $app.querySelectorAll(".fu button").forEach(b => b.onclick = () => patch({ follow_up: b.dataset.d === "x" ? null : addDays(+b.dataset.d) }, b.dataset.d === "x" ? "Follow-up cleared" : "Follow-up saved"));
  document.getElementById("an").onclick = async () => { const t = document.getElementById("nt").value.trim(); if (!t) return; try { await api("/api/lead/" + id + "/notes", { method: "POST", body: { text: t } }); toast("Note saved"); leadPage(id); } catch (e) { toast(e.message); } };
}

async function form(id) {
  tabsOn("leads"); $top.innerHTML = "";
  let L = { source: "Phone call", status: "New" };
  if (id) { try { L = (await api("/api/lead/" + id)).lead; } catch (e) { return; } }
  const inp = (k, lab, type = "text", ph = "") => `<label for="f_${k}">${lab}</label><input id="f_${k}" name="${k}" type="${type}" placeholder="${esc(ph)}" value="${esc(L[k] ?? "")}"${type === "number" ? ' inputmode="numeric"' : ""}>`;
  $app.innerHTML = `<button class="back" onclick="history.back()">‹ Back</button><h1>${id ? "Edit lead" : "Add lead"}</h1>
  <form class="f sec" id="lf">
   ${inp("name", "Name *", "text", "Full name")}
   ${inp("company", "Business", "text", "Company name")}
   ${inp("business_type", "Type of business", "text", "e.g. HVAC, mortgage broker")}
   ${inp("service", "What they want", "text", "e.g. Missed-call text back")}
   <div class="two"><div>${inp("phone", "Phone", "tel")}</div><div>${inp("email", "Email", "email")}</div></div>
   ${inp("website", "Website", "text", "example.com")}
   <div class="two"><div><label for="f_source">Source</label><select id="f_source" name="source">${[...new Set([...SOURCES, L.source].filter(Boolean))].map(s => `<option ${s === L.source ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></div>
   ${id ? "" : `<div><label for="f_status">Status</label><select id="f_status" name="status">${ST.map(s => `<option ${s === L.status ? "selected" : ""}>${s}</option>`).join("")}</select></div>`}</div>
   ${ME.role === "owner" ? `<div class="two"><div>${inp("value_setup", "Setup $", "number", "0")}</div><div>${inp("value_monthly", "Monthly $", "number", "0")}</div></div>` : ""}
   ${id ? "" : `<div class="two"><div>${inp("follow_up", "Follow up on", "date")}</div><div><label for="f_as">Assigned to</label><select id="f_as" name="assigned_to">${USERS.map(u => `<option value="${u.id}" ${u.id === ME.id ? "selected" : ""}>${esc(u.name)}</option>`).join("")}</select></div></div>`}
   <label for="f_message">Notes / what they said</label><textarea id="f_message" name="message">${esc(L.message || "")}</textarea>
   <div class="err" id="fe"></div><button class="btn" type="submit" style="width:100%">${id ? "Save" : "Add lead"}</button>
   ${id && ME.role === "owner" ? `<div style="text-align:center;margin-top:10px"><button type="button" class="danger" id="del">Delete lead</button></div>` : ""}
  </form>`;
  document.getElementById("lf").onsubmit = async e => {
    e.preventDefault(); const b = Object.fromEntries(new FormData(e.target).entries());
    if (!b.follow_up) delete b.follow_up;
    try { if (id) { await api("/api/lead/" + id, { method: "PATCH", body: b }); toast("Saved"); history.back(); } else { const d = await api("/api/leads", { method: "POST", body: b }); LEADS = []; toast("Lead added"); location.replace("#/lead/" + d.id); } }
    catch (x) { document.getElementById("fe").textContent = x.message; }
  };
  const del = document.getElementById("del");
  if (del) del.onclick = async () => { if (!confirm("Delete this lead and its notes?")) return; await api("/api/lead/" + id, { method: "DELETE" }); LEADS = []; toast("Deleted"); location.hash = "#/"; };
}

async function team() {
  tabsOn(""); $top.innerHTML = "";
  USERS = (await api("/api/users")).users;
  const own = ME.role === "owner";
  $app.innerHTML = `<button class="back" onclick="location.hash='#/'">‹ Leads</button><h1>Team</h1>
   <div class="sec">${USERS.map(u => `<div class="row note"><div><b>${esc(u.name)}</b>${u.id === ME.id ? " (you)" : ""}<br><small>${esc(u.email || "")}${u.email ? " · " : ""}${u.role === "owner" ? "Owner" : "Member"}</small></div>
     ${own && !u.main && u.id !== ME.id ? `<div><button class="btn2" data-r="${u.id}">New password</button> <button class="btn2" data-x="${u.id}" style="color:var(--red)">Remove</button></div>` : ""}</div>`).join("")}</div>
   ${own ? `<div class="sec f"><h3>Add a person</h3><form id="tf"><label>Name</label><input name="name" required><label>Email</label><input name="email" type="email" autocapitalize="off" required>
     <label>Role</label><select name="role"><option value="owner">Owner (everything)</option><option value="member" selected>Member (leads only, no money)</option></select>
     <div class="err" id="te"></div><button class="btn" type="submit" style="margin-top:12px">Add person</button></form>
     <p class="empty2" style="margin-top:8px">Owner: everything, incl. money and team. Member: works leads; no money, can't delete leads or manage the team. You'll see their password once, here, to send them yourself. Nothing is emailed.</p><div id="newpw"></div></div>` : ""}
   <div class="sec f"><h3>My password</h3><form id="pf"><label>Current password</label><input name="current" type="password" autocomplete="current-password" required>
     <label>New password (10+ characters)</label><input name="password" type="password" autocomplete="new-password" required minlength="10"><div class="err" id="pe"></div><button class="btn2" type="submit">Change password</button></form></div>
   <div style="text-align:center;margin-top:14px"><button class="danger" id="lo">Sign out</button></div>`;
  const showPw = (who, pw) => { const e = document.getElementById("newpw"); e.innerHTML = `<div class="banner" style="background:#e3f7ea;color:#0f5d2e;display:block"><b>${esc(who)}</b> can sign in at ${esc(location.origin + location.pathname)}<br>Password: <b style="user-select:all;font-family:ui-monospace,monospace">${esc(pw)}</b><br><small>Copy it now. It won't be shown again.</small></div>`; };
  document.getElementById("lo").onclick = async () => { await api("/api/logout", { method: "POST" }); showLogin(); };
  document.getElementById("pf").onsubmit = async e => { e.preventDefault(); try { await api("/api/me/password", { method: "POST", body: Object.fromEntries(new FormData(e.target).entries()) }); e.target.reset(); toast("Password changed"); } catch (x) { document.getElementById("pe").textContent = x.message; } };
  if (!own) return;
  document.getElementById("tf").onsubmit = async e => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target).entries()); try { const d = await api("/api/team", { method: "POST", body: b }); await team(); showPw(b.name, d.password); } catch (x) { document.getElementById("te").textContent = x.message; } };
  $app.querySelectorAll("[data-x]").forEach(b => b.onclick = async () => { const u = USERS.find(x => x.id === b.dataset.x); if (!confirm("Remove " + u.name + "? They'll be signed out right away.")) return; await api("/api/team/" + u.id, { method: "DELETE" }); toast("Removed"); team(); });
  $app.querySelectorAll("[data-r]").forEach(b => b.onclick = async () => { const u = USERS.find(x => x.id === b.dataset.r); if (!confirm("Make a new password for " + u.name + "?")) return; const d = await api("/api/team/" + u.id + "/reset", { method: "POST" }); showPw(u.name, d.password); });
}

function soon(k) {
  const S = { proposals: ["📄", "Proposals", "Type the client and what they need, get a clean proposal PDF, and see when it's opened."],
    systems: ["🩺", "Client systems", "Every system you've built for clients: last run, errors, and what needs you. Red means check in."],
    money: ["💵", "Money", "Setup fees and monthly retainers per client, what's paid and what's due."] }[k] || ["", "Coming soon", ""];
  tabsOn(k); topMe();
  $app.innerHTML = `<div class="soon"><div class="ic">${S[0]}</div><h1>${S[1]}</h1><p>${S[2]}</p><p><span class="pill">Coming soon</span></p></div>`;
}

async function route() {
  const h = location.hash || "#/";
  let m;
  try { await loadMe(); } catch (e) { return; }
  window.scrollTo(0, 0);
  if ((m = h.match(/^#\/lead\/([a-f0-9]{24})$/))) return leadPage(m[1]);
  if ((m = h.match(/^#\/edit\/([a-f0-9]{24})$/))) return form(m[1]);
  if (h === "#/add") return form(null);
  if ((m = h.match(/^#\/soon\/(\w+)$/))) return soon(m[1]);
  if (h === "#/team") return team();
  return board();
}
window.addEventListener("hashchange", route);
route();
})();
