import React from "react";
import { Trans } from "@lingui/macro";
import { LanguageToggle } from "./LanguageToggle";
import { SourceLinks } from "./SourceLinks";

interface Props {
  locale: string;
  onSwitch: (locale: string) => void;
}

export function AboutPanel({ locale, onSwitch }: Props) {
  return (
    <div className="about-panel">
      <h3 className="about-heading">
        <Trans>このアプリについて</Trans>
      </h3>
      <div className="about-row">
        <span className="about-label">
          <Trans>ソースコード</Trans>
        </span>
        <div className="about-value">
          <SourceLinks withLabel />
        </div>
      </div>
      <hr className="about-divider" />
      <div className="about-row">
        <span className="about-label">
          <Trans>言語</Trans>
        </span>
        <div className="about-value">
          <LanguageToggle locale={locale} onSwitch={onSwitch} />
        </div>
      </div>
    </div>
  );
}
