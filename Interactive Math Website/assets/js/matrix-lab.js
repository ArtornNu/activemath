/* ============================================================
   Matrix Lab v2 — a small, dependency-free interactive engine
   ------------------------------------------------------------
   Used across Module 5's seven activities. Plain HTML5 <canvas> +
   JavaScript, no external service — nothing here can go down,
   time out, or need an API key.

   THE CORE IDEA:
   A 2x2 matrix M = [[a, b], [c, d]] is an instruction for where
   the two basis arrows land:
     - î (1,0) lands at (a, c)  — column 1
     - ĵ (0,1) lands at (b, d)  — column 2
   Every other point's new home is x·(î's new spot) + y·(ĵ's new
   spot). Dragging the tips of î/ĵ *is* editing the matrix.

   This version adds, on top of the original engine:
     - a faint "ghost" of the untransformed (standard) grid, so
       before/after are visible at once
     - a list of extra points, each optionally showing a "ghost"
       dot at its own untransformed position (for the change-of-
       basis activity: same coordinates, different actual spot)
     - a dashed "combination" construction (a copies of î, then
       b copies of ĵ) for a chosen point
     - one freely-draggable point independent of the basis
       vectors (used for the systems-of-equations activity)
     - a fixed, non-transformed "target" marker
   ============================================================ */

class MatrixLab {
  constructor(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.size = canvas.width;
    this.range = opts.range || 5;
    this.scale = this.size / (2 * this.range);

    this.matrix = opts.matrix || { a: 1, b: 0, c: 0, d: 1 };
    this.showBasisVectors = opts.showBasisVectors !== false;
    this.draggableBasis = !!opts.draggableBasis;
    this.showUnitSquare = !!opts.showUnitSquare;
    this.showDeterminant = !!opts.showDeterminant;
    this.detOutputId = opts.detOutputId || null;
    this.showGhostIdentity = !!opts.showGhostIdentity;
    this.showLiveGrid = opts.showLiveGrid !== false; // set false to hide the M-skewed solid grid, keeping only showGhostIdentity's plain orthogonal one — for canvases where the skewed grid is pure clutter (nothing is actually being dragged/transformed on it) rather than a teaching aid
    this.showOriginLabel = !!opts.showOriginLabel;
    this.lockedBasis = opts.lockedBasis || null; // "i" | "j" | null — that arrow can't be dragged while locked

    // which world point sits at the canvas's visual center — default (0,0), same as
    // always. Activities whose numbers are all positive (e.g. Activity 8's word
    // problems) can shift this so the origin sits toward a corner instead of
    // wasting half the canvas on a quadrant nothing ever visits.
    this.center = opts.center || { x: 0, y: 0 };
    this.axisLabels = opts.axisLabels || null; // {x: "label for the x axis", y: "label for the y axis"}
    this.guideLines = opts.guideLines || []; // [{axis:"x"|"y", value, color, label}] — dashed full-width/height reference lines
    this.systemLines = opts.systemLines || []; // [{a,b,c,color,label}] — the solution set of ax+by=c, drawn as a full (possibly slanted) line clipped to the visible window. Unlike guideLines (always axis-aligned), this handles any coefficients — used for "one equation in two unknowns is a whole line" and "two equations intersect at one point".
    this.parallelograms = opts.parallelograms || []; // [{v1:{x,y}, v2:{x,y}, color, label, alpha}] — filled parallelogram spanned by two vectors from the origin (v1, v2, v1+v2), with its area shown as a live label. Generic (not tied to the instance's own matrix) — used for teaching Cramer's Rule as a ratio of areas: unlike the det/area readout above (always the current matrix's own two columns), any two arbitrary vectors can be passed here, e.g. (target, col2) instead of (col1, col2).
    this.vectorArrows = opts.vectorArrows || []; // [{v:{x,y}, color, label}] — a labeled arrow drawn raw from the origin to `v`, NOT run through applyM (unlike showBasisVectors' î/ĵ, which are always this instance's own matrix columns). Use this to draw an arbitrary vector — e.g. a target vector, or another activity's column — on a canvas where it isn't literally "this matrix's column."

    this.shape = opts.shape || null;
    this.drawable = !!opts.drawable;
    this.drawModeOn = false;

    this.points = opts.points || []; // [{x,y,color,label,ghost}]
    this.showCombinationFor = opts.showCombinationFor || null; // {x,y,color}

    this.freePoint = opts.freePoint || null; // {x,y,color,label}
    this.targetPoint = opts.targetPoint || null; // {x,y,color,label} — drawn raw, not transformed
    this.targetPoints = opts.targetPoints || []; // array of {x,y,color,label} — same as targetPoint, but plural (one crosshair per point)
    this.targetShape = opts.targetShape || null; // array of {x,y} — drawn raw (dashed outline), a "match this" reference

    this.draggablePoints = opts.draggablePoints || null; // [{x,y,color,label}] — each independently grabbable and draggable, unlike the single freePoint
    this.dragAxisLock = opts.dragAxisLock || null; // "x" | "y" | null — while dragging any draggablePoint, restrict movement to just that axis (the other stays put)

    this.onMatrixChange = opts.onMatrixChange || function () {};
    this.onFreePointChange = opts.onFreePointChange || function () {};
    this.onDraggablePointsChange = opts.onDraggablePointsChange || function () {};

    this._dragging = null; // "i" | "j" | "free" | null
    this._draggingPointIndex = null; // index into draggablePoints currently being dragged, or null
    this._penDown = false;
    this._animT = null; // 0..1 progress of the "count the combination" pulse animation, or null when idle

    this._bindEvents();
    this.draw();
  }

