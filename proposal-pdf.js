/* DaysWon proposal PDF builder (runs in the browser) */
(function () {
  const NAVY = [11, 21, 48], ACC = [79, 107, 255], ACCL = [157, 176, 255], INK = [31, 42, 68], MUT = [96, 108, 138], LINE = [221, 227, 238], SOFT = [244, 246, 251], GREEN = [18, 122, 59];
  const usd = n => "$" + Number(n || 0).toLocaleString("en-US");
  const fmtLong = ymd => { if (!ymd) return ""; const [y, m, d] = ymd.slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); };
  const lines = t => String(t || "").split(/\n/).map(s => s.trim()).filter(Boolean);
  const pairs = t => lines(t).map(l => { const i = l.indexOf(":"); return i > 0 && i < 60 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : ["", l]; });
  const REPL = { "→": "->", "←": "<-", "≈": "~", "≥": ">=", "≤": "<=", "✓": "", "✔": "", "\u00a0": " ", "\u2009": " ", "\u202f": " ", "−": "-", "★": "*" };

  async function build(P, biz) {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const doc = await PDFDocument.create();
    doc.setTitle((P.title || "Proposal") + " · Proposal for " + (P.company || P.client_name || "client"));
    doc.setAuthor("DaysWon"); doc.setCreator("DaysWon"); doc.setProducer("DaysWon");
    const F = { r: await doc.embedFont(StandardFonts.Helvetica), b: await doc.embedFont(StandardFonts.HelveticaBold), i: await doc.embedFont(StandardFonts.HelveticaOblique) };
    const okc = {};
    const san = s => [...String(s ?? "")].map(ch => { if (REPL[ch] !== undefined) return REPL[ch]; if (okc[ch] === undefined) { try { F.r.encodeText(ch); okc[ch] = true; } catch { okc[ch] = false; } } return okc[ch] ? ch : "?"; }).join("");
    const C = a => rgb(a[0] / 255, a[1] / 255, a[2] / 255);
    const W = 612, Hh = 792, M = 54, CW = W - 2 * M, BOT = 64;
    let page, y; const pages = [];
    const newPage = () => { page = doc.addPage([W, Hh]); pages.push(page); y = Hh - M; };
    const tw = (t, f, s) => f.widthOfTextAtSize(t, s);
    const text = (t, x, yy, f, s, col) => page.drawText(san(t), { x, y: yy, font: f, size: s, color: C(col) });
    const wrap = (t, f, s, w) => { const out = []; for (const para of san(t).split("\n")) { let cur = ""; for (const word of para.split(/\s+/).filter(Boolean)) { const nx = cur ? cur + " " + word : word; if (tw(nx, f, s) <= w || !cur) cur = nx; else { out.push(cur); cur = word; } } out.push(cur); } return out; };
    // rich wrap: segments [{t,f}]
    const wrapRich = (segs, s, w) => { const words = []; segs.forEach(sg => san(sg.t).split(/\s+/).filter(Boolean).forEach(x => words.push({ t: x, f: sg.f }))); const out = []; let cur = [], cw = 0; const sp = tw(" ", F.r, s);
      for (const wd of words) { const ww = tw(wd.t, wd.f, s); if (cur.length && cw + sp + ww > w) { out.push(cur); cur = []; cw = 0; } cw += (cur.length ? sp : 0) + ww; cur.push(wd); } if (cur.length) out.push(cur); return out; };
    const drawRich = (ln, x, yy, s, col) => { let xx = x; const sp = tw(" ", F.r, s); for (const wd of ln) { page.drawText(wd.t, { x: xx, y: yy, font: wd.f, size: s, color: C(col) }); xx += tw(wd.t, wd.f, s) + sp; } };
    const ensure = h => { if (y - h < BOT) newPage(); };
    const BS = 11, LH = 16;
    const para = (t, opt = {}) => { const f = opt.f || F.r, s = opt.s || BS, lh = opt.lh || LH, x = M + (opt.ind || 0); const ls = wrap(t, f, s, CW - (opt.ind || 0)); for (const l of ls) { ensure(lh); text(l, x, y - s, f, s, opt.col || INK); y -= lh; } y -= opt.after ?? 6; };
    const bullet = (t, ind = 0) => { const ls = wrap(t, F.r, BS, CW - 16 - ind); ensure(LH); page.drawCircle({ x: M + ind + 4, y: y - BS + 3.6, size: 2.3, color: C(ACC) }); ls.forEach((l, i) => { if (i) ensure(LH); text(l, M + ind + 16, y - BS, F.r, BS, INK); y -= LH; }); y -= 3; };
    const heading = t => { ensure(60); y -= 14; page.drawRectangle({ x: M, y: y - 17, width: 4, height: 18, color: C(ACC) }); text(t, M + 13, y - 15, F.b, 15.5, NAVY); y -= 30; };
    const body = (t, terms) => { let inList = false; for (const l of lines(t)) {
      if (/^[-•*]\s+/.test(l)) { bullet(l.replace(/^[-•*]\s+/, "")); inList = true; continue; }
      if (inList) { y -= 4; inList = false; }
      const m = terms && l.match(/^([A-Z][^.:]{1,40}[.:])\s+(.*)$/);
      if (m) { const ls = wrapRich([{ t: m[1], f: F.b }, { t: m[2], f: F.r }], BS, CW); for (const ln of ls) { ensure(LH); drawRich(ln, M, y - BS, BS, INK); y -= LH; } y -= 7; continue; }
      if (/:$/.test(l) && l.length < 60) { ensure(LH + 24); y -= 2; para(l.replace(/:$/, ""), { f: F.b, after: 3 }); continue; }
      para(l, { after: 8 }); } };

    // ---- cover band ----
    newPage();
    const bandH = 300;
    page.drawRectangle({ x: 0, y: Hh - bandH, width: W, height: bandH, color: C(NAVY) });
    page.drawRectangle({ x: 0, y: Hh - bandH, width: W, height: 4, color: C(ACC) });
    text("Days", M, Hh - 62, F.b, 21, [255, 255, 255]); text("Won", M + tw("Days", F.b, 21), Hh - 62, F.b, 21, ACCL);
    const kl = "PROPOSAL"; let kx = W - M - (tw(kl, F.b, 9.5) + 2.4 * (kl.length - 1)); for (const ch of kl) { text(ch, kx, Hh - 58, F.b, 9.5, ACCL); kx += tw(ch, F.b, 9.5) + 2.4; }
    let ty = Hh - 120; const tls = wrap(P.title || "Proposal", F.b, 32, CW); tls.slice(0, 2).forEach(l => { text(l, M, ty, F.b, 32, [255, 255, 255]); ty -= 38; });
    ty += 8; wrap(P.summary || "", F.r, 12.5, CW - 30).slice(0, 4).forEach(l => { text(l, M, ty - 8, F.r, 12.5, [201, 210, 238]); ty -= 18; });
    const meta = [["PREPARED FOR", [P.client_name, P.company].filter(Boolean).join(", ") || "-"], ["PREPARED BY", (biz.name || "DaysWon") + ", DaysWon"], ["DATE", fmtLong(P.sent_at || new Date().toISOString())], ["VALID UNTIL", P.valid_until ? fmtLong(P.valid_until) : "-"]];
    const colW = CW / 4; meta.forEach(([k, v], i) => { const x = M + i * colW; text(k, x, Hh - bandH + 46, F.b, 7.5, [142, 156, 199]); wrap(v, F.r, 9.5, colW - 10).slice(0, 2).forEach((l, j) => text(l, x, Hh - bandH + 32 - j * 12, F.r, 9.5, [255, 255, 255])); });
    y = Hh - bandH - 26;
    // at a glance
    const glance = [];
    if (P.setup_price) glance.push([usd(P.setup_price), "one-time setup"]);
    if (P.monthly_fee) glance.push([usd(P.monthly_fee) + "/mo", "monthly service"]);
    if (P.min_months) glance.push([P.min_months + " months", "minimum term"]);
    if (glance.length) { const g = 12, bw = (CW - g * (glance.length - 1)) / glance.length; glance.forEach(([v, l], i) => { const x = M + i * (bw + g); page.drawRectangle({ x, y: y - 62, width: bw, height: 62, color: C(SOFT), borderColor: C(LINE), borderWidth: 0.8 }); text(v, x + 14, y - 30, F.b, 18, NAVY); text(l, x + 14, y - 48, F.r, 9.5, MUT); }); y -= 82; }
    if (P.needs) { para("What you need", { f: F.b, s: 9, col: ACC, after: 0, lh: 13 }); para(P.needs, { s: 12, lh: 17, col: NAVY, after: 6 }); }

    if (P.problem) { heading("The problem"); body(P.problem); }
    if (P.solution) { heading("Our solution"); body(P.solution); }
    const st = pairs(P.steps);
    if (st.length) { heading("How it works"); st.forEach(([a, b], i) => {
      const ls = wrap(b, F.r, BS, CW - 34); const h = (a ? LH : 0) + ls.length * LH + 8; ensure(Math.min(h, 3 * LH + 8));
      page.drawCircle({ x: M + 10, y: y - 10, size: 10, color: C(ACC) }); const n = String(i + 1); text(n, M + 10 - tw(n, F.b, 10) / 2, y - 13.5, F.b, 10, [255, 255, 255]);
      if (a) { text(a, M + 30, y - BS - 1, F.b, BS + 0.5, NAVY); y -= LH + 1; }
      ls.forEach(l => { ensure(LH); text(l, M + 30, y - BS, F.r, BS, INK); y -= LH; }); y -= 8; }); }
    const tl = pairs(P.timeline);
    if (tl.length) { heading("Timeline"); tl.forEach(([a, b], i) => { const ls = wrap(b, F.r, BS, CW - 120); ensure(ls.length * LH + 12); if (i) page.drawLine({ start: { x: M, y: y + 4 }, end: { x: M + CW, y: y + 4 }, thickness: 0.7, color: C(LINE) });
      text(a, M, y - BS - 4, F.b, BS, NAVY); ls.forEach((l, j) => text(l, M + 120, y - BS - 4 - j * LH, F.r, BS, INK)); y -= ls.length * LH + 12; }); }
    const nd = lines(P.client_needs).map(l => l.replace(/^[-•*]\s+/, ""));
    if (nd.length) { heading("What we need from you"); nd.forEach(l => bullet(l)); }
    if (P.setup_price || P.monthly_fee) {
      heading("Investment");
      const rows = [];
      if (P.setup_price) { const d = P.deposit_pct || 0, dep = Math.round(P.setup_price * d / 100); rows.push(["One-time setup", d && d < 100 ? usd(dep) + " (" + d + "%) to start, " + usd(P.setup_price - dep) + " at launch" : "Paid in full to start", usd(P.setup_price)]); }
      if (P.monthly_fee) rows.push(["Monthly service", (P.min_months ? P.min_months + "-month minimum, then cancel anytime with 30 days' notice" : "Cancel anytime with 30 days' notice"), usd(P.monthly_fee) + " / month"]);
      ensure(rows.length * 46 + 30);
      page.drawRectangle({ x: M, y: y - 24, width: CW, height: 24, color: C(NAVY) });
      text("ITEM", M + 12, y - 16, F.b, 8.5, [255, 255, 255]); text("PRICE", M + CW - 12 - tw("PRICE", F.b, 8.5), y - 16, F.b, 8.5, [255, 255, 255]); y -= 24;
      rows.forEach(([a, b, c]) => { const ls = wrap(b, F.r, 9.5, CW - 190); const h = 22 + ls.length * 13 + 8; page.drawRectangle({ x: M, y: y - h, width: CW, height: h, color: C([255, 255, 255]), borderColor: C(LINE), borderWidth: 0.8 });
        text(a, M + 12, y - 18, F.b, 11.5, NAVY); ls.forEach((l, j) => text(l, M + 12, y - 33 - j * 13, F.r, 9.5, MUT)); text(c, M + CW - 12 - tw(c, F.b, 13), y - 19, F.b, 13, NAVY); y -= h; });
      y -= 12;
      if (P.setup_price && P.deposit_pct && P.deposit_pct < 100) { ensure(LH); const t = "Due to start: " + usd(Math.round(P.setup_price * P.deposit_pct / 100)); text(t, M + CW - tw(t, F.b, 11), y - 11, F.b, 11, ACC); y -= LH + 6; }
      if (P.price_notes) para(P.price_notes, { s: 9.5, lh: 14, col: MUT });
    }
    if (P.terms) { heading("Terms"); body(P.terms, true); }
    // acceptance block (kept together)
    if (y - 230 < BOT) newPage();
    heading("Acceptance");
    para("By signing below, the client accepts this proposal and its terms." + (P.valid_until ? " This proposal is valid until " + fmtLong(P.valid_until) + "." : ""), { after: 10 });
    if (P.status === "accepted" && P.accepted_name) {
      const t = "Accepted online by " + P.accepted_name + (P.accepted_company ? ", " + P.accepted_company : "") + " on " + new Date(P.accepted_at || Date.now()).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) + ".";
      page.drawRectangle({ x: M, y: y - 34, width: CW, height: 34, color: C([227, 247, 234]) }); text(t, M + 12, y - 21, F.b, 10.5, GREEN); y -= 48;
    }
    const half = (CW - 30) / 2;
    const col = (x, title, fields) => { let yy = y; text(title, x, yy - 10, F.b, 11, NAVY); yy -= 22; fields.forEach(([lab, val]) => { yy -= 26; if (val) text(val, x, yy + 5, F.r, 10.5, INK); page.drawLine({ start: { x, y: yy }, end: { x: x + half, y: yy }, thickness: 0.8, color: C(MUT) }); text(lab, x, yy - 11, F.b, 7.5, MUT); yy -= 12; }); return yy; };
    const acc = P.status === "accepted";
    const y1 = col(M, "Client", [["NAME", acc ? P.accepted_name : P.client_name], ["COMPANY", acc ? P.accepted_company || P.company : P.company], ["SIGNATURE", ""], ["DATE", acc && P.accepted_at ? new Date(P.accepted_at).toLocaleDateString("en-US") : ""]]);
    const y2 = col(M + half + 30, "DaysWon", [["NAME", (biz.name || "") + ", DaysWon"], ["SIGNATURE", ""], ["DATE", ""]]);
    y = Math.min(y1, y2) - 16;
    const contact = ["Questions? " + (biz.name || "") + ", DaysWon", biz.email, biz.phone, biz.website].filter(Boolean).join("  ·  ");
    ensure(20); text(contact, M, y - 10, F.r, 9.5, MUT); y -= 20;
    // footers
    const foot = "DaysWon  ·  " + (P.title || "Proposal") + (P.company ? "  ·  Prepared for " + P.company : "");
    pages.forEach((pg, i) => { page = pg; if (i) { /* thin top rule */ pg.drawRectangle({ x: 0, y: Hh - 6, width: W, height: 6, color: C(NAVY) }); }
      pg.drawLine({ start: { x: M, y: 42 }, end: { x: W - M, y: 42 }, thickness: 0.6, color: C(LINE) });
      const ft = san(foot).slice(0, 95); pg.drawText(ft, { x: M, y: 28, size: 8.5, font: F.r, color: C(MUT) });
      const pn = "Page " + (i + 1) + " of " + pages.length; pg.drawText(pn, { x: W - M - tw(pn, F.r, 8.5), y: 28, size: 8.5, font: F.r, color: C(MUT) }); });
    return await doc.save();
  }
  function fname(P) { return ("DaysWon Proposal - " + [P.company || P.client_name, P.title].filter(Boolean).join(" - ")).replace(/[\\/:*?"<>|]+/g, " ").slice(0, 100) + ".pdf"; }
  async function file(P, biz) { const bytes = await build(P, biz); return new File([bytes], fname(P), { type: "application/pdf" }); }
  async function share(P, biz, tryShare) {
    const f = await file(P, biz);
    if (tryShare && navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], title: f.name }); return "shared"; } catch (e) { if (e.name === "AbortError") return "cancelled"; } }
    const u = URL.createObjectURL(f); const a = document.createElement("a"); a.href = u; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000); return "downloaded";
  }
  window.DWPdf = { build, file, share, fname };
})();
