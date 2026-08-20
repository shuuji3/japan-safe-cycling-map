# Bike category ↔ OSM mapping

How this app turns OpenStreetMap tags into the 6 legend categories:
**input (OSM) → output (`class`) → UI category**.

## Approach: hybrid

Keep the coarse `class` (fast grouping for the map layer filter) **and** retain the
raw cycling tags in the tile. So the ⓘ popover can show the _actual_ source tag per
line, and data can be audited/reclassified without a tile rebuild.

## Input (which OSM ways are included)

A way matches if **any** of:

- `highway=cycleway`
- any `cycleway=*` / `cycleway:left=*` / `cycleway:right=*` / `cycleway:both=*`
- `highway` ∈ {footway, path, pedestrian} **and** `bicycle` ∈ {designated, yes, permissive}

## Tag → `class` (comprehensive)

For every row below, `cycleway:left`, `cycleway:right`, and `cycleway:both` each map to the same `class` as `cycleway`.

| OSM tag                                                        | Value                         | Resulting `class`               |
| -------------------------------------------------------------- | ----------------------------- | ------------------------------- |
| `highway`                                                      | `cycleway`                    | `cycleway`                      |
| `cycleway` (also `:left` / `:right` / `:both`)                 | `track`                       | `track`                         |
| `cycleway` (also `:left` / `:right` / `:both`)                 | `lane`                        | `bike_lane`                     |
| `cycleway` (also `:left` / `:right` / `:both`)                 | `shared_lane`                 | `shared_lane`                   |
| `cycleway:*:lane`                                              | `exclusive`                   | `bike_lane`                     |
| `cycleway:*:lane`                                              | `advisory`                    | `bike_lane`                     |
| `cycleway:*:lane`                                              | `pictogram`                   | `shared_lane`                   |
| `highway` ∈ {footway,path,pedestrian} + `bicycle`              | ∈ {designated,yes,permissive} | `bicycle_designated`            |
| `cycleway`                                                     | `no`                          | `no_cycleway`                   |
| `cycleway:both`                                                | `no`                          | `no_cycleway`                   |
| `cycleway:left` + `cycleway:right`                             | both `no`                     | `no_cycleway`                   |
| lone `cycleway:left` **or** `cycleway:right`                   | `no`                          | `other` (opposite side unknown) |
| any other matched `cycleway*` value                            |                               | `other`                         |
| `highway`, `oneway`, `name`, `bicycle`                         | retained as-is                | (no class change)               |
| `oneway:bicycle`                                               | retained                      | (no class change)               |
| `cycleway:oneway` (also `:left` / `:right` / `:both` variants) | retained                      | (no class change)               |

### Japan-specific nuance (this app targets Japanese roads)

Tag interpretation follows the OSM wiki `JA:Tag:highway=cycleway`in Japan.

- 自転車レーン (ordinary bicycle dedicated lane) is typically tagged `cycleway=lane`
  plus `cycleway:lane=advisory` (e.g. 新浜通り: `highway=tertiary` + `cycleway=lane` +
  `cycleway:lane=advisory`). A Japanese bike lane is **not exclusive** — cars may turn
  or stop on it — so `advisory` is not a separate class; it still maps to **`bike_lane`**.
- `highway=cycleway` is used only for 自転車専用道路 (sign 325-2).
- 自転車歩行者道 (footway open to bicycles) is `highway=footway`/`path` + `bicycle=`.
- 自転車ナビマーク / 自転車ナビライン (non-legal road markings) is
  `cycleway=shared_lane` + `cycleway:lane=pictogram` ⇒ **`shared_lane`**.

Not retained: `cycleway:*:width`, `:surface`, `:surface:colour`, `:smoothness`,
`:buffer`, `:separation`, `:traffic_sign`, `cycleway:lanes`.

## UI grouping (6 → 6)

| UI category                     | class values         | Color     |
| ------------------------------- | -------------------- | --------- |
| 自転車専用道路・自転車道        | `cycleway`, `track`  | `#1a9850` |
| 自転車専用通行帯 (自転車レーン) | `bike_lane`          | `#91cf60` |
| 自転車歩行者道 (自歩道)         | `bicycle_designated` | `#fdae61` |
| 車道共有 (矢羽根・ナビマーク)   | `shared_lane`        | `#d73027` |
| その他 (付帯設備・属性)         | `other`              | `#CC79A7` |
| 自転車専用の走行空間なし        | `no_cycleway`        | `#969696` |

## `no_cycleway` qualification (whole-road absence)

A way is classified `no_cycleway` only when the **whole road** is asserted absent of
bike infrastructure **and** cycling is not prohibited. It qualifies if **all** of:

- cycling not prohibited: `bicycle` is not `no` (`access=no` implying bike prohibition
  is also excluded), **and**
- any one of:
  - `cycleway=no` (unsuffixed), **or**
  - `cycleway:both=no`, **or**
  - `cycleway:left=no` **AND** `cycleway:right=no` (both present)

A lone `cycleway:left=no` or `cycleway:right=no` does **not** qualify as `no_cycleway`
by itself. It only matters relative to the other side:

- if the opposite side has infrastructure (`left=lane` + `right=no`, etc.), the way is
  classified by that infrastructure (`bike_lane` / `track` / `shared_lane`) — see
  priority below;
- only if the opposite side is also `no` (or `cycleway=no` / `cycleway:both=no`) does
  the way become `no_cycleway`;
