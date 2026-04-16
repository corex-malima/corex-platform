export function currentIsoWeek(): string {
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${String(date.getUTCFullYear()).slice(2)}${String(week).padStart(2, "0")}`;
}

export function currentDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function generateAvailableWeeks(fromYear = 2024): string[] {
  const weeks: string[] = [];
  const now = new Date();
  const currentWeekId = currentIsoWeek();

  for (let year = fromYear; year <= now.getFullYear(); year += 1) {
    const weeksInYear = getIsoWeeksInYear(year);
    for (let week = 1; week <= weeksInYear; week += 1) {
      const id = `${String(year).slice(2)}${String(week).padStart(2, "0")}`;
      if (id <= currentWeekId) weeks.push(id);
    }
  }

  return weeks;
}

export function formatWeekLabel(isoWeekId: string): string {
  const normalized = isoWeekId.length === 6 ? isoWeekId.slice(2) : isoWeekId;
  const year = `20${normalized.slice(0, 2)}`;
  const week = normalized.slice(2);
  return `Sem ${Number.parseInt(week, 10)} - ${year}`;
}

function getIsoWeeksInYear(year: number): number {
  const jan1 = new Date(year, 0, 1).getDay();
  const dec31 = new Date(year, 11, 31).getDay();
  return jan1 === 4 || dec31 === 4 ? 53 : 52;
}
