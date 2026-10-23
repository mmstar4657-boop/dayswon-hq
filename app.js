(() => {
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

const BASEURL = location.origin + location.pathname.replace(/[^/]*$/, "");
const ST = ["New", "Contacted", "Proposal sent", "Won", "Lost"];
const PST = ["draft", "sent", "accepted", "declined"], PL = { draft: "Draft", sent: "Sent", accepted: "Accepted", declined: "Declined" };
const SOURCES = ["Phone call", "WhatsApp", "Referral", "Email", "Site form", "Live chat", "Other"];
let ME = null, USERS = [], LEADS = null, SYNC = null, PROPS = null, AIREADY = null, LAYOUT = null, railOpen = false;
let leadFilter = "All", q = "", propFilter = "All";
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad2 = n => String(n).padStart(2, "0"), ymd = d => d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
const today = () => ymd(new Date()), addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
const fmtD = iso => { if (!iso) return ""; const d = new Date(iso); return d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(d.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}) }); };
const fmtDT = iso => iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
const fmtF = s => { if (!s) return ""; const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); };
const money = n => "$" + Number(n || 0).toLocaleString("en-US");
const val = L => (L.value_setup || L.value_monthly) ? [L.value_setup ? money(L.value_setup) : "", L.value_monthly ? money(L.value_monthly) + "/mo" : ""].filter(Boolean).join(" + ") : "";
const pval = P => (P.setup_price || P.monthly_fee) ? [P.setup_price ? money(P.setup_price) : "", P.monthly_fee ? money(P.monthly_fee) + "/mo" : ""].filter(Boolean).join(" + ") : "";
const ago = iso => { const h = (Date.now() - Date.parse(iso)) / 36e5; return h < 1 ? Math.max(1, Math.round(h * 60)) + " min" : h < 48 ? Math.round(h) + "h" : Math.round(h / 24) + " days"; };
const isOpen = L => !["Won", "Lost"].includes(L.status), stale = L => L.status === "New" && Date.now() - Date.parse(L.created_at) > 864e5, due = L => isOpen(L) && L.follow_up && L.follow_up <= today();
const sc = s => "s-" + String(s).split(" ")[0];
const owner = () => ME && ME.role === "owner";
const uname = id => (USERS.find(u => u.id === id) || {}).name || "";
const initials = n => String(n || "?").trim().split(/\s+/).map(x => x[0]).slice(0, 2).join("").toUpperCase();
const P_ = {
  leads: '<path d="M4 6h16M4 12h16M4 18h10"/>', props: '<path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6"/>', sys: '<path d="M3 12h4l3-7 4 14 3-7h4"/>', money: '<path d="M12 3v18M17 7H9.5a3 3 0 000 6h5a3 3 0 010 6H6"/>',
  team: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 11a3 3 0 100-6M21 20c0-2.6-1.6-4.8-4-5.6"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', back: '<path d="M15 5l-7 7 7 7"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  call: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2"/>', text: '<path d="M4 5h16v11H9l-5 4z"/>', mail: '<path d="M3 6h18v12H3zM3 7l9 6 9-6"/>',
  pdf: '<path d="M7 3h7l5 5v13H7zM14 3v5h5M12 11v6M9.5 14.5L12 17l2.5-2.5"/>', link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>', search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/>', refresh: '<path d="M20 11a8 8 0 10-2.3 5.7M20 4v7h-7"/>'
};
const ic = k => `<svg class="i" viewBox="0 0 24 24">${P_[k] || ""}</svg>`;
function toast(t) { const e = $("#toast"); if (!e) return; e.textContent = t; e.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove("on"), 2000); }
function loadScript(src) { return new Promise((ok, no) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error("Couldn't load " + src)); document.head.appendChild(s); }); }
function sheet(inner) { const bg = document.createElement("div"); bg.className = "sheet-bg"; bg.innerHTML = `<div class="sheet">${inner}<button class="btn ghost" data-close>Close</button></div>`; bg.onclick = e => { if (e.target === bg || e.target.closest("[data-close]")) bg.remove(); }; document.body.appendChild(bg); return bg; }

// ---------- auth ----------
function showLogin() {
  ME = null; LEADS = null; PROPS = null; LAYOUT = null; document.body.className = "";
  document.body.innerHTML = `<form class="login" id="lf"><div class="logo"><img src="favicon.svg" alt=""><span>Days<i>Won</i> HQ</span></div><h1>Sign in</h1><p class="muted" style="margin:0 0 8px">Private workspace for the DaysWon team.</p>
    <label class="l" for="em">Email</label><input class="in" type="email" id="em" autocomplete="username" autocapitalize="off">
    <label class="l" for="pw">Password</label><input class="in" type="password" id="pw" autocomplete="current-password">
    <div class="err" id="le"></div><button class="btn pri" type="submit">Sign in</button></form><div id="toast"></div>`;
  $("#lf").onsubmit = async e => { e.preventDefault(); $("#le").textContent = ""; const b = e.target.querySelector("button"); b.disabled = true;
    try { await api("/api/login", { method: "POST", body: { email: $("#em").value, password: $("#pw").value } }); ME = null; await route(); } catch (x) { $("#le").textContent = x.message; b.disabled = false; } };
}
async function loadMe() { const [m, u] = await Promise.all([api("/api/me"), api("/api/users")]); ME = m.me; USERS = u.users; }

// ---------- shell ----------
const layoutOf = () => innerWidth >= 1200 ? "desk" : innerWidth >= 768 ? "pad" : "phone";
const NAV = [["leads", "#/leads", "Leads", "leads"], ["proposals", "#/proposals", "Proposals", "props"], ["systems", "#/systems", "Systems", "sys"], ["money", "#/money", "Money", "money"]];
const navItems = () => NAV.filter(n => n[0] !== "money" || owner());;
function shell() {
  LAYOUT = layoutOf(); document.body.className = "L-" + LAYOUT + (railOpen ? " rail-open" : "");
  if (LAYOUT === "phone") {
    document.body.innerHTML = `<div id="shell" style="display:block"><header class="ptop" id="ptop"></header><main id="main"></main>
      <nav class="tabs">${navItems().map(n => `<a href="${n[1]}" data-n="${n[0]}">${ic(n[3])}${n[2]}</a>`).join("")}</nav></div><div id="toast"></div>`;
  } else {
    document.body.innerHTML = `<div id="shell"><aside class="side"><div class="logo"><img src="favicon.svg" alt=""><span>Days<i>Won</i> HQ</span></div>
      ${navItems().map(n => `<a class="nv" href="${n[1]}" data-n="${n[0]}" title="${n[2]}">${ic(n[3])}<span class="lbl">${n[2]}</span>${n[4] ? `<em>${n[4]}</em>` : ""}</a>`).join("")}
      <div class="sp"></div>
      <a class="nv" href="#/team" data-n="team" title="Team">${ic("team")}<span class="lbl">Team</span></a>
      ${owner() ? `<a class="nv" href="#/settings" data-n="settings" title="Settings">${ic("gear")}<span class="lbl">Settings</span></a>` : ""}
      ${LAYOUT === "pad" ? `<button class="nv" id="rail" title="Menu">${ic("menu")}<span class="lbl">Collapse</span></button>` : ""}
      <a class="me" href="#/team"><div class="av">${esc(initials(ME.name))}</div><span>${esc(ME.name)}</span></a></aside><div class="content" id="main"></div></div><div id="toast"></div>`;
    const r = $("#rail"); if (r) r.onclick = () => { railOpen = !railOpen; document.body.classList.toggle("rail-open", railOpen); };
  }
}
function setNav(k) { document.querySelectorAll("[data-n]").forEach(a => a.classList.toggle("on", a.dataset.n === k)); }
function ptop(title, back) { const t = $("#ptop"); if (!t) return; t.innerHTML = back ? `<button class="back" onclick="${back === "hist" ? "history.length>1?history.back():location.hash='#/leads'" : `location.hash='${back}'`}">${ic("back")}${esc(title || "Back")}</button><div class="grow"></div>`
  : `<div class="logo"><img src="favicon.svg" alt=""><span>Days<i>Won</i></span></div><div class="grow"></div><a class="av" href="#/team" style="color:#fff">${esc(initials(ME.name))}</a>`; }
const main = () => $("#main");

// ---------- leads ----------
async function loadLeads() { const d = await api("/api/leads"); LEADS = d.leads; SYNC = d.sync; }
function leadCard(L, sel, why) {
  const cls = stale(L) ? "hot" : due(L) ? "due" : "";
  let badge = "";
  if (why === "stale" || (!why && stale(L))) badge = `<span class="pill b-red">Not contacted · ${ago(L.created_at)}</span>`;
  else if (L.follow_up && isOpen(L)) badge = `<span class="pill ${L.follow_up < today() ? "b-red" : L.follow_up === today() ? "b-amb" : ""}">${L.follow_up < today() ? "Overdue · " : L.follow_up === today() ? "Today · " : "Follow up "}${fmtF(L.follow_up)}</span>`;
  const v = owner() ? val(L) : "";
  return `<a class="lc ${cls} ${sel === L.id ? "sel" : ""}" href="#/lead/${L.id}"><div class="row"><div><div class="nm">${esc(L.name)}</div>${L.company || L.business_type ? `<div class="co">${esc([L.company, L.business_type].filter(Boolean).join(" · "))}</div>` : ""}</div>${LAYOUT === "desk" && !why ? "" : `<span class="pill ${sc(L.status)}">${esc(L.status)}</span>`}</div>
    ${L.service ? `<div class="w">${esc(L.service)}</div>` : ""}<div class="mt"><span>${esc(L.source || "")}</span><span>·</span><span>${fmtD(L.created_at)}</span>${L.assigned_to && USERS.length > 1 ? `<span>·</span><span>${esc(uname(L.assigned_to))}</span>` : ""}${v ? `<span>·</span><b style="color:var(--ink);font-weight:600">${esc(v)}</b>` : ""}${badge ? " " + badge : ""}</div></a>`;
}
const match = L => !q || [L.name, L.company, L.business_type, L.service, L.email, L.phone].join(" ").toLowerCase().includes(q.toLowerCase());
const todayList = () => [...LEADS.filter(due).map(L => [L, "due"]), ...LEADS.filter(L => stale(L) && !due(L)).map(L => [L, "stale"])];
const syncLine = () => `<div class="syncl"><span>${SYNC ? (SYNC.ok ? "Website leads checked " + ago(SYNC.at) + " ago" : "Website check failed: " + esc(SYNC.error || "")) : ""}</span><button class="btn sm" id="rs">${ic("refresh")}Check now</button></div>`;
function bindSync(redraw) { const b = $("#rs"); if (b) b.onclick = async () => { b.disabled = true; try { const d = await api("/api/sync", { method: "POST" }); toast(d.sync.ok ? (d.sync.added ? d.sync.added + " new lead(s)" : "No new website leads") : "Check failed"); await loadLeads(); redraw(); } catch (e) { toast(e.message); b.disabled = false; } }; }
function bindSearch(redraw) { const qi = $("#q"); if (!qi) return; qi.oninput = () => { q = qi.value; const p = qi.selectionStart; redraw(); const n = $("#q"); n.focus(); n.setSelectionRange(p, p); }; }

