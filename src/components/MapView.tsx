import { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, useApp } from '../store/useApp';
import { computeStyle } from '../lib/style';
import { bboxOfAll } from '../lib/geometry';
import { ROLES } from '../data/constants';
import { SPLIT_SNAP_TOLERANCE_M, snapToRing, splitParcelByCut } from '../lib/polygon-split';
import type { LatLng, Parcel } from '../types';
import { isAnalyzedParcel } from '../lib/analysis-parcels';
import { GEMINI_OUTLINE_COLOR, parcelOutlineStyle, strokeBoostForZoom } from '../lib/parcel-outline-style';
import { isGeminiParcel } from '../lib/parcel-sources';
import { pickParcelAt } from '../lib/parcel-selection';
import { candidateCulture, parcelForCandidate, parcelShowsCandidateCulture } from '../lib/candidate-parcel';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

/**
 * Ordre d'empilement des contours de parcelles.
 *
 * Toutes les parcelles partagées le meme z-index : le Traceur se fait alors
 * dans l'ordre d'ajout, et un grand champ masque les petits contours qu'il
 * englobe. On empile donc les petites parcelles au-dessus des grandes, ce
 * qui correspond a l'ordre de lecture attendu (on voit les details, le
 * contour global reste en fond).
 */
function outlineZIndex(parcel: Parcel): number {
  const ha = parcel.areaHa;
  if (ha < 0.1) return 18;
  if (ha < 0.5) return 16;
  if (ha < 1) return 14;
  if (ha < 3) return 12;
  return 10;
}
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };

/** Épingle commune aux bornes, à l'emplacement recherché et au brouillon. */
const PIN_PATH = 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z';

function pinIcon(color: string, scale: number): google.maps.Symbol {
  return {
    path: PIN_PATH,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#fff',
    strokeWeight: 1.6,
    scale,
    anchor: new google.maps.Point(12, 23),
  };
}

/** Style d'un sommet de la coupe : extrémités plus visibles que les points intermédiaires. */
function splitVertexIcon(end: boolean): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: end ? 7 : 5,
    fillColor: '#fff',
    fillOpacity: 1,
    strokeColor: '#B60319',
    strokeWeight: end ? 3 : 2,
  };
}

/** Contenu texte de la bulle : jamais de HTML interpolé avec un nom saisi. */
function locationInfo(title: string, lat: number, lng: number, kind: 'borne' | 'coords'): HTMLElement {
  const root = document.createElement('div');
  root.className = 'borne-info';
  root.dataset.kind = kind;
  const type = document.createElement('em');
  type.textContent = kind === 'borne' ? 'Borne GPS' : 'Emplacement recherché';
  const name = document.createElement('strong');
  name.textContent = title;
  const coords = document.createElement('span');
  coords.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  root.append(type, name, coords);
  return root;
}