  // ---- coordinate helpers ----
  // both formulas fold in `center` — the world point drawn at the canvas's visual
  // middle. center defaults to (0,0), which makes these reduce to the original
  // "origin is always dead-center" formulas exactly — every activity that doesn't
  // pass `center` is completely unaffected.
  toScreen(x, y) { return { x: this.size / 2 + (x - this.center.x) * this.scale, y: this.size / 2 - (y - this.center.y) * this.scale }; }
  toWorld(px, py) { return { x: (px - this.size / 2) / this.scale + this.center.x, y: (this.size / 2 - py) / this.scale + this.center.y }; }
  applyM(x, y) { const m = this.matrix; return { x: m.a * x + m.b * y, y: m.c * x + m.d * y }; }
  canvasPointFromEvent(evt) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
    const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }

  // ---- public controls ----
  setMatrix(m) { this.matrix = m; this.draw(); this.onMatrixChange(this.matrix); }
  resetMatrix() { this.setMatrix({ a: 1, b: 0, c: 0, d: 1 }); }
  setDrawMode(on) { this.drawModeOn = on; if (on) this.resetMatrix(); }
  clearShape() { this.shape = []; this.draw(); }
  setShape(points) { this.shape = points; this.draw(); }
  setPoints(points) { this.points = points; this.draw(); }
  setFreePoint(p) { this.freePoint = p; this.draw(); }
  setTargetPoint(p) { this.targetPoint = p; this.draw(); }
  setTargetShape(points) { this.targetShape = points; this.draw(); }
  setCombinationFor(p) { this.showCombinationFor = p; this.draw(); }
  setShowGhostIdentity(on) { this.showGhostIdentity = on; this.draw(); }
  setLockedBasis(which) { this.lockedBasis = which; this.draw(); }
  setShowBasisVectors(on) { this.showBasisVectors = on; this.draw(); }
  setGuideLines(lines) { this.guideLines = lines || []; this.draw(); }
  setSystemLines(lines) { this.systemLines = lines || []; this.draw(); }
  setParallelograms(list) { this.parallelograms = list || []; this.draw(); }
  setVectorArrows(list) { this.vectorArrows = list || []; this.draw(); }
  setAxisLabels(labels) { this.axisLabels = labels || null; this.draw(); }
  setDraggablePoints(points) { this.draggablePoints = points; this.draw(); }
  setTargetPoints(points) { this.targetPoints = points; this.draw(); }
  /* Animate a small pulsing marker walking the "a copies of î, then b copies of ĵ"
     path — a copies of î. Used as an answer-key style animation showing exactly how
     to count the standard-basis coordinate by hand. Safe no-op if nothing to count. */
  pulseCombinationPath(durationMs) {
    if (!this.showCombinationFor) return;
    durationMs = durationMs || 1600;
    const startTime = performance.now();
    const self = this;
    function step(now) {
      const t = Math.min((now - startTime) / durationMs, 1);
      self._animT = t;
      self.draw();
      if (t < 1) requestAnimationFrame(step);
      else { self._animT = null; self.draw(); }
    }
    requestAnimationFrame(step);
  }

  // ---- drawing ----
  draw() {
    const ctx = this.ctx, size = this.size, range = this.range;
    ctx.clearRect(0, 0, size, size);

    // grid/axis extent — normally just [-range, range], but when `center` shifts
    // the visual middle away from (0,0) the visible window shifts with it, so the
    // grid must span [center ± range] to still cover the whole canvas. With the
    // default center (0,0) this reduces to exactly [-range, range] as before.
    const gx0 = Math.floor(this.center.x - range), gx1 = Math.ceil(this.center.x + range);
    const gy0 = Math.floor(this.center.y - range), gy1 = Math.ceil(this.center.y + range);

    if (this.showGhostIdentity) {
      // dashed + gray = the FIXED standard grid, never moves. Solid + blue (below) = the
      // LIVE grid, moves with i/j. Two overlaid solid grids at low opacity turned out to
      // be genuinely hard to tell apart (color alone wasn't enough contrast) — dashing
      // one of them makes the two unmistakable regardless of color perception or a
      // washed-out projector.
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(28,39,51,0.3)";
      ctx.setLineDash([4, 4]);
      for (let i = gx0; i <= gx1; i++) {
        this._strokeRawLine({ x: i, y: gy0 }, { x: i, y: gy1 });
      }
      for (let j = gy0; j <= gy1; j++) {
        this._strokeRawLine({ x: gx0, y: j }, { x: gx1, y: j });
      }
      ctx.setLineDash([]);
    }

    if (this.showLiveGrid) {
      // NOTE: this whole block (including the "axis" lines just below) runs
      // through _strokeLine, i.e. through applyM — so on a canvas where M is
      // being reused purely as a computation (not an actual shape being
      // transformed), even the main x/y axis lines end up visibly skewed,
      // not just the grid cells. showLiveGrid:false skips all of this,
      // leaving only showGhostIdentity's true orthogonal dashed grid (if on).
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(29,95,184,0.4)";
      for (let i = gx0; i <= gx1; i++) {
        this._strokeLine({ x: i, y: gy0 }, { x: i, y: gy1 });
      }
      for (let j = gy0; j <= gy1; j++) {
        this._strokeLine({ x: gx0, y: j }, { x: gx1, y: j });
      }
      ctx.strokeStyle = "rgba(28,39,51,0.4)";
      ctx.lineWidth = 1.6;
      this._strokeLine({ x: gx0, y: 0 }, { x: gx1, y: 0 });
      this._strokeLine({ x: 0, y: gy0 }, { x: 0, y: gy1 });
    }

    if (this.showOriginLabel) {
      const o = this.toScreen(0, 0);
      ctx.font = "11px sans-serif";
      ctx.fillStyle = "rgba(28,39,51,0.6)";
      ctx.fillText("(0, 0)", o.x + 6, o.y + 15);
    }

    if (this.axisLabels) {
      // parked on the SIDE of each axis that positive-quadrant-only content
      // (like Activity 8's word problems) never touches — below the x-axis,
      // left of the y-axis — so labels never fight with points, arrows, or a
      // target that happens to sit near the range's far edge.
      ctx.font = "bold 12px sans-serif";
      ctx.fillStyle = "rgba(28,39,51,0.7)";
      if (this.axisLabels.x) {
        const p = this.toScreen(this.center.x + range * 0.94, this.center.y);
        ctx.textAlign = "right";
        ctx.fillText(this.axisLabels.x, p.x, p.y + 16);
        ctx.textAlign = "left";
      }
      if (this.axisLabels.y) {
        const p = this.toScreen(this.center.x, this.center.y + range * 0.94);
        ctx.textAlign = "right";
        ctx.fillText(this.axisLabels.y, p.x - 8, p.y + 4);
        ctx.textAlign = "left";
      }
    }

    if (this.parallelograms && this.parallelograms.length) {
      // drawn before lines/points so the shaded fills sit underneath everything
      // that's actually being read as a specific value (points, arrows, lines)
      this.parallelograms.forEach((p) => this._fillParallelogram(p));
    }

    if (this.vectorArrows && this.vectorArrows.length) {
      this.vectorArrows.forEach((v) => this._strokeRawVector(v));
    }

    if (this.guideLines && this.guideLines.length) {
      this.guideLines.forEach((g) => this._strokeGuideLine(g));
    }

    if (this.systemLines && this.systemLines.length) {
      this.systemLines.forEach((l) => this._strokeSystemLine(l));
    }

    if (this.showUnitSquare) {
      this._strokePolygon(
        [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
        "#1d5fb8", "rgba(29,95,184,0.16)", true
      );
    }
    if (this.targetShape && this.targetShape.length > 1) {
      this._strokeRawPolygon(this.targetShape, "#d97a1f");
    }
    if (this.shape && this.shape.length > 1) {
      this._strokePolygon(this.shape, "#178a4c", "rgba(23,138,76,0.14)", false);
    }

    if (this.showCombinationFor) {
      this._strokeCombination(this.showCombinationFor);
      if (this._animT !== null) this._drawAnimPulse();
    }

    this.points.forEach((p) => this._strokePointWithGhost(p));

    if (this.showBasisVectors) {
      this._strokeVector({ x: 1, y: 0 }, "#c23b3b", "î", "i");
      this._strokeVector({ x: 0, y: 1 }, "#7a3fd1", "ĵ", "j");
    }

    if (this.targetPoint) this._strokeRawDot(this.targetPoint, true);
    if (this.targetPoints && this.targetPoints.length) {
      this.targetPoints.forEach((p) => this._strokeRawDot(p, true));
    }
    if (this.freePoint) this._strokeRawDot(this.freePoint, false);
    if (this.draggablePoints && this.draggablePoints.length) {
      this.draggablePoints.forEach((p) => this._strokeRawDot(p, false));
    }

    if (this.showDeterminant && this.detOutputId) {
      const el = document.getElementById(this.detOutputId);
      if (el) el.innerHTML = this._detReadoutHTML();
    }
  }

  _strokeRawLine(p1, p2) {
    const a = this.toScreen(p1.x, p1.y), b = this.toScreen(p2.x, p2.y);
    const ctx = this.ctx;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  _strokeLine(p1, p2) {
    const w1 = this.applyM(p1.x, p1.y), w2 = this.applyM(p2.x, p2.y);
    const a = this.toScreen(w1.x, w1.y), b = this.toScreen(w2.x, w2.y);
    const ctx = this.ctx;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  _strokePolygon(points, stroke, fill, closed) {
    const ctx = this.ctx;
    const screenPts = points.map((p) => { const w = this.applyM(p.x, p.y); return this.toScreen(w.x, w.y); });
    ctx.beginPath();
    screenPts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    if (closed) ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = 2.5; ctx.stroke();
  }
  _strokeRawPolygon(points, stroke) {
    const ctx = this.ctx;
    const screenPts = points.map((p) => this.toScreen(p.x, p.y));
    ctx.setLineDash([7, 6]); ctx.lineWidth = 2.5; ctx.strokeStyle = stroke;
    ctx.beginPath();
    screenPts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath(); ctx.stroke();
    ctx.setLineDash([]);
  }
  _strokeVector(base, color, label, key) {
    const locked = key && this.lockedBasis === key;
    const w = this.applyM(base.x, base.y);
    const tip = this.toScreen(w.x, w.y);
    const origin = this.toScreen(0, 0);
    const ctx = this.ctx;
    const drawColor = locked ? this._fadeColor(color) : color;
    ctx.strokeStyle = drawColor; ctx.fillStyle = drawColor; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
    const ang = Math.atan2(tip.y - origin.y, tip.x - origin.x);
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x - 10 * Math.cos(ang - 0.3), tip.y - 10 * Math.sin(ang - 0.3));
    ctx.lineTo(tip.x - 10 * Math.cos(ang + 0.3), tip.y - 10 * Math.sin(ang + 0.3));
    ctx.closePath(); ctx.fill();
    ctx.font = "bold 15px sans-serif";
    ctx.fillStyle = drawColor;
    ctx.fillText(label, tip.x + 8, tip.y - 8);
    if (this.draggableBasis && !locked) {
      ctx.beginPath(); ctx.arc(tip.x, tip.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
    }
  }
  _fadeColor(hex) {
    // quick hex->rgba fade, used to show a locked (currently non-draggable) arrow as dimmed
    const n = parseInt(hex.replace("#", ""), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return `rgba(${r},${g},${b},0.35)`;
  }
  _strokePointWithGhost(p) {
    const ctx = this.ctx;
    const live = this.toScreen(this.applyM(p.x, p.y).x, this.applyM(p.x, p.y).y);
    if (p.ghost) {
      const ghost = this.toScreen(p.x, p.y);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(28,39,51,0.35)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(ghost.x, ghost.y); ctx.lineTo(live.x, live.y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(ghost.x, ghost.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(28,39,51,0.35)"; ctx.fill();
      ctx.font = "12px sans-serif"; ctx.fillStyle = "rgba(28,39,51,0.55)";
      ctx.fillText(`(${p.x}, ${p.y}) in standard`, ghost.x + 8, ghost.y + 14);
    }
    ctx.beginPath(); ctx.arc(live.x, live.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = p.color || "#c23b3b"; ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
    if (p.label) {
      ctx.font = "bold 13px sans-serif"; ctx.fillStyle = p.color || "#c23b3b";
      ctx.fillText(p.label, live.x + 9, live.y - 9);
    }
  }
  _strokeCombination(p) {
    const ctx = this.ctx;
    const iTip = this.applyM(1, 0), jTip = this.applyM(0, 1);
    const aTimesI = { x: p.x * iTip.x, y: p.x * iTip.y };
    const full = { x: aTimesI.x + p.y * jTip.x, y: aTimesI.y + p.y * jTip.y };
    const o = this.toScreen(0, 0), mid = this.toScreen(aTimesI.x, aTimesI.y), end = this.toScreen(full.x, full.y);
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = "#c23b3b";
    ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(mid.x, mid.y); ctx.stroke();
    ctx.strokeStyle = "#7a3fd1";
    ctx.beginPath(); ctx.moveTo(mid.x, mid.y); ctx.lineTo(end.x, end.y); ctx.stroke();
    ctx.setLineDash([]);
    this._drawArrowhead(o, mid, "#c23b3b");
    this._drawArrowhead(mid, end, "#7a3fd1");
  }
  _drawAnimPulse() {
    const p = this.showCombinationFor;
    if (!p) return;
    const iTip = this.applyM(1, 0), jTip = this.applyM(0, 1);
    const aTimesI = { x: p.x * iTip.x, y: p.x * iTip.y };
    const full = { x: aTimesI.x + p.y * jTip.x, y: aTimesI.y + p.y * jTip.y };
    const o = this.toScreen(0, 0), mid = this.toScreen(aTimesI.x, aTimesI.y), end = this.toScreen(full.x, full.y);
    const t = this._animT;
    let pos, color;
    if (t < 0.5) {
      const tt = t / 0.5;
      pos = { x: o.x + (mid.x - o.x) * tt, y: o.y + (mid.y - o.y) * tt };
      color = "#c23b3b";
    } else {
      const tt = (t - 0.5) / 0.5;
      pos = { x: mid.x + (end.x - mid.x) * tt, y: mid.y + (end.y - mid.y) * tt };
      color = "#7a3fd1";
    }
    const ctx = this.ctx;
    ctx.beginPath(); ctx.arc(pos.x, pos.y, 9, 0, Math.PI * 2);
    ctx.globalAlpha = 0.85; ctx.fillStyle = color; ctx.fill(); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(pos.x, pos.y, 13, 0, Math.PI * 2);
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
  }
  _drawArrowhead(from, to, color) {
    if (Math.hypot(to.x - from.x, to.y - from.y) < 1) return; // zero-length segment, nothing to point
    const ctx = this.ctx;
    const ang = Math.atan2(to.y - from.y, to.x - from.x);
    const size = 8;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - size * Math.cos(ang - 0.3), to.y - size * Math.sin(ang - 0.3));
    ctx.lineTo(to.x - size * Math.cos(ang + 0.3), to.y - size * Math.sin(ang + 0.3));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
  _strokeRawDot(p, isTarget) {
    const ctx = this.ctx;
    const s = this.toScreen(p.x, p.y);
    ctx.beginPath();
    if (isTarget) {
      // crosshair style for targets
      ctx.strokeStyle = p.color || "#d97a1f"; ctx.lineWidth = 2.5;
      ctx.moveTo(s.x - 10, s.y); ctx.lineTo(s.x + 10, s.y);
      ctx.moveTo(s.x, s.y - 10); ctx.lineTo(s.x, s.y + 10); ctx.stroke();
      ctx.beginPath(); ctx.arc(s.x, s.y, 11, 0, Math.PI * 2);
      ctx.strokeStyle = p.color || "#d97a1f"; ctx.stroke();
    } else {
      ctx.arc(s.x, s.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = p.color || "#178a4c"; ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
    }
    if (p.label) {
      ctx.font = "bold 13px sans-serif"; ctx.fillStyle = p.color || "#178a4c";
      if (isTarget) {
        // targets label to the LOWER-LEFT, points label to the upper-right (see
        // _strokePointWithGhost) — deliberately opposite corners, so when a
        // dragged point lands exactly on its target (the whole point of these
        // activities!) the two labels don't stack into unreadable overlapping
        // text right at the moment a student gets the answer right.
        ctx.textAlign = "right";
        ctx.fillText(p.label, s.x - 14, s.y + 24);
        ctx.textAlign = "left";
      } else {
        ctx.fillText(p.label, s.x + 12, s.y - 10);
      }
    }
  }
  _strokeGuideLine(g) {
    // a dashed line spanning the whole canvas at one fixed x or y — used to build
    // a target point up one coordinate at a time (e.g. "sentence 1's total = 8"
    // appears as a vertical guide before the full (8, 5) target point exists).
    const ctx = this.ctx;
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = g.color || "#d97a1f";
    ctx.beginPath();
    if (g.axis === "x") {
      const sx = this.toScreen(g.value, 0).x;
      ctx.moveTo(sx, 0); ctx.lineTo(sx, this.size);
    } else {
      const sy = this.toScreen(0, g.value).y;
      ctx.moveTo(0, sy); ctx.lineTo(this.size, sy);
    }
    ctx.stroke();
    ctx.restore();
    if (g.label) {
      // flip the label to the other side of its line whenever the default side
      // would run the text off the canvas — happens often here since a guide
      // line's whole point is to sit near the target, and the target is often
      // deliberately placed close to the range's edge for a snug, big-cell fit.
      ctx.font = "bold 12px sans-serif";
      ctx.fillStyle = g.color || "#d97a1f";
      if (g.axis === "x") {
        const sx = this.toScreen(g.value, 0).x;
        if (sx > this.size - 90) {
          ctx.textAlign = "right";
          ctx.fillText(g.label, sx - 5, 14);
          ctx.textAlign = "left";
        } else {
          ctx.fillText(g.label, sx + 5, 14);
        }
      } else {
        const sy = this.toScreen(0, g.value).y;
        if (sy < 20) {
          ctx.fillText(g.label, 5, sy + 16);
        } else {
          ctx.fillText(g.label, 5, sy - 6);
        }
      }
    }
  }

  /* ---- clip the infinite line ax+by=c to an axis-aligned box [x0,x1]x[y0,y1].
     Tests all 4 box edges, keeps the intersections that actually land inside the
     box, and returns the two farthest apart (handles the box-corner edge case
     where a line grazes exactly through a corner and math produces 3+ "hits"). ---- */
  _clipLineToBox(a, b, c, x0, x1, y0, y1) {
    const eps = 1e-9, tol = 1e-6;
    const within = (v, lo, hi) => v >= lo - tol && v <= hi + tol;
    const pts = [];
    if (Math.abs(b) > eps) {
      let y = (c - a * x0) / b;
      if (within(y, y0, y1)) pts.push({ x: x0, y });
      y = (c - a * x1) / b;
      if (within(y, y0, y1)) pts.push({ x: x1, y });
    }
    if (Math.abs(a) > eps) {
      let x = (c - b * y0) / a;
      if (within(x, x0, x1)) pts.push({ x, y: y0 });
      x = (c - b * y1) / a;
      if (within(x, x0, x1)) pts.push({ x, y: y1 });
    }
    const uniq = [];
    pts.forEach((p) => {
      if (!uniq.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 1e-6)) uniq.push(p);
    });
    if (uniq.length < 2) return null; // line doesn't cross the visible window at all
    let best = [uniq[0], uniq[1]], bestD = -1;
    for (let i = 0; i < uniq.length; i++) {
      for (let j = i + 1; j < uniq.length; j++) {
        const d = Math.hypot(uniq[i].x - uniq[j].x, uniq[i].y - uniq[j].y);
        if (d > bestD) { bestD = d; best = [uniq[i], uniq[j]]; }
      }
    }
    return best;
  }
  /* ---- draw one line "ax + by = c" — the whole solution set of a single linear
     equation in two unknowns. Solid (not dashed) since, unlike a guideLine, this
     IS the mathematical object being taught here, not just a reference mark. ---- */
  _strokeSystemLine(line) {
    const range = this.range;
    const x0 = this.center.x - range, x1 = this.center.x + range;
    const y0 = this.center.y - range, y1 = this.center.y + range;
    const seg = this._clipLineToBox(line.a, line.b, line.c, x0, x1, y0, y1);
    if (!seg) return;
    const p1 = this.toScreen(seg[0].x, seg[0].y), p2 = this.toScreen(seg[1].x, seg[1].y);
    const ctx = this.ctx;
    ctx.save();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = line.color || "#1d5fb8";
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    ctx.restore();
    if (line.label) {
      // nudged in from one clipped endpoint (not the exact edge) so the text
      // never gets cut off by the canvas boundary
      const t = 0.14;
      const lx = p1.x + (p2.x - p1.x) * t, ly = p1.y + (p2.y - p1.y) * t;
      ctx.font = "bold 12px sans-serif";
      ctx.fillStyle = line.color || "#1d5fb8";
      ctx.fillText(line.label, lx + 6, ly - 6);
    }
  }

  /* ---- a raw (non-transformed) labeled arrow from the origin to an arbitrary
     vector — the "any vector, not just this matrix's own columns" counterpart
     to showBasisVectors/_strokeVector (which always runs through applyM). ---- */
  _strokeRawVector(v) {
    const origin = this.toScreen(0, 0);
    const tip = this.toScreen(v.v.x, v.v.y);
    const ctx = this.ctx;
    const color = v.color || "#1d5fb8";
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
    const ang = Math.atan2(tip.y - origin.y, tip.x - origin.x);
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x - 10 * Math.cos(ang - 0.3), tip.y - 10 * Math.sin(ang - 0.3));
    ctx.lineTo(tip.x - 10 * Math.cos(ang + 0.3), tip.y - 10 * Math.sin(ang + 0.3));
    ctx.closePath(); ctx.fill();
    if (v.label) {
      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = color;
      ctx.fillText(v.label, tip.x + 8, tip.y - 8);
    }
  }

  /* ---- filled parallelogram spanned by two arbitrary vectors from the origin,
     with its area shown as a live label — the visual half of "Cramer's Rule as
     a ratio of areas" (see the `parallelograms` constructor option above). ---- */
  _fillParallelogram(p) {
    const o = this.toScreen(0, 0);
    const a = this.toScreen(p.v1.x, p.v1.y);
    const b = this.toScreen(p.v1.x + p.v2.x, p.v1.y + p.v2.y);
    const c = this.toScreen(p.v2.x, p.v2.y);
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(o.x, o.y); ctx.lineTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y);
    ctx.closePath();
    ctx.fillStyle = p.color || "#1d5fb8";
    ctx.globalAlpha = p.alpha != null ? p.alpha : 0.2;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = p.color || "#1d5fb8";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    if (p.label) {
      const area = Math.abs(p.v1.x * p.v2.y - p.v1.y * p.v2.x);
      const midX = (o.x + a.x + b.x + c.x) / 4, midY = (o.y + a.y + b.y + c.y) / 4;
      ctx.font = "bold 12px sans-serif";
      ctx.fillStyle = p.color || "#1d5fb8";
      ctx.textAlign = "center";
      ctx.fillText(`${p.label} = ${area.toFixed(2)}`, midX, midY);
      ctx.textAlign = "left";
    }
  }

  _detReadoutHTML() {
    const m = this.matrix;
    const det = m.a * m.d - m.b * m.c;
    const area = Math.abs(det).toFixed(2);
    let note;
    if (Math.abs(det) < 0.05) {
      note = `<span style="color:#c23b3b;font-weight:800">🫓 Flattened to a line! det ≈ 0 — every point on the square just collapsed onto that line.</span>`;
    } else if (det < 0) {
      note = `<span style="color:#7a3fd1;font-weight:800">🔄 Orientation flipped — det is negative.</span>`;
    } else {
      note = `<span style="color:#178a4c;font-weight:800">✅ Still a normal parallelogram (det &gt; 0).</span>`;
    }
    return `det = <b>${det.toFixed(2)}</b> &nbsp;·&nbsp; area scale factor = <b>${area}</b><br>${note}`;
  }

  // ---- interaction ----
  _bindEvents() {
    const start = (evt) => this._onDown(evt);
    const move = (evt) => this._onMove(evt);
    const end = () => this._onUp();
    this.canvas.addEventListener("mousedown", start);
    this.canvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    this.canvas.addEventListener("touchstart", (e) => { start(e); }, { passive: true });
    this.canvas.addEventListener("touchmove", (e) => { e.preventDefault(); move(e); }, { passive: false });
    window.addEventListener("touchend", end);
  }
  _hitBasis(pt) {
    // lockedBasis: "i" | "j" locks just that one arrow; "both" locks red and purple
    // together (used when a stage needs a completely fixed matrix to read, not drag).
    if (!this.draggableBasis || this.lockedBasis === "both") return null;
    const iTip = this.toScreen(this.matrix.a, this.matrix.c);
    const jTip = this.toScreen(this.matrix.b, this.matrix.d);
    const dI = Math.hypot(pt.x - iTip.x, pt.y - iTip.y);
    const dJ = Math.hypot(pt.x - jTip.x, pt.y - jTip.y);
    const HIT = 22;
    if (this.lockedBasis !== "i" && dI < HIT && dI <= dJ) return "i";
    if (this.lockedBasis !== "j" && dJ < HIT) return "j";
    return null;
  }
  _hitFreePoint(pt) {
    if (!this.freePoint) return false;
    const s = this.toScreen(this.freePoint.x, this.freePoint.y);
    return Math.hypot(pt.x - s.x, pt.y - s.y) < 22;
  }
  _hitDraggablePoint(pt) {
    if (!this.draggablePoints) return -1;
    for (let i = 0; i < this.draggablePoints.length; i++) {
      const s = this.toScreen(this.draggablePoints[i].x, this.draggablePoints[i].y);
      if (Math.hypot(pt.x - s.x, pt.y - s.y) < 22) return i;
    }
    return -1;
  }
  _onDown(evt) {
    const pt = this.canvasPointFromEvent(evt);
    const hitBasis = this._hitBasis(pt);
    if (hitBasis) { this._dragging = hitBasis; return; }
    if (this._hitFreePoint(pt)) { this._dragging = "free"; return; }
    const hitPointIdx = this._hitDraggablePoint(pt);
    if (hitPointIdx !== -1) { this._draggingPointIndex = hitPointIdx; return; }
    if (this.drawable && this.drawModeOn) {
      this._penDown = true;
      this.shape = [this.toWorld(pt.x, pt.y)];
      this.draw();
    }
  }
  _onMove(evt) {
    if (this._dragging === "i" || this._dragging === "j") {
      const pt = this.canvasPointFromEvent(evt);
      const w = this.toWorld(pt.x, pt.y);
      if (this._dragging === "i") { this.matrix.a = round2(w.x); this.matrix.c = round2(w.y); }
      else { this.matrix.b = round2(w.x); this.matrix.d = round2(w.y); }
      this.draw(); this.onMatrixChange(this.matrix);
      return;
    }
    if (this._dragging === "free") {
      const pt = this.canvasPointFromEvent(evt);
      const w = this.toWorld(pt.x, pt.y);
      this.freePoint.x = round2(w.x); this.freePoint.y = round2(w.y);
      this.draw(); this.onFreePointChange(this.freePoint);
      return;
    }
    if (this._draggingPointIndex !== null) {
      const pt = this.canvasPointFromEvent(evt);
      const w = this.toWorld(pt.x, pt.y);
      const p = this.draggablePoints[this._draggingPointIndex];
      if (this.dragAxisLock === "x" || this.dragAxisLock == null) p.x = round2(w.x);
      if (this.dragAxisLock === "y" || this.dragAxisLock == null) p.y = round2(w.y);
      this.draw();
      this.onDraggablePointsChange(this.draggablePoints);
      return;
    }
    if (this.drawable && this.drawModeOn && this._penDown) {
      const pt = this.canvasPointFromEvent(evt);
      this.shape.push(this.toWorld(pt.x, pt.y));
      this.draw();
    }
  }
  _onUp() { this._dragging = null; this._draggingPointIndex = null; this._penDown = false; }
}

function round2(n) {
  // "magnet" — only snap when close to a whole number (within MAGNET_RANGE); otherwise move freely.
  // Whole numbers are easy to count and pattern-find, but forcing every position to one feels sticky/jumpy.
  const MAGNET_RANGE = 0.15;
  const nearest = Math.round(n);
  return Math.abs(n - nearest) < MAGNET_RANGE ? nearest : n;
}

const MATRIX_LAB_PRESETS = {
  house: [
    { x: -2, y: -2 }, { x: 2, y: -2 }, { x: 2, y: 1 }, { x: 0, y: 3 },
    { x: -2, y: 1 }, { x: -2, y: -2 }, { x: -1, y: -2 }, { x: -1, y: -0.5 },
    { x: 0, y: -0.5 }, { x: 0, y: -2 },
  ],
  star: (() => {
    const pts = [];
    for (let i = 0; i < 11; i++) {
      const r = i % 2 === 0 ? 2.4 : 1.0;
      const ang = (Math.PI / 5) * i - Math.PI / 2;
      pts.push({ x: r * Math.cos(ang), y: r * Math.sin(ang) });
    }
    pts.push(pts[0]);
    return pts;
  })(),
  arrow: [
    { x: -2.5, y: -0.6 }, { x: 0.5, y: -0.6 }, { x: 0.5, y: -1.4 },
    { x: 2.5, y: 0 }, { x: 0.5, y: 1.4 }, { x: 0.5, y: 0.6 },
    { x: -2.5, y: 0.6 }, { x: -2.5, y: -0.6 },
  ],
  boat: [
    { x: -2.5, y: -1 }, { x: 2.5, y: -1 }, { x: 1.6, y: -2.2 }, { x: -1.6, y: -2.2 }, { x: -2.5, y: -1 },
    { x: 0, y: -1 }, { x: 0, y: 2.5 }, { x: 2, y: 0.5 }, { x: 0, y: -1 },
  ],
};