function drawBoard(sel) {
  const tl = todayList(), openL = LEADS.filter(isOpen);
  const kp = owner() ? [[openL.length, "Open leads"], [money(openL.reduce((a, L) => a + (L.value_setup || 0), 0)), "Setup in pipeline"], [money(openL.reduce((a, L) => a + (L.value_monthly || 0), 0)) + "/mo", "Monthly in pipeline"], [money(LEADS.filter(L => L.status === "Won").reduce((a, L) => a + (L.value_monthly || 0), 0)) + "/mo", "Won monthly"]]
    : [[openL.length, "Open leads"], [LEADS.filter(L => L.status === "Proposal sent").length, "Proposals out"], [LEADS.filter(L => L.status === "Won").length, "Won"]];
  const colV = s => { if (!owner()) return ""; const ls = LEADS.filter(L => L.status === s); const a = ls.reduce((x, L) => x + (L.value_setup || 0), 0), m = ls.reduce((x, L) => x + (L.value_monthly || 0), 0); return a || m ? `<span class="v">${a ? money(a) : ""}${a && m ? " + " : ""}${m ? money(m) + "/mo" : ""}</span>` : ""; };
  $("#pa").innerHTML = `<div class="bar"><h1>Leads</h1><input class="in search" id="q" type="search" placeholder="Search leads" value="${esc(q)}"><div class="grow"></div><a class="btn pri" href="#/add">${ic("plus")}Add lead</a></div>
    <div class="today"><div class="lbl">Follow up<br>today · ${tl.length}</div>${tl.length ? tl.map(([L, w]) => leadCard(L, sel, w)).join("") : `<div class="muted" style="align-self:center">Nothing due. You're on top of it.</div>`}</div>
    <div class="kpis">${kp.map(([b, s]) => `<div class="kpi"><b>${b}</b><span>${s}</span></div>`).join("")}</div>
    <div class="board">${ST.map(s => { const ls = LEADS.filter(L => L.status === s && match(L)); return `<div class="col"><h4>${esc(s)} <span class="n">${ls.length}</span>${colV(s)}</h4>${ls.map(L => leadCard(L, sel)).join("") || `<div class="empty" style="padding:14px 4px">No leads</div>`}</div>`; }).join("")}</div>${syncLine()}`;
  bindSearch(() => drawBoard(sel)); bindSync(() => drawBoard(sel));
}
function drawList(el, sel) {
  const counts = Object.fromEntries(ST.map(s => [s, LEADS.filter(L => L.status === s).length]));
  const shown = ST.filter(s => leadFilter === "All" || leadFilter === s), tl = todayList();
  const groups = shown.map(s => { const ls = LEADS.filter(L => L.status === s && match(L)); return ls.length || leadFilter !== "All" ? `<div class="grp"><h4>${esc(s)} <span class="n">${ls.length}</span></h4>${ls.map(L => leadCard(L, sel)).join("") || `<div class="empty">None</div>`}</div>` : ""; }).join("");
  const chips = `<div class="chips">${["All", ...ST].map(s => `<button class="chip ${leadFilter === s ? "on" : ""}" data-f="${esc(s)}">${esc(s)}<i>${s === "All" ? LEADS.length : counts[s]}</i></button>`).join("")}</div>`;
  if (LAYOUT === "pad") {
    el.innerHTML = `<div class="lh"><div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><h1 style="font-size:20px;margin:0;flex:1">Leads</h1><a class="btn pri sm" href="#/add">${ic("plus")}Add</a></div><input class="in" id="q" type="search" placeholder="Search leads" value="${esc(q)}"><div style="margin-top:10px">${chips}</div></div>
      <div class="lb">${tl.length ? `<div class="grp"><h4 style="color:var(--red)">Follow up today <span class="n">${tl.length}</span></h4>${tl.map(([L, w]) => leadCard(L, sel, w)).join("")}</div>` : ""}${groups || `<div class="empty">No leads yet.</div>`}${syncLine()}</div>`;
  } else {
    el.innerHTML = `<div class="bar"><h1>Leads</h1></div><div class="page"><div class="todayp"><h4>Follow up today · ${tl.length}</h4>${tl.length ? tl.map(([L, w]) => leadCard(L, sel, w)).join("") : `<div class="empty">Nothing due. You're on top of it.</div>`}</div>
      <input class="in" id="q" type="search" placeholder="Search leads" value="${esc(q)}" style="margin:8px 0 10px">${chips}${groups || `<div class="empty">No leads yet.</div>`}${syncLine()}</div><button class="fab" onclick="location.hash='#/add'">+ Add lead</button>`;
  }
  el.querySelectorAll(".chip").forEach(b => b.onclick = () => { leadFilter = b.dataset.f; drawList(el, sel); });
  bindSearch(() => drawList(el, sel)); bindSync(() => drawList(el, sel));
}
async function leadsView(sel, sub) {
  setNav("leads");
  const m = main(), key = "leads-" + LAYOUT;
  if (LAYOUT === "phone") {
    if (sub) { ptop(sub === "lead" ? "Leads" : "Back", "hist"); m.innerHTML = `<div id="det"></div>`; return sub === "lead" ? leadDetail($("#det"), sel) : leadForm($("#det"), sel); }
    ptop(); m.dataset.v = ""; m.innerHTML = `<div class="loading">Loading leads…</div>`;
    try { await loadLeads(); } catch (e) { if (e.message !== "login") m.innerHTML = `<div class="loading">${esc(e.message)}</div>`; return; }
    return drawList(m, null);
  }
  if (m.dataset.v !== key || !LEADS) {
    m.dataset.v = key;
    m.innerHTML = LAYOUT === "desk" ? `<div id="pa"><div class="loading">Loading leads…</div></div><div id="dw"></div>` : `<div class="md"><div class="ml" id="pa"><div class="loading">Loading…</div></div><div class="mr" id="mr"></div></div>`;
    try { await loadLeads(); } catch (e) { if (e.message !== "login" && $("#pa")) $("#pa").innerHTML = `<div class="loading">${esc(e.message)}</div>`; return; }
  }
  if (!$("#pa")) return;
  if (LAYOUT === "desk") drawBoard(sel); else drawList($("#pa"), sel);
  if (LAYOUT === "desk") {
    const dw = $("#dw");
    if (!sub) { dw.innerHTML = ""; return; }
    dw.innerHTML = `<div class="drawer-bg" onclick="location.hash='#/leads'"></div><aside class="drawer" id="det"></aside>`;
    return sub === "lead" ? leadDetail($("#det"), sel) : leadForm($("#det"), sel);
  }
  const mr = $("#mr");
  if (!sub) { mr.innerHTML = `<div class="empty" style="padding-top:30vh">${ic("leads")}<br>Select a lead to see the details</div>`; return; }
  mr.innerHTML = `<div id="det"></div>`;
  return sub === "lead" ? leadDetail($("#det"), sel) : leadForm($("#det"), sel);
}
async function refreshLists() { try { await loadLeads(); } catch { return; } const h = location.hash; const id = (h.match(/[a-f0-9]{24}/) || [])[0]; if (LAYOUT === "desk" && $("#pa") && $(".board")) drawBoard(id); else if (LAYOUT === "pad" && $("#pa")) drawList($("#pa"), id); }
function detHead(title, closeTo) {
  if (LAYOUT === "phone") return "";
  return `<div class="dhead">${LAYOUT === "desk" ? `<button class="btn ghost sm" onclick="location.hash='${closeTo}'">${ic("x")}</button>` : ""}<b style="flex:1">${esc(title)}</b></div>`;
}
const telOf = p => String(p || "").replace(/[^0-9+]/g, "");
function mailDraft(L) { const first = (L.name || "").split(" ")[0] || "there"; const what = L.service ? " about " + L.service.replace(/\.$/, "") : "";
  return "mailto:" + encodeURIComponent(L.email) + "?subject=" + encodeURIComponent("Following up" + (L.company ? " — " + L.company : "") + " | DaysWon") + "&body=" + encodeURIComponent(`Hi ${first},\n\nThanks for reaching out to DaysWon${what}. I'd love to hear a bit more about how things run today and where the time goes, so I can show you what we'd set up for you.\n\nDo you have 15 minutes this week for a quick call? Just reply with a time that works.\n\nBest,\n${ME.name}\nDaysWon`); }
const smsDraft = L => "sms:" + telOf(L.phone) + "&body=" + encodeURIComponent(`Hi ${(L.name || "").split(" ")[0]}, this is ${ME.name} from DaysWon. Thanks for reaching out! Do you have a few minutes to talk this week?`);
async function leadDetail(el, id) {
  el.innerHTML = detHead("Lead", "#/leads") + `<div class="loading">Loading…</div>`;
  let d, pr; try { [d, pr] = await Promise.all([api("/api/lead/" + id), api("/api/proposals?lead=" + id)]); } catch (e) { if (e.message !== "login") el.innerHTML = detHead("Lead", "#/leads") + `<div class="loading">${esc(e.message)}</div>`; return; }
  const L = d.lead, notes = d.notes, props = pr.proposals;
  const rows = [["Business", L.company], ["Type", L.business_type], ["Wants", L.service], ["Website", L.website ? `<a href="https://${esc(L.website.replace(/^https?:\/\//, ""))}" target="_blank" rel="noopener">${esc(L.website)}</a>` : "", true], ["Phone", L.phone], ["Email", L.email], ["Value", owner() ? val(L) : ""], ["Source", L.source], ["Came in", fmtDT(L.created_at)], ["First contact", L.contacted_at ? fmtDT(L.contacted_at) : "Not yet"]]
    .filter(r => r[1]).map(r => `<dt>${r[0]}</dt><dd>${r[2] ? r[1] : esc(r[1])}</dd>`).join("");
  el.innerHTML = detHead(L.name, "#/leads") + `<div class="ld">
   <div class="hd"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><div class="nm">${esc(L.name)}</div>${L.company ? `<div class="co">${esc(L.company)}</div>` : ""}</div><span class="pill ${sc(L.status)}">${esc(L.status)}</span></div>
    <div class="acts"><a class="${L.phone ? "" : "off"}" href="tel:${esc(telOf(L.phone))}">${ic("call")}Call</a><a class="${L.phone ? "" : "off"}" href="${L.phone ? esc(smsDraft(L)) : "#"}">${ic("text")}Text</a><a class="${L.email ? "" : "off"}" href="${L.email ? esc(mailDraft(L)) : "#"}">${ic("mail")}Email</a></div>
    ${L.status === "New" ? `<div class="banner"><span>${stale(L) ? "Not contacted yet · came in " + ago(L.created_at) + " ago" : "Not contacted yet"}</span><button class="btn sm" id="mc">Mark contacted</button></div>` : ""}</div>
   <div class="box" style="margin-top:12px"><h3>Stage</h3><div class="seg" id="stg">${ST.map(s => `<button class="${s === L.status ? "on" : ""}" data-s="${esc(s)}">${esc(s)}</button>`).join("")}</div></div>
   <div class="box"><h3>Proposals</h3>${props.map(P => `<a class="prow" href="#/proposal/${P.id}"><span><b>${esc(P.title || "Untitled")}</b><br><small class="muted">${P.status === "accepted" ? "Accepted " + fmtD(P.accepted_at) : P.status === "sent" ? "Sent " + fmtD(P.sent_at) + (P.views ? " · opened " + P.views + "×" : " · not opened yet") : "Updated " + fmtD(P.updated_at)}${owner() && pval(P) ? " · " + esc(pval(P)) : ""}</small></span><span class="pill ${sc(P.status)}">${PL[P.status]}</span></a>`).join("") || `<div class="muted" style="font-size:14px">No proposals yet.</div>`}
     <button class="btn" id="np" style="margin-top:10px">${ic("plus")}New proposal</button></div>${owner() ? `<div class="box" id="lbill"></div>` : ""}
   <div class="box"><h3>Assigned to</h3><select id="as" class="in">${USERS.map(u => `<option value="${u.id}" ${u.id === L.assigned_to ? "selected" : ""}>${esc(u.name)}${u.id === ME.id ? " (me)" : ""}</option>`).join("")}<option value="" ${L.assigned_to ? "" : "selected"}>Nobody</option></select></div>
   <div class="box"><h3>Next follow-up</h3><div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"><input type="date" class="in" id="fu" value="${esc(L.follow_up || "")}" style="width:auto">
     <button class="btn sm" data-d="1">Tomorrow</button><button class="btn sm" data-d="3">+3 days</button><button class="btn sm" data-d="7">+1 week</button>${L.follow_up ? `<button class="btn sm ghost" data-d="x">Clear</button>` : ""}</div>
     ${L.follow_up ? `<div style="margin-top:8px;font-size:13.5px">${L.follow_up < today() ? `<span class="pill b-red">Overdue</span> ` : ""}${fmtF(L.follow_up)}</div>` : ""}</div>
   <div class="box"><h3>Details</h3><dl class="kv">${rows}</dl>${L.message ? `<h3 style="margin-top:14px">What they wrote</h3><div style="white-space:pre-wrap;font-size:14px">${esc(L.message)}</div>` : ""}
     ${L.transcript ? `<details style="margin-top:10px"><summary>Chat transcript</summary><pre style="white-space:pre-wrap;font-size:12.5px">${esc(L.transcript)}</pre></details>` : ""}<div style="margin-top:12px"><a class="btn sm" href="#/edit/${L.id}">Edit details</a></div></div>
   <div class="box"><h3>Notes & history</h3><textarea id="nt" class="in" placeholder="What happened? e.g. Called, wants a demo Tuesday"></textarea><button class="btn dark" id="an" style="margin-top:8px">Save note</button>
     <div style="margin-top:10px">${notes.map(n => `<div class="note ${n.kind === "log" ? "log" : ""}"><small>${n.user_name ? esc(n.user_name) + " · " : ""}${fmtDT(n.at)}</small>${esc(n.text)}</div>`).join("") || `<div class="muted">No notes yet.</div>`}</div></div></div>`;
  const patch = async (b, msg) => { try { await api("/api/lead/" + id, { method: "PATCH", body: b }); toast(msg); leadDetail(el, id); refreshLists(); } catch (e) { toast(e.message); } };
  el.querySelectorAll("#stg button").forEach(b => b.onclick = () => patch({ status: b.dataset.s }, "Moved to " + b.dataset.s));
  const mc = el.querySelector("#mc"); if (mc) mc.onclick = () => patch({ status: "Contacted" }, "Marked contacted");
  el.querySelector("#as").onchange = e => patch({ assigned_to: e.target.value || null }, "Assigned");
  el.querySelector("#fu").onchange = e => (e.target.value || "") === (L.follow_up || "") ? 0 : patch({ follow_up: e.target.value || null }, "Follow-up saved");
  el.querySelectorAll("[data-d]").forEach(b => b.onclick = () => patch({ follow_up: b.dataset.d === "x" ? null : addDays(+b.dataset.d) }, b.dataset.d === "x" ? "Follow-up cleared" : "Follow-up saved"));
  el.querySelector("#an").onclick = async () => { const t = el.querySelector("#nt").value.trim(); if (!t) return; try { await api("/api/lead/" + id + "/notes", { method: "POST", body: { text: t } }); toast("Note saved"); leadDetail(el, id); } catch (e) { toast(e.message); } };
  el.querySelector("#np").onclick = () => newProposal(id);
  if (owner()) billingBox(el.querySelector("#lbill"), { leadId: id });
}
async function leadForm(el, id) {
  let L = { source: "Phone call", status: "New" };
  if (id) { try { L = (await api("/api/lead/" + id)).lead; } catch (e) { return; } }
  const inp = (k, lab, type = "text", ph = "") => `<label class="l" for="f_${k}">${lab}</label><input class="in" id="f_${k}" name="${k}" type="${type}" placeholder="${esc(ph)}" value="${esc(L[k] ?? "")}"${type === "number" ? ' inputmode="numeric"' : ""}>`;
  el.innerHTML = detHead(id ? "Edit lead" : "Add lead", id ? "#/lead/" + id : "#/leads") + `<div class="ld"><form class="box" id="lf">${LAYOUT === "phone" ? `<h2 style="margin:0 0 4px">${id ? "Edit lead" : "Add lead"}</h2>` : ""}
   ${inp("name", "Name *", "text", "Full name")}${inp("company", "Business", "text", "Company name")}${inp("business_type", "Type of business", "text", "e.g. HVAC, mortgage broker")}${inp("service", "What they want", "text", "e.g. Missed-call text back")}
   <div class="grid2"><div>${inp("phone", "Phone", "tel")}</div><div>${inp("email", "Email", "email")}</div></div>${inp("website", "Website", "text", "example.com")}
   <div class="grid2"><div><label class="l" for="f_source">Source</label><select class="in" id="f_source" name="source">${[...new Set([...SOURCES, L.source].filter(Boolean))].map(s => `<option ${s === L.source ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></div>
   ${id ? "" : `<div><label class="l" for="f_status">Stage</label><select class="in" id="f_status" name="status">${ST.map(s => `<option ${s === L.status ? "selected" : ""}>${s}</option>`).join("")}</select></div>`}</div>
   ${owner() ? `<div class="grid2"><div>${inp("value_setup", "Setup $", "number", "0")}</div><div>${inp("value_monthly", "Monthly $", "number", "0")}</div></div>` : ""}
   ${id ? "" : `<div class="grid2"><div>${inp("follow_up", "Follow up on", "date")}</div><div><label class="l" for="f_as">Assigned to</label><select class="in" id="f_as" name="assigned_to">${USERS.map(u => `<option value="${u.id}" ${u.id === ME.id ? "selected" : ""}>${esc(u.name)}</option>`).join("")}</select></div></div>`}
   <label class="l" for="f_message">Notes / what they said</label><textarea class="in" id="f_message" name="message">${esc(L.message || "")}</textarea>
   <div class="err" id="fe"></div><button class="btn pri" type="submit" style="width:100%;margin-top:10px">${id ? "Save" : "Add lead"}</button>
   ${id && owner() ? `<div style="text-align:center;margin-top:10px"><button type="button" class="btn ghost danger" id="del">Delete lead</button></div>` : ""}</form></div>`;
  el.querySelector("#lf").onsubmit = async e => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target).entries()); if (!b.follow_up) delete b.follow_up;
    try { if (id) { await api("/api/lead/" + id, { method: "PATCH", body: b }); toast("Saved"); await refreshLists(); location.hash = "#/lead/" + id; } else { const d = await api("/api/leads", { method: "POST", body: b }); toast("Lead added"); await refreshLists(); location.replace("#/lead/" + d.id); } }
    catch (x) { el.querySelector("#fe").textContent = x.message; } };
  const del = el.querySelector("#del"); if (del) del.onclick = async () => { if (!confirm("Delete this lead and its notes?")) return; await api("/api/lead/" + id, { method: "DELETE" }); toast("Deleted"); await refreshLists(); location.hash = "#/leads"; };
}

