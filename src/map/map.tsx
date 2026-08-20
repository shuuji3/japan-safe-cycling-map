import { memo, useEffect, useRef, useState } from 'react'
import { useLingui } from '@lingui/react'
import {
  FullscreenControl,
  GeolocateControl,
  Map as MapLibreMap,
  type MapMouseEvent,
  NavigationControl,
  type Popup,
  setWorkerUrl,
} from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import '../styles/App.css'
import {
  BIKE_CLASSES,
  ROUTE_NETWORKS,
  bikeLayerIds,
  initBikeLayers,
  routeLayerIds,
  setBikeClassVisible,
  setRouteNetworkVisible,
} from '../data/bike'
import { featurePopover } from './featureInfo'
import { applyBasemap, Basemap, refreshAttribution } from './basemap'
import { LayerSwitcher } from '../components/LayerSwitcher'
import { MobileNav } from '../components/MobileNav'

// maplibre-gl v6 no longer exposes the deprecated global `workerUrl`; the
// worker must be wired up via setWorkerUrl with its URL imported below.
setWorkerUrl(workerUrl)

function MapComponent() {
  const { i18n } = useLingui()
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)

  // Centering Japan
  const [lng, setLng] = useState(139.9599)
  const [lat, setLat] = useState(35.6493)
  const [zoom, setZoom] = useState(9)

  // Per-facility-type checkbox state (default: all visible)
  const [visible, setVisible] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(BIKE_CLASSES.map((c) => [c.id, true])),
  )

  // Whether the legend sidebar is expanded or collapsed to a small button.
  // Collapsed by default on narrow (mobile) screens.
  const [legendOpen, setLegendOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth > 768,
  )

  // Which basemap is shown: Protomaps street map, or GSI satellite hybrid.
  const [basemap, setBasemap] = useState<Basemap>('map')
  const basemapRef = useRef(basemap)
  basemapRef.current = basemap

  useEffect(() => {
    if (mapRef.current !== null || !mapContainer) {
      return
    }

    const map = new MapLibreMap({
      container: mapContainer,
      center: [lng, lat],
      zoom: zoom,
      hash: true,
      style: 'https://api.protomaps.com/styles/v5/light/en.json?key=51f8408cd47ce4e9',
    })
    mapRef.current = map

    map.on('load', () => {
      initBikeLayers(map)
      // Start from the requested basemap (style is fully loaded here).
      applyBasemap(map, basemapRef.current)
      // Layers are initially added hidden; default all facility types to visible.
      for (const def of BIKE_CLASSES) {
        setBikeClassVisible(map, def.id, true)
      }
      // Route networks are toggled implicitly with the cycleway checkbox.
      for (const def of ROUTE_NETWORKS) {
        setRouteNetworkVisible(map, def.id, true)
      }

      // Info popover: hover shows it, click pins it, Esc / outside-click closes.
      let popup: Popup | null = null
      let pinned = false
      let over = false
      const ids = [...bikeLayerIds(), ...routeLayerIds()]

      function showPopup(e: MapMouseEvent, pin: boolean): void {
        const features = map.queryRenderedFeatures(e.point, { layers: ids })
        if (!features.length) {
          return
        }
        const f = features[0]
        popup?.remove()
        const type = String(f.layer?.id ?? '').startsWith('route-') ? 'relation' : 'way'
        popup = featurePopover(map, e.lngLat, (f.properties || {}) as any, type)
        pinned = pin
        popup.on('close', () => {
          popup = null
          pinned = false
        })
      }

      function closePopup(): void {
        popup?.remove()
        popup = null
        pinned = false
      }

      map.on('mousemove', (e: MapMouseEvent) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ids })
        if (features.length) {
          map.getCanvas().style.cursor = 'pointer'
          if (!over) {
            over = true
            if (!pinned) {
              showPopup(e, false)
            }
          }
        } else {
          map.getCanvas().style.cursor = ''
          over = false
          if (!pinned) {
            closePopup()
          }
        }
      })
      map.on('click', (e: MapMouseEvent) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ids })
        if (features.length) {
          showPopup(e, true)
        }
      })
      map.on('dblclick', closePopup)
      map.on('contextmenu', closePopup)
      document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') {
          closePopup()
        }
      })
    })

    map.addControl(new NavigationControl({}))
    map.addControl(new FullscreenControl({}))
    map.addControl(
      new GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
    )

    map.on('move', () => {
      setLng(map.getCenter().lng)
      setLat(map.getCenter().lat)
      setZoom(map.getZoom())
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapContainer])

  // Apply checkbox changes to layer visibility.
  // Route networks follow the "cycleway" checkbox implicitly.
  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }
    for (const def of BIKE_CLASSES) {
      setBikeClassVisible(map, def.id, !!visible[def.id])
    }
    const routesOn = !!visible['cycleway']
    for (const def of ROUTE_NETWORKS) {
      setRouteNetworkVisible(map, def.id, routesOn)
    }
  }, [visible])

  // Switch basemap (street <-> satellite hybrid) at runtime.
  useEffect(() => {
    const map = mapRef.current
    // Skip until the style document has loaded (getStyle() is unsafe earlier).
    if (map && map.isStyleLoaded()) {
      applyBasemap(map, basemap)
    }
  }, [basemap])

  useEffect(() => {
    const map = mapRef.current
    if (map && map.isStyleLoaded()) {
      refreshAttribution(map)
    }
  }, [i18n.locale])

  return (
    <div>
      <MobileNav
        visible={visible}
        onToggle={(id, checked) => setVisible((v) => ({ ...v, [id]: checked }))}
        onSelect={(coords) => mapRef.current?.flyTo({ center: coords, zoom: 13 })}
        legendOpen={legendOpen}
        onLegendToggle={() => setLegendOpen((v) => !v)}
      />
      <LayerSwitcher mode={basemap} onToggle={setBasemap} />
      <div ref={setMapContainer} className="map-container" />
    </div>
  )
}

export const Map = memo(MapComponent)
