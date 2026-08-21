export type Coin = {
  symbol: string;
  name: string;
  geckoId: string;
  network: string;
  logo: string;
  decimals: number;
};

const icon = (slug: string) =>
  `https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/128/color/${slug}.png`;

export const COINS: Coin[] = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    geckoId: "bitcoin",
    network: "Bitcoin",
    logo: icon("btc"),
    decimals: 6,
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    geckoId: "ethereum",
    network: "ERC20",
    logo: icon("eth"),
    decimals: 5,
  },
  {
    symbol: "USDT",
    name: "Tether",
    geckoId: "tether",
    network: "TRC20",
    logo: icon("usdt"),
    decimals: 2,
  },
  {
    symbol: "BNB",
    name: "BNB",
    geckoId: "binancecoin",
    network: "BEP20",
    logo: icon("bnb"),
    decimals: 4,
  },
  {
    symbol: "SOL",
    name: "Solana",
    geckoId: "solana",
    network: "Solana",
    logo: icon("sol"),
    decimals: 4,
  },
  {
    symbol: "XRP",
    name: "XRP",
    geckoId: "ripple",
    network: "XRP Ledger",
    logo: icon("xrp"),
    decimals: 3,
  },
  {
    symbol: "ADA",
    name: "Cardano",
    geckoId: "cardano",
    network: "Cardano",
    logo: icon("ada"),
    decimals: 3,
  },
  {
    symbol: "DOGE",
    name: "Dogecoin",
    geckoId: "dogecoin",
    network: "Dogecoin",
    logo: icon("doge"),
    decimals: 2,
  },
  {
    symbol: "TON",
    name: "Toncoin",
    geckoId: "the-open-network",
    network: "TON",
    logo: "https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png",
    decimals: 3,
  },
  {
    symbol: "MATIC",
    name: "Polygon",
    geckoId: "matic-network",
    network: "Polygon",
    logo: icon("matic"),
    decimals: 2,
  },
];

export const COIN_MAP: Record<string, Coin> = Object.fromEntries(
  COINS.map((c) => [c.symbol, c]),
);

export const GECKO_TO_SYMBOL: Record<string, string> = Object.fromEntries(
  COINS.map((c) => [c.geckoId, c.symbol]),
);

/** Fallback reference prices used when the live price feed is unreachable. */
export const FALLBACK_PRICES: Record<string, number> = {
  BTC: 96500,
  ETH: 3350,
  USDT: 1,
  BNB: 705,
  SOL: 182,
  XRP: 2.28,
  ADA: 0.86,
  DOGE: 0.31,
  TON: 5.1,
  MATIC: 0.45,
};

export function coinOf(symbol: string): Coin {
  return COIN_MAP[symbol] ?? COINS[2]!;
}