// ---------- proposals ----------
async function newProposal(leadId) {
  try { const d = await api("/api/proposals", { method: "POST", body: { lead_id: leadId || null } }); PROPS = null; toast("Draft created"); location.hash = "#/proposal/" + d.id; } catch (e) { toast(e.message); }
}
function newProposalSheet() {
  const opts = (LEADS || []).map(L => `<option value="${L.id}">${esc(L.name)}${L.company ? " · " + esc(L.company) : ""}</option>`).join("");
  const s = sheet(`<h3>New proposal</h3><p class="muted" style="margin:0">Pick the lead it's for (you can change it later).</p><select class="in" id="nl" style="margin-top:12px"><option value="">No lead</option>${opts}</select><button class="btn pri" id="nc">Create draft</button>`);
  s.querySelector("#nc").onclick = () => { const v = s.querySelector("#nl").value; s.remove(); newProposal(v); };
}
async function loadProps() { PROPS = (await api("/api/proposals")).proposals; }
const pmeta = P => P.status === "accepted" ? "Accepted " + fmtD(P.accepted_at) + (P.accepted_name ? " by " + P.accepted_name : "") : P.status === "sent" ? "Sent " + fmtD(P.sent_at) + (P.views ? " · opened " + P.views + "×" : " · not opened yet") : P.status === "declined" ? "Declined " + fmtD(P.declined_at) : "Draft · updated " + fmtD(P.updated_at);
function propFilterChips(redraw) { const c = Object.fromEntries(PST.map(s => [s, PROPS.filter(P => P.status === s).length])); return `<div class="chips">${["All", ...PST].map(s => `<button class="chip ${propFilter === s ? "on" : ""}" data-pf="${s}">${s === "All" ? "All" : PL[s]}<i>${s === "All" ? PROPS.length : c[s]}</i></button>`).join("")}</div>`; }
function bindPF(el, redraw) { el.querySelectorAll("[data-pf]").forEach(b => b.onclick = () => { propFilter = b.dataset.pf; redraw(); }); }
async function proposalsView(sel) {
  setNav("proposals");
  const m = main();
  if (!LEADS) loadLeads().catch(() => {});
  if (LAYOUT === "phone") {
    if (sel) { ptop("Proposals", "#/proposals"); m.dataset.v = ""; m.innerHTML = `<div id="ed"></div>`; return editor($("#ed"), sel, false); }
    ptop(); m.innerHTML = `<div class="loading">Loading…</div>`;
    try { await loadProps(); } catch (e) { return; }
    const draw = () => { const ls = PROPS.filter(P => propFilter === "All" || P.status === propFilter);
      m.innerHTML = `<div class="bar"><h1>Proposals</h1></div><div class="page">${propFilterChips()}${ls.map(P => `<a class="pc" href="#/proposal/${P.id}"><div class="row"><span class="t">${esc(P.title || "Untitled")}</span><span class="pill ${sc(P.status)}">${PL[P.status]}</span></div><div class="mt">${esc([P.client_name, P.company].filter(Boolean).join(" · "))}${owner() && pval(P) ? " · " + esc(pval(P)) : ""}</div><div class="mt">${esc(pmeta(P))}</div></a>`).join("") || `<div class="empty">No proposals here yet.</div>`}</div><button class="fab" id="npb">+ New proposal</button>`;
      bindPF(m, draw); $("#npb").onclick = newProposalSheet; };
    return draw();
  }
  if (LAYOUT === "desk") {
    m.dataset.v = "";
    if (sel) { m.innerHTML = `<div id="ed"></div>`; return editor($("#ed"), sel, true); }
    m.innerHTML = `<div class="bar"><h1>Proposals</h1></div><div class="loading">Loading…</div>`;
    try { await loadProps(); } catch (e) { return; }
    const draw = () => { const ls = PROPS.filter(P => propFilter === "All" || P.status === propFilter);
      m.innerHTML = `<div class="bar"><h1>Proposals</h1><div class="grow"></div><button class="btn pri" id="npb">${ic("plus")}New proposal</button></div><div class="page">${propFilterChips()}
       <table class="pt" style="margin-top:8px"><thead><tr><th>Proposal</th><th>Client</th><th>Status</th>${owner() ? "<th>Value</th>" : ""}<th>Activity</th></tr></thead><tbody>
       ${ls.map(P => `<tr data-id="${P.id}"><td><b>${esc(P.title || "Untitled")}</b></td><td>${esc(P.client_name || "")}<div class="muted" style="font-size:12.5px">${esc(P.company || "")}</div></td><td><span class="pill ${sc(P.status)}">${PL[P.status]}</span></td>${owner() ? `<td>${esc(pval(P))}</td>` : ""}<td class="muted" style="font-size:13px">${esc(pmeta(P))}</td></tr>`).join("") || `<tr><td colspan="5" class="empty">No proposals here yet.</td></tr>`}</tbody></table></div>`;
      bindPF(m, draw); m.querySelectorAll("tr[data-id]").forEach(tr => tr.onclick = () => location.hash = "#/proposal/" + tr.dataset.id); $("#npb").onclick = newProposalSheet; };
    return draw();
  }
  // pad: master/detail
  if (m.dataset.v !== "props-pad" || !PROPS) { m.dataset.v = "props-pad"; m.innerHTML = `<div class="md"><div class="ml" id="pl"><div class="loading">Loading…</div></div><div class="mr" id="pr"></div></div>`; try { await loadProps(); } catch (e) { return; } }
  const drawL = () => { const ls = PROPS.filter(P => propFilter === "All" || P.status === propFilter);
    $("#pl").innerHTML = `<div class="lh"><div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><h1 style="font-size:20px;margin:0;flex:1">Proposals</h1><button class="btn pri sm" id="npb">${ic("plus")}New</button></div>${propFilterChips()}</div>
      <div class="lb">${ls.map(P => `<a class="pc ${P.id === sel ? "sel" : ""}" href="#/proposal/${P.id}"><div class="row"><span class="t">${esc(P.title || "Untitled")}</span><span class="pill ${sc(P.status)}">${PL[P.status]}</span></div><div class="mt">${esc([P.client_name, P.company].filter(Boolean).join(" · "))}${owner() && pval(P) ? " · " + esc(pval(P)) : ""}</div><div class="mt">${esc(pmeta(P))}</div></a>`).join("") || `<div class="empty">No proposals here yet.</div>`}</div>`;
    bindPF($("#pl"), drawL); $("#npb").onclick = newProposalSheet; };
  drawL();
  if (!sel) { $("#pr").innerHTML = `<div class="empty" style="padding-top:30vh">${ic("props")}<br>Select a proposal, or create a new one</div>`; return; }
  $("#pr").innerHTML = `<div id="ed"></div>`; return editor($("#ed"), sel, false, async () => { await loadProps(); drawL(); });
}
async function aiReady() { if (AIREADY === null) { try { AIREADY = (await api("/api/settings/ai-status")).ready; } catch { AIREADY = false; } } return AIREADY; }

