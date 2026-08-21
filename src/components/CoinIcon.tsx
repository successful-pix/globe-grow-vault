import { useState } from "react";

import { coinOf } from "@/lib/coins";
import { cn } from "@/lib/utils";

export function CoinIcon({
  symbol,
  size = 40,
  className,
}: {
  symbol: string;
  size?: number;
  className?: string;
}) {
  const coin = coinOf(symbol);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-secondary font-display text-xs font-bold text-foreground",
          className,
        )}
        style={{ width: size, height: size }}
      >
        {coin.symbol.slice(0, 3)}
      </div>
    );
  }

  return (
    <img
      src={coin.logo}
      alt={`${coin.name} logo`}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("rounded-full bg-secondary/60 object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}
