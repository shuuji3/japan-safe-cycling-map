import React, { useEffect, useState } from "react";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/macro";
import { Basemap } from "./basemap";
import { BikeLegend } from "./BikeLegend";
import { SearchBox } from "./SearchBox";

type Tab = "search" | "legend" | null;

interface MobileNavProps {
  mode: Basemap;
  onBasemapToggle: (mode: Basemap) => void;
  onSelect: (coords: [number, number]) => void;
  onToggle: (id: string, checked: boolean) => void;
  visible: Record<string, boolean>;
  legendOpen: boolean;
  onLegendToggle: () => void;
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window === "undefined" || window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    setMatches(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

// Consolidated mobile layout: a fixed bottom nav bar with three actions
// (search / categories / basemap). Search and categories expand inline above
// the bar; the basemap tab just toggles 地図 <-> 航空写真. Desktop keeps the
// original floating search box and side legend, so nothing changes there.
export function MobileNav({
  mode,
  onBasemapToggle,
  onSelect,
  onToggle,
  visible,
  legendOpen,
  onLegendToggle,
}: MobileNavProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  useLingui();
  const [activeTab, setActiveTab] = useState<Tab>(null);
  const [open, setOpen] = useState(false);
  const isAerial = mode === "aerial";

  const selectTab = (next: Exclude<Tab, null>) => {
    if (open && activeTab === next) {
      setOpen(false);
    } else {
      setActiveTab(next);
      setOpen(true);
    }
  };

  if (!isMobile) {
    return (
      <>
        <SearchBox onSelect={onSelect} />
        <BikeLegend
          visible={visible}
          onToggle={onToggle}
          open={legendOpen}
          handleOpen={onLegendToggle}
        />
      </>
    );
  }

  return (
    <>
      <div
        className={open ? "mobilenav-panel open" : "mobilenav-panel"}
        onTransitionEnd={() => {
          if (!open) {
            setActiveTab(null);
          }
        }}
      >
        {activeTab === "search" && <SearchBox onSelect={onSelect} />}
        {activeTab === "legend" && (
          <BikeLegend
            visible={visible}
            onToggle={onToggle}
            open={true}
            handleOpen={() => {}}
          />
        )}
      </div>
      <nav className="mobilenav">
        <button
          type="button"
          className={open && activeTab === "search" ? "active" : ""}
          onClick={() => selectTab("search")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <span>{t`検索`}</span>
        </button>
        <button
          type="button"
          className={open && activeTab === "legend" ? "active" : ""}
          onClick={() => selectTab("legend")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
          </svg>
          <span>{t`カテゴリー`}</span>
        </button>
        <button
          type="button"
          onClick={() => onBasemapToggle(isAerial ? "map" : "aerial")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z" />
          </svg>
          <span>{isAerial ? t`地図` : t`航空写真`}</span>
        </button>
      </nav>
    </>
  );
}