async function editor(el, id, withPrev, onChange) {
  el.innerHTML = `<div class="loading">Loading proposal…</div>`;
  let d; try { [d] = await Promise.all([api("/api/proposal/" + id), aiReady(), LEADS ? null : loadLeads()]); } catch (e) { if (e.message !== "login") el.innerHTML = `<div class="loading">${esc(e.message)}</div>`; return; }
  const P = d.proposal, BIZ = d.biz, own = owner();
  const changed = () => { if (onChange) onChange(); PROPS = LAYOUT === "pad" ? PROPS : null; };
  const lead = (LEADS || []).find(L => L.id === P.lead_id);
  const link = own ? BASEURL + "p.html#" + P.token : "";
  const F = (k, lab, type, ph, hint) => `<label class="l" for="e_${k}">${lab}</label>${type === "area" ? `<textarea class="in" id="e_${k}" data-k="${k}" placeholder="${esc(ph || "")}" rows="5">${esc(P[k] || "")}</textarea>` : `<input class="in" id="e_${k}" data-k="${k}" type="${type || "text"}" placeholder="${esc(ph || "")}" value="${esc(P[k] ?? "")}"${type === "number" ? ' inputmode="numeric" min="0"' : ""}>`}${hint ? `<div class="hint">${hint}</div>` : ""}`;
  const hasText = () => ["problem", "solution", "steps"].some(k => (P[k] || "").trim());
  el.innerHTML = `<div class="bar ebar">${LAYOUT === "desk" ? `<a class="btn ghost sm" href="#/proposals">${ic("back")}</a>` : ""}<div class="et" style="min-width:0"><h1 style="overflow:hidden;text-overflow:ellipsis" id="eh">${esc(P.title || "Untitled proposal")}</h1></div><span class="pill ${sc(P.status)}">${PL[P.status]}</span><div class="grow"></div><span class="savest" id="sv">Saved</span>
      ${withPrev ? "" : `<button class="btn sm" id="pvb">${ic("eye")}Preview</button>`}${own ? `<button class="btn sm" id="pdfb">${ic("pdf")}PDF</button><button class="btn sm pri" id="lnkb">${ic("link")}Client link</button>` : ""}</div>
   <div class="ed ${withPrev ? "" : "one"}"><div class="form">
    <div class="box"><h3>Status</h3><div class="seg" id="pst">${PST.map(s => `<button class="${s === P.status ? "on" : ""}" data-s="${s}">${PL[s]}</button>`).join("")}</div>
      <div class="hint" style="margin-top:8px">${P.status === "accepted" ? "Accepted " + fmtDT(P.accepted_at) + (P.accepted_name ? " by " + esc(P.accepted_name) + (P.accepted_company ? ", " + esc(P.accepted_company) : "") : "") : P.status === "sent" ? "Sent " + fmtDT(P.sent_at) + (P.views ? " · client opened it " + P.views + "× (first " + fmtDT(P.viewed_at) + ")" : " · client hasn't opened the link yet") : P.status === "draft" ? "Not sent. Nothing is sent from this app: you send the PDF or link yourself, then mark it Sent." : "Declined " + fmtDT(P.declined_at)}</div>
      ${!own ? `<div class="hint">Prices, PDF and the client link are visible to owners only.</div>` : ""}</div>
    <div class="box ai"><h3>${ic("spark")} Draft with AI</h3>${AIREADY ? `<textarea class="in" id="brief" rows="3" placeholder="A few lines: who the client is, what they want, and the price. e.g. Dental office in Brooklyn, 3 chairs, wants missed calls texted back and online booking. $2,500 setup, $400/month, 3 months minimum."></textarea><button class="btn pri" id="aib" style="margin-top:8px">${ic("spark")}Draft with AI</button><div class="hint">Fills every section below. You can edit everything after.</div>`
      : `<button class="btn" disabled>${ic("spark")}Draft with AI</button><div class="hint">${own ? `Add your AI key in <a href="#/settings">Settings</a> to turn this on. Until then, fill in the sections by hand below.` : "Ask an owner to add an AI key in Settings. You can fill in the sections by hand below."}</div>`}<div class="err" id="aie"></div></div>
    <div class="box"><h3>Client</h3><label class="l" for="e_lead">Lead</label><select class="in" id="e_lead"><option value="">No lead</option>${(LEADS || []).map(L => `<option value="${L.id}" ${L.id === P.lead_id ? "selected" : ""}>${esc(L.name)}${L.company ? " · " + esc(L.company) : ""}</option>`).join("")}</select>
      ${lead ? `<div class="hint"><a href="#/lead/${lead.id}">Open lead</a> · marking this proposal Sent or Accepted moves the lead to Proposal sent / Won.</div>` : ""}
      <div class="grid2"><div>${F("client_name", "Client name", "text", "Full name")}</div><div>${F("company", "Company")}</div></div>${F("client_email", "Client email", "email", "for your email draft")}
      ${F("title", "Proposal title", "text", "e.g. Refi Radar")}${F("summary", "One-line summary", "text", "What the system does for them, in one sentence")}${F("needs", "What they need", "text", "One sentence")}</div>
    <div class="box"><h3>Scope</h3>${F("problem", "The problem", "area", "Their situation and why it matters.", 'Start a line with "- " for a bullet.')}${F("solution", "Our solution", "area", "What we build and run for them.")}
      ${F("steps", "How it works (one step per line)", "area", "Step name: what happens", 'Write each step as "Step name: what happens".')}${F("timeline", "Timeline (one per line)", "area", "Week 1: what happens")}${F("client_needs", "What we need from the client (one per line)", "area", "Access to …")}</div>
    ${own ? `<div class="box"><h3>Pricing</h3><div class="grid4"><div>${F("setup_price", "Setup $", "number", "0")}</div><div>${F("deposit_pct", "Deposit %", "number", "50")}</div><div>${F("monthly_fee", "Monthly $", "number", "0")}</div><div>${F("min_months", "Min. months", "number", "3")}</div></div>
      <div class="hint" id="payh"></div>${F("price_notes", "Pricing notes", "area", "What the setup and monthly fee include; third-party costs.")}</div><div class="box" id="bill"></div>` : ""}
    <div class="box"><h3>Terms</h3>${F("valid_until", "Valid until", "date")}${F("terms", "Terms", "area", "")}<button class="btn sm" id="dterms" style="margin-top:8px">Reset to DaysWon default terms</button></div>
    <div class="box"><h3>History</h3>${d.events.map(e => `<div class="note log"><small>${esc(e.user_name || "")} · ${fmtDT(e.at)}</small>${esc(e.text)}</div>`).join("") || `<div class="muted">Nothing yet.</div>`}
      ${own ? `<button class="btn ghost danger sm" id="pdel" style="margin-top:10px">Delete proposal</button>` : ""}</div>
   </div>${withPrev ? `<div class="prev" id="pv"></div>` : ""}</div>`;
  el.querySelectorAll("textarea.in[data-k]").forEach(t => { t.rows = Math.min(14, Math.max(4, (t.value.match(/\n/g) || []).length + 2)); });
  const pv = el.querySelector("#pv");
  const payh = () => { const h = el.querySelector("#payh"); if (!h) return; const s = +P.setup_price || 0, dp = +P.deposit_pct || 0; h.textContent = s ? (dp && dp < 100 ? `${money(Math.round(s * dp / 100))} to start, ${money(s - Math.round(s * dp / 100))} at launch.` : "Setup paid in full to start.") + (P.min_months ? ` ${P.min_months}-month minimum, then 30 days' notice.` : "") : ""; };
  const drawPrev = () => { if (pv) pv.innerHTML = DWView.html(P, BIZ); payh(); };
  drawPrev();
  let pend = {}, tm = null, ptm = null;
  const save = async () => { const b = pend; pend = {}; if (!Object.keys(b).length) return; $("#sv").textContent = "Saving…"; try { await api("/api/proposal/" + id, { method: "PATCH", body: b }); $("#sv").textContent = "Saved"; changed(); } catch (e) { $("#sv").textContent = "Not saved: " + e.message; Object.assign(pend, b); } };
  const queue = (k, v) => { P[k] = v; pend[k] = v; $("#sv").textContent = "Editing…"; clearTimeout(tm); tm = setTimeout(save, 800); clearTimeout(ptm); ptm = setTimeout(drawPrev, 250); if (k === "title") $("#eh").textContent = v || "Untitled proposal"; };
  el.querySelectorAll("[data-k]").forEach(i => { i.addEventListener("input", () => queue(i.dataset.k, i.type === "number" ? (i.value === "" ? 0 : +i.value) : i.value)); i.addEventListener("blur", () => { clearTimeout(tm); save(); }); });
  el.querySelector("#e_lead").onchange = async e => { await save(); try { await api("/api/proposal/" + id, { method: "PATCH", body: { lead_id: e.target.value || null } }); toast("Lead linked"); changed(); editor(el, id, withPrev, onChange); } catch (x) { toast(x.message); } };
  if (own) billingBox(el.querySelector("#bill"), { P });
  el.querySelector("#dterms").onclick = () => { if ((P.terms || "").trim() && !confirm("Replace the terms with the DaysWon default terms?")) return; const t = el.querySelector("#e_terms"); t.value = DEFAULT_TERMS; queue("terms", DEFAULT_TERMS); };
  el.querySelectorAll("#pst button").forEach(b => b.onclick = async () => {
    const s = b.dataset.s; if (s === P.status) return; await save();
    const body = { status: s };
    if (s === "accepted") { const n = prompt("Who accepted it? (optional, e.g. the client's name)", P.client_name || ""); if (n === null) return; body.accepted_name = n; }
    try { await api("/api/proposal/" + id, { method: "PATCH", body }); toast(s === "sent" && P.lead_id ? "Marked sent · lead moved to Proposal sent" : s === "accepted" && P.lead_id ? "Accepted · lead moved to Won" : "Marked " + PL[s]); changed(); LEADS = null; editor(el, id, withPrev, onChange); } catch (e) { toast(e.message); } });
  const aib = el.querySelector("#aib");
  if (aib) aib.onclick = async () => {
    const brief = el.querySelector("#brief").value.trim(); const er = el.querySelector("#aie"); er.textContent = "";
    if (brief.length < 10) { er.textContent = "Write a few lines first: who the client is, what they want, and the price."; return; }
    if (hasText() && !confirm("Replace the text in the sections with a new AI draft?")) return;
    aib.disabled = true; aib.innerHTML = "Writing the proposal… (about 30 sec)";
    try { const r = await api("/api/proposal/" + id + "/ai", { method: "POST", body: { brief } }); const dft = r.draft; const b = {};
      for (const [k, v] of Object.entries(dft)) { if (v === "" || v === 0 || v == null) { if (!["client_name", "company"].includes(k) || P[k]) continue; } if ((k === "client_name" || k === "company") && P[k] && !v) continue; b[k] = v; P[k] = v; }
      await api("/api/proposal/" + id, { method: "PATCH", body: b }); toast("Draft written. Read it over and edit anything."); changed(); editor(el, id, withPrev, onChange);
    } catch (e) { er.textContent = e.message; aib.disabled = false; aib.innerHTML = ic("spark") + "Draft with AI"; } };
  const pvb = el.querySelector("#pvb");
  if (pvb) pvb.onclick = () => { const m = document.createElement("div"); m.className = "prevmodal"; m.innerHTML = `<button class="btn dark x">${ic("x")}Close</button><div style="max-width:760px;margin:0 auto;padding:0 ${LAYOUT === "phone" ? 0 : 16}px">${DWView.html(P, BIZ)}</div>`; m.querySelector(".x").onclick = () => m.remove(); document.body.appendChild(m); };
  const pdel = el.querySelector("#pdel");
  if (pdel) pdel.onclick = async () => { if (!confirm("Delete this proposal? Its client link stops working.")) return; await api("/api/proposal/" + id, { method: "DELETE" }); PROPS = null; toast("Deleted"); location.hash = "#/proposals"; };
  const pdfb = el.querySelector("#pdfb");
  if (pdfb) pdfb.onclick = async () => { await save(); pdfb.disabled = true; const old = pdfb.innerHTML; pdfb.textContent = "Making PDF…";
    try { await loadScript("pdf-lib.min.js"); await loadScript("proposal-pdf.js?v=7"); const f = await DWPdf.file(P, BIZ); const u = URL.createObjectURL(f);
      const canShare = navigator.canShare && navigator.canShare({ files: [f] });
      const s = sheet(`<h3>PDF ready</h3><p class="muted" style="margin:0;word-break:break-all">${esc(f.name)} · ${Math.round(f.size / 1024)} KB</p>${canShare ? `<button class="btn pri" id="shp">Share PDF…</button>` : ""}<a class="btn ${canShare ? "" : "pri"}" href="${u}" target="_blank" rel="noopener" id="opp">Open PDF</a><a class="btn" href="${u}" download="${esc(f.name)}" id="dlp">Download</a>`);
      const sh = s.querySelector("#shp"); if (sh) sh.onclick = async () => { try { await navigator.share({ files: [f], title: f.name }); } catch (e) { } };
    } catch (e) { toast("Couldn't make the PDF: " + e.message); } pdfb.disabled = false; pdfb.innerHTML = old; };
  const lnkb = el.querySelector("#lnkb");
  if (lnkb) lnkb.onclick = async () => { await save();
    const first = (P.client_name || "").split(" ")[0] || "there";
    const mt = "mailto:" + encodeURIComponent(P.client_email || "") + "?subject=" + encodeURIComponent("Proposal: " + (P.title || "your project") + " | DaysWon") + "&body=" + encodeURIComponent(`Hi ${first},\n\nThanks again for your time. Here's our proposal for ${P.title || "your project"}:\n${link}\n\nYou can read it on your phone, download a PDF, and accept it right on the page.\n\nAny questions, just reply here.\n\nBest,\n${BIZ.name || ME.name}\nDaysWon`);
    const s = sheet(`<h3>Client link</h3><p class="muted" style="margin:0 0 8px">A private, read-only page for ${esc(P.client_name || "the client")} with an Accept button. No login needed. Nothing is sent by the app: you send it yourself.</p>
      <input class="in" readonly value="${esc(link)}" id="lk" onclick="this.select()"><button class="btn pri" id="cpl">Copy link</button>${navigator.share ? `<button class="btn" id="shl">Share…</button>` : ""}<a class="btn" href="${esc(mt)}" id="eml">Email draft</a><a class="btn" href="${esc(link)}" target="_blank" rel="noopener">Open client page</a>
      ${P.status === "draft" ? `<div class="banner info" id="msb" style="margin-top:12px"><span>Sent it to the client?</span><button class="btn sm dark" id="mks">Mark as sent</button></div>` : ""}
      <button class="btn ghost sm" id="rsl" style="height:34px">Make a new link (old one stops working)</button>`);
    s.querySelector("#cpl").onclick = async () => { try { await navigator.clipboard.writeText(link); toast("Link copied"); } catch { s.querySelector("#lk").select(); document.execCommand("copy"); toast("Link copied"); } };
    const shl = s.querySelector("#shl"); if (shl) shl.onclick = async () => { try { await navigator.share({ title: (P.title || "Proposal") + " · DaysWon", text: "Here's our proposal for " + (P.title || "your project") + ":", url: link }); } catch { } };
    const mks = s.querySelector("#mks"); if (mks) mks.onclick = async () => { try { await api("/api/proposal/" + id, { method: "PATCH", body: { status: "sent" } }); s.remove(); toast(P.lead_id ? "Marked sent · lead moved to Proposal sent" : "Marked sent"); changed(); LEADS = null; editor(el, id, withPrev, onChange); } catch (e) { toast(e.message); } };
    s.querySelector("#rsl").onclick = async () => { if (!confirm("Make a new link? Anyone with the old link won't be able to open it.")) return; await api("/api/proposal/" + id + "/relink", { method: "POST" }); s.remove(); toast("New link made"); editor(el, id, withPrev, onChange); };
  };
}
const DEFAULT_TERMS = "Ownership. DaysWon keeps ownership of the software and systems it builds. You receive a license to use them for as long as your monthly service is active.\nYour data. You own your data, including your customer lists and everything the system finds or creates for you.\nPayment. The setup fee is paid in two parts, as shown under Investment. The monthly fee is billed monthly from launch.\nTerm. The monthly service has the minimum term shown under Investment. After that, either side can cancel with 30 days' notice.\nResults. We build, run and improve the system with care, but no specific business results are guaranteed.\nChanges. Work outside this scope is quoted separately before it starts.";