- if the opposite side is some other non-infra value (e.g. `left=no` +
  `right=crossing`), it falls through to `other`.

Priority: existing infrastructure classes win first (`cycleway`, `track`,
`bike_lane`, `shared_lane`, `bicycle_designated`). `no_cycleway` is evaluated before
the generic `other` catch-all, so previously-unclassified `=no` ways become
`no_cycleway` instead of `other`.

Notes / traps:

- `cycleway:*:oneway=no` (`cycleway:left:oneway=no`, `cycleway:right:oneway=no`,
  `cycleway:both:oneway=no`) is **ignored** for absence detection — it means an existing
  lane is bidirectional (direction of flow), not that no lane exists.
- `marker=no` is **not** used. The `marker` key describes the physical shape of
  utility/milestone markers (`post`, `stone`, ...) and is unrelated to cycle lanes.
  Surveyed "no cycle lane/mark" is encoded as `cycleway=no`.
- `cycleway=shoulder` (no designated infrastructure but a rideable shoulder) remains
  classified as `other`, not merged into `no_cycleway`.
- `bicycle=no` (legal prohibition) can co-exist with `cycleway=no` (physical absence)
  on a way; such ways are excluded from `no_cycleway`.

## Sources

- Raw conversion: `scripts/planetiler-bike-schema.yml`
- UI grouping: `src/bike.ts` (`BIKE_CLASSES`)
- Tag semantics: OSM wiki (`Key:cycleway`, `Key:cycleway:both`, `Key:cycleway:lane`,
  `Tag:cycleway=lane/track/shared_lane/share_busway`, `Key:oneway:bicycle`, JA variants)

## References (OSM wiki)

All pages below were verified to exist on wiki.openstreetmap.org. They are the
source of truth for the tag semantics used in this app.

### Cycling infrastructure (`cycleway`)

- [Key:cycleway](https://wiki.openstreetmap.org/wiki/Key:cycleway) — the `cycleway` key, its values, and the `cycleway:left` / `cycleway:right` / `cycleway:both` side attributes.
- [JA:Key:cycleway](https://wiki.openstreetmap.org/wiki/JA:Key:cycleway) — Japanese translation (左右属性, 車線指定, 緩衝帯 etc.).
- [JA:Tag:highway=cycleway](https://wiki.openstreetmap.org/wiki/JA:Tag:highway=cycleway) — **日本での解釈**: only the 自転車専用道路 sign (325-2) maps to `highway=cycleway`; 自転車歩行者道 uses `highway=footway`/`path` + `bicycle`. Also the key source for `cycleway=lane`＋`cycleway:lane=advisory` = 自転車レーン (新浜通り example), and `cycleway=shared_lane`＋`cycleway:lane=pictogram` = 自転車ナビライン.

### Sub-keys / refinements

- [Key:cycleway:lane](https://wiki.openstreetmap.org/wiki/Key:cycleway:lane) — `exclusive` / `advisory` / `pictogram` refine `cycleway=lane` (⚠ referenced by `cycleway:*:lane` in this app).
- [Key:cycleway:right:oneway](https://wiki.openstreetmap.org/wiki/Key:cycleway:right:oneway) (redirects from / canonical for `Key:cycleway:oneway`) — oneway rules for cycle lanes/tracks incl. contra-flow (`:left` / `:right` / `:both` variants).
- [Key:cycleway:lanes](https://wiki.openstreetmap.org/wiki/Key:cycleway:lanes) — per-lane cycleway type (`cycleway:lanes=*`); not confused with `cycleway:lane=*`.
- [Key:cycleway:buffer](https://wiki.openstreetmap.org/wiki/Key:cycleway:buffer) — space between the cycleway and car lanes.
- [Key:cycleway:separation](https://wiki.openstreetmap.org/wiki/Key:cycleway:separation) — physical separation of the cycleway (bollard, kerb, planter, …).

### Access / oneway / highway

- [Key:bicycle](https://wiki.openstreetmap.org/wiki/Key:bicycle) — access permission for cyclists (`yes` / `no` / `designated` / `permissive` / …).
- [Key:oneway:bicycle](https://wiki.openstreetmap.org/wiki/Key:oneway:bicycle) — oneway rules for cyclists (used for contra-flow streets).
- [Key:highway](https://wiki.openstreetmap.org/wiki/Key:highway) — the `highway` tag and its values.
- [Tag:highway=cycleway](https://wiki.openstreetmap.org/wiki/Tag:highway=cycleway) — dedicated cycleway as a way.
- [Tag:highway=footway](https://wiki.openstreetmap.org/wiki/Tag:highway=footway) — footway (used with `bicycle=` for 自転車歩行者道 as per JA interpretation).
- [Tag:highway=path](https://wiki.openstreetmap.org/wiki/Tag:highway=path) — generic path (used with `bicycle=` when shared foot/bike).
- [Tag:highway=pedestrian](https://wiki.openstreetmap.org/wiki/Tag:highway=pedestrian) — pedestrian zone.

### Direction / side suffixes & routes

- [Forward & backward, left & right](https://wiki.openstreetmap.org/wiki/Forward_%26_backward,_left_%26_right) — semantics of the `:forward` / `:backward` / `:left` / `:right` / `:both` suffixes (source for the left/right/both grouping).
- [Cycle routes](https://wiki.openstreetmap.org/wiki/Cycle_routes) — `route=bicycle` relations and the `icn` / `ncn` / `rcn` / `lcn` network levels used by this app's route layer.
