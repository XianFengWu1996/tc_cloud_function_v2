import { DateTime } from 'luxon';

export const currenTime = () => {
  const zone = 'America/New_York';
  const dateTime = DateTime.local().setZone(zone);
  const currentTime = dateTime.hour * 60 + dateTime.minute;

  return {
    year: dateTime.year,
    month: dateTime.month,
    dayOfWeek: dateTime.weekdayLong,
    day: dateTime.daysInMonth,
    hour: dateTime.hour,
    minute: dateTime.minute,
    second: dateTime.second,
    currentTime,
    dateTime,
  };
};

export const timeFormat = (time: number) => {
  const hr = Math.floor(time / 60);
  const min = time % 60;

  const hour = hr < 10 ? `0${hr}` : `${hr}`;
  const minute = min < 10 ? `0${min}` : `${min}`;
  const ampm = hr >= 0 && hr <= 12 ? 'AM' : 'PM';

  return `${hour}:${minute}${ampm}`;
};
