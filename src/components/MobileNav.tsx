import React, { useEffect, useState } from "react";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/macro";
import { AboutPanel } from "./AboutPanel";
import { BikeLegend } from "./BikeLegend";
import { SearchBox } from "./SearchBox";

type Tab = "search" | "legend" | "about" | null;

interface MobileNavProps {
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
// (search / categories / about). Search and categories expand inline above
// the bar; about shows a compact panel with source links and the language
// switcher. Desktop keeps the original floating search box and side legend,
// so nothing changes there.
export function MobileNav({
  onSelect,
  onToggle,
  visible,
  legendOpen,
  onLegendToggle,
}: MobileNavProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { i18n } = useLingui();
  const locale = i18n.locale;
  const [activeTab, setActiveTab] = useState<Tab>(null);
  const [open, setOpen] = useState(false);

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
            showFooter={false}
          />
        )}
        {activeTab === "about" && (
          <AboutPanel locale={locale} onSwitch={(l) => i18n.activate(l)} />
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
          className={open && activeTab === "about" ? "active" : ""}
          onClick={() => selectTab("about")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
          <span>{t`情報`}</span>
        </button>
      </nav>
    </>
  );
}
