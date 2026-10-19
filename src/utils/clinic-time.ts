const CLINIC_TIME_ZONE = 'America/Sao_Paulo';

export interface ClinicDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: CLINIC_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export function getClinicDateTimeParts(date: Date): ClinicDateTimeParts {
  const parts = formatter.formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, Number(part.value)]));
  return {
    year: values.get('year')!,
    month: values.get('month')!,
    day: values.get('day')!,
    hour: values.get('hour')!,
    minute: values.get('minute')!,
    second: values.get('second')!,
  };
}

export function clinicLocalDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): Date {
  const targetTime = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = targetTime;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const local = getClinicDateTimeParts(new Date(candidate));
    const representedTime = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
    );
    const difference = targetTime - representedTime;
    if (difference === 0) {
      break;
    }
    candidate += difference;
  }

  return new Date(candidate);
}

export function clinicWeekDay(parts: ClinicDateTimeParts): number {
  return new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day),
  ).getUTCDay();
}

export function clinicMinutesSinceMidnight(
  parts: ClinicDateTimeParts,
): number {
  return parts.hour * 60 + parts.minute;
}
