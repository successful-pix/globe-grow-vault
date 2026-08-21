import { createServerFn } from "@tanstack/react-start";

import { COINS, FALLBACK_PRICES, GECKO_TO_SYMBOL, coinOf } from "./coins";

export type Quote = { price: number; change24h: number };
export type Quotes = Record<string, Quote>;

function fallbackQuotes(): Quotes {
  const out: Quotes = {};
  for (const coin of COINS) {
    const seed = coin.symbol.charCodeAt(0) + coin.symbol.length * 7;
    out[coin.symbol] = {
      price: FALLBACK_PRICES[coin.symbol] ?? 1,
      change24h: coin.symbol === "USDT" ? 0.01 : ((seed % 13) - 6) / 1.7,
    };
  }
  return out;
}

export const getQuotes = createServerFn({ method: "GET" }).handler(async (): Promise<Quotes> => {
  const ids = COINS.map((c) => c.geckoId).join(",");
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { headers: { accept: "application/json" } },
    );
    if (!res.ok) throw new Error(`price feed ${res.status}`);
    const json = (await res.json()) as Record<string, { usd?: number; usd_24h_change?: number }>;
    const out: Quotes = {};
    for (const [geckoId, value] of Object.entries(json)) {
      const symbol = GECKO_TO_SYMBOL[geckoId];
      if (!symbol || typeof value.usd !== "number") continue;
      out[symbol] = { price: value.usd, change24h: value.usd_24h_change ?? 0 };
    }
    const merged = { ...fallbackQuotes(), ...out };
    return merged;
  } catch (error) {
    console.error("getQuotes failed, using fallback prices", error);
    return fallbackQuotes();
  }
});

export type Candle = { t: number; o: number; h: number; l: number; c: number };

function syntheticCandles(symbol: string, points: number, spanMs: number): Candle[] {
  const base = FALLBACK_PRICES[symbol] ?? 1;
  let seed = symbol.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const now = Date.now();
  const candles: Candle[] = [];
  let price = base * (0.94 + rand() * 0.1);
  for (let i = points - 1; i >= 0; i--) {
    const drift = (rand() - 0.48) * (symbol === "USDT" ? 0.0004 : 0.018);
    const open = price;
    const close = open * (1 + drift);
    const high = Math.max(open, close) * (1 + rand() * 0.006);
    const low = Math.min(open, close) * (1 - rand() * 0.006);
    candles.push({ t: now - i * spanMs, o: open, h: high, l: low, c: close });
    price = close;
  }
  return candles;
}

export const getCandles = createServerFn({ method: "GET" })
  .inputValidator((input: { symbol: string; days: number }) => ({
    symbol: String(input.symbol).toUpperCase().slice(0, 8),
    days: Math.min(Math.max(Number(input.days) || 1, 1), 365),
  }))
  .handler(async ({ data }): Promise<Candle[]> => {
    const coin = coinOf(data.symbol);
    const spanMs = data.days <= 1 ? 30 * 60 * 1000 : data.days * 24 * 60 * 60 * 1000 * 0.02;
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coin.geckoId}/ohlc?vs_currency=usd&days=${data.days}`,
        { headers: { accept: "application/json" } },
      );
      if (!res.ok) throw new Error(`chart feed ${res.status}`);
      const rows = (await res.json()) as number[][];
      const candles = rows
        .filter((r) => r.length >= 5)
        .map((r) => ({ t: r[0]!, o: r[1]!, h: r[2]!, l: r[3]!, c: r[4]! }));
      if (candles.length < 5) throw new Error("chart feed empty");
      return candles.slice(-60);
    } catch (error) {
      console.error("getCandles failed, using synthetic series", error);
      return syntheticCandles(data.symbol, 48, spanMs);
    }
  });
