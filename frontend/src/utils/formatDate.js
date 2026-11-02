function pad(value) {
  return String(value).padStart(2, '0');
}

function toValidDate(value) {
  if (!value && value !== 0) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatParts(date) {
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return { day, month, year, hours, minutes, seconds };
}

// DD/MM/YYYY
export function formatDate(value) {
  const date = toValidDate(value);
  if (!date) return '-';
  const { day, month, year } = formatParts(date);
  return `${day}/${month}/${year}`;
}

// DD/MM/YYYY HH:mm:ss (24h)
export function formatDateTime(value) {
  const date = toValidDate(value);
  if (!date) return '-';
  const { day, month, year, hours, minutes, seconds } = formatParts(date);
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

export function formatTime(value) {
  const date = toValidDate(value);
  if (!date) return '-';
  const { hours, minutes, seconds } = formatParts(date);
  return `${hours}:${minutes}:${seconds}`;
}
