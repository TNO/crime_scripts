import { ComponentTypes } from 'mithril';
import { State } from '../services';

type IconResolver = string | (() => string);

export enum Pages {
  LANDING = 'LANDING',
  LOGIN = 'LOGIN',
  HOME = 'HOME',
  CRIME_SCRIPT = 'CRIME_SCRIPT',
  SETTINGS = 'SETTINGS',
  ABOUT = 'ABOUT',
  ARTICLE = 'ARTICLE',
  CASE = 'CASE',
}

export type VisibilityResolver = (s: State) => boolean;

export interface Page {
  id: Pages;
  default?: boolean;
  hasNavBar?: boolean;
  title: string;
  icon?: IconResolver;
  iconClass?: string;
  route: string;
  visible: boolean | VisibilityResolver;
  component: ComponentTypes<any, any>;
  sidebar?: ComponentTypes<any, any>;
  hasSidebar?: boolean;
}
