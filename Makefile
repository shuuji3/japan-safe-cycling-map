.DELETE_ON_ERROR:

PLANETILER_URL = https://github.com/onthegomap/planetiler/releases/latest/download/planetiler.jar
PLANETILER_JAR = .cache/planetiler.jar

OSM_PATH = .cache/japan.osm.pbf
OSM_URL = https://download.geofabrik.de/asia/japan-latest.osm.pbf
OSM_UA = japan-safe-cycling-map (https://github.com/shuuji3/japan-safe-cycling-map)
ROUTES_GEOJSON = .cache/route_networks.geojson
OUTPUT = public/bicycle-roads.pmtiles
MINZOOM ?= 0
MAXZOOM ?= 16

# all
targets = $(OUTPUT)

all: $(targets)

clean:
	rm -f $(PLANETILER_JAR)
	rm -f $(OSM_PATH)
	rm -f $(ROUTES_GEOJSON)
	rm -f $(OUTPUT)

# download
#
# Download OpenStreetMap data. FORCE re-checks the server on every run; when a
# local extract already exists we update it incrementally via pyosmium-up-to-date
# (only the diffs since the last update), falling back to a full download when
# the file is missing.
$(OSM_PATH): FORCE
	mkdir -p $(@D)
	@if [ -f $@ ]; then \
		uv run --no-sync pyosmium-up-to-date $@; \
	else \
		curl \
			--user-agent "$(OSM_UA)" \
			--location \
			--fail \
			--output $@ \
			$(OSM_URL); \
	fi

# Download Planetiler jar only if missing
$(PLANETILER_JAR): FORCE
	mkdir -p $(@D)
	test -f $@ || curl --location --fail --output $@ $(PLANETILER_URL)

# route networks
$(ROUTES_GEOJSON): $(OSM_PATH) FORCE
	uv run --no-sync python3 scripts/generate-route-networks.py $(OSM_PATH) $(ROUTES_GEOJSON)

# planetiler
#
# Build the bike overlay PMTiles archive
$(OUTPUT): $(ROUTES_GEOJSON) $(PLANETILER_JAR) FORCE
	mkdir -p $(@D)
	mise exec -- java \
		-Xmx8g \
		-jar $(PLANETILER_JAR) \
		generate-custom \
		--schema=scripts/planetiler-bike-schema.yml \
		--osm_path=$(OSM_PATH) \
		--output=$(OUTPUT) \
		--minzoom=$(MINZOOM) \
		--maxzoom=$(MAXZOOM)

.PHONY: all clean FORCE
FORCE:
