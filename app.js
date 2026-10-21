"use strict";
(function () {
  var D = window.DATA;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]; }); };
  var fmt = function (n, d) { return n.toFixed(d == null ? 2 : d).replace(".", ","); };
  var SHORT = ["Покрытие", "Зрелость", "Открытость", "Интегр.", "Данные"];
  var state = { w: D.crit.map(function (c) { return c.w; }), thr: { take: D.thr.take, idea: D.thr.idea }, sort: { k: "total", d: -1 }, cat: "", q: "", open: {}, all: false };

  function total(c) {
    var sw = state.w.reduce(function (a, b) { return a + b; }, 0);
    if (!sw) return 0;
    return Math.round(c.s.reduce(function (a, s, i) { return a + s * state.w[i]; }, 0) / sw * 100) / 100;
  }
  function verdict(t) {
    if (t >= state.thr.take) return ["Брать", "ok"];
    if (t >= state.thr.idea) return ["Рассмотреть / взять идею", "mid"];
    return ["Только как референс", "low"];
  }
  function enrich() {
    var rows = D.comps.map(function (c) { var r = Object.assign({}, c); r.t = total(c); return r; });
    rows.forEach(function (r) { r.rk = rows.filter(function (o) { return o.c === r.c && o.t > r.t; }).length + 1; r.v = verdict(r.t); });
    return rows;
  }
  var cats = []; D.comps.forEach(function (c) { if (cats.indexOf(c.c) < 0) cats.push(c.c); });

  /* ---------- builds ---------- */
  var SYM = function (v) { return v === 1 ? '<span class="cell c1" title="есть">●</span>' : v === 0.5 ? '<span class="cell c05" title="частично">½</span>' : '<span class="cell c0" title="нет">○</span>'; };
  $("#bth").innerHTML = "<th scope='col'>Решение</th>" + D.funcs.map(function (f) { return '<th scope="col" style="white-space:normal;min-width:70px">' + esc(f) + "</th>"; }).join("") + "<th scope='col'>Покрытие</th>";
  (function () {
    var rows = D.builds.map(function (b) { var o = Object.assign({}, b); o.cov = b.v.reduce(function (a, x) { return a + x; }, 0) / b.v.length; return o; }).sort(function (a, b) { return b.cov - a.cov; });
    $("#bt tbody").innerHTML = rows.map(function (b) {
      return '<tr><td title="' + esc(b.note) + '">' + esc(b.n) + "</td>" + b.v.map(function (v) { return '<td style="text-align:center">' + SYM(v) + "</td>"; }).join("") +
        '<td><div class="tot"><span>' + Math.round(b.cov * 100) + '%</span><span class="bar" aria-hidden="true"><i style="width:' + b.cov * 100 + '%"></i></span></div></td></tr>';
    }).join("") + '<tr class="goal"><td>Цель кейса</td>' + D.funcs.map(function () { return '<td style="text-align:center">' + SYM(1) + "</td>"; }).join("") + "<td>100%</td></tr>";
  })();

  /* ---------- compare ---------- */
  function buildWeights() {
    $("#wgrid").innerHTML = D.crit.map(function (c, i) {
      return '<div class="wi"><label for="w' + i + '" title="' + esc(c.desc) + '"><span>' + esc(c.name) + '</span><output id="wo' + i + '">' + Math.round(state.w[i] * 100) + '%</output></label><input type="range" id="w' + i + '" min="0" max="1" step="0.05" value="' + state.w[i] + '"></div>';
    }).join("");
    D.crit.forEach(function (c, i) {
      $("#w" + i).addEventListener("input", function (e) { state.w[i] = +e.target.value; $("#wo" + i).textContent = Math.round(state.w[i] * 100) + "%"; render(); });
    });
    $("#thrTake").value = state.thr.take; $("#thrIdea").value = state.thr.idea;
  }
  $("#thrTake").addEventListener("input", function (e) { state.thr.take = +e.target.value; render(); });
  $("#thrIdea").addEventListener("input", function (e) { state.thr.idea = +e.target.value; render(); });
  $("#resetW").addEventListener("click", function () { state.w = D.crit.map(function (c) { return c.w; }); state.thr = { take: D.thr.take, idea: D.thr.idea }; buildWeights(); render(); });
  $("#catSel").innerHTML = '<option value="">Все категории</option>' + cats.map(function (c) { return "<option>" + esc(c) + "</option>"; }).join("");
  $("#catSel").addEventListener("change", function (e) { state.cat = e.target.value; render(); });
  $("#q").addEventListener("input", function (e) { state.q = e.target.value.trim().toLowerCase(); render(); });
  $("#rankAll").addEventListener("click", function () { state.all = !state.all; render(); });

  var COLS = [["n", "Компонент"], ["c", "Категория"]].concat(SHORT.map(function (s, i) { return ["s" + i, s]; }), [["total", "Итог"], ["rk", "В категории"], ["v", "Вердикт"], ["l", "Лицензия"]]);
  $("#cth").innerHTML = COLS.map(function (c) { return '<th scope="col" data-k="' + c[0] + '"><button type="button">' + c[1] + "</button></th>"; }).join("");
  $("#cth").addEventListener("click", function (e) {
    var th = e.target.closest("th"); if (!th) return;
    var k = th.dataset.k;
    state.sort = state.sort.k === k ? { k: k, d: -state.sort.d } : { k: k, d: ["n", "c", "v", "l"].indexOf(k) >= 0 ? 1 : -1 };
    render();
  });
  function sortVal(r, k) {
    if (k === "total") return r.t; if (k === "rk") return r.rk; if (k === "v") return r.v[0];
    if (k.charAt(0) === "s" && k.length === 2) return r.s[+k.charAt(1)];
    return String(r[k]).toLowerCase();
  }

  function renderCats(rows) {
    var avgs = cats.map(function (c) { var rs = rows.filter(function (r) { return r.c === c; }); return rs.reduce(function (a, r) { return a + r.t; }, 0) / rs.length; });
    var minAvg = Math.min.apply(null, avgs);
    $("#cats").innerHTML = cats.map(function (c, i) {
      var rs = rows.filter(function (r) { return r.c === c; });
      var best = rs.reduce(function (b, r) { return r.t > b.t ? r : b; }, rs[0]);
      return '<div class="cat-card' + (avgs[i] === minAvg ? " weak" : "") + '"><h4>' + esc(c) + '</h4><div class="avg">' + fmt(avgs[i]) + ' <small>средний, ' + rs.length + ' шт.</small></div><div class="best">Лучший: <b>' + esc(best.n) + "</b> · " + fmt(best.t) + '</div><div class="lowbar"><i style="width:' + avgs[i] / 5 * 100 + '%"></i></div></div>';
    }).join("");
    // panel meta in wiki
    $$(".pmeta").forEach(function (m) {
      var cat = CATMAP[m.dataset.slug]; if (!cat) return;
      var rs = rows.filter(function (r) { return r.c === cat; });
      var best = rs.reduce(function (b, r) { return r.t > b.t ? r : b; }, rs[0]);
      var avg = rs.reduce(function (a, r) { return a + r.t; }, 0) / rs.length;
      m.innerHTML = '<span class="chip">Компонентов: <b>' + rs.length + '</b></span><span class="chip">Средний итог: <b>' + fmt(avg) + '</b></span><span class="chip">Лучший: <b>' + esc(best.n) + "</b> · " + fmt(best.t) + "</span>";
    });
  }
  function renderRank(rows) {
    var list = rows.slice().sort(function (a, b) { return b.t - a.t || a.n.localeCompare(b.n); });
    var shown = state.all ? list : list.slice(0, 12);
    $("#rank").innerHTML = shown.map(function (r) {
      return '<div class="rrow" title="' + esc(r.c) + '"><div class="rn">' + esc(r.n) + '</div><div class="rb"><i class="i-' + r.v[1] + '" style="width:' + r.t / 5 * 100 + '%"></i></div><div class="rval">' + fmt(r.t) + "</div></div>";
    }).join("");
    $("#rankAll").textContent = state.all ? "Показать только топ-12" : "Показать все " + list.length;
  }
  function renderTable(rows) {
    var k = state.sort.k, d = state.sort.d;
    var list = rows.filter(function (r) { return (!state.cat || r.c === state.cat) && (!state.q || (r.n + " " + r.l + " " + r.c).toLowerCase().indexOf(state.q) >= 0); });
    list.sort(function (a, b) { var x = sortVal(a, k), y = sortVal(b, k); return (x > y ? 1 : x < y ? -1 : 0) * d || b.t - a.t; });
    $$("#cth th").forEach(function (th) { th.setAttribute("aria-sort", th.dataset.k === k ? (d > 0 ? "ascending" : "descending") : "none"); });
    var html = list.map(function (r) {
      var idx = D.comps.findIndex(function (c) { return c.n === r.n; }), id = "d" + idx, open = !!state.open[r.n];
      return '<tr><td><button type="button" class="name" aria-expanded="' + open + '" aria-controls="' + id + '" data-n="' + esc(r.n) + '">' + esc(r.n) + "</button></td>" +
        '<td class="cat">' + esc(r.c) + "</td>" + r.s.map(function (s) { return '<td><span class="sc sc' + s + '">' + s + "</span></td>"; }).join("") +
        '<td><div class="tot"><span>' + fmt(r.t) + '</span><span class="bar" aria-hidden="true"><i style="width:' + r.t / 5 * 100 + '%"></i></span></div></td><td>' + r.rk + '</td><td><span class="pill ' + r.v[1] + '">' + r.v[0] + '</span></td><td class="lic">' + esc(r.l) + "</td></tr>" +
        '<tr class="det" id="' + id + '"' + (open ? "" : " hidden") + '><td colspan="' + COLS.length + '">' + esc(r.y) + ' <a href="' + esc(r.u) + '" target="_blank" rel="noopener noreferrer">Источник</a></td></tr>';
    }).join("");
    $("#ct tbody").innerHTML = html || '<tr><td colspan="' + COLS.length + '">Ничего не найдено</td></tr>';
    return list;
  }
  $("#ct tbody").addEventListener("click", function (e) {
    var b = e.target.closest(".name"); if (!b) return;
    var n = b.dataset.n; state.open[n] = !state.open[n];
    var det = document.getElementById(b.getAttribute("aria-controls"));
    det.hidden = !state.open[n]; b.setAttribute("aria-expanded", state.open[n]);
  });
  $("#csv").addEventListener("click", function () {
    var rows = renderTable(enrich());
    var q = function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; };
    var head = ["Компонент", "Категория"].concat(D.crit.map(function (c) { return c.name; }), ["Итог", "Место в категории", "Вердикт", "Лицензия", "Основание", "Источник"]);
    var lines = [head.map(q).join(",")].concat(rows.map(function (r) { return [r.n, r.c].concat(r.s, [r.t, r.rk, r.v[0], r.l, r.y, r.u]).map(q).join(","); }));
    var blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "fdm_components_comparison.csv";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });
  function render() { var rows = enrich(); renderCats(rows); renderRank(rows); renderTable(rows); }
  buildWeights(); render();

  /* ---------- sources filter ---------- */
  $("#srcQ").addEventListener("input", function (e) {
    var q = e.target.value.trim().toLowerCase();
    $$("#srcList li").forEach(function (li) { li.hidden = q && li.textContent.toLowerCase().indexOf(q) < 0 && li.innerHTML.toLowerCase().indexOf(q) < 0; });
  });

  /* ---------- scroll spy + reveal ---------- */
  var links = $$(".top nav a"), blocks = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });
  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          links.forEach(function (l) { l.classList.toggle("on", l.getAttribute("href") === "#" + e.target.id); });
          var on = $(".top nav a.on"); if (on && on.scrollIntoView && window.innerWidth < 980) on.scrollIntoView({ block: "nearest", inline: "center" });
        }
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    blocks.forEach(function (b) { if (b) spy.observe(b); });
    var rv = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); rv.unobserve(e.target); } }); }, { rootMargin: "0px 0px -8% 0px" });
    $$(".rv").forEach(function (el) { rv.observe(el); });
  } else { $$(".rv").forEach(function (el) { el.classList.add("in"); }); }

})();
