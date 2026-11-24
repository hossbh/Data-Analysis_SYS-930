/* Data analysis page: box plots of the notebooks' published statistics, and a CSV explorer that runs in the browser. */
(function () {
  'use strict';
  var K = window.K, $ = K.$, $$ = K.$$, esc = K.esc;
  var ACC = 'var(--acc)';

  /* ---------------------------------------------------------------- number formatting */
  function nf(v) {
    if (v === null || v === undefined || !isFinite(v)) return '–';
    var a = Math.abs(v);
    if (a >= 1e6) return K.compact(v);
    if (a >= 1000) return Math.round(v).toLocaleString('en-US');
    if (a === 0) return '0';
    return String(Number(v.toPrecision(4)));
  }

  /* ---------------------------------------------------------------- findings: box plots from five-number summaries */
  function box(el, q, mean, o) {
    var lab = ['Minimum', 'First quartile', 'Median', 'Third quartile', 'Maximum'];
    K.chart(el, {
      height: 110, crosshair: false, legend: false, aria: o.aria,
      x: { min: o.min, max: o.max, fmt: o.fmt, label: o.label }, y: { min: 0, max: 2, ticks: [] },
      series: [
        { type: 'line', color: 'var(--ink-3)', data: [[q[0], 1], [q[1], 1]], width: 1.5 },
        { type: 'line', color: 'var(--ink-3)', data: [[q[3], 1], [q[4], 1]], width: 1.5 },
        { type: 'line', color: 'var(--ink-3)', data: [[q[0], 0.7], [q[0], 1.3]], width: 1.5 },
        { type: 'line', color: 'var(--ink-3)', data: [[q[4], 0.7], [q[4], 1.3]], width: 1.5 },
        { type: 'rect', x0: q[1], x1: q[3], y0: 0.5, y1: 1.5, color: ACC, fill: 'color-mix(in srgb, var(--acc) 20%, transparent)', width: 1.5 },
        { type: 'line', color: ACC, data: [[q[2], 0.5], [q[2], 1.5]], width: 3 },
        { type: 'dots', color: 'var(--ink)', data: [[mean, 1]], r: 4.5 }
      ],
      tip: function () { return q.map(function (v, i) { return '<div class="r"><span>' + lab[i] + '</span><span>' + o.fmt(v) + '</span></div>'; }).join('') + '<div class="r"><span>Mean (dot)</span><span>' + o.fmt(mean) + '</span></div>'; }
    });
  }
  box($('#njBox'), [66083, 156898, 448734, 576567, 905116], 418662, { min: 0, max: 1000000, fmt: function (v) { return K.compact(v); }, label: 'People per county', aria: 'Box plot of New Jersey county populations' });
  box($('#txBox'), [26700, 107800, 128450, 162875, 285300], 137540, { min: 0, max: 300000, fmt: function (v) { return '$' + K.compact(v); }, label: 'Monthly average sale price', aria: 'Box plot of Texas monthly average sale prices' });
  K.hbars($('#txMissing'), {
    items: [['Sales', 4674], ['Sales volume', 4674], ['Average price', 4674], ['Listings', 3795], ['Months on market', 3765]].map(function (r) { return { label: r[0], value: r[1] / 5040, color: ACC, n: r[1] }; }),
    min: 0, max: 1, rowH: 40, fmt: function (v) { return K.pct(v, 1); }, aria: 'Share of the 5,040 records with a value in each column',
    tip: function (it) { return '<b>' + it.label + '</b><div class="r"><span>Records with a value</span><span>' + it.n.toLocaleString('en-US') + ' of 5,040</span></div>'; }
  });

  /* ---------------------------------------------------------------- CSV reading */
  var MISSING = /^(|na|n\/a|nan|null|none|-|\?)$/i;
  function parseCSV(t) {
    if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1);
    var first = t.slice(0, t.indexOf('\n') > 0 ? t.indexOf('\n') : t.length), cand = [',', ';', '\t'], delim = ',', best = -1;
    cand.forEach(function (d) { var n = first.split(d).length; if (n > best) { best = n; delim = d; } });
    var rows = [], row = [], cell = '', q = false, c;
    for (var i = 0; i < t.length; i++) {
      c = t[i];
      if (q) { if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true;
      else if (c === delim) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return !(r.length === 1 && r[0].trim() === ''); });
  }
  function toNum(s) { s = s.trim(); if (MISSING.test(s)) return NaN; var c = s.replace(/^\$|%$/g, ''); if (/^-?[\d,]+(\.\d+)?$/.test(c)) c = c.replace(/,/g, ''); var v = Number(c); return c !== '' && isFinite(v) ? v : NaN; }
  function build(rows, name) {
    if (rows.length < 2) throw new Error('The file needs a header row and at least one row of data.');
    var head = rows[0].map(function (h, i) { h = h.trim(); return h || 'column ' + (i + 1); }), seen = {};
    head = head.map(function (h) { var b = h, n = 2; while (seen[h]) h = b + ' (' + n++ + ')'; seen[h] = 1; return h; });
    var data = rows.slice(1, 200001), cols = head.map(function (h, j) {
      var raw = data.map(function (r) { return (r[j] === undefined ? '' : r[j]).trim(); });
      var miss = 0, nums = new Array(raw.length), ok = 0, uniq = new Map();
      raw.forEach(function (s, i) { if (MISSING.test(s)) { miss++; nums[i] = NaN; return; } var v = toNum(s); nums[i] = v; if (isFinite(v)) ok++; if (uniq.size < 5000) uniq.set(s, (uniq.get(s) || 0) + 1); });
      var present = raw.length - miss, isNum = present > 0 && ok / present >= 0.9;
      return { name: h, raw: raw, num: isNum ? nums : null, type: isNum ? 'num' : 'text', miss: miss, uniq: uniq };
    });
    return { name: name, n: data.length, cols: cols, truncated: rows.length - 1 > data.length };
  }

  /* ---------------------------------------------------------------- statistics helpers */
  function clean(a) { var o = []; for (var i = 0; i < a.length; i++) if (isFinite(a[i])) o.push(a[i]); return o; }
  function summary(a) {
    var v = clean(a).sort(function (x, y) { return x - y; }); if (!v.length) return null;
    var m = K.mean(v);
    return { n: v.length, mean: m, sd: v.length > 1 ? Math.sqrt(K.variance(v)) : 0, min: v[0], q1: K.quantile(v, 0.25), med: K.quantile(v, 0.5), q3: K.quantile(v, 0.75), max: v[v.length - 1] };
  }
  function agg(vals, how) {
    if (how === 'count') return vals.length;
    var v = clean(vals); if (!v.length) return NaN;
    if (how === 'sum') return v.reduce(function (s, x) { return s + x; }, 0);
    if (how === 'median') return K.quantile(v.sort(function (a, b) { return a - b; }), 0.5);
    return K.mean(v);
  }
  function pearson(x, y) {
    var n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
    for (var i = 0; i < x.length; i++) { var a = x[i], b = y[i]; if (!isFinite(a) || !isFinite(b)) continue; n++; sx += a; sy += b; sxx += a * a; syy += b * b; sxy += a * b; }
    if (n < 3) return { r: NaN, n: n };
    var cov = sxy - sx * sy / n, vx = sxx - sx * sx / n, vy = syy - sy * sy / n;
    return { r: vx > 0 && vy > 0 ? cov / Math.sqrt(vx * vy) : NaN, n: n };
  }

  /* ---------------------------------------------------------------- the explorer */
  var D = null;
  var TIME = /^(year|yr|date|time|month|period|quarter|week|day)$/i, IDLIKE = /(^id$|_id$|^fips$|code$)/i;
  function numCols() { return D.cols.filter(function (c) { return c.type === 'num'; }); }
  function catCols() { return D.cols.filter(function (c) { return c.uniq.size >= 2 && c.uniq.size <= 500 && (c.type === 'text' || c.uniq.size <= 60); }); }
  function col(name) { return D.cols.find(function (c) { return c.name === name; }); }
  function opts(sel, list, pick) {
    var el = $(sel), prev = el.value;
    el.innerHTML = list.map(function (c) { return '<option>' + esc(c.name) + '</option>'; }).join('');
    var keep = list.some(function (c) { return c.name === prev; }) ? prev : pick;
    if (keep) el.value = keep;
  }
  function load(text, name, note) {
    try { D = build(parseCSV(text), name); }
    catch (e) { $('#loadMsg').textContent = e.message || 'That file could not be read as a CSV.'; return; }
    var nums = numCols();
    $('#loadMsg').textContent = '';
    $('#ds').hidden = false;
    $('#dsName').textContent = name;
    $('#dsNote').textContent = note || (D.truncated ? 'First 200,000 rows' : 'Read in your browser');
    var cells = D.n * D.cols.length, miss = D.cols.reduce(function (s, c) { return s + c.miss; }, 0);
    $('#dsKv').innerHTML = [['Rows', D.n.toLocaleString('en-US')], ['Columns', D.cols.length], ['Numeric columns', nums.length], ['Missing cells', K.pct(cells ? miss / cells : 0, 1)]].map(function (p) { return '<div><span class="k">' + p[0] + '</span><div class="v">' + p[1] + '</div></div>'; }).join('');
    profile();
    // sensible first choices: a time column for trends, a measure that is not an id or a time
    var measures = nums.filter(function (c) { return !TIME.test(c.name) && !IDLIKE.test(c.name); }), m = measures.length ? measures : nums;
    var priceLike = [/price/i, /pop/i, /value/i, /amount|income|cost/i, /sales/i].reduce(function (f, re) { return f || m.find(function (c) { return re.test(c.name); }); }, null) || m[0];
    var other = m.find(function (c) { return c !== priceLike; }) || priceLike;
    var time = nums.find(function (c) { return TIME.test(c.name); }), cats = catCols(), cat = cats.find(function (c) { return c.type === 'text'; }) || cats[0];
    opts('#dCol', nums, priceLike && priceLike.name);
    opts('#rCat', cats, cat && cat.name); opts('#rVal', nums, priceLike && priceLike.name);
    opts('#tX', nums, (time || nums[0] || {}).name); opts('#tY', nums, priceLike && priceLike.name);
    opts('#sX', nums, (other || {}).name); opts('#sY', nums, (priceLike || {}).name);
    drawAll();
    $('#ds').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }
  function profile() {
    var h = '<thead><tr><th>Column</th><th>Type</th><th class="n">Values</th><th class="n">Missing</th><th class="n">Unique</th><th class="n">Mean</th><th class="n">Std dev</th><th class="n">Min</th><th class="n">25 %</th><th class="n">Median</th><th class="n">75 %</th><th class="n">Max</th></tr></thead><tbody>';
    D.cols.forEach(function (c) {
      var present = D.n - c.miss, u = c.uniq.size >= 5000 ? '5,000+' : c.uniq.size.toLocaleString('en-US');
      h += '<tr><td><b>' + esc(c.name) + '</b></td><td class="ty">' + (c.type === 'num' ? 'number' : 'text') + '</td><td class="n">' + present.toLocaleString('en-US') + '</td><td class="n">' + K.pct(D.n ? c.miss / D.n : 0, 1) + '</td><td class="n">' + u + '</td>';
      if (c.type === 'num') { var s = summary(c.num); h += s ? [s.mean, s.sd, s.min, s.q1, s.med, s.q3, s.max].map(function (v) { return '<td class="n">' + nf(v) + '</td>'; }).join('') : '<td colspan="7"></td>'; }
      else { var top = null; c.uniq.forEach(function (n, k) { if (!top || n > top[1]) top = [k, n]; }); h += '<td colspan="7" class="muted">' + (top ? 'Most common: ' + esc(top[0].length > 40 ? top[0].slice(0, 40) + '…' : top[0]) + ' (' + top[1].toLocaleString('en-US') + ')' : '') + '</td>'; }
      h += '</tr>';
    });
    $('#prof').innerHTML = h + '</tbody>';
  }
  function none(el, msg) { el.innerHTML = '<p class="note">' + msg + '</p>'; }

  function drawDist() {
    var el = $('#distChart'), c = col($('#dCol').value); if (!c || !c.num) return none(el, 'This file has no numeric column to chart.');
    var v = clean(c.num), s = summary(c.num), n = +$('#dBins').value; $('#dBinsO').textContent = n;
    if (!v.length) return none(el, 'This column has no numbers.');
    var lo = s.min, hi = s.max > s.min ? s.max : s.min + 1, b = K.hist(v, lo, hi, n);
    K.chart(el, {
      height: 300, legend: false, aria: 'Histogram of ' + c.name,
      x: { min: lo, max: hi, label: c.name, fmt: nf }, y: { min: 0, label: 'Rows', fmt: K.compact },
      series: [{ type: 'bins', name: c.name, color: ACC, data: b }, { type: 'vline', x: s.med, color: 'var(--ink)', width: 1.5, dash: '4 3', label: 'median' }],
      tip: function (xv) { var q = b.find(function (x) { return xv >= x[0] && xv < x[1]; }); return q ? '<b>' + nf(q[0]) + ' – ' + nf(q[1]) + '</b><div class="r"><span>Rows</span><span>' + q[2].toLocaleString('en-US') + '</span></div><div class="r"><span>Share</span><span>' + K.pct(q[2] / v.length, 1) + '</span></div>' : null; }
    });
    var skew = s.mean > s.med * 1.05 ? 'The mean is above the median: the distribution has a long right tail.' : s.mean < s.med * 0.95 ? 'The mean is below the median: the distribution leans left.' : 'The mean and median are close: the distribution is roughly balanced.';
    $('#distCap').textContent = v.length.toLocaleString('en-US') + ' values · mean ' + nf(s.mean) + ' · median ' + nf(s.med) + ' · std dev ' + nf(s.sd) + '. ' + skew;
  }
  function drawRank() {
    var el = $('#rankChart'), cc = col($('#rCat').value), vc = col($('#rVal').value), how = $('#rAgg').value, show = $('#rShow').value;
    if (!cc) return none(el, 'Ranking needs a column with between 2 and 500 distinct values to group by.');
    if (!vc && how !== 'count') return none(el, 'Ranking needs a numeric column.');
    var groups = new Map();
    cc.raw.forEach(function (k, i) { if (MISSING.test(k)) return; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(vc && vc.num ? vc.num[i] : 1); });
    var items = []; groups.forEach(function (vals, k) { var a = agg(vals, how); if (isFinite(a)) items.push({ label: k, value: a, n: vals.length, color: ACC }); });
    items.sort(function (a, b) { return b.value - a.value; });
    var pick = show === 'top' ? items.slice(0, 10) : show === 'bottom' ? items.slice(-10) : show === 'both' ? (items.length > 10 ? items.slice(0, 5).concat(items.slice(-5)) : items) : items.slice(0, 40);
    var name = how === 'count' ? 'rows' : how + ' ' + vc.name;
    K.hbars(el, {
      items: pick, min: Math.min(0, Math.min.apply(null, pick.map(function (i) { return i.value; }))), fmt: nf, rowH: 40, aria: 'Groups of ' + cc.name + ' ranked by ' + name,
      tip: function (it) { return '<b>' + esc(it.label) + '</b><div class="r"><span>' + esc(name) + '</span><span>' + nf(it.value) + '</span></div><div class="r"><span>Rows</span><span>' + it.n.toLocaleString('en-US') + '</span></div>'; }
    });
  }
  function drawTrend() {
    var el = $('#trendChart'), xc = col($('#tX').value), yc = col($('#tY').value), how = $('#tAgg').value;
    if (!xc || !yc) return none(el, 'Trends need two numeric columns.');
    var g = new Map();
    xc.num.forEach(function (x, i) { if (!isFinite(x)) return; if (!g.has(x)) g.set(x, []); g.get(x).push(yc.num[i]); });
    var xs = Array.from(g.keys()).sort(function (a, b) { return a - b; });
    if (xs.length > 400) { // too many distinct x values: bin them
      var lo = xs[0], hi = xs[xs.length - 1], nb = 100, w = (hi - lo) / nb, bins = new Map();
      xs.forEach(function (x) { var k = Math.min(nb - 1, Math.floor((x - lo) / w)), c = lo + (k + 0.5) * w; if (!bins.has(c)) bins.set(c, []); Array.prototype.push.apply(bins.get(c), g.get(x)); });
      g = bins; xs = Array.from(g.keys()).sort(function (a, b) { return a - b; });
    }
    var pts = xs.map(function (x) { return [x, agg(g.get(x), how)]; }).filter(function (p) { return isFinite(p[1]); });
    if (pts.length < 2) return none(el, 'Not enough values to draw a trend.');
    var yearish = TIME.test(xc.name) && pts.every(function (p) { return Number.isInteger(p[0]); });
    K.chart(el, {
      height: 300, aria: how + ' of ' + yc.name + ' over ' + xc.name,
      x: { label: xc.name, fmt: yearish ? String : nf }, y: { label: how + ' ' + yc.name, fmt: nf },
      series: [{ type: 'line', name: how + ' ' + yc.name, color: ACC, data: pts }, { type: 'dots', color: ACC, data: pts.length <= 60 ? pts : [], r: 4 }],
      legend: false
    });
    var a = pts[0], b = pts[pts.length - 1], ch = a[1] !== 0 ? (b[1] - a[1]) / Math.abs(a[1]) : NaN;
    $('#trendCap').textContent = 'From ' + (yearish ? a[0] : nf(a[0])) + ' to ' + (yearish ? b[0] : nf(b[0])) + ', the ' + how + ' of ' + yc.name + ' went from ' + nf(a[1]) + ' to ' + nf(b[1]) + (isFinite(ch) ? ' (' + (ch >= 0 ? '+' : '') + K.pct(ch, 1) + ').' : '.');
  }
  function drawRel() {
    var el = $('#relChart'), xc = col($('#sX').value), yc = col($('#sY').value);
    if (!xc || !yc) return none(el, 'Relationships need two numeric columns.');
    var pts = []; for (var i = 0; i < D.n; i++) { var x = xc.num[i], y = yc.num[i]; if (isFinite(x) && isFinite(y)) pts.push([x, y]); }
    if (pts.length < 3) return none(el, 'Not enough rows with both values.');
    var pr = pearson(xc.num, yc.num), fit = K.lstsq(pts.map(function (p) { return [p[0], 1]; }), pts.map(function (p) { return p[1]; }));
    var step = Math.max(1, Math.ceil(pts.length / 3000)), shown = pts.filter(function (p, i) { return i % step === 0; });
    var xmin = Math.min.apply(null, pts.map(function (p) { return p[0]; })), xmax = Math.max.apply(null, pts.map(function (p) { return p[0]; }));
    K.chart(el, {
      height: 320, aria: yc.name + ' against ' + xc.name, crosshair: false,
      x: { label: xc.name, fmt: nf, pad: 0.02 }, y: { label: yc.name, fmt: nf },
      series: [{ type: 'dots', name: 'Rows', color: ACC, data: shown, r: 2.6, ring: false, opacity: 0.55 }, { type: 'line', name: 'Least-squares line', color: 'var(--ink)', data: fit ? [[xmin, fit[0] * xmin + fit[1]], [xmax, fit[0] * xmax + fit[1]]] : [], width: 2 }],
      tip: function (xv, yv, near) { return near && near.s.type === 'dots' ? '<div class="r"><span>' + esc(xc.name) + '</span><span>' + nf(near.p[0]) + '</span></div><div class="r"><span>' + esc(yc.name) + '</span><span>' + nf(near.p[1]) + '</span></div>' : null; }
    });
    var r = pr.r, word = !isFinite(r) ? 'no measurable' : Math.abs(r) >= 0.7 ? 'a strong' : Math.abs(r) >= 0.4 ? 'a moderate' : Math.abs(r) >= 0.2 ? 'a weak' : 'little or no';
    $('#relCap').textContent = pts.length.toLocaleString('en-US') + ' rows' + (step > 1 ? ' (every ' + step + 'th drawn)' : '') + ' · r = ' + (isFinite(r) ? r.toFixed(3) : '–') + ', R² = ' + (isFinite(r) ? (r * r).toFixed(3) : '–') + ': ' + word + (isFinite(r) && Math.abs(r) >= 0.2 ? (r > 0 ? ' positive' : ' negative') : '') + ' linear relationship.';
  }
  function drawCorr() {
    var el = $('#heat'), nums = numCols().filter(function (c) { return clean(c.num).length >= 3; }).slice(0, 12);
    if (nums.length < 2) return none(el, 'Correlations need at least two numeric columns.');
    var n = nums.length, h = '<div class="heat" style="grid-template-columns:minmax(90px,150px) repeat(' + n + ', minmax(44px, 1fr))"><div></div>';
    nums.forEach(function (c) { h += '<div class="hd top" title="' + esc(c.name) + '">' + esc(c.name.length > 10 ? c.name.slice(0, 9) + '…' : c.name) + '</div>'; });
    nums.forEach(function (a) {
      h += '<div class="hd" title="' + esc(a.name) + '">' + esc(a.name) + '</div>';
      nums.forEach(function (b) {
        var r = a === b ? 1 : pearson(a.num, b.num).r, bg = !isFinite(r) ? 'var(--panel-2)' : 'color-mix(in srgb, ' + (r >= 0 ? 'var(--s1)' : 'var(--neg)') + ' ' + Math.round(Math.abs(r) * 100) + '%, var(--panel-2))';
        h += '<div class="' + (isFinite(r) && Math.abs(r) > 0.6 ? 'on-dark' : '') + '" style="background:' + bg + '" title="' + esc(a.name + ' × ' + b.name) + ': r = ' + (isFinite(r) ? r.toFixed(3) : '–') + '">' + (isFinite(r) ? r.toFixed(2) : '–') + '</div>';
      });
    });
    el.innerHTML = h + '</div>';
  }
  function drawAll() { if (!D) return; drawDist(); drawRank(); drawTrend(); drawRel(); drawCorr(); }
  ['#dCol', '#dBins'].forEach(function (s) { $(s).addEventListener('input', function () { if (D) drawDist(); }); });
  ['#rCat', '#rVal', '#rAgg', '#rShow'].forEach(function (s) { $(s).addEventListener('change', function () { if (D) drawRank(); }); });
  ['#tX', '#tY', '#tAgg'].forEach(function (s) { $(s).addEventListener('change', function () { if (D) drawTrend(); }); });
  ['#sX', '#sY'].forEach(function (s) { $(s).addEventListener('change', function () { if (D) drawRel(); }); });

  /* ---------------------------------------------------------------- loading a file */
  function readFile(file) {
    if (!file) return;
    if (file.size > 25e6) { $('#loadMsg').textContent = 'That file is larger than 25 MB. Try a smaller extract.'; return; }
    $('#loadMsg').textContent = 'Reading ' + file.name + '…';
    var rd = new FileReader();
    rd.onload = function () { load(String(rd.result), file.name); };
    rd.onerror = function () { $('#loadMsg').textContent = 'That file could not be read.'; };
    rd.readAsText(file);
  }
  $('#file').addEventListener('change', function () { readFile(this.files && this.files[0]); this.value = ''; });
  var drop = $('#drop');
  ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { readFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); });

  // a synthetic sample shaped like a monthly city-level housing table: randomly generated, not real data
  function sample() {
    var r = K.rng(2024), out = ['city,year,month,sales,avgprice,listings,onmarket'];
    var cities = [['Alder', 1.0, 1.2], ['Birchwood', 1.35, 0.5], ['Cedar Falls', 0.8, 2.0], ['Dunmore', 1.15, 0.8], ['Elmhurst', 0.7, 0.6], ['Fairview', 1.25, 1.6], ['Glenwood', 0.9, 0.9], ['Harbor City', 1.5, 3.0]];
    cities.forEach(function (c) {
      for (var y = 2000; y <= 2009; y++) for (var m = 1; m <= 12; m++) {
        var t = y - 2000 + (m - 1) / 12, slump = y >= 2007 ? 0.12 * (y - 2006) : 0;
        var price = 110000 * c[1] * (1 + 0.045 * t) * (1 + 0.03 * Math.sin(2 * Math.PI * (m - 3) / 12)) * (1 + 0.04 * K.randn(r));
        var sales = Math.max(5, Math.round(c[2] * 180 * (1 + 0.25 * Math.sin(2 * Math.PI * (m - 4) / 12)) * (1 + 0.03 * t - slump) * Math.exp(0.12 * K.randn(r))));
        var listings = Math.round(sales * (6.5 + 0.4 * K.randn(r)) * (y >= 2007 ? 1.3 : 1)), onm = (listings / sales * (1 + 0.08 * K.randn(r))).toFixed(1);
        var gap = r() < 0.06;
        out.push([c[0], y, m, sales, Math.round(price / 100) * 100, gap ? '' : listings, gap ? '' : onm].join(','));
      }
    });
    return out.join('\n');
  }
  $('#bSample').addEventListener('click', function () { load(sample(), 'Synthetic housing sample', 'Randomly generated for demonstration · not real data'); });
})();
