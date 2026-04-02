export const HN_BASE_URL = 'https://hacker-news.firebaseio.com/v0';
export const LIST_STALE_MS = 2 * 60 * 1000; // cache lists for 5 minutes
export const ITEM_STALE_INITIAL = 5 * 60 * 1000; // cache stories for 10 minutes (first 2 hours)
export const ITEM_STALE_MAX = 7 * 24 * 60 * 60 * 1000; // cache stories for max 1 week
export const ITEM_STALE_RAMP_UP = 2 * 60 * 60 * 1000; // ramp up period: 2 hours
export const USER_STALE_MS = 24 * 60 * 60 * 1000; // cache users a day
