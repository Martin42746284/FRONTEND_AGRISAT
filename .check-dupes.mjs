// .check-dupes.ts
import fs from "node:fs";

// src/lib/geometry.ts
var M_PER_DEG_LAT = 110574;
var mPerDegLng = (lat) => 111320 * Math.cos(lat * Math.PI / 180);
function ringAreaHa(coords) {
  const n = coords.length;
  if (n < 3) return 0;
  const [la0, lo0] = coords[0];
  const kx = mPerDegLng(la0);
  const pts = coords.map(([la, lo]) => [(lo - lo0) * kx, (la - la0) * M_PER_DEG_LAT]);
  let a = 0;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % n];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2 / 1e4;
}
function isDuplicateVhrParcel(a, b) {
  if (a.id === b.id) return true;
  if (!a.coords?.length || !b.coords?.length || a.areaHa <= 0 || b.areaHa <= 0) return false;
  const areaA = a.areaHa * 1e4;
  const areaB = b.areaHa * 1e4;
  const minArea = Math.min(areaA, areaB);
  const maxArea = Math.max(areaA, areaB);
  const areaRatio = minArea / maxArea;
  const degMargin = 25 / M_PER_DEG_LAT;
  const [[minLaA, minLoA], [maxLaA, maxLoA]] = bboxOf(a.coords);
  const [[minLaB, minLoB], [maxLaB, maxLoB]] = bboxOf(b.coords);
  if (minLaA > maxLaB + degMargin || maxLaA < minLaB - degMargin || minLoA > maxLoB + degMargin || maxLoA < minLoB - degMargin) {
    return false;
  }
  if (areaRatio >= 0.25) {
    if (pointInPolygon(a.centroid, b.coords) || pointInPolygon(b.centroid, a.coords)) {
      return true;
    }
  }
  const latitude = (a.centroid[0] + b.centroid[0]) / 2;
  const east = (a.centroid[1] - b.centroid[1]) * mPerDegLng(latitude);
  const north = (a.centroid[0] - b.centroid[0]) * M_PER_DEG_LAT;
  const centerDistM = Math.hypot(north, east);
  const centerToleranceM = Math.max(18, Math.min(45, Math.sqrt(maxArea) * 0.22));
  if (areaRatio >= 0.4 && centerDistM <= centerToleranceM) {
    return true;
  }
  return false;
}
function centroidOf(coords) {
  const n = coords.length;
  return [coords.reduce((s, c) => s + c[0], 0) / n, coords.reduce((s, c) => s + c[1], 0) / n];
}
function pointInPolygon(pt, poly) {
  const [y, x] = pt;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i];
    const [yj, xj] = poly[j];
    if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function bboxOf(coords) {
  let minLa = Infinity, minLo = Infinity, maxLa = -Infinity, maxLo = -Infinity;
  for (const [la, lo] of coords) {
    if (la < minLa) minLa = la;
    if (la > maxLa) maxLa = la;
    if (lo < minLo) minLo = lo;
    if (lo > maxLo) maxLo = lo;
  }
  return [[minLa, minLo], [maxLa, maxLo]];
}

// src/api/http.ts
var envLike = import.meta.env ?? globalThis.__AGRI_ENV__ ?? {};
var API_BASE = envLike.VITE_MALTO_API_URL?.replace(/\/+$/, "") ?? "";

