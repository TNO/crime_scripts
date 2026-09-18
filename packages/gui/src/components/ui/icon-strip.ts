import m, { type FactoryComponent } from 'mithril';
import { type IconValue, resolveIconSources } from '../../models';

type IconStripAttrs = {
  className?: string;
  fallback: string;
  icon?: IconValue;
  icons?: IconValue[];
  uploadedImage?: string;
};

export const IconStrip: FactoryComponent<IconStripAttrs> = () => {
  return {
    view: ({ attrs: { className, fallback, icon, icons, uploadedImage } }) => {
      const sources = resolveIconSources(icons, icon, uploadedImage);
      const displayedSources = sources.length > 0 ? sources : [fallback];
      const classes = [className, `icon-strip--count-${displayedSources.length}`].filter(Boolean).join(' ');
      return m('.icon-strip', { className: classes, 'aria-hidden': 'true' },
        displayedSources.map((source, index) =>
          m('img.icon-strip-symbol', { key: `${source}:${index}`, src: source, alt: '' })
        )
      );
    },
  };
};