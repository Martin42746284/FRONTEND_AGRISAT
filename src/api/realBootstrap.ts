/**
 * Bootstrap 100 % Malto — aucune donnée fictive dans les parcelles, régions, communes.
 *
 * Sources réelles (backend Malto, base Neon Postgres) :
 *   GET /api/parcelles      → parcelles FTW classifiées orge / non-orge (RF Sentinel-2)
 *   GET /api/zone-parcels   → tracés VHR (Delineate Anything) autour d'Antsirabe
 *
 * Régions et communes sont reconstruites À PARTIR DES PARCELLES réelles (enveloppe
 * convexe des centroïdes), plus aucune géométrie fictive. Les utilisateurs, analyses
 * et journal d'audit démarrent vides : Malto n'expose pas (encore) de routes pour eux.
 */
import type { Analysis, AuditEntry, Commune, LatLng, Parcel, Region, User } from '../types';
import { request } from './http';
import { maltoConfigured } from './services';
import { maltoToFrontend, type MaltoParcel } from './maltoAdapter';
import { convexHull, scaleAround, centroidOf, ringAreaHa } from '../lib/geometry';
import { REJECTED_PARCEL_SOURCE } from '../lib/parcel-sources';
import type { RejectedParcel } from '../lib/rejections';

/** Réponse du bootstrap : données 100 % réelles, comptes/analyses vides. */
export interface BootstrapDb {
  regions: Region[];
  communes: Commune[];
  parcels: Parcel[];
  /** Contours automatiques supprimés — à réappliquer sur les nouveaux tracés. */
  rejectedParcels: RejectedParcel[];
  analyses: Analysis[];
  users: User[];
  audit: AuditEntry[];
}


/**
 * Construit une « commune » unique (et sa région) à partir des parcelles réelles :
 * enveloppe convexe de tous les centroïdes. Si Malto expose un jour plusieurs
 * régions, on regroupera ici par région réelle.
 */
function deriveZones(parcels: Parcel[]): { regions: Region[]; communes: Commune[] } {
  const centroids = parcels.filter((p) => !p.rejected).map((p) => p.centroid);
  if (!centroids.length) return { regions: [], communes: [] };

  const hull = convexHull(centroids);
  const ctr = centroidOf(hull);
  const region: Region = {
    id: 'malto-zone',
    name: 'Zone Malto (Vakinankaratra)',
    center: ctr,
    outline: scaleAround(hull, ctr, 1.12),
  };
  const commune: Commune = {
    id: 'malto-antsirabe',
    regionId: region.id,
    name: 'Antsirabe — données Malto',
    code: 'MALTO',
    center: ctr,
    outline: scaleAround(hull, ctr, 1.06),
    coverage: 'analysee',
    imageDate: null,
    cloudCover: 0,
  };
  return { regions: [region], communes: [commune] };
}

/** Assigne chaque parcelle à la commune/région dérivée (tout est dedans par construction). */
function assignZones(parcels: Parcel[], regions: Region[], communes: Commune[]): Parcel[] {
  return parcels.map((p) => ({
    ...p,
    regionId: regions[0]?.id ?? '',
    communeId: communes[0]?.id ?? '',
  }));
}

/**
 * Délai propre à la lecture de la table `parcelles`.
 *
 * Le backend relit toutes les lignes avec leurs colonnes JSONB (contours, séries
 * temporelles), ce qui coûte 20 à 35 s sur Neon, réveil du calcul compris. Le délai
 * par défaut de `request` (20 s) coupait la requête avant la réponse : la carte
 * restait vide alors que la base était saine. Marge au-dessus du timeout serveur (90 s).
 */
const PARCELLES_TIMEOUT_MS = 120_000;

/** Bootstrap réel : parcelles Malto enregistrées en base + zones dérivées + comptes vides. */
export async function bootstrapReal(): Promise<BootstrapDb> {
  if (!maltoConfigured()) {
    console.warn('[AgriSat] VITE_MALTO_API_URL non défini — aucune donnée affichée (backend non configuré).');
    return { regions: [], communes: [], parcels: [], rejectedParcels: [], analyses: [], users: [], audit: [] };
  }

  // 1) Parcelles classifiées enregistrées dans la base de données Malto.
  // Les lignes « Tracé automatique supprimé » sont des marqueurs de suppression,
  // pas des parcelles : on les retire de la carte et on les renvoie séparément
  // pour que le traçage automatique ne les réaffiche pas.
  const rows = await request<MaltoParcel[]>('/api/parcelles', {}, PARCELLES_TIMEOUT_MS);
  const kept: MaltoParcel[] = [];
  const rejectedParcels: RejectedParcel[] = [];
  for (const row of rows) {
    if (row.data_source !== REJECTED_PARCEL_SOURCE) {
      kept.push(row);
      continue;
    }
    const coords: LatLng[] = (row.coordinates ?? []).map((c) => [c.lat, c.lng] as LatLng);
    if (coords.length < 3) continue;
    const centroid: LatLng = row.center_lat != null && row.center_lng != null
      ? [row.center_lat, row.center_lng]
      : centroidOf(coords);
    rejectedParcels.push({
      id: row.id,
      coords,
      centroid,
      areaHa: row.surface_ha && row.surface_ha > 0 ? row.surface_ha : ringAreaHa(coords),
      at: row.created_at ?? new Date().toISOString(),
    });
  }
  const ftw = maltoToFrontend(kept);

  // Plus de pré-chargement statique VHR en base : les contours VHR sont tracés
  // dynamiquement sur la carte par le traçage automatique de l'écran (useViewportParcelTracing).
  const zones = deriveZones(ftw);
  const parcels = assignZones(ftw, zones.regions, zones.communes);

  console.info(`[AgriSat] Données réelles : ${parcels.length} parcelles enregistrées, ${zones.regions.length} région(s), ${zones.communes.length} commune(s).`);

  return {
    regions: zones.regions,
    communes: zones.communes,
    parcels,
    rejectedParcels,
    analyses: [],
    users: [],
    audit: [],
  };
}