// src/data/constants.ts
var CULTURES = [
  { id: "orge", label: "Orge", color: "#E3B505", kind: "culture" },
  { id: "riz", label: "Riz", color: "#3E9B4F", kind: "culture" },
  { id: "haricot", label: "Haricot", color: "#3A6EDC", kind: "culture" },
  { id: "mais", label: "Ma\xEFs", color: "#E8793A", kind: "culture" },
  { id: "manioc", label: "Manioc", color: "#8C6A4F", kind: "culture" },
  { id: "pomme_de_terre", label: "Pomme de terre", color: "#B34FA0", kind: "culture" },
  { id: "autre", label: "Autre culture", color: "#7B5FC6", kind: "culture" },
  { id: "jachere", label: "Jach\xE8re", color: "#CDB892", kind: "couverture" },
  { id: "sol_nu", label: "Sol nu", color: "#A59D93", kind: "couverture" },
  { id: "vegetation", label: "V\xE9g\xE9tation naturelle", color: "#1E6B4B", kind: "couverture" },
  { id: "eau", label: "Eau", color: "#5BB9E6", kind: "couverture" },
  { id: "inconnue", label: "Inconnue", color: "#8A9199", kind: "couverture" }
];
var CULTURE_BY_ID = Object.fromEntries(CULTURES.map((c) => [c.id, c]));
var DEFAULT_COLORS = Object.fromEntries(CULTURES.map((c) => [c.id, c.color]));
var SEASONS = [
  { id: "2026-C", label: "2026 \xB7 Contre-saison (mai\u2013oct.)", short: "Contre-saison 2026", start: "2026-05-01", end: "2026-10-31", type: "C", modelVersion: "RF 1.1.0 / ResUNet 1.2.0", note: "Acquisition en cours" },
  { id: "2025-2026-P", label: "2025\u20132026 \xB7 Saison des pluies (nov.\u2013avr.)", short: "Pluies 2025\u201326", start: "2025-11-01", end: "2026-04-30", type: "P", modelVersion: "RF 1.1.0 / ResUNet 1.2.0" },
  { id: "2025-C", label: "2025 \xB7 Contre-saison (mai\u2013oct.)", short: "Contre-saison 2025", start: "2025-05-01", end: "2025-10-31", type: "C", modelVersion: "RF 0.9.2 / U-Net 0.9.0" },
  { id: "2024-2025-P", label: "2024\u20132025 \xB7 Saison des pluies (nov.\u2013avr.)", short: "Pluies 2024\u201325", start: "2024-11-01", end: "2025-04-30", type: "P", modelVersion: "RF 0.9.2 / U-Net 0.9.0" }
];
var SEASON_BY_ID = Object.fromEntries(SEASONS.map((s) => [s.id, s]));
var DEFAULT_SEASON = "2026-C";
var CURRENT_MODEL = "RF 1.1.0 / ResUNet 1.2.0";

