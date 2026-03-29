export interface Feed {
  id: string;
  name: string;
  url: string;
  color: string;
  enabled: boolean;
  /** Domain used to fetch the outlet logo via ClearBit, e.g. "bbc.com" */
  logo?: string;
  /** If true, attempt a direct fetch before falling back to the proxy chain */
  direct?: boolean;
}

export interface Article {
  id: string;
  source: string;
  sourceName: string;
  sourceColor: string;
  sourceLogo?: string;
  title: string;
  link: string;
  desc: string;
  date: Date;
  image: string | null;
}

export interface FeedConfigMap {
  [id: string]: boolean;
}
