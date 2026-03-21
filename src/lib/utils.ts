const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const WEEK = DAY * 7;
const MONTH = DAY * 30;
const YEAR = DAY * 365;

export function timeToReadable(unixSeconds: number): string {
	const diff = Date.now() / 1000 - unixSeconds;
	if (diff < MINUTE) return 'just now';

	if (diff < HOUR) {
    const m = Math.floor(diff / MINUTE);
    return `${m} min${m > 0 ? "s":""} ago`;
  }

	if (diff < DAY){
    const m = Math.floor(diff / HOUR);
    return `${m} hour${m > 0 ? "s":""} ago`;
  }

	if (diff < WEEK){
    const w = Math.floor(diff / DAY);
    return `${w} day${w > 0 ? "s":""} ago`;
  }

	if (diff < MONTH) {
    const w = Math.floor(diff / WEEK);
    return `${w} week${w > 0 ? "s":""} ago`;
  }

	if (diff < YEAR) {
    const m = Math.floor(diff / MONTH);
    return `${m} month${m > 0 ? "s":""} ago`;
  }

  const y = Math.floor(diff / YEAR);
	return `${y} year${y > 0 ? "s":""} ago`;
}