// src/api/maltoAdapter.ts
var CULTURE_MAP = {
  "orge": "orge",
  "barley": "orge",
  "riz": "riz",
  "rice": "riz",
  "paddy": "riz",
  "haricot": "haricot",
  "bean": "haricot",
  "haricots": "haricot",
  "ma\xEFs": "mais",
  "mais": "mais",
  "corn": "mais",
  "maize": "mais",
  "manioc": "manioc",
  "cassava": "manioc",
  "pomme de terre": "pomme_de_terre",
  "potato": "pomme_de_terre",
  "pdt": "pomme_de_terre",
  "jach\xE8re": "jachere",
  "jachere": "jachere",
  "fallow": "jachere",
  "sol nu": "sol_nu",
  "bare": "sol_nu",
  "bare soil": "sol_nu",
  "v\xE9g\xE9tation": "vegetation",
  "vegetation": "vegetation",
  "eau": "eau",
  "water": "eau",
  "unknown": "inconnue",
  "inconnue": "inconnue"
};
function mapCulture(raw) {
  if (!raw) return "inconnue";
  return CULTURE_MAP[raw.trim().toLowerCase()] ?? "autre";
}
function orgeProbFromVerdict(verdict) {
  if (!verdict) return null;
  const m = verdict.match(/probabilit[ée]\s*d['’]orge\s*(\d+(?:[.,]\d+)?)\s*%/i);
  return m ? Number(m[1].replace(",", ".")) / 100 : null;
}
function isNonOrge(p) {
  const raw = (p.culture_detected ?? "").toLowerCase();
  return raw.includes("non-orge") || raw.includes("non orge");
}
function mapConfidence(p) {
  const declared = (p.culture_detected ?? "").trim() !== "";
  if (!declared) return 0.05;
  let conf = p.confidence ?? orgeProbFromVerdict(p.verdict);
  if (conf == null) conf = p.ndvi_percentage != null ? p.ndvi_percentage / 100 : 0.5;
  else if (conf > 1) conf /= 100;
  return Math.min(0.99, Math.max(0.05, conf));
}
function mapStatus(p, conf) {
  const v = (p.verdict ?? "").toLowerCase();
  if (v.includes("valid\xE9") || v.includes("valide") || v.includes("terrain")) return "verifie_terrain";
  if (v.includes("corrig")) return "corrige";
  if (v.includes("obsol")) return "obsolete";
  if (conf < 0.5) return "incertain";
  return "non_verifie";
}
function mapSeason(raw) {
  const s = raw?.trim() ?? "";
  if (s && SEASON_BY_ID[s]) return { id: s, stage: s };
  return { id: DEFAULT_SEASON, stage: s };
}
var EMPTY_CULTURE_LABELS = /* @__PURE__ */ new Set(["", "inconnue", "inconnu", "unknown", "non d\xE9termin\xE9", "non determine", "n/a"]);
function mapCultureDetail(p) {
  const declared = p.culture_declared?.trim() || null;
  const detected = p.culture_detected?.trim() || null;
  const declaredCulture = declared && !EMPTY_CULTURE_LABELS.has(declared.toLowerCase()) ? declared : null;
  const hasCulture = Boolean(
    detected || declaredCulture || p.ndvi_percentage != null || p.confidence != null
  );
  if (!hasCulture) return void 0;
  const timeSeries = (p.time_series_s2 ?? []).flatMap((point) => {
    const date = typeof point?.date === "string" ? point.date.trim() : "";
    if (!date) return [];
    return [{ date, ndvi: typeof point.ndvi === "number" ? point.ndvi : null }];
  });
  return {
    declared: declaredCulture,
    detected,
    confidence: p.confidence ?? null,
    verdict: p.verdict ?? null,
    details: p.details ?? null,
    ndvi: p.ndvi_percentage ?? null,
    ndre: p.ndre ?? null,
    evi: p.evi ?? null,
    savi: p.savi ?? null,
    ndwi: p.ndwi ?? null,
    spectralBands: p.spectral_bands ?? null,
    seasonLabel: p.saison ?? null,
    growthStage: p.growth_stage ?? null,
    plantingDate: p.estimated_planting_date ?? null,
    harvestDate: p.estimated_harvest_date ?? null,
    daysSincePlanting: p.days_since_planting ?? null,
    plantingConfidence: p.planting_confidence ?? null,
    soilType: p.soil_type ?? null,
    riskFactors: p.risk_factors ?? [],
    recommendations: p.recommendations ?? null,
    ownerName: p.owner_name ?? null,
    notes: p.notes ?? null,
    source: p.data_source ?? null,
    timeSeries,
    agroScore: p.agro_score ?? null,
    hybridScore: p.hybrid_score ?? null,
    cnnProbBarley: p.cnn_prob_barley ?? null,
    cnnProbNonBarley: p.cnn_prob_non_barley ?? null,
    createdAt: p.created_at ?? null
  };
}
function maltoToFrontend(parcels, zones) {
  return parcels.filter((p) => Array.isArray(p.coordinates) && p.coordinates.length >= 3).map((p) => {
    const coords = (p.coordinates ?? []).map((c) => [c.lat, c.lng]);
    const centroid = p.center_lat != null && p.center_lng != null ? [p.center_lat, p.center_lng] : avgPoint(coords);
    const season = mapSeason(p.saison);
    const isBarley = !isNonOrge(p);
    const culture = !isBarley ? "autre" : (p.culture_detected ?? "").trim() !== "" ? "orge" : mapCulture(p.culture_declared) || "inconnue";
    const conf = mapConfidence(p);
    const processedAt = p.created_at || (/* @__PURE__ */ new Date()).toISOString();
    const result = {
      seasonId: season.id,
      culture,
      confidence: conf,
      probs: { [culture]: conf },
      status: mapStatus(p, conf),
      analysisId: `MALTO-${p.id.slice(0, 8)}`,
      modelVersion: `Malto FTW${season.stage !== season.id ? ` \xB7 ${season.stage}` : ""} (RF ${CURRENT_MODEL.includes("RF") ? CURRENT_MODEL : ""})`.trim(),
      processedAt,
      observedFrom: processedAt.slice(0, 10),
      observedTo: processedAt.slice(0, 10)
    };
    let regionId = "";
    let communeId = "";
    if (zones) {
      regionId = zones.regions.find((r) => pointInPolygon(centroid, r.outline))?.id ?? "";
      communeId = zones.communes.find((c) => pointInPolygon(centroid, c.outline))?.id ?? "";
    }
    const areaHa = p.surface_ha && p.surface_ha > 0 ? p.surface_ha : ringAreaHa(coords);
    return {
      id: p.id,
      communeId,
      regionId,
      coords,
      centroid,
      areaHa,
      detectionConfidence: conf,
      createdAt: processedAt,
      results: { [season.id]: result },
      corrections: [],
      dataSource: p.data_source ?? void 0,
      cultureDetail: mapCultureDetail(p),
      rejected: false
    };
  });
}
function avgPoint(coords) {
  if (!coords.length) return [0, 0];
  let x = 0;
  let y = 0;
  for (const [a, b] of coords) {
    x += a;
    y += b;
  }
  return [x / coords.length, y / coords.length];
}
function maltoVhrToFrontend(features, zones, idPrefix = "") {
  return features.map((f) => {
    let ring = [];
    if (f.geometry?.type === "Polygon") {
      ring = f.geometry.coordinates[0] ?? [];
    } else if (f.geometry?.type === "MultiPolygon") {
      const polygons = f.geometry.coordinates;
      ring = polygons.flat().reduce((best, r) => r.length > best.length ? r : best, []);
    }
    const coords = ring.map(([lng, lat]) => [lat, lng]);
    if (coords.length < 3) return null;
    const centroid = avgPoint(coords);
    const rawConf = f.properties.confidence != null ? f.properties.confidence : 50;
    const conf = Math.min(0.99, Math.max(0.01, rawConf > 1 ? rawConf / 100 : rawConf));
    const processedAt = (/* @__PURE__ */ new Date()).toISOString();
    const result = {
      seasonId: DEFAULT_SEASON,
      culture: "inconnue",
      // pas de classification de culture sur les tracés VHR
      confidence: conf,
      probs: { inconnue: conf },
      status: "incertain",
      // équiv. « non classé » (contours pointillés, REC-09)
      analysisId: "MALTO-VHR",
      modelVersion: `Delineate Anything${f.properties.source ? ` \xB7 ${f.properties.source}` : ""}`,
      processedAt,
      observedFrom: processedAt.slice(0, 10),
      observedTo: processedAt.slice(0, 10)
    };
    let regionId = "";
    let communeId = "";
    if (zones) {
      regionId = zones.regions.find((r) => pointInPolygon(centroid, r.outline))?.id ?? "";
      communeId = zones.communes.find((c) => pointInPolygon(centroid, c.outline))?.id ?? "";
    }
    const p = {
      // Le modèle redémarre sa numérotation (VHR-0001, …) à chaque requête.
      // Préfixer avec la tuile empêche le store de confondre deux parcelles distinctes.
      id: f.properties.parcel_id ? `${idPrefix ? `${idPrefix}-` : ""}${f.properties.parcel_id}` : `${idPrefix ? `${idPrefix}-` : "VHR-"}${Math.random().toString(36).slice(2, 10)}`,
      communeId,
      regionId,
      coords,
      centroid,
      areaHa: f.properties.area_ha ?? ringAreaHa(coords),
      detectionConfidence: conf,
      createdAt: processedAt,
      results: { [DEFAULT_SEASON]: result },
      corrections: [],
      rejected: false
    };
    return p;
  }).filter((p) => p !== null);
}

// src/lib/rejections.ts
var MAX_CENTROID_DISTANCE_M = 8;
var MIN_AREA_RATIO = 0.5;
function isRejectedParcel(parcel, rejections2) {
  return rejections2.some((rejection) => {
    if (rejection.id === parcel.id) return true;
    const maxArea = Math.max(rejection.areaHa, parcel.areaHa);
    const minArea = Math.min(rejection.areaHa, parcel.areaHa);
    if (maxArea <= 0 || minArea / maxArea < MIN_AREA_RATIO) return false;
    const latitude = (rejection.centroid[0] + parcel.centroid[0]) / 2;
    const east = (rejection.centroid[1] - parcel.centroid[1]) * mPerDegLng(latitude);
    const north = (rejection.centroid[0] - parcel.centroid[0]) * M_PER_DEG_LAT;
    return Math.hypot(east, north) <= MAX_CENTROID_DISTANCE_M;
  });
}

// .check-dupes.ts
var rows = JSON.parse(fs.readFileSync("../parcelles.json", "utf8"));
var db = maltoToFrontend(rows);
var rejections = [];
for (const row of rows) {
  if (row.data_source !== "Trac\xE9 automatique supprim\xE9") continue;
  const coords = (row.coordinates ?? []).map((c) => [c.lat, c.lng]);
  if (coords.length < 3) continue;
  rejections.push({
    id: row.id,
    coords,
    centroid: row.center_lat != null ? [row.center_lat, row.center_lng] : centroidOf(coords),
    areaHa: row.surface_ha && row.surface_ha > 0 ? row.surface_ha : ringAreaHa(coords),
    at: row.created_at ?? (/* @__PURE__ */ new Date()).toISOString()
  });
}
var zone = JSON.parse(fs.readFileSync("../zone.json", "utf8"));
var traced = maltoVhrToFrontend(zone.geojson.features, void 0, "tile-test");
var fresh = traced.filter(
  (candidate) => !isRejectedParcel(candidate, rejections) && !db.some((parcel) => isDuplicateVhrParcel(parcel, candidate))
);
console.log("db", db.length, "rejections", rejections.length, "traced", traced.length, "fresh", fresh.length);
var jecam = db.filter((p) => p.id && rows.find((r) => r.id === p.id)?.label?.startsWith("jecam-vhr"));
console.log("db jecam-vhr rows", jecam.length);
console.log("db by data source", [...new Set(rows.map((r) => r.data_source))].map((s) => [String(s).slice(0, 40), rows.filter((r) => r.data_source === s).length]));
console.log("traced sample", traced.slice(0, 2).map((p) => ({ area: p.areaHa, centroid: p.centroid })));
console.log("db vhr sample", jecam.slice(0, 2).map((p) => ({ area: p.areaHa, centroid: p.centroid })));
