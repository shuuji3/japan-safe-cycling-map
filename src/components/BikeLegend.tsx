import React, { useEffect, useRef, useState } from 'react'
import { useLingui } from '@lingui/react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { BIKE_CLASSES } from '../data/bike'
import { SourceFooter } from './SourceFooter'

interface Props {
  visible: Record<string, boolean>;
  onToggle: (id: string, checked: boolean) => void;
  open: boolean;
  handleOpen: () => void;
  showFooter?: boolean;
}

// Sidebar with per-category checkboxes and a hover/click-pin popover that
// explains the OSM tags each layer uses.
export function BikeLegend({
  visible,
  onToggle,
  open,
  handleOpen,
  showFooter = true,
}: Props) {
  const { i18n } = useLingui();
  const locale = i18n.locale;
  // Which row's OSM-tag popover is open (anchored at the ⓘ button) and whether
  // it was pinned by a click (stays until clicked outside or toggled).
  const [note, setNote] = useState<{ id: string; x: number; y: number } | null>(
    null,
  );
  const [pinned, setPinned] = useState(false);
  const noteRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  const placeNote = (
    e: React.MouseEvent<HTMLButtonElement>,
    id: string,
  ): void => {
    const rect = e.currentTarget.getBoundingClientRect();
    setNote({ id, x: rect.right + 8, y: rect.top });
  };

  // Hover shows the popover without pinning.
  const openOnHover = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    placeNote(e, id);
    setPinned(false);
    window.clearTimeout(closeTimer.current);
  };

  // Click pins (or unpins) it. preventDefault stops the nested button from
  // also toggling the containing label's checkbox.
  const togglePin = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    e.preventDefault();
    if (pinned && note && note.id === id) {
      setNote(null);
      setPinned(false);
      return;
    }
    placeNote(e, id);
    setPinned(true);
  };

  // A short delay lets the cursor move into the popover before it closes.
  const scheduleClose = () => {
    if (pinned) {
      return;
    }
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setNote(null), 150);
  };

  const cancelClose = () => window.clearTimeout(closeTimer.current);

  // Clicking anywhere outside the popover closes it (and unpins).
  useEffect(() => {
    if (!note) {
      return;
    }
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (noteRef.current && noteRef.current.contains(target)) {
        return;
      }
      if ((target as Element).closest?.(".note-toggle")) {
        return;
      }
      setNote(null);
      setPinned(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [note]);

  const openDef = note ? BIKE_CLASSES.find((d) => d.id === note.id) : null;

  return (
    <>
      <div className="bike-sidebar">
        <div className="legend-head" onClick={handleOpen}
        >
          <h2>
            <Trans>自転車道のカテゴリー</Trans>
          </h2>
          <span
            className="legend-fold"
            title={open ? t`閉じる` : t`開く`}
          >
            <svg className="legend-icon" viewBox="0 0 24 24" aria-hidden="true">
              {open ? (
                <>
                  <path d="M0 0h24v24H0z" fill="none" />
                  <path fill="currentColor" d="m12 10.8l-3.9 3.9q-.275.275-.7.275t-.7-.275t-.275-.7t.275-.7l4.6-4.6q.3-.3.7-.3t.7.3l4.6 4.6q.275.275.275.7t-.275.7t-.7.275t-.7-.275z" />
                </>
              ) : (
                <>
                  <path d="M0 0h24v24H0z" fill="none" />
                  <path fill="currentColor" d="M11.625 14.913q-.175-.063-.325-.213l-4.6-4.6q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l3.9 3.9l3.9-3.9q.275-.275.7-.275t.7.275t.275.7t-.275.7l-4.6 4.6q-.15.15-.325.213t-.375.062t-.375-.062" />
                </>
              )}
            </svg>
          </span>
        </div>
        <div className={open ? "legend-collapse open" : "legend-collapse"}>
          <div className="legend-collapse-inner">
          {BIKE_CLASSES.map((def) => (
          <div key={def.id} className="bike-row">
            <input
              id={`cb-${def.id}`}
              type="checkbox"
              className="bike-chk"
              checked={!!visible[def.id]}
              onChange={(e) => onToggle(def.id, e.target.checked)}
            />
            <label className="bike-toggle" htmlFor={`cb-${def.id}`}>
              <div className="bike-head">
                <span className="bike-check" aria-hidden="true">
                  {!!visible[def.id] && (
                    <svg viewBox="0 0 24 24" className="bike-check-mark">
                      <path d="M4.5 12.5 L9.5 17.5 L19.5 6.5" />
                    </svg>
                  )}
                </span>
                <span
                  className="bike-swatch"
                  style={{ background: def.color }}
                  aria-hidden="true"
                />
                <span className="bike-name">{i18n._(def.name)}</span>
                <button
                  type="button"
                  className="note-toggle"
                  aria-label={t`${i18n._(def.name)}が表示しているOSMタグ`}
                  onMouseEnter={(e) => openOnHover(e, def.id)}
                  onMouseLeave={scheduleClose}
                  onClick={(e) => togglePin(e, def.id)}
                >
                  ⓘ
                </button>
              </div>
              <div className="bike-toggle-summary">{i18n._(def.summary)}</div>
            </label>
          </div>
        ))}
        {showFooter && (
          <SourceFooter locale={locale} onSwitch={(l) => i18n.activate(l)} />
        )}
          </div>
        </div>
      </div>
      {openDef && (
        <div
          ref={noteRef}
          className="note-popover"
          style={{ left: note!.x, top: note!.y }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className="note-heading">
            <Trans>このレイヤーが表示しているOSMタグ</Trans>
          </div>
          {openDef.attrs.map((a, i) => (
            <div key={i} className="note-attr">
              <div className="note-attr-tags">
                {a.tags.map((t) => (
                  <code key={t} className="bike-toggle-tag">{t}</code>
                ))}
              </div>
              <span className="note-attr-meaning">{i18n._(a.meaning)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
