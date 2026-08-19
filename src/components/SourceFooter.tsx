import { Trans } from '@lingui/react/macro'
import { LanguageToggle } from './LanguageToggle'
import { SourceLinks } from './SourceLinks'

interface Props {
  locale: string;
  onSwitch: (locale: string) => void;
}

// Source-code links (GitHub / Tangled) plus the language switcher. Used as the
// footer of the desktop legend sidebar.
export function SourceFooter({ locale, onSwitch }: Props) {
  return (
    <div className="sidebar-footer">
      <div className="github-link">
        <span className="source-label">
          <Trans>ソースコード</Trans>
        </span>
        <SourceLinks />
      </div>
      <LanguageToggle locale={locale} onSwitch={onSwitch} />
    </div>
  );
}