// ---------- team / settings ----------
async function teamView() {
  setNav("team"); if (LAYOUT === "phone") ptop("Leads", "#/leads");
  const m = main(); m.dataset.v = "";
  USERS = (await api("/api/users")).users; const own = owner();
  m.innerHTML = `<div class="bar"><h1>Team & account</h1></div><div class="page" style="max-width:720px">
   ${own && LAYOUT === "phone" ? `<a class="btn" href="#/settings" style="width:100%;margin-bottom:12px">${ic("gear")}Settings (payments, AI key, business details)</a>` : ""}
   <div class="box"><h3>People</h3>${USERS.map(u => `<div class="prow"><div style="display:flex;gap:10px;align-items:center"><div class="av">${esc(initials(u.name))}</div><div><b>${esc(u.name)}</b>${u.id === ME.id ? " (you)" : ""}<br><small class="muted">${esc(u.email || "")}${u.email ? " · " : ""}${u.role === "owner" ? "Owner" : "Member"}</small></div></div>
     ${own && !u.main && u.id !== ME.id ? `<div style="display:flex;gap:6px"><button class="btn sm" data-r="${u.id}">New password</button><button class="btn sm danger" data-x="${u.id}">Remove</button></div>` : ""}</div>`).join("")}</div>
   ${own ? `<div class="box"><h3>Add a person</h3><form id="tf"><div class="grid2"><div><label class="l">Name</label><input class="in" name="name" required></div><div><label class="l">Email</label><input class="in" name="email" type="email" autocapitalize="off" required></div></div>
     <label class="l">Role</label><select class="in" name="role"><option value="owner">Owner (everything)</option><option value="member" selected>Member (leads and proposals, no money)</option></select>
     <div class="err" id="te"></div><button class="btn pri" type="submit" style="margin-top:12px">Add person</button></form>
     <p class="hint">Owner: everything, including money, the team and Settings. Member: works leads and proposals; no prices, can't delete or manage the team. You'll see their password once, here, to send them yourself. Nothing is emailed.</p><div id="newpw"></div></div>` : ""}
   <div class="box"><h3>My password</h3><form id="pf"><label class="l">Current password</label><input class="in" name="current" type="password" autocomplete="current-password" required>
     <label class="l">New password (10+ characters)</label><input class="in" name="password" type="password" autocomplete="new-password" required minlength="10"><div class="err" id="pe"></div><button class="btn" type="submit" style="margin-top:10px">Change password</button></form></div>
   <div style="text-align:center;margin-top:16px"><button class="btn ghost danger" id="lo">Sign out</button></div></div>`;
  const showPw = (who, pw) => { $("#newpw").innerHTML = `<div class="banner ok" style="display:block"><b>${esc(who)}</b> can sign in at ${esc(BASEURL)}<br>Password: <b style="user-select:all;font-family:ui-monospace,monospace">${esc(pw)}</b><br><small>Copy it now. It won't be shown again.</small></div>`; };
  $("#lo").onclick = async () => { try { await api("/api/logout", { method: "POST" }); } catch { } showLogin(); };
  $("#pf").onsubmit = async e => { e.preventDefault(); try { await api("/api/me/password", { method: "POST", body: Object.fromEntries(new FormData(e.target).entries()) }); e.target.reset(); toast("Password changed"); } catch (x) { $("#pe").textContent = x.message; } };
  if (!own) return;
  $("#tf").onsubmit = async e => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target).entries()); try { const d = await api("/api/team", { method: "POST", body: b }); await teamView(); showPw(b.name, d.password); } catch (x) { $("#te").textContent = x.message; } };
  m.querySelectorAll("[data-x]").forEach(b => b.onclick = async () => { const u = USERS.find(x => x.id === b.dataset.x); if (!confirm("Remove " + u.name + "? They'll be signed out right away.")) return; await api("/api/team/" + u.id, { method: "DELETE" }); toast("Removed"); teamView(); });
  m.querySelectorAll("[data-r]").forEach(b => b.onclick = async () => { const u = USERS.find(x => x.id === b.dataset.r); if (!confirm("Make a new password for " + u.name + "?")) return; const d = await api("/api/team/" + u.id + "/reset", { method: "POST" }); showPw(u.name, d.password); });
}
async function settingsView() {
  setNav("settings"); if (LAYOUT === "phone") ptop("Account", "#/team");
  const m = main(); m.dataset.v = "";
  if (!owner()) { m.innerHTML = `<div class="soon"><h2>Settings</h2><p>Only an owner can open Settings.</p></div>`; return; }
  m.innerHTML = `<div class="loading">Loading…</div>`;
  const [d, sd] = await Promise.all([api("/api/settings"), api("/api/settings/stripe")]); const ai = d.ai, biz = d.biz, st = sd.stripe; STRIPE = st;
  m.innerHTML = `<div class="bar"><h1>Settings</h1></div><div class="page" style="max-width:720px">
   <div class="box"><h3>AI for proposals</h3><p style="margin:0 0 8px;font-size:14px">Use DaysWon's own AI account (Anthropic or OpenAI). The key is stored encrypted on the server and is never sent back to any browser.</p>
    ${ai ? `<div class="banner ok"><span>Key saved: <b>${ai.provider === "anthropic" ? "Anthropic" : "OpenAI"}</b> ${esc(ai.hint)} · model ${esc(ai.model)}<br><small>Added by ${esc(ai.set_by || "")} · ${fmtDT(ai.set_at)}</small></span><button class="btn sm" id="rmk">Remove</button></div>` : `<div class="banner info"><span>No AI key yet. "Draft with AI" stays off until you add one.</span></div>`}
    <form id="af"><div class="grid2"><div><label class="l">Provider</label><select class="in" name="provider"><option value="">Detect from key</option><option value="anthropic">Anthropic (Claude)</option><option value="openai">OpenAI (ChatGPT)</option></select></div><div><label class="l">Model (optional)</label><input class="in" name="model" placeholder="Picked automatically"></div></div>
     <label class="l">API key</label><input class="in" name="key" type="password" autocomplete="off" placeholder="${ai ? "Paste a new key to replace it" : "sk-ant-… or sk-…"}" required>
     <div class="err" id="ae"></div><button class="btn pri" type="submit" style="margin-top:12px">Save and test key</button></form>
    <p class="hint">Get a key at console.anthropic.com (API keys) or platform.openai.com (API keys). AI usage is billed by that provider to your account.</p></div>
   <div class="box" id="paybox"><h3 style="display:flex;align-items:center;gap:8px">Payments (Stripe) ${st.connected && st.mode !== "live" ? '<span class="pill tm">TEST MODE</span>' : st.connected ? '<span class="pill s-accepted">LIVE</span>' : ""}</h3>
    <p style="margin:0 0 8px;font-size:14px">Invoices, pay links and monthly billing run on your own Stripe account. The secret key is stored encrypted on the server and is never sent back to any browser.</p>
    ${st.connected ? `<div class="banner ${st.mode === "live" ? "ok" : "tmb"}"><span><b>Connected, ${st.mode === "live" ? "live mode" : "test mode"}</b> · key ending ${esc(st.last4)}${st.account ? " · " + esc(st.account) : ""}${st.mock ? " · practice key (no Stripe)" : ""}<br><small>Payment updates: ${st.webhook_secret ? (st.webhook_auto ? "set up automatically in Stripe" : "signing secret saved") : "not set up yet (use Check with Stripe on the Money page)"} · added by ${esc(st.set_by || "")} ${st.set_at ? fmtDT(st.set_at) : ""}</small></span><button class="btn sm" id="rms">Remove</button></div>`
      : `<div class="banner info"><span>Not connected. Invoices and pay links stay off until you add your Stripe key.</span></div>`}
    <form id="sf"><label class="l">Secret key</label><input class="in" name="key" type="password" autocomplete="off" placeholder="${st.connected ? "Paste a new key to replace it (e.g. sk_live_… to go live)" : "sk_test_…"}">
     <label class="l">Webhook signing secret (optional)</label><input class="in" name="webhook_secret" type="password" autocomplete="off" placeholder="whsec_… (leave empty: it's set up for you)">
     <div class="err" id="se2"></div><div class="hint" id="sn2"></div><button class="btn pri" type="submit" style="margin-top:12px">Save and test key</button></form>
    <p class="hint">Find it in Stripe: Developers → API keys → Secret key. Use the <b>test</b> key (sk_test_…) now; when your account is activated, paste the <b>live</b> key (sk_live_…) here to switch to real payments. Saving also adds the payment-updates webhook in Stripe for you. Never share your Stripe password with anyone.</p>
    <details class="hint"><summary>Set up the webhook by hand</summary>In Stripe: Developers → Webhooks → Add endpoint.<br>URL: <b style="user-select:all;word-break:break-all">${esc(st.webhook_url || "")}</b><br>Events: checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, payment_intent.payment_failed, invoice.paid, invoice.payment_failed, customer.subscription.created / updated / deleted. Then paste its signing secret above.</details></div>
   <div class="box"><h3>Business details on proposals</h3><form id="bf"><div class="grid2"><div><label class="l">Prepared by (your name)</label><input class="in" name="name" value="${esc(biz.name)}"></div><div><label class="l">Email</label><input class="in" name="email" type="email" value="${esc(biz.email)}"></div></div>
     <div class="grid2"><div><label class="l">Phone</label><input class="in" name="phone" value="${esc(biz.phone)}"></div><div><label class="l">Website</label><input class="in" name="website" value="${esc(biz.website)}" placeholder="e.g. dayswon.com"></div></div>
     <button class="btn" type="submit" style="margin-top:12px">Save details</button></form></div></div>`;
  $("#af").onsubmit = async e => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target).entries()); const btn = e.target.querySelector("button"); btn.disabled = true; btn.textContent = "Testing key…"; $("#ae").textContent = "";
    try { await api("/api/settings/ai", { method: "POST", body: b }); AIREADY = true; toast("AI key works and is saved"); settingsView(); } catch (x) { $("#ae").textContent = x.message; btn.disabled = false; btn.textContent = "Save and test key"; } };
  const rm = $("#rmk"); if (rm) rm.onclick = async () => { if (!confirm("Remove the AI key? Draft with AI turns off.")) return; await api("/api/settings/ai", { method: "DELETE" }); AIREADY = false; toast("Key removed"); settingsView(); };
  $("#sf").onsubmit = async e => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target).entries()); const btn = e.target.querySelector("button"); btn.disabled = true; btn.textContent = "Testing key…"; $("#se2").textContent = "";
    try { const r = await api("/api/settings/stripe", { method: "POST", body: b }); STRIPE = r.stripe; toast("Stripe connected · " + (r.stripe.mode === "live" ? "LIVE" : "test mode")); await settingsView(); if (r.note) { const n = $("#sn2"); if (n) n.textContent = r.note; } } catch (x) { $("#se2").textContent = x.message; btn.disabled = false; btn.textContent = "Save and test key"; } };
  const rms = $("#rms"); if (rms) rms.onclick = async () => { if (!confirm("Remove the Stripe key? New invoices and pay links stop working until you add a key again.")) return; await api("/api/settings/stripe", { method: "DELETE" }); STRIPE = null; toast("Stripe key removed"); settingsView(); };
  $("#bf").onsubmit = async e => { e.preventDefault(); try { await api("/api/settings/biz", { method: "POST", body: Object.fromEntries(new FormData(e.target).entries()) }); toast("Saved"); } catch (x) { toast(x.message); } };
}
function soon(k) {
  const S = { systems: ["sys", "Client systems", "Every system you've built for clients: last run, errors, and what needs you. Red means check in."], money: ["money", "Money", "Setup fees and monthly retainers per client, what's paid and what's due."] }[k] || ["", "Coming soon", ""];
  setNav(k); if (LAYOUT === "phone") ptop(); main().dataset.v = "";
  main().innerHTML = `<div class="soon">${ic(S[0])}<h2>${S[1]}</h2><p>${S[2]}</p><p><span class="pill">Coming soon</span></p></div>`;
}


