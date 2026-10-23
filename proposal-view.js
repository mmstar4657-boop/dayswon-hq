/* DaysWon proposal HTML view (shared by the app preview and the client page) */
(function () {
  const H = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const usd = n => "$" + Number(n || 0).toLocaleString("en-US");
  const fmtLong = ymd => { if (!ymd) return ""; const [y, m, d] = String(ymd).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); };
  const lines = t => String(t || "").split(/\n/).map(s => s.trim()).filter(Boolean);
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  const pairs = t => lines(t).map(l => { const i = l.indexOf(":"); return i > 0 && i < 60 ? [l.slice(0, i).trim(), cap(l.slice(i + 1).trim())] : ["", l]; });
  function text(t, terms) { let out = "", ul = false;
    for (const l of lines(t)) {
      if (/^[-•*]\s+/.test(l)) { if (!ul) { out += "<ul>"; ul = true; } out += "<li>" + H(l.replace(/^[-•*]\s+/, "")) + "</li>"; continue; }
      if (ul) { out += "</ul>"; ul = false; }
      const m = terms && l.match(/^([A-Z][^.:]{1,40}[.:])\s+(.*)$/);
      if (m) out += "<p><b>" + H(m[1]) + "</b> " + H(m[2]) + "</p>"; else if (/:$/.test(l) && l.length < 60) out += "<h4>" + H(l.replace(/:$/, "")) + "</h4>"; else out += "<p>" + H(l) + "</p>";
    } return out + (ul ? "</ul>" : ""); }
  function payLine(P) { if (!P.setup_price) return ""; const d = P.deposit_pct || 0, dep = Math.round(P.setup_price * d / 100); return d && d < 100 ? usd(dep) + " (" + d + "%) to start, " + usd(P.setup_price - dep) + " at launch" : "Paid in full to start"; }
  function html(P, biz, opt = {}) {
    biz = biz || {};
    const sec = (h, inner) => inner ? `<section class="pv-sec"><h2>${H(h)}</h2>${inner}</section>` : "";
    const steps = pairs(P.steps).map(([a, b], i) => `<div class="pv-step"><span>${i + 1}</span><div>${a ? "<b>" + H(a) + "</b>" : ""}<div>${H(b)}</div></div></div>`).join("");
    const tl = pairs(P.timeline).map(([a, b]) => `<tr><th>${H(a)}</th><td>${H(b)}</td></tr>`).join("");
    const needs = lines(P.client_needs).map(x => `<li>${H(x.replace(/^[-•*]\s+/, ""))}</li>`).join("");
    const hasPrice = P.setup_price || P.monthly_fee;
    const price = hasPrice ? `<table class="pv-price">${P.setup_price ? `<tr><th>One-time setup<small>${H(payLine(P))}</small></th><td>${usd(P.setup_price)}</td></tr>` : ""}${P.monthly_fee ? `<tr><th>Monthly service<small>${P.min_months ? H(P.min_months + "-month minimum, then cancel anytime with 30 days' notice") : "Cancel anytime with 30 days' notice"}</small></th><td>${usd(P.monthly_fee)}<small>per month</small></td></tr>` : ""}</table>${P.price_notes ? "<p class='pv-mut'>" + H(P.price_notes) + "</p>" : ""}` : "";
    const glance = [P.setup_price ? [usd(P.setup_price), "one-time setup"] : null, P.monthly_fee ? [usd(P.monthly_fee) + "/mo", "monthly service"] : null, P.min_months && hasPrice ? [P.min_months + " months", "minimum term"] : null].filter(Boolean);
    return `<div class="pv">
      <div class="pv-hero"><div class="pv-top"><div class="pv-logo">Days<i>Won</i></div><div class="pv-k">PROPOSAL</div></div>
        <h1>${H(P.title || "Untitled proposal")}</h1>${P.summary ? `<p class="pv-sum">${H(P.summary)}</p>` : ""}
        <div class="pv-meta"><div><small>Prepared for</small>${H([P.client_name, P.company].filter(Boolean).join(", ") || "—")}</div><div><small>Prepared by</small>${H((biz.name || "") + ", DaysWon")}</div>${P.valid_until ? `<div><small>Valid until</small>${H(fmtLong(P.valid_until))}</div>` : ""}</div></div>
      ${glance.length ? `<div class="pv-glance">${glance.map(([v, l]) => `<div><b>${H(v)}</b><span>${H(l)}</span></div>`).join("")}</div>` : ""}
      ${P.needs ? `<div class="pv-needs"><small>What you need</small>${H(P.needs)}</div>` : ""}
      ${sec("The problem", text(P.problem))}${sec("Our solution", text(P.solution))}${sec("How it works", steps)}
      ${sec("Timeline", tl ? "<table class='pv-tl'>" + tl + "</table>" : "")}${sec("What we need from you", needs ? "<ul>" + needs + "</ul>" : "")}
      ${sec("Investment", price)}${sec("Terms", text(P.terms, true))}
      ${opt.accept ? `<section class="pv-sec" id="accept"><h2>Acceptance</h2>${opt.accept}</section>` : ""}
      <div class="pv-foot">${H(["Questions? " + (biz.name || "") + ", DaysWon", biz.email, biz.phone, biz.website].filter(Boolean).join("  ·  "))}</div></div>`;
  }
  window.DWView = { html, H, usd, fmtLong };
})();
