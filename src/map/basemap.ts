import { i18n } from '@lingui/core'
import { type Map as MapLibreMap } from 'maplibre-gl'

export type Basemap = 'map' | 'aerial'

// The basemap vector source inside the Protomaps style document.
export const PM_SOURCE = 'protomaps'

export const GSI_SOURCE = 'gsi-seamlessphoto'
export const GSI_LAYER = 'gsi-seamlessphoto'
export const BOUNDARY_LAYER = 'boundary-city'
export const BOUNDARY_MASK_LAYER = 'boundary-land-mask'
const SEA_KINDS = ['sea', 'ocean', 'bay', 'strait', 'fjord']
export const GSI_URL = 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'
export const GSI_DEVELOP_PAGE = 'https://maps.gsi.go.jp/development/ichiran.html'

// Localized GSI citation for シームレス空中写真, attached to the raster source
// so MapLibre's attribution control shows it when aerial is on. 加工 is NOT
// claimed: the imagery is shown as-is and only overlaid with app data.
function gsiAttribution(): string {
  if (i18n.locale === 'en') {
    return `GSI seamless aerial photos (<a href="${GSI_DEVELOP_PAGE}">国土地理院</a>). Data sources: Landsat8, bathymetry (GEBCO), GRUS (© Axelspace), USGS`
  }
  return `国土地理院シームレス空中写真（<a href="${GSI_DEVELOP_PAGE}">国土地理院</a>） データソース：Landsat8・海底地形（GEBCO）・GRUS（© Axelspace）・USGS`
}
// Symbol layers omitted from the aerial hybrid (house numbers, road-arrow icons).
const HIDE_IF_SYMBOL = new Set(['address_label', 'roads_oneway'])
// Keep the lines (roads/water/rail/boundaries) but semi-transparent so the
// satellite photo still reads through. Main roads (highway/major) keep a stronger
// presence; minor/sub roads, water, rail and boundaries are faded more so the
// photo isn't overpowered by pale line work.
const MAJOR_LINE_OPACITY = 0.4
const MINOR_LINE_OPACITY = 0.2

function lineOpacityFor(id: string): number {
  return /highway|major/.test(id) ? MAJOR_LINE_OPACITY : MINOR_LINE_OPACITY
}

function isProtomapsLayer(map: MapLibreMap, id: string): boolean {
  const l = map.getLayer(id)
  return !!l && (l as any).source === PM_SOURCE
}

// Id of the layer to insert the satellite *under*: the first non-background
// layer, i.e. at the very bottom of the style. Roads/lines/labels then paint on
// top of the photo (hybrid), which is what the aerial mode needs.
function bottomAnchorId(map: MapLibreMap): string | undefined {
  const first = map.getStyle().layers.find((l) => l.id !== 'background')
  return first ? first.id : undefined
}

function setLineOpacity(map: MapLibreMap, opacityFor: (id: string) => number | undefined): void {
  for (const l of map.getStyle().layers) {
    if (!isProtomapsLayer(map, l.id) || l.type !== 'line') {
      continue
    }
    try {
      map.setPaintProperty(l.id, 'line-opacity', opacityFor(l.id))
    } catch {
      /* ignore */
    }
  }
}

// In aerial mode the satellite sits at the bottom; hide the opaque layers that
// would cover it (fills/landcover/water/buildings), but KEEP line layers (roads,
// water, rail, boundaries) and labels so real roads stay findable on the photo.
function hideOpaqueLayers(map: MapLibreMap): void {
  for (const l of map.getStyle().layers) {
    if (!isProtomapsLayer(map, l.id)) {
      continue
    }
    if (l.type === 'line') {
      continue
    }
    if (l.type === 'symbol') {
      if (HIDE_IF_SYMBOL.has(l.id)) {
        try {
          map.setLayoutProperty(l.id, 'visibility', 'none')
        } catch {
          /* ignore */
        }
      }
      continue
    }
    // Keep the ocean land-mask so boundary lines stay hidden over the sea even
    // in aerial mode (other opaque fills are hidden to reveal the photo).
    if (l.id === BOUNDARY_MASK_LAYER) {
      continue
    }
    try {
      map.setLayoutProperty(l.id, 'visibility', 'none')
    } catch {
      /* background & un-togglable layers can't be set to none; ignore */
    }
  }
}

function showAllLayers(map: MapLibreMap): void {
  for (const l of map.getStyle().layers) {
    if (!isProtomapsLayer(map, l.id)) {
      continue
    }
    try {
      map.setLayoutProperty(l.id, 'visibility', 'visible')
    } catch {
      /* ignore */
    }
  }
}

function ensureSatellite(map: MapLibreMap): void {
  if (map.getSource(GSI_SOURCE)) {
    return
  }
  map.addSource(GSI_SOURCE, {
    type: 'raster',
    tiles: [GSI_URL],
    tileSize: 256,
    maxzoom: 18,
    attribution: gsiAttribution(),
  } as any)
  // Insert at the very bottom (above background, below every Protomaps layer).
  map.addLayer({ id: GSI_LAYER, type: 'raster', source: GSI_SOURCE }, bottomAnchorId(map))
}

export function initCityBoundaries(map: MapLibreMap): void {
  if (map.getLayer(BOUNDARY_LAYER)) {
    return
  }
  const boundaryColor = map.getPaintProperty('boundaries', 'line-color')
  const waterColor = map.getPaintProperty('water', 'fill-color')
  if (typeof boundaryColor !== 'string' || typeof waterColor !== 'string') {
    return
  }
  map.addLayer({
    id: BOUNDARY_LAYER,
    type: 'line',
    source: PM_SOURCE,
    'source-layer': 'boundaries',
    minzoom: 2,
    filter: ['all', ['>=', ['get', 'kind_detail'], 3], ['<=', ['get', 'kind_detail'], 7]],
    layout: { 'line-join': 'round' },
    paint: {
      'line-color': boundaryColor,
      'line-dasharray': [3, 1, 1, 1],
      'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.4, 5, 1, 12, 3],
    },
  } as any)
  map.addLayer({
    id: BOUNDARY_MASK_LAYER,
    type: 'fill',
    source: PM_SOURCE,
    'source-layer': 'water',
    filter: ['in', 'kind', ...SEA_KINDS],
    paint: { 'fill-color': waterColor, 'fill-opacity': 1 },
  } as any)
}

function removeSatellite(map: MapLibreMap): void {
  if (map.getLayer(GSI_LAYER)) {
    map.removeLayer(GSI_LAYER)
  }
  if (map.getSource(GSI_SOURCE)) {
    map.removeSource(GSI_SOURCE)
  }
}

// Rebuild the satellite with the current locale's citation. No-op when aerial
// is off (source absent). Locale changes are rare, so remove-and-recreate is
// simpler than mutating attribution in place (MapLibre types expose no setter).
export function refreshAttribution(map: MapLibreMap): void {
  if (!map.getSource(GSI_SOURCE)) {
    return
  }
  removeSatellite(map)
  ensureSatellite(map)
}

export function applyBasemap(map: MapLibreMap, mode: Basemap): void {
  if (mode === 'aerial') {
    ensureSatellite(map)
    hideOpaqueLayers(map)
    setLineOpacity(map, lineOpacityFor)
  } else {
    showAllLayers(map)
    setLineOpacity(map, () => undefined)
    removeSatellite(map)
  }
}