export default function MapView({ baseIds }: { baseIds: Set<string> }) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const parcels = useApp((s) => s.parcels);
  const communes = useApp((s) => s.communes);
  const regions = useApp((s) => s.regions);
  const f = useApp((s) => s.filters);
  const colors = useApp((s) => s.colors);
  const threshold = useApp((s) => s.threshold);
  const selectedId = useApp((s) => s.selectedId);
  const mapZoom = useApp((s) => s.mapZoom);
  // Paliers de zoom : le rendu des 4 000 contours n'est recalculé qu'au
  // franchissement d'un palier, pas à chaque cran de molette.
  const zoomBoost = strokeBoostForZoom(mapZoom);
  const basemap = useApp((s) => s.basemap);

  const showCoverage = useApp((s) => s.showCoverage);
  const fly = useApp((s) => s.fly);
  const drawing = useApp((s) => s.drawing);
  const draft = useApp((s) => s.draft);
  const manualParcelDraft = useApp((s) => s.manualParcelDraft);
  const drawMode = useApp((s) => s.drawMode);
  const zone = useApp((s) => s.zone);
  const automaticDetection = useApp((s) => s.automaticDetection);
  const automaticSearchCenter = useApp((s) => s.automaticSearchCenter);
  const automaticSearchRadius = useApp((s) => s.automaticSearchRadius);
  const editingParcelId = useApp((s) => s.editingParcelId);
  // Lisibilité renforcée automatique : satellite à l'échelle de la parcelle
  // (zoom >= 15), ou pendant le tracé / l'édition d'un contour.
  const readability = basemap === 'satellite' && (mapZoom >= 15 || drawing || !!editingParcelId);
  const splitParcelId = useApp((s) => s.splitParcelId);
  const splitDraft = useApp((s) => s.splitDraft);
  const geminiCapture = useApp((s) => s.geminiCapture);
  const bornes = useApp((s) => s.bornes);
  const bornePlacement = useApp((s) => s.bornePlacement);
  const borneDraft = useApp((s) => s.borneDraft);
  const searchedLocation = useApp((s) => s.searchedLocation);

  // Emprise de toutes les parcelles affichables : elle sert au cadrage d'ouverture.
  const parcelsBounds = useMemo(
    () => bboxOfAll(parcels.filter((parcel) => !parcel.rejected).map((parcel) => parcel.coords)),
    [parcels],
  );

  const parcelLayers = useRef(new Map<string, google.maps.Polygon>());
  const onMap = useRef(new Set<string>());
  /** Halo unique sous les parcelles : les anneaux de tous les contours visibles. */
  const casingLayer = useRef<google.maps.Polygon | null>(null);
  /** Signature des anneaux déjà posés, pour éviter de reconstruire la géométrie. */
  const casingKey = useRef<string | null>(null);
  const regionLayers = useRef<google.maps.Polygon[]>([]);
  const communeLayers = useRef<google.maps.Polygon[]>([]);
  const automaticLayers = useRef<google.maps.Polygon[]>([]);
  const draftLine = useRef<google.maps.Polyline | null>(null);
  const draftMarkers = useRef<google.maps.Marker[]>([]);
  const manualPreview = useRef<google.maps.Polygon | null>(null);
  const zonePolygon = useRef<google.maps.Polygon | null>(null);
  const zoneMarkers = useRef<google.maps.Marker[]>([]);
  const editMarkers = useRef<google.maps.Marker[]>([]);
  const splitLine = useRef<google.maps.Polyline | null>(null);
  const splitMarkers = useRef<google.maps.Marker[]>([]);
  const splitParts = useRef<google.maps.Polygon[]>([]);
  const searchCenterMarker = useRef<google.maps.Marker | null>(null);
  const searchRadiusCircle = useRef<google.maps.Circle | null>(null);
  const captureRectangle = useRef<google.maps.Rectangle | null>(null);
  const borneMarkers = useRef<google.maps.Marker[]>([]);
  const draftBorneMarker = useRef<google.maps.Marker | null>(null);
  const searchedMarker = useRef<google.maps.Marker | null>(null);
  const infoWindow = useRef<google.maps.InfoWindow | null>(null);
  /** L'ouverture a déjà été recadrée sur l'ensemble des parcelles. */
  const fitAllDone = useRef(false);
  /** L'utilisateur a déplacé la carte : on ne la recadre plus sous ses doigts. */
  const userMovedMap = useRef(false);

  const latest = useRef({ parcels: new Map<string, Parcel>(), drawing, automaticSearchCenter, bornePlacement });
  latest.current.drawing = drawing;
  latest.current.automaticSearchCenter = automaticSearchCenter;
  latest.current.bornePlacement = bornePlacement;
  const center = useMemo(() => ({ lat: DEFAULT_MAP_CENTER[0], lng: DEFAULT_MAP_CENTER[1] }), []);
  const mapOptions = useMemo<google.maps.MapOptions>(() => ({
    mapTypeId: basemap === 'satellite' ? 'satellite' : 'roadmap',
    minZoom: 5,
    maxZoom: 21,
    zoomControl: false,
    scaleControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    clickableIcons: false,
    gestureHandling: 'greedy',
  }), [basemap]);

  // Carte, clics de dessin et suivi du centre/zoom (utilisé par la capture Gemini).
  useEffect(() => {
    if (!map) return;
    const syncView = () => {
      const currentCenter = map.getCenter();
      const currentZoom = map.getZoom();
      const currentBounds = map.getBounds();
      const div = map.getDiv();
      if (currentCenter && typeof currentZoom === 'number') {
        const bounds = currentBounds ? {
          south: currentBounds.getSouthWest().lat(),
          west: currentBounds.getSouthWest().lng(),
          north: currentBounds.getNorthEast().lat(),
          east: currentBounds.getNorthEast().lng(),
        } : null;
        const size = div ? {
          width: div.clientWidth,
          height: div.clientHeight,
        } : null;
        useApp.getState().setMapView([currentCenter.lat(), currentCenter.lng()], currentZoom, bounds, size);
      }
    };
    const idle = map.addListener('idle', syncView);
    const dragStart = map.addListener('dragstart', () => {
      userMovedMap.current = true;
    });
    const click = map.addListener('click', (event: google.maps.MapMouseEvent) => {
      const state = useApp.getState();
      if (state.bornePlacement && event.latLng) {
        state.placeBorneDraft([event.latLng.lat(), event.latLng.lng()]);
        return;
      }
      infoWindow.current?.close();
      if (state.splitParcelId && event.latLng) {
        state.addSplitPoint([event.latLng.lat(), event.latLng.lng()]);
      } else if (latest.current.drawing && event.latLng) {
        state.addDraftPoint([event.latLng.lat(), event.latLng.lng()]);
      } else if (latest.current.automaticSearchCenter && event.latLng) {
        state.setAutomaticSearchCenter([event.latLng.lat(), event.latLng.lng()]);
      }
    });
    syncView();
    return () => {
      idle.remove();
      dragStart.remove();
      click.remove();
      searchCenterMarker.current?.setMap(null);
      searchCenterMarker.current = null;
      searchRadiusCircle.current?.setMap(null);
      searchRadiusCircle.current = null;
      captureRectangle.current?.setMap(null);
      captureRectangle.current = null;
      parcelLayers.current.forEach((layer) => layer.setMap(null));
      parcelLayers.current.clear();
      regionLayers.current.forEach((layer) => layer.setMap(null));
      regionLayers.current = [];
      communeLayers.current.forEach((layer) => layer.setMap(null));
      communeLayers.current = [];
      automaticLayers.current.forEach((layer) => layer.setMap(null));
      automaticLayers.current = [];
      borneMarkers.current.forEach((marker) => marker.setMap(null));
      borneMarkers.current = [];
      draftBorneMarker.current?.setMap(null);
      draftBorneMarker.current = null;
      searchedMarker.current?.setMap(null);
      searchedMarker.current = null;
      infoWindow.current?.close();
      infoWindow.current = null;
      map.getDiv().classList.remove('is-drawing');
      map.getDiv().classList.remove('is-placing-borne');
      onMap.current.clear();
    };
  }, [map]);

  // Repère rouge déplaçable pour choisir le centre de l’analyse orge / autre culture.
  useEffect(() => {
    if (!map || !automaticSearchCenter) {
      searchCenterMarker.current?.setMap(null);
      searchCenterMarker.current = null;
      return;
    }
    const position = { lat: automaticSearchCenter[0], lng: automaticSearchCenter[1] };
    if (searchCenterMarker.current) {
      searchCenterMarker.current.setPosition(position);
      return;
    }
    const marker = new google.maps.Marker({
      map,
      position,
      draggable: true,
      title: 'Déplacer le centre de recherche de l’analyse orge / autre culture',
      zIndex: google.maps.Marker.MAX_ZINDEX + 1,
    });
    marker.addListener('dragend', () => {
      const next = marker.getPosition();
      if (next) useApp.getState().setAutomaticSearchCenter([next.lat(), next.lng()]);
    });
    searchCenterMarker.current = marker;
  }, [automaticSearchCenter, map]);

  // Rayon de l'analyse automatique : cercle au sol, à l'échelle réelle, qui matérialise
  // la zone où les parcelles sont analysées. Déplaçable avec le repère central.
  useEffect(() => {
    searchRadiusCircle.current?.setMap(null);
    searchRadiusCircle.current = null;
    if (!map || !automaticSearchCenter || !automaticSearchRadius) return;
    const circle = new google.maps.Circle({
      map,
      center: { lat: automaticSearchCenter[0], lng: automaticSearchCenter[1] },
      radius: automaticSearchRadius,
      clickable: false,
      strokeColor: '#03793C', strokeOpacity: 1, strokeWeight: 2,
      fillColor: '#03793C', fillOpacity: 0.08,
      zIndex: 45,
    });
    searchRadiusCircle.current = circle;
    return () => {
      circle.setMap(null);
      if (searchRadiusCircle.current === circle) searchRadiusCircle.current = null;
    };
  }, [map, automaticSearchCenter, automaticSearchRadius]);

  // Zone couverte par la dernière capture Gemini : rectangle au sol, à l'échelle réelle.
  useEffect(() => {
    captureRectangle.current?.setMap(null);
    captureRectangle.current = null;
    if (!map || !geminiCapture) return;
    const rectangle = new google.maps.Rectangle({
      map,
      bounds: {
        south: geminiCapture.south,
        west: geminiCapture.west,
        north: geminiCapture.north,
        east: geminiCapture.east,
      },
      clickable: false,
      strokeColor: '#B60319', strokeOpacity: 1, strokeWeight: 2,
      fillColor: '#B60319', fillOpacity: 0.05,
      zIndex: 55,
    });
    captureRectangle.current = rectangle;
    return () => {
      rectangle.setMap(null);
      if (captureRectangle.current === rectangle) captureRectangle.current = null;
    };
  }, [map, geminiCapture]);

  // Bornes GPS enregistrées : épingles vertes, rouges pour celle sélectionnée dans
  // la recherche. La bulle n'est ouverte que pour la borne recherchée.
  useEffect(() => {
    borneMarkers.current.forEach((marker) => marker.setMap(null));
    borneMarkers.current = [];
    if (!map) return;
    if (bornes.length === 0) {
      if (searchedLocation?.kind !== 'coords') infoWindow.current?.close();
      return;
    }

    const info = infoWindow.current ?? new google.maps.InfoWindow();
    infoWindow.current = info;
    let selectedMarker: google.maps.Marker | null = null;

    for (const borne of bornes) {
      const selected = searchedLocation?.kind === 'borne' && searchedLocation.borneId === borne.id;
      const marker = new google.maps.Marker({
        map,
        position: { lat: borne.lat, lng: borne.lng },
        title: `Borne GPS — ${borne.name}`,
        zIndex: selected ? google.maps.Marker.MAX_ZINDEX + 3 : 6000,
        icon: pinIcon(selected ? '#B60319' : '#03793C', selected ? 2.05 : 1.65),
      });
      marker.addListener('click', () => {
        const state = useApp.getState();
        state.setSearchedLocation({
          kind: 'borne',
          lat: borne.lat,
          lng: borne.lng,
          label: borne.name,
          borneId: borne.id,
        });
        state.flyTo({ center: [borne.lat, borne.lng], zoom: 18 });
      });
      borneMarkers.current.push(marker);
      if (selected) selectedMarker = marker;
    }

    if (selectedMarker && searchedLocation?.kind === 'borne') {
      info.setContent(locationInfo(searchedLocation.label, searchedLocation.lat, searchedLocation.lng, 'borne'));
      info.open({ map, anchor: selectedMarker });
    } else if (!searchedLocation) {
      info.close();
    }

    return () => {
      borneMarkers.current.forEach((marker) => marker.setMap(null));
      borneMarkers.current = [];
    };
  }, [map, bornes, searchedLocation]);

  // Emplacement trouvé par saisie de coordonnées : épingle bleue distincte des bornes.
  useEffect(() => {
    searchedMarker.current?.setMap(null);
    searchedMarker.current = null;
    if (!map || searchedLocation?.kind !== 'coords') return;

    const marker = new google.maps.Marker({
      map,
      position: { lat: searchedLocation.lat, lng: searchedLocation.lng },
      title: 'Emplacement recherché',
      zIndex: google.maps.Marker.MAX_ZINDEX + 4,
      icon: pinIcon('#B60319', 2.1),
    });
    searchedMarker.current = marker;

    const info = infoWindow.current ?? new google.maps.InfoWindow();
    infoWindow.current = info;
    info.setContent(locationInfo(searchedLocation.label, searchedLocation.lat, searchedLocation.lng, 'coords'));
    info.open({ map, anchor: marker });

    return () => {
      marker.setMap(null);
      if (searchedMarker.current === marker) searchedMarker.current = null;
    };
  }, [map, searchedLocation]);

  // Point d'atterrissage du mode placement, avant validation du nom.
  useEffect(() => {
    draftBorneMarker.current?.setMap(null);
    draftBorneMarker.current = null;
    if (!map || !borneDraft) return;
    const marker = new google.maps.Marker({
      map,
      position: { lat: borneDraft[0], lng: borneDraft[1] },
      title: 'Nouvelle borne GPS',
      zIndex: google.maps.Marker.MAX_ZINDEX + 5,
      icon: pinIcon('#03793C', 2.1),
    });
    draftBorneMarker.current = marker;
    return () => {
      marker.setMap(null);
      if (draftBorneMarker.current === marker) draftBorneMarker.current = null;
    };
  }, [map, borneDraft]);

  // Curseur en croix pendant le placement d'une borne.
  useEffect(() => {
    if (!map) return;
    const div = map.getDiv();
    div.classList.toggle('is-placing-borne', bornePlacement);
    if (bornePlacement) infoWindow.current?.close();
    return () => div.classList.remove('is-placing-borne');
  }, [bornePlacement, map]);

  // Fond de carte Google : imagerie satellite ou plan routier.
  useEffect(() => {
    if (map) map.setMapTypeId(basemap === 'satellite' ? 'satellite' : 'roadmap');
  }, [basemap, map]);

  // Ouverture : cadrer la carte sur TOUTES les parcelles chargées.
  //
  // Sans cela la carte s'ouvrait au centre par défaut au zoom 21 (~100 m de
  // large) alors que les parcelles couvrent ~20 km : la quasi-totalité d'entre
  // elles restait hors écran, ce qui donnait l'impression qu'elles manquaient.
  // Le cadrage n'a lieu qu'une fois, dès que les parcelles sont disponibles, et
  // jamais après un déplacement manuel de l'utilisateur.
  useEffect(() => {
    if (!map || fitAllDone.current || userMovedMap.current || !parcelsBounds) return;
    fitAllDone.current = true;
    const [[south, west], [north, east]] = parcelsBounds;
    // Parcelles confondues : un fitBounds pousserait le zoom au maximum, illisible.
    if (Math.abs(north - south) < 1e-6 && Math.abs(east - west) < 1e-6) {
      map.setCenter({ lat: south, lng: west });
      map.setZoom(DEFAULT_MAP_ZOOM);
      return;
    }
    map.fitBounds(new google.maps.LatLngBounds({ lat: south, lng: west }, { lat: north, lng: east }), 40);
  }, [map, parcelsBounds]);

  // Régions et couverture des communes.
  useEffect(() => {
    regionLayers.current.forEach((layer) => layer.setMap(null));
    communeLayers.current.forEach((layer) => layer.setMap(null));
    regionLayers.current = [];
    communeLayers.current = [];
    if (!map) return;

    for (const region of regions) {
      regionLayers.current.push(new google.maps.Polygon({
        map,
        paths: region.outline.map(([lat, lng]) => ({ lat, lng })),
        strokeColor: '#16231E', strokeOpacity: 0.55, strokeWeight: 1.5,
        fillOpacity: 0, clickable: false, zIndex: 1,
      }));
    }
    for (const commune of communes) {
      const style = commune.coverage === 'analysee'
        ? { strokeColor: '#03793C', strokeWeight: 1, fillColor: '#03793C', fillOpacity: 0.05 }
        : commune.coverage === 'partielle'
          ? { strokeColor: '#C98A00', strokeWeight: 1.6, fillColor: '#F2B84B', fillOpacity: 0.14 }
          : { strokeColor: '#5B6770', strokeWeight: 1.4, fillColor: '#5B6770', fillOpacity: 0.25 };
      const polygon = new google.maps.Polygon({
        map: showCoverage ? map : null,
        paths: commune.outline.map(([lat, lng]) => ({ lat, lng })),
        ...style,
        strokeOpacity: 0.8,
        clickable: true,
        zIndex: 2,
      });
      // En mode placement, un clic sur une commune doit poser la borne au lieu
      // d'être absorbé par le polygone.
      polygon.addListener('click', (event: google.maps.MapMouseEvent) => {
        const state = useApp.getState();
        if (!state.bornePlacement || !event.latLng) return;
        event.stop();
        state.placeBorneDraft([event.latLng.lat(), event.latLng.lng()]);
      });
      communeLayers.current.push(polygon);
    }
    return () => {
      regionLayers.current.forEach((layer) => layer.setMap(null));
      communeLayers.current.forEach((layer) => layer.setMap(null));
      regionLayers.current = [];
      communeLayers.current = [];
    };
  }, [map, regions, communes, showCoverage]);

  // Création des contours de parcelles — les objets persistants sont réutilisés lors des restylages.
  useEffect(() => {
    const index = new Map<string, Parcel>();
    for (const parcel of parcels) index.set(parcel.id, parcel);
    latest.current.parcels = index;
    if (!map) return;

    // Nettoie les polygones qui ne sont plus dans parcels (ex: suppression de doublons)
    const currentIds = new Set(parcels.map((p) => p.id));
    for (const [id, polygon] of parcelLayers.current.entries()) {
      if (!currentIds.has(id)) {
        polygon.setMap(null);
        parcelLayers.current.delete(id);
        onMap.current.delete(id);
      }
    }

    for (const parcel of parcels) {
      const existing = parcelLayers.current.get(parcel.id);
      if (existing) {
        // En édition, le chemin est porté par les sommets déplaçables : on ne le réécrit pas.
        if (parcel.id === editingParcelId) continue;
        // Garde le tracé affiché aligné sur la parcelle (contour modifié, import, déduplication…).
        const path = existing.getPath();
        let same = path.getLength() === parcel.coords.length;
        for (let i = 0; same && i < parcel.coords.length; i++) {
          const v = path.getAt(i);
          same = Math.abs(v.lat() - parcel.coords[i][0]) < 1e-9 && Math.abs(v.lng() - parcel.coords[i][1]) < 1e-9;
        }
        if (same) continue;
        existing.setPath(parcel.coords.map(([lat, lng]) => ({ lat, lng })));
        continue;
      }
      const polygon = new google.maps.Polygon({
        map: null,
        paths: parcel.coords.map(([lat, lng]) => ({ lat, lng })),
        clickable: true,
        zIndex: 10,
      });
      polygon.addListener('click', (event: google.maps.PolyMouseEvent) => {
        const state = useApp.getState();
        if (state.bornePlacement) {
          if (event.latLng) {
            event.stop();
            state.placeBorneDraft([event.latLng.lat(), event.latLng.lng()]);
          }
          return;
        }
        if (state.borneDraft) return;
        if (state.drawing) return;
        // Scission en cours : chaque clic pose un sommet de la coupe, sans
        // changer de parcelle sélectionnée.
        if (state.splitParcelId) {
          if (event.latLng) {
            event.stop();
            state.addSplitPoint([event.latLng.lat(), event.latLng.lng()]);
          }
          return;
        }
        // Un contour non classé (tracé manuel, VHR) peut recouvrir une parcelle
        // classée : le clic ouvre alors celle-ci pour afficher sa culture.
        // L'écouteur est créé avec le polygone et n'est pas recréé lors des
        // mises à jour : on relit donc les parcelles courantes (analyse,
        // correction…) au moment du clic.
        const currentParcels = [...latest.current.parcels.values()];
        const clicked = latest.current.parcels.get(parcel.id) ?? parcel;
        const point: [number, number] = event.latLng
          ? [event.latLng.lat(), event.latLng.lng()]
          : clicked.centroid;
        const target = pickParcelAt(
          point,
          clicked,
          currentParcels,
          (id) => onMap.current.has(id),
        );
        state.select(target.id);
      });
      // Double-clic : passe en édition du contour (sommets déplaçables). Droit limité par le rôle.
      polygon.addListener('dblclick', () => {
        const s = useApp.getState();
        if (s.drawing || s.bornePlacement || s.borneDraft || s.splitParcelId) return;
        if (!s.user || !ROLES[s.user.role].can.correct) {
          s.toast('Votre profil ne permet pas de modifier le contour d’une parcelle.', 'warn');
          return;
        }
        s.startEditParcel(parcel.id);
      });
      parcelLayers.current.set(parcel.id, polygon);
    }
  }, [map, parcels, editingParcelId]);

  // Résultats temporaires de recherche orge / autre culture, distincts des parcelles enregistrées.
  useEffect(() => {
    automaticLayers.current.forEach((layer) => layer.setMap(null));
    automaticLayers.current = [];
    if (!map || !automaticDetection) return;

    for (const candidate of automaticDetection.parcels) {
      // Parcelle enregistrée correspondante. Tant que sa fiche relue en base
      // n'affiche pas encore la culture détectée (résultat en cours
      // d'enregistrement, relecture en cours), l'aperçu temporaire reste utile :
      // il montre le résultat dès qu'il arrive. En revanche, quand la parcelle
      // enregistrée porte déjà cette culture, cet aperçu empilé au-dessus d'elle
      // masquerait sa couleur officielle et capterait les clics : on ne le
      // dessine plus.
      const culture = candidateCulture(candidate);
      const stored = parcelForCandidate(candidate, parcels);
      if (stored && baseIds.has(stored.id) && parcelShowsCandidateCulture(stored, candidate, f.seasonId)) continue;

      const points = candidate.coordinates
        .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
        .map(({ lat, lng }) => ({ lat, lng }));
      if (points.length < 3) continue;
      const presence = candidate.analysis?.barley_presence;
      const color = colors[culture];
      const polygon = new google.maps.Polygon({
        map,
        paths: points,
        strokeColor: color,
        strokeOpacity: 1,
        strokeWeight: 2.5,
        fillColor: color,
        fillOpacity: presence === 'confirmed' || presence === 'probable' ? 0.16 : 0.06,
        clickable: true,
        zIndex: 30,
      });
      polygon.addListener('click', (event: google.maps.MapMouseEvent) => {
        const state = useApp.getState();
        if (state.bornePlacement) {
          if (event.latLng) {
            event.stop();
            state.placeBorneDraft([event.latLng.lat(), event.latLng.lng()]);
          }
          return;
        }
        if (state.borneDraft) return;
        // La fiche de la parcelle enregistrée s'ouvre dès que celle-ci affiche
        // déjà la culture détectée (données relues en base, donc à jour).
        const stored = parcelForCandidate(candidate, [...latest.current.parcels.values()]);
        if (stored && parcelShowsCandidateCulture(stored, candidate, state.filters.seasonId)) {
          state.select(stored.id);
          return;
        }
        // Résultat pas encore relu en base : ses détails d'analyse s'affichent.
        state.select(null);
        state.selectAutomaticParcel(candidate.id);
      });
      automaticLayers.current.push(polygon);

      for (const segment of candidate.analysis?.detected_segments ?? []) {
        if (segment.coordinates.length < 3) continue;
        automaticLayers.current.push(new google.maps.Polygon({
          map,
          paths: segment.coordinates.map(({ lat, lng }) => ({ lat, lng })),
          strokeColor: '#FACC15', strokeOpacity: 1, strokeWeight: 2,
          fillColor: '#FACC15', fillOpacity: 0.24,
          clickable: false, zIndex: 40,
        }));
      }
    }
    return () => {
      automaticLayers.current.forEach((layer) => layer.setMap(null));
      automaticLayers.current = [];
    };
  }, [automaticDetection, map, colors, parcels, baseIds, f.seasonId]);

  // Halo des contours : un seul polygone multi-anneaux, plus large et sombre,
  // glissé sous les parcelles. Un halo par parcelle doublerait le nombre
  // d'overlays (jusqu'à ~8 000) ; un overlay unique ne coûte qu'un tracé
  // supplémentaire par anneau et détache les traits de l'imagerie satellite.
  useEffect(() => {
    if (!map) return;
    const casing = new google.maps.Polygon({
      map,
      strokeColor: '#0B1711',
      strokeOpacity: 0.5,
      strokeWeight: 3.6,
      fillOpacity: 0,
      clickable: false,
      zIndex: 4,
    });
    casingLayer.current = casing;
    casingKey.current = null;
    return () => {
      casing.setMap(null);
      if (casingLayer.current === casing) casingLayer.current = null;
      casingKey.current = null;
    };
  }, [map]);

  // Visibilité et styles : aucun nouveau calcul IA lors d’un changement de filtre.
  useEffect(() => {
    if (!map) return;
    const context = { colors, threshold, mode: f.mode, cultures: new Set(f.cultures), othersStyle: f.othersStyle, zoom: mapZoom };
    // Anneaux des contours réellement affichés : le halo ne doit pas révéler
    // une parcelle masquée par un filtre.
    const visibleRings: { id: string; area: number; coords: Parcel['coords'] }[] = [];
    for (const parcel of parcels) {
      const polygon = parcelLayers.current.get(parcel.id);
      if (!polygon) continue;
      // Parcelle en cours d'édition : jamais masquée par les filtres pendant la modification.
      if (parcel.id === editingParcelId) {
        polygon.setOptions({ strokeColor: '#B60319', strokeOpacity: 1, strokeWeight: 4, fillColor: '#B60319', fillOpacity: 0.14, zIndex: 1200 });
        if (!onMap.current.has(parcel.id)) {
          polygon.setMap(map);
          onMap.current.add(parcel.id);
        }
        visibleRings.push({ id: parcel.id, area: parcel.areaHa, coords: parcel.coords });
        continue;
      }
      const result = parcel.results[f.seasonId];
      const wanted = !!result && baseIds.has(parcel.id);
      if (!wanted) {
        polygon.setMap(null);
        onMap.current.delete(parcel.id);
        continue;
      }
      // Contour Gemini encore à analyser : trait rouge fin, sans remplissage ni
      // étiquette, comme la délimitation de référence. C'est une délimitation
      // explicite : elle reste visible même quand un filtre de culture masque
      // les parcelles non classées. Une fois analysé, la parcelle reprend le
      // style de culture habituel (flux KML/tracé manuel).
      const isGeminiOutline = isGeminiParcel(parcel) && !isAnalyzedParcel(parcel);
      // Contour automatique VHR qui n'a encore jamais été analysé : il conserve
      // son style de tracé automatique (jaune, pointillé si la parcelle est
      // petite), qui signale l'incertitude de la délimitation.
      const isUntouchedVhrOutline = result.modelVersion.includes('Delineate Anything');
      // Aucune culture enregistrée : parcelle tracée à la main et pas encore
      // analysée, culture supprimée depuis la fiche, ou contour jamais classé.
      // Le contour reprend alors le rouge de référence des délimitations Gemini
      // et KML — il n'a aucune couleur de culture à afficher.
      const hasNoCulture = !isAnalyzedParcel(parcel) && !isUntouchedVhrOutline;
      // Contour importé depuis un fichier KML : trait rouge de référence des
      // tracés Gemini, pour une lecture visuelle cohérente sur la carte. Dès
      // qu'elle est analysée, quelle que soit la culture détectée (blé, avoine,
      // orge…), la parcelle reprend la couleur de culture habituelle.
      const isKmlReference = Boolean(
        (parcel.kmlImported || parcel.kmlCulture) && !isAnalyzedParcel(parcel),
      );
      const { visible, options } = computeStyle(result, context, parcel.id === selectedId);
      if (!visible && !isGeminiOutline && !isKmlReference) {
        polygon.setMap(null);
        onMap.current.delete(parcel.id);
        continue;
      }
      const isUnclassifiedMalto = result.analysisId.startsWith('MALTO-') && (result.culture === 'inconnue' || !result.confidence);
      const isVhrOutline = isUntouchedVhrOutline || isUnclassifiedMalto;
      const isReferenceOutline = isGeminiOutline || isKmlReference || hasNoCulture;
      const displayStyle = isReferenceOutline
        ? {
          fillColor: GEMINI_OUTLINE_COLOR,
          fillOpacity: 0,
          strokeColor: GEMINI_OUTLINE_COLOR,
          strokeOpacity: 1,
          strokeWeight: (parcel.id === selectedId ? 3 : 2) + zoomBoost * 0.6,
        }
        : isVhrOutline
          ? parcelOutlineStyle(parcel, parcel.id === selectedId, mapZoom)
          : {
            fillColor: options.fillColor,
            fillOpacity: options.fillOpacity,
            strokeColor: options.color,
            strokeOpacity: options.opacity,
            strokeWeight: options.weight,
          };
      polygon.setOptions({ ...displayStyle, zIndex: parcel.id === selectedId ? 1000 : outlineZIndex(parcel) });
      if (!onMap.current.has(parcel.id)) {
        polygon.setMap(map);
        onMap.current.add(parcel.id);
      }
      visibleRings.push({ id: parcel.id, area: parcel.areaHa, coords: parcel.coords });
    }

    // Géométrie du halo : reconstruite seulement quand l'ensemble visible (ou
    // un contour) change ; sinon seul le poids de trait est réajusté.
    const casing = casingLayer.current;
    if (casing) {
      const key = visibleRings.map((ring) => `${ring.id}:${ring.area.toFixed(2)}:${ring.coords.length}`).join('|');
      if (!visibleRings.length) {
        casingKey.current = '';
        casing.setMap(null);
      } else {
        if (key !== casingKey.current) {
          casingKey.current = key;
          casing.setPaths(visibleRings.map((ring) => ring.coords.map(([lat, lng]) => ({ lat, lng }))));
        }
        casing.setOptions({ strokeWeight: 3.6 + zoomBoost, map });
      }
    }
    // `mapZoom` n'est volontairement pas une dépendance : les poids ne changent
    // qu'aux paliers de `zoomBoost`, on évite de restyler 4 000 contours à
    // chaque cran de zoom.
  }, [map, parcels, baseIds, f.mode, f.cultures, f.othersStyle, f.seasonId, colors, threshold, selectedId, editingParcelId, zoomBoost]);

  // Mode édition : le contour reste visible, surmonté, et ses sommets deviennent déplaçables.
  useEffect(() => {
    editMarkers.current.forEach((marker) => marker.setMap(null));
    editMarkers.current = [];
    if (!map) return;
    // Le double-clic sert à éditer : on évite en parallèle le zoom de la carte.
    map.setOptions({ disableDoubleClickZoom: !!editingParcelId });
    if (!editingParcelId) return;
    const polygon = parcelLayers.current.get(editingParcelId);
    const start = useApp.getState().editingCoords;
    if (!polygon || !start || start.length < 3) return;

    const points = start.map(([lat, lng]) => ({ lat, lng }));
    polygon.setPath(points);
    polygon.setOptions({ strokeColor: '#B60319', strokeOpacity: 1, strokeWeight: 4, fillColor: '#B60319', fillOpacity: 0.14, zIndex: 1200 });
    polygon.setMap(map);
    onMap.current.add(editingParcelId);

    start.forEach((_, index) => {
      const marker = new google.maps.Marker({
        map,
        position: points[index],
        draggable: true,
        zIndex: google.maps.Marker.MAX_ZINDEX + 2,
        title: `Sommet ${index + 1} — déplacez pour ajuster le contour`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: '#fff', fillOpacity: 1,
          strokeColor: '#B60319', strokeWeight: 3,
        },
      });
      marker.addListener('drag', () => {
        const position = marker.getPosition();
        if (!position) return;
        points[index] = { lat: position.lat(), lng: position.lng() };
        polygon.setPath(points);
      });
      marker.addListener('dragend', () => {
        useApp.getState().setEditingCoords(points.map(({ lat, lng }) => [lat, lng] as [number, number]));
      });
      editMarkers.current.push(marker);
    });
    return () => {
      editMarkers.current.forEach((marker) => marker.setMap(null));
      editMarkers.current = [];
    };
  }, [map, editingParcelId]);

  // Scission manuelle : ligne de coupe accrochée au contour et aperçu des deux
  // parties obtenues, pour suivre la limite réelle avant de valider.
  useEffect(() => {
    const clearOverlays = () => {
      splitLine.current?.setMap(null);
      splitLine.current = null;
      splitMarkers.current.forEach((marker) => marker.setMap(null));
      splitMarkers.current = [];
      splitParts.current.forEach((layer) => layer.setMap(null));
      splitParts.current = [];
    };

    if (!map || !splitParcelId) {
      clearOverlays();
      return;
    }
    const parcel = latest.current.parcels.get(splitParcelId);
    if (!parcel) {
      clearOverlays();
      return;
    }

    // Le dernier clic est accroché au contour comme le premier : une coupe se
    // termine sur la limite de la parcelle, pas à quelques mètres à l'intérieur.
    const draft = splitDraft.map(([lat, lng]) => [lat, lng] as LatLng);
    if (draft.length >= 2) {
      const lastSnap = snapToRing(draft[draft.length - 1], parcel.coords);
      if (lastSnap && lastSnap.distanceM <= SPLIT_SNAP_TOLERANCE_M) {
        draft[draft.length - 1] = lastSnap.point;
      }
    }

    // Les objets Google Maps sont réutilisés d'un clic à l'autre : recréer la
    // ligne, les sommets et les deux polygones à chaque point rendait la pose
    // saccadée sur les parcelles de plusieurs milliers de sommets.
    if (draft.length >= 2) {
      if (!splitLine.current) {
        splitLine.current = new google.maps.Polyline({
          strokeColor: '#0F172A', strokeOpacity: 0.95, strokeWeight: 4,
          clickable: false, zIndex: 1300,
        });
      }
      splitLine.current.setPath(draft.map(([lat, lng]) => ({ lat, lng })));
      splitLine.current.setMap(map);
    } else {
      splitLine.current?.setMap(null);
    }

    while (splitMarkers.current.length > draft.length) {
      splitMarkers.current.pop()?.setMap(null);
    }
    draft.forEach(([lat, lng], index) => {
      const end = index === 0 || index === draft.length - 1;
      let marker = splitMarkers.current[index];
      if (!marker) {
        const created = new google.maps.Marker({
          map,
          position: { lat, lng },
          draggable: true,
          clickable: true,
          cursor: 'grab',
          zIndex: google.maps.Marker.MAX_ZINDEX + 1,
          title: end ? 'Extrémité de la coupe — glissez pour ajuster' : 'Sommet de la coupe — glissez pour ajuster',
          icon: splitVertexIcon(end),
        });
        created.set('splitIndex', index);
        created.set('splitEnd', end);
        created.addListener('dragend', () => {
          const at = Number(created.get('splitIndex'));
          const position = created.getPosition();
          if (!Number.isFinite(at) || at < 0 || !position) return;
          const state = useApp.getState();
          if (!state.splitParcelId) return;
          const currentParcel = latest.current.parcels.get(state.splitParcelId);
          const lastIndex = state.splitDraft.length - 1;
          let next: LatLng = [position.lat(), position.lng()];
          // Seules les extrémités doivent rester sur le contour ; les sommets
          // intermédiaires peuvent suivre librement un talus ou un chemin.
          if (currentParcel && (at === 0 || at === lastIndex)) {
            const snapped = snapToRing(next, currentParcel.coords, SPLIT_SNAP_TOLERANCE_M);
            if (snapped) next = snapped.point;
          }
          state.moveSplitPoint(at, next);
        });
        splitMarkers.current[index] = created;
        marker = created;
      } else {
        marker.setMap(map);
      }
      marker.set('splitIndex', index);
      marker.setPosition({ lat, lng });
      if (marker.get('splitEnd') !== end) {
        marker.set('splitEnd', end);
        marker.setIcon(splitVertexIcon(end));
        marker.setTitle(end ? 'Extrémité de la coupe — glissez pour ajuster' : 'Sommet de la coupe — glissez pour ajuster');
      }
    });

    const preview = splitParcelByCut(parcel.coords, draft);
    if (preview.ok) {
      for (let i = 0; i < 2; i += 1) {
        let layer = splitParts.current[i];
        if (!layer) {
          const color = i === 0 ? '#0EA5E9' : '#F97316';
          layer = new google.maps.Polygon({
            strokeColor: color, strokeOpacity: 1, strokeWeight: 2,
            fillColor: color, fillOpacity: 0.22,
            clickable: false, zIndex: 1250,
          });
          splitParts.current[i] = layer;
        }
        layer.setPaths(preview.parts[i].map(([lat, lng]) => ({ lat, lng })));
        layer.setMap(map);
      }
    } else {
      splitParts.current.forEach((layer) => layer.setMap(null));
    }
  }, [map, splitParcelId, splitDraft, parcels]);

  // Nettoyage des overlays de scission quand la carte est démontée.
  useEffect(() => () => {
    splitLine.current?.setMap(null);
    splitLine.current = null;
    splitMarkers.current.forEach((marker) => marker.setMap(null));
    splitMarkers.current = [];
    splitParts.current.forEach((layer) => layer.setMap(null));
    splitParts.current = [];
  }, []);

  // Curseur en croix pendant le tracé de la coupe.
  useEffect(() => {
    if (!map) return;
    const div = map.getDiv();
    div.classList.toggle('is-splitting', !!splitParcelId);
    return () => div.classList.remove('is-splitting');
  }, [map, splitParcelId]);

  // Afficher/masquer la couverture sans recréer les polygones.
  useEffect(() => {
    communeLayers.current.forEach((layer) => layer.setMap(showCoverage ? map : null));
  }, [showCoverage, map]);

  // Navigation programmatique.
  useEffect(() => {
    if (!map || !fly) return;
    if (fly.bounds) {
      const [[south, west], [north, east]] = fly.bounds;
      map.fitBounds(new google.maps.LatLngBounds({ lat: south, lng: west }, { lat: north, lng: east }), 40);
    } else if (fly.center) {
      map.panTo({ lat: fly.center[0], lng: fly.center[1] });
      map.setZoom(fly.zoom ?? 12);
    }
  }, [fly, map]);

  // Parcelle sélectionnée : recentrage doux si hors vue.
  useEffect(() => {
    if (!map || !selectedId) return;
    const parcel = latest.current.parcels.get(selectedId);
    if (!parcel) return;
    const bounds = map.getBounds();
    if (!bounds?.contains({ lat: parcel.centroid[0], lng: parcel.centroid[1] })) {
      map.panTo({ lat: parcel.centroid[0], lng: parcel.centroid[1] });
    }
  }, [map, selectedId]);

  // Mode dessin : clics de carte ajoutent des points au polygone temporaire.
  useEffect(() => {
    if (map) map.getDiv().classList.toggle('is-drawing', drawing);
  }, [drawing, map]);

  useEffect(() => {
    draftLine.current?.setMap(null);
    draftMarkers.current.forEach((marker) => marker.setMap(null));
    draftMarkers.current = [];
    if (!map || draft.length === 0) return;
    if (draft.length > 1) {
      draftLine.current = new google.maps.Polyline({
        map,
        path: draft.map(([lat, lng]) => ({ lat, lng })),
        strokeColor: drawMode === 'parcel' ? '#FFFFFF' : '#B60319', strokeOpacity: drawMode === 'parcel' ? 0.96 : 1, strokeWeight: drawMode === 'parcel' ? 2 : 2.5,
        icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '8px' }],
        clickable: false,
      });
    }
    draft.forEach(([lat, lng], index) => {
      draftMarkers.current.push(new google.maps.Marker({
        map,
        position: { lat, lng },
        clickable: false,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: index === 0 ? 6 : 4,
          fillColor: '#fff', fillOpacity: 1,
          strokeColor: drawMode === 'parcel' ? '#FFFFFF' : '#B60319', strokeWeight: 2,
        },
      }));
    });
  }, [draft, map]);

  useEffect(() => {
    manualPreview.current?.setMap(null);
    manualPreview.current = null;
    if (!map || !manualParcelDraft) return;
    // Aperçu du tracé manuel : rouge comme le contour une fois enregistré (la
    // parcelle n'a pas encore de culture).
    manualPreview.current = new google.maps.Polygon({
      map,
      paths: manualParcelDraft.map(([lat, lng]) => ({ lat, lng })),
      strokeColor: GEMINI_OUTLINE_COLOR, strokeOpacity: 1, strokeWeight: 2,
      fillColor: GEMINI_OUTLINE_COLOR, fillOpacity: 0,
    });
    return () => {
      manualPreview.current?.setMap(null);
      manualPreview.current = null;
    };
  }, [manualParcelDraft, map]);

  useEffect(() => {
    zonePolygon.current?.setMap(null);
    zoneMarkers.current.forEach((marker) => marker.setMap(null));
    zoneMarkers.current = [];
    if (!map || !zone) return;
    const points = zone.map(([lat, lng]) => ({ lat, lng }));
    const polygon = new google.maps.Polygon({
      map,
      paths: points,
      strokeColor: '#B60319', strokeOpacity: 1, strokeWeight: 2.5,
      fillColor: '#B60319', fillOpacity: 0.06,
      clickable: false, zIndex: 50,
    });
    zonePolygon.current = polygon;
    zone.forEach((point, index) => {
      const marker = new google.maps.Marker({
        map,
        position: { lat: point[0], lng: point[1] },
        draggable: true,
        title: 'Déplacer ce sommet',
        icon: {
          path: google.maps.SymbolPath.CIRCLE, scale: 7,
          fillColor: '#fff', fillOpacity: 1,
          strokeColor: '#B60319', strokeWeight: 3,
        },
      });
      marker.addListener('drag', () => {
        const position = marker.getPosition();
        if (!position) return;
        points[index] = { lat: position.lat(), lng: position.lng() };
        polygon.setPath(points);
      });
      marker.addListener('dragend', () => {
        useApp.getState().setZone(points.map(({ lat, lng }) => [lat, lng] as [number, number]));
      });
      zoneMarkers.current.push(marker);
    });
  }, [zone, map]);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'agrisat-google-maps',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  if (!GOOGLE_MAPS_API_KEY) {
    return <div className="map map-message" role="alert">Configurez VITE_GOOGLE_MAPS_API_KEY pour afficher Google Maps.</div>;
  }
  if (loadError) return <div className="map map-message" role="alert">Google Maps n’a pas pu être chargé. Vérifiez la clé API et les restrictions de domaine.</div>;
  if (!isLoaded) return <div className="map map-message" role="status">Chargement de Google Maps…</div>;

  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      mapContainerClassName={`map${readability ? ' map--readable' : ''}`}
      center={center}
      zoom={DEFAULT_MAP_ZOOM}
      options={mapOptions}
      onLoad={setMap}
      onUnmount={() => setMap(null)}
    />
  );
}
