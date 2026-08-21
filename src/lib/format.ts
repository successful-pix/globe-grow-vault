export function fmtUsd(value: number, maxDigits = 2): string {
  const abs = Math.abs(value);
  const digits = abs > 0 && abs < 1 ? Math.max(maxDigits, 4) : maxDigits;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function fmtAmount(value: number, decimals = 4): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function fmtPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function shortAddress(address: string, size = 6): string {
  if (address.length <= size * 2 + 3) return address;
  return `${address.slice(0, size)}...${address.slice(-size)}`;
}

export function fmtDate(value: string | number | Date): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function countdown(target: string | Date): string {
  const ms = new Date(target).getTime() - Date.now();
  if (ms <= 0) return "Matured";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  return `${hours}h ${minutes}m ${seconds}s`;
}