// ---------- money (owner only) ----------
let STRIPE = null, moneyFilter = "All", moneyClient = "";
const cents = c => "$" + ((c || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: (c || 0) % 100 ? 2 : 0, maximumFractionDigits: 2 });
const IST = { unpaid: "Unpaid", overdue: "Overdue", paid: "Paid", failed: "Failed", void: "Cancelled" };
const SST = { pending: "Waiting for client", active: "Active", past_due: "Payment failed", canceled: "Stopped", paused: "Paused" };
const payLink = t => BASEURL + "pay.html#" + t;
const testBadge = () => STRIPE && STRIPE.connected && STRIPE.mode !== "live" ? `<span class="pill tm">TEST MODE</span>` : "";
const modeTag = x => x.mode !== "live" ? ` <span class="pill tm xs">TEST</span>` : "";
const cname = x => x.lead_company || x.lead_name || "No client";
const fmtYmd = s => s ? fmtF(s) : "";
async function stripeStatus() { if (STRIPE === null) { try { STRIPE = (await api("/api/settings/stripe")).stripe; } catch { STRIPE = { connected: false }; } } return STRIPE; }
function invItem(I, showClient) {
  return `<div class="mrow"><div class="mmain"><b>${esc(I.description || "Invoice")}</b>${modeTag(I)}<div class="muted">${showClient ? esc(cname(I)) + " · " : ""}${I.status === "paid" ? "Paid " + fmtD(I.paid_at) : I.status === "void" ? "Cancelled " + fmtD(I.voided_at) : "Due " + fmtYmd(I.due_date)}${I.status === "failed" && I.last_error ? " · " + esc(I.last_error) : ""}</div></div>
    <div class="mamt">${cents(I.amount_cents)}<span class="pill i-${I.status}">${IST[I.status] || esc(I.status)}</span></div>
    <div class="macts">${["unpaid", "overdue", "failed"].includes(I.status) ? `<button class="btn sm pri" data-cp="${I.id}">${ic("link")}Pay link</button><button class="btn sm ghost" data-void="${I.id}">Cancel</button>` : ""}${I.status === "void" ? `<button class="btn sm ghost danger" data-del="${I.id}">Delete</button>` : ""}</div></div>`;
}
function subItem(S, showClient) {
  return `<div class="mrow"><div class="mmain"><b>${esc(S.description || "Monthly")}</b>${modeTag(S)}<div class="muted">${showClient ? esc(cname(S)) + " · " : ""}${S.status === "active" ? (S.next_charge ? "Next charge " + fmtYmd(S.next_charge) : "Active") : S.status === "pending" ? "First charge " + fmtYmd(S.start_date) + " · client hasn't set up payment yet" : S.status === "canceled" ? "Stopped " + fmtD(S.canceled_at) : esc(S.last_error || "")}</div></div>
    <div class="mamt">${cents(S.amount_cents)}/mo<span class="pill u-${S.status}">${SST[S.status] || esc(S.status)}</span></div>
    <div class="macts">${S.status === "pending" ? `<button class="btn sm pri" data-cps="${S.id}">${ic("link")}Pay link</button>` : ""}${["pending", "active", "past_due", "paused"].includes(S.status) ? `<button class="btn sm ghost" data-stop="${S.id}">Stop</button>` : ""}${S.status === "canceled" ? `<button class="btn sm ghost danger" data-sdel="${S.id}">Delete</button>` : ""}</div></div>`;
}
function linkSheet(x, isSub) {
  const link = payLink(x.token), what = isSub ? cents(x.amount_cents) + "/month" : cents(x.amount_cents);
  const mt = "mailto:?subject=" + encodeURIComponent((x.description || "Payment") + " | DaysWon") + "&body=" + encodeURIComponent(`Hi,\n\n${isSub ? "Here's the link to set up the monthly payment (" + what + ")" : "Here's the payment link for " + (x.description || "your invoice") + " (" + what + (x.due_date ? ", due " + fmtYmd(x.due_date) : "") + ")"}:\n${link}\n\nYou can pay securely by card on that page. No login needed.\n\nThank you,\n${ME.name}\nDaysWon`);
  const s = sheet(`<h3>Pay link ${x.mode !== "live" ? '<span class="pill tm">TEST MODE</span>' : ""}</h3><p class="muted" style="margin:0 0 8px">${esc(x.description || "")} · ${what}. The client pays by card on this page, no login. Nothing is sent by the app: you send it yourself.</p>
    <input class="in" readonly value="${esc(link)}" id="lk" onclick="this.select()"><button class="btn pri" id="cpl">Copy link</button>${navigator.share ? `<button class="btn" id="shl">Share…</button>` : ""}<a class="btn" href="${esc(mt)}">Email draft</a><a class="btn" href="${esc(link)}" target="_blank" rel="noopener">Open pay page</a>`);
  s.querySelector("#cpl").onclick = async () => { try { await navigator.clipboard.writeText(link); toast("Link copied"); } catch { s.querySelector("#lk").select(); document.execCommand("copy"); toast("Link copied"); } };
  const shl = s.querySelector("#shl"); if (shl) shl.onclick = async () => { try { await navigator.share({ title: (x.description || "Payment") + " · DaysWon", url: link }); } catch { } };
}
function bindMoney(el, data, redraw) {
  const fi = id => data.invoices.find(i => i.id === id), fs = id => data.subscriptions.find(i => i.id === id);
  el.querySelectorAll("[data-cp]").forEach(b => b.onclick = () => linkSheet(fi(b.dataset.cp), false));
  el.querySelectorAll("[data-cps]").forEach(b => b.onclick = () => linkSheet(fs(b.dataset.cps), true));
  const act = async (path, method, msg) => { try { await api(path, { method }); toast(msg); redraw(); } catch (e) { toast(e.message); } };
  el.querySelectorAll("[data-void]").forEach(b => b.onclick = () => confirm("Cancel this invoice? Its pay link stops working.") && act("/api/invoices/" + b.dataset.void + "/void", "POST", "Invoice cancelled"));
  el.querySelectorAll("[data-del]").forEach(b => b.onclick = () => confirm("Delete this cancelled invoice from the list?") && act("/api/invoices/" + b.dataset.del, "DELETE", "Deleted"));
  el.querySelectorAll("[data-stop]").forEach(b => b.onclick = () => confirm("Stop monthly billing? If the client is already paying monthly, Stripe cancels it now and no more charges are made.") && act("/api/subscriptions/" + b.dataset.stop + "/cancel", "POST", "Monthly billing stopped"));
  el.querySelectorAll("[data-sdel]").forEach(b => b.onclick = () => confirm("Delete this stopped billing from the list?") && act("/api/subscriptions/" + b.dataset.sdel, "DELETE", "Deleted"));
}
function noKeyBanner() { return `<div class="banner info"><span>No Stripe key yet. Add your Stripe key in <a href="#/settings">Settings → Payments</a> to create invoices and pay links.</span></div>`; }
// Billing box on a proposal (create + list) or a lead (list)
async function billingBox(box, o) {
  if (!box) return;
  box.innerHTML = `<h3>Billing</h3><div class="muted">Loading…</div>`;
  let d; try { [d] = await Promise.all([api("/api/money?" + (o.P ? "proposal=" + o.P.id : "lead=" + o.leadId)), stripeStatus()]); STRIPE = d.stripe; } catch (e) { box.innerHTML = `<h3>Billing</h3><div class="muted">${esc(e.message)}</div>`; return; }
  const P = o.P, ready = STRIPE.connected, acc = P && P.status === "accepted";
  const setup = P ? +P.setup_price || 0 : 0, dp = P ? +P.deposit_pct || 0 : 0, dep = Math.round(setup * dp) / 100, rest = setup - dep, mon = P ? +P.monthly_fee || 0 : 0;
  const has = k => d.invoices.some(i => i.kind === k && i.status !== "void"), hasSub = d.subscriptions.some(s => s.status !== "canceled");
  let make = "";
  if (P) {
    if (!acc) make = `<div class="hint">Invoices and monthly billing open once this proposal is Accepted.</div>`;
    else if (!ready) make = noKeyBanner() + `<div class="mbtns"><button class="btn" disabled>Create deposit invoice</button><button class="btn" disabled>Start monthly billing</button></div>`;
    else make = `<div class="mbtns">${setup ? `<button class="btn ${has("deposit") ? "" : "pri"}" data-mk="deposit">${ic("plus")}Deposit invoice${dep ? " · " + money(dep) : ""}</button><button class="btn" data-mk="launch">${ic("plus")}Launch invoice${rest ? " · " + money(rest) : ""}</button>` : ""}
      ${mon ? `<button class="btn" data-mk="monthly" ${hasSub ? "disabled" : ""}>${ic("plus")}Start monthly billing · ${money(mon)}/mo</button>` : ""}<button class="btn ghost" data-mk="custom">${ic("plus")}Other invoice</button></div>`;
  }
  const list = d.invoices.map(I => invItem(I, false)).join("") + d.subscriptions.map(S => subItem(S, false)).join("");
  box.innerHTML = `<h3 style="display:flex;align-items:center;gap:8px">Billing ${testBadge()}</h3>${make}<div class="mlist">${list || `<div class="muted" style="font-size:14px">${P ? "No invoices yet." : "No invoices yet. Create them from the client's accepted proposal."}</div>`}</div>`;
  const redraw = () => billingBox(box, o);
  bindMoney(box, d, redraw);
  box.querySelectorAll("[data-mk]").forEach(b => b.onclick = () => {
    const k = b.dataset.mk, monthly = k === "monthly";
    const amt = k === "deposit" ? dep : k === "launch" ? rest : monthly ? mon : "";
    const desc = monthly ? "Monthly service · " + (P.title || "Project") : (k === "deposit" ? "Setup deposit (" + dp + "%)" : k === "launch" ? "Setup balance at launch" : "") + (k === "custom" ? "" : " · " + (P.title || "Project"));
    const firstOfNext = (() => { const t = new Date(); return ymd(new Date(t.getFullYear(), t.getMonth() + 1, 1)); })();
    const s = sheet(`<h3>${monthly ? "Start monthly billing" : k === "deposit" ? "Deposit invoice" : k === "launch" ? "Launch invoice" : "New invoice"} ${testBadge()}</h3>
      <label class="l">Description</label><input class="in" id="md" value="${esc(desc)}" placeholder="What it's for">
      <label class="l">${monthly ? "Amount per month ($)" : "Amount ($)"}</label><input class="in" id="ma" type="number" inputmode="decimal" min="1" step="0.01" value="${esc(amt)}">
      <label class="l">${monthly ? "First charge date" : "Due date"}</label><input class="in" id="mdt" type="date" min="${today()}" value="${monthly ? firstOfNext : addDays(7)}">
      <div class="hint">${monthly ? "The client opens the pay link and saves a card. Stripe then charges " + "monthly from this date. If the date is less than 2 days away, the first charge happens when they sign up." : "Marked overdue in the app after this date. The app doesn't send reminders."}</div>
      <div class="err" id="me"></div><button class="btn pri" id="mok">${monthly ? "Create monthly pay link" : "Create invoice"}</button>`);
    s.querySelector("#mok").onclick = async () => { const btn = s.querySelector("#mok"); btn.disabled = true;
      try { const body = { proposal_id: P.id, description: s.querySelector("#md").value, amount: s.querySelector("#ma").value };
        if (monthly) body.start_date = s.querySelector("#mdt").value; else { body.kind = k; body.due_date = s.querySelector("#mdt").value; }
        await api(monthly ? "/api/subscriptions" : "/api/invoices", { method: "POST", body }); s.remove(); toast(monthly ? "Monthly pay link ready" : "Invoice created"); await billingBox(box, o);
        const d2 = await api("/api/money?proposal=" + P.id); const x = monthly ? d2.subscriptions[0] : d2.invoices[0]; if (x) linkSheet(x, monthly);
      } catch (e) { s.querySelector("#me").textContent = e.message; btn.disabled = false; } };
  });
}
async function moneyView() {
  setNav("money"); if (LAYOUT === "phone") ptop(); const m = main(); m.dataset.v = "";
  if (!owner()) { m.innerHTML = `<div class="soon"><h2>Money</h2><p>Only an owner can see money.</p></div>`; return; }
  m.innerHTML = `<div class="bar"><h1>Money</h1></div><div class="loading">Loading…</div>`;
  let d; try { d = await api("/api/money"); STRIPE = d.stripe; } catch (e) { if (e.message !== "login") m.innerHTML = `<div class="loading">${esc(e.message)}</div>`; return; }
  const cur = STRIPE.connected ? STRIPE.mode : null, inMode = x => !cur || x.mode === cur;
  const INV = d.invoices.filter(inMode), SUB = d.subscriptions.filter(inMode);
  const sum = (a, f) => a.filter(f).reduce((s, x) => s + x.amount_cents, 0);
  const paid = sum(INV, i => i.status === "paid"), unpaid = sum(INV, i => ["unpaid", "failed"].includes(i.status)), overdue = sum(INV, i => i.status === "overdue"), mrr = sum(SUB, s => s.status === "active");
  const nexts = SUB.filter(s => s.status === "active" && s.next_charge).map(s => s.next_charge).sort();
  const clients = {}; for (const x of [...d.invoices, ...d.subscriptions]) { const k = x.lead_id || "none"; clients[k] = clients[k] || { id: k, name: cname(x), paid: 0, unpaid: 0, overdue: 0, mrr: 0, next: null }; }
  for (const i of INV) { const c = clients[i.lead_id || "none"]; if (i.status === "paid") c.paid += i.amount_cents; else if (i.status === "overdue") c.overdue += i.amount_cents; else if (i.status !== "void") c.unpaid += i.amount_cents; }
  for (const s of SUB) { const c = clients[s.lead_id || "none"]; if (s.status === "active") { c.mrr += s.amount_cents; if (s.next_charge && (!c.next || s.next_charge < c.next)) c.next = s.next_charge; } }
  const CL = Object.values(clients).sort((a, b) => a.name.localeCompare(b.name));
  const draw = () => {
    const fInv = d.invoices.filter(i => (moneyFilter === "All" || i.status === moneyFilter) && (!moneyClient || (i.lead_id || "none") === moneyClient));
    const fSub = d.subscriptions.filter(s => (moneyFilter === "All" || (moneyFilter === "monthly")) && (!moneyClient || (s.lead_id || "none") === moneyClient));
    const cnt = st => d.invoices.filter(i => i.status === st).length;
    const chips = [["All", "All", d.invoices.length + d.subscriptions.length], ["unpaid", "Unpaid", cnt("unpaid")], ["overdue", "Overdue", cnt("overdue")], ["paid", "Paid", cnt("paid")], ["failed", "Failed", cnt("failed")], ["void", "Cancelled", cnt("void")], ["monthly", "Monthly", d.subscriptions.length]];
    const tile = (lab, v, cls, sub) => `<div class="tile ${cls || ""}"><small>${lab}</small><b>${v}</b>${sub ? `<em>${sub}</em>` : ""}</div>`;
    m.innerHTML = `<div class="bar"><h1>Money</h1>${testBadge()}<div class="grow"></div>${STRIPE.connected ? `<button class="btn sm" id="msync">${ic("refresh")}Check with Stripe</button>` : ""}</div><div class="page mpage">
      ${STRIPE.connected ? (STRIPE.mode !== "live" ? `<div class="banner tmb"><span><b>Test mode.</b> Pay links use Stripe's practice payments (card 4242 4242 4242 4242). No real money moves. Paste a live key in Settings to go live.</span></div>` : "") : noKeyBanner()}
      <div class="tiles">${tile("Paid", cents(paid), "g")}${tile("Unpaid", cents(unpaid))}${tile("Overdue", cents(overdue), overdue ? "r" : "")}${tile("Monthly (MRR)", cents(mrr), "", SUB.filter(s => s.status === "active").length + " active")}${tile("Next charge", nexts[0] ? fmtYmd(nexts[0]) : "None", "", nexts.length ? nexts.length + " scheduled" : "")}</div>
      <div class="box"><h3>By client</h3>${CL.length ? `<table class="pt mt2"><thead><tr><th>Client</th><th>Paid</th><th>Unpaid</th><th>Overdue</th><th>Monthly</th><th>Next charge</th></tr></thead><tbody>${CL.map(c => `<tr data-c="${c.id}"><td><b>${esc(c.name)}</b></td><td data-l="Paid">${cents(c.paid)}</td><td data-l="Unpaid">${cents(c.unpaid)}</td><td data-l="Overdue" class="${c.overdue ? "red" : ""}">${cents(c.overdue)}</td><td data-l="Monthly">${c.mrr ? cents(c.mrr) + "/mo" : "—"}</td><td data-l="Next">${c.next ? fmtYmd(c.next) : "—"}</td></tr>`).join("")}</tbody></table>` : `<div class="muted" style="font-size:14px">Nothing billed yet. Open an accepted proposal and tap <b>Deposit invoice</b> or <b>Start monthly billing</b>.</div>`}</div>
      <div class="box"><h3>Invoices & monthly billing</h3>
        <div class="mfil"><div class="chips">${chips.map(c => `<button class="chip ${moneyFilter === c[0] ? "on" : ""}" data-mf="${c[0]}">${c[1]}<i>${c[2]}</i></button>`).join("")}</div>
        <select class="in" id="mcl" style="width:auto;max-width:100%"><option value="">All clients</option>${CL.map(c => `<option value="${c.id}" ${moneyClient === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>
        <div class="mlist">${moneyFilter !== "monthly" ? fInv.map(i => invItem(i, true)).join("") : ""}${fSub.map(s => subItem(s, true)).join("") || ""}${(moneyFilter !== "monthly" ? fInv.length : 0) + fSub.length ? "" : `<div class="empty">Nothing here.</div>`}</div></div></div>`;
    m.querySelectorAll("[data-mf]").forEach(b => b.onclick = () => { moneyFilter = b.dataset.mf; draw(); });
    m.querySelector("#mcl").onchange = e => { moneyClient = e.target.value; draw(); };
    m.querySelectorAll("tr[data-c]").forEach(tr => tr.onclick = () => { moneyClient = tr.dataset.c; draw(); });
    bindMoney(m, d, moneyView);
    const ms = $("#msync"); if (ms) ms.onclick = async () => { ms.disabled = true; ms.textContent = "Checking…"; try { const r = (await api("/api/money/sync", { method: "POST" })).result; toast(r.practice ? "Practice key: nothing to check" : r.changed ? r.changed + " updated from Stripe" : "Up to date with Stripe"); moneyView(); } catch (e) { toast(e.message); ms.disabled = false; } };
  };
  draw();
}
// ---------- client systems (owner + member) ----------
const SYST = { up: "Up", down: "Down", unknown: "Unknown" };
async function systemsView() {
  setNav("systems"); if (LAYOUT === "phone") ptop(); const m = main(); m.dataset.v = "";
  m.innerHTML = `<div class="bar"><h1>Client systems</h1></div><div class="loading">Loading…</div>`;
  let d; try { [d] = await Promise.all([api("/api/systems"), LEADS ? null : loadLeads()]); } catch (e) { if (e.message !== "login") m.innerHTML = `<div class="loading">${esc(e.message)}</div>`; return; }
  const SY = d.systems, own = owner();
  const dot = s => `<span class="sdot d-${s.status}"></span>`;
  const last = s => !s.last_checked ? "Never" : Date.now() - Date.parse(s.last_checked) < 60e3 ? "Just now" : ago(s.last_checked) + " ago";
  const resp = s => s.response_ms != null ? s.response_ms + " ms" : "—";
  const host = u => { try { return new URL(u).host + (new URL(u).pathname.length > 1 ? new URL(u).pathname : ""); } catch { return u || ""; } };
  const counts = { up: SY.filter(s => s.status === "up").length, down: SY.filter(s => s.status === "down").length };
  m.innerHTML = `<div class="bar"><h1>Client systems</h1><div class="grow"></div>${SY.some(s => s.url) ? `<button class="btn sm" id="ckall">${ic("refresh")}Check all</button>` : ""}${own ? `<button class="btn pri sm" id="addsys">${ic("plus")}Add system</button>` : ""}</div><div class="page">
    <p class="muted" style="margin:0 0 10px;font-size:14px">${SY.length ? `${counts.up} up · ${counts.down} down · ${SY.length - counts.up - counts.down} unknown. ` : ""}Check now pings the address from the server and records the answer and response time. Nothing is sent to anyone.</p>
    ${SY.length ? (LAYOUT === "phone" ? SY.map(s => `<div class="pc sys"><div class="row"><span class="t">${dot(s)}${esc(s.name)}</span><span class="pill y-${s.status}">${SYST[s.status] || s.status}</span></div>
        <div class="mt">${esc(cname(s))}${s.url ? " · " + esc(host(s.url)) : ""}</div><div class="mt">Checked ${last(s)} · ${resp(s)}${s.last_error ? " · " + esc(s.last_error) : ""}</div>${s.notes ? `<div class="mt">${esc(s.notes)}</div>` : ""}
        <div class="macts" style="margin-top:8px">${s.url ? `<button class="btn sm" data-ck="${s.id}">Check now</button>` : ""}${own ? `<button class="btn sm ghost" data-ed="${s.id}">Edit</button>` : ""}</div></div>`).join("")
      : `<div class="box" style="padding:0;overflow:auto"><table class="pt sy"><thead><tr><th>Status</th><th>System</th><th>Client</th><th>URL / endpoint</th><th>Last checked</th><th>Response</th><th>Notes</th><th></th></tr></thead><tbody>
        ${SY.map(s => `<tr><td><span class="pill y-${s.status}">${SYST[s.status] || s.status}</span></td><td><b>${esc(s.name)}</b></td><td>${esc(cname(s))}</td><td class="url">${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(host(s.url))}</a>` : "—"}</td>
          <td>${last(s)}${s.last_error ? `<div class="red" style="font-size:12px">${esc(s.last_error)}</div>` : ""}</td><td>${resp(s)}</td><td class="nt">${esc(s.notes || "")}</td><td style="white-space:nowrap">${s.url ? `<button class="btn sm" data-ck="${s.id}">Check now</button>` : ""}${own ? ` <button class="btn sm ghost" data-ed="${s.id}">Edit</button>` : ""}</td></tr>`).join("")}</tbody></table></div>`)
    : `<div class="empty">${ic("sys")}<br>No client systems yet.${own ? " Tap Add system to list what you've built for a client." : ""}</div>`}</div>`;
  m.querySelectorAll("[data-ck]").forEach(b => b.onclick = async () => { b.disabled = true; b.textContent = "Checking…"; try { const r = (await api("/api/systems/" + b.dataset.ck + "/check", { method: "POST" })).result; toast(r.status === "up" ? "Up · " + r.response_ms + " ms" : "Down" + (r.error ? " · " + r.error : "")); systemsView(); } catch (e) { toast(e.message); b.disabled = false; b.textContent = "Check now"; } });
  const ca = $("#ckall"); if (ca) ca.onclick = async () => { ca.disabled = true; ca.textContent = "Checking…"; try { await api("/api/systems/check-all", { method: "POST" }); toast("All checked"); } catch (e) { toast(e.message); } systemsView(); };
  const form = s => {
    const won = (LEADS || []).filter(L => L.status === "Won"), other = (LEADS || []).filter(L => L.status !== "Won");
    const opt = L => `<option value="${L.id}" ${s && s.lead_id === L.id ? "selected" : ""}>${esc(L.company ? L.company + " · " + L.name : L.name)}</option>`;
    const sh = sheet(`<h3>${s ? "Edit system" : "Add system"}</h3><label class="l">System name</label><input class="in" id="sn" value="${esc(s ? s.name : "")}" placeholder="e.g. Refi Radar">
      <label class="l">Client</label><select class="in" id="sl"><option value="">No client</option>${won.length ? `<optgroup label="Won clients">${won.map(opt).join("")}</optgroup>` : ""}${other.length ? `<optgroup label="Other leads">${other.map(opt).join("")}</optgroup>` : ""}</select>
      <label class="l">URL / endpoint to check</label><input class="in" id="su" type="url" inputmode="url" autocapitalize="off" value="${esc(s ? s.url || "" : "")}" placeholder="https://…">
      <label class="l">Notes</label><textarea class="in" id="sno" rows="3" placeholder="Where it runs, logins live in…, what to watch">${esc(s ? s.notes || "" : "")}</textarea>
      <div class="err" id="se"></div><button class="btn pri" id="sok">${s ? "Save" : "Add system"}</button>${s ? `<button class="btn ghost danger" id="sdel">Delete system</button>` : ""}`);
    sh.querySelector("#sok").onclick = async () => { const body = { name: sh.querySelector("#sn").value, lead_id: sh.querySelector("#sl").value || null, url: sh.querySelector("#su").value.trim(), notes: sh.querySelector("#sno").value };
      try { await api(s ? "/api/systems/" + s.id : "/api/systems", { method: s ? "PATCH" : "POST", body }); sh.remove(); toast(s ? "Saved" : "System added"); systemsView(); } catch (e) { sh.querySelector("#se").textContent = e.message; } };
    const del = sh.querySelector("#sdel"); if (del) del.onclick = async () => { if (!confirm("Delete " + s.name + "?")) return; await api("/api/systems/" + s.id, { method: "DELETE" }); sh.remove(); toast("Deleted"); systemsView(); };
  };
  const ad = $("#addsys"); if (ad) ad.onclick = () => form(null);
  m.querySelectorAll("[data-ed]").forEach(b => b.onclick = () => form(SY.find(s => s.id === b.dataset.ed)));
}

// ---------- router ----------
async function route() {
  if (!ME) { if (!SESS) return showLogin(); try { await loadMe(); } catch (e) { return; } LAYOUT = null; }
  if (!$("#main") || LAYOUT !== layoutOf()) shell();
  const h = location.hash || "#/leads"; let m;
  document.querySelectorAll(".sheet-bg").forEach(x => x.remove());
  if (LAYOUT !== "desk" || !/^#\/(lead|edit|add)/.test(h)) window.scrollTo(0, 0);
  try {
    if ((m = h.match(/^#\/lead\/([a-f0-9]{24})$/))) return await leadsView(m[1], "lead");
    if ((m = h.match(/^#\/edit\/([a-f0-9]{24})$/))) return await leadsView(m[1], "edit");
    if (h === "#/add") return await leadsView(null, "add");
    if ((m = h.match(/^#\/proposal\/([a-f0-9]{24})$/))) return await proposalsView(m[1]);
    if (h === "#/proposals") return await proposalsView(null);
    if (h === "#/systems" || h === "#/soon/systems") return await systemsView();
    if (h === "#/money" || h === "#/soon/money") return await moneyView();
    if (h === "#/team") return await teamView();
    if (h === "#/settings") return await settingsView();
    return await leadsView(null, null);
  } catch (e) { if (e.message !== "login") toast(e.message); }
}
let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if (ME && LAYOUT && LAYOUT !== layoutOf()) { LAYOUT = null; route(); } }, 200); });
addEventListener("hashchange", route);
route();
})();
