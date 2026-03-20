export type ItemType = "job" | "story" | "comment" | "poll" | "pollopt";

export type Item = {
  id: number;
  deleted?: boolean;
  type?: ItemType;
  by?: string;
  time?: number;
  text?: string;
  dead?: boolean;
  parent?: number;
  poll?: number;
  kids?: number[];
  url?: string;
  score?: number;
  title?: string;
  parts?: number[];
  descendants?: number;
  cached_at: Date;
}

export type Comment = Item & {
	comments: Comment[]
}

export type User = {
  id: string;
  created: number;
  karma: number;
  about?: string;
  submitted?: number[];
}
