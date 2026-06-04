import type { Commission, Order, Trade } from './types';

/** Resolve a Commission config into a pure `(notional) => cost` function. */
export function commissionFn(c?: Commission): (notional: number) => number {
  if (!c) return () => 0;
  if (c.type === 'flat') return () => c.value;
  return (notional: number) => Math.abs(notional) * c.value;
}

/**
 * A long-only portfolio: tracks cash + a single position, executes fills with
 * slippage and commission, and records completed round-trips as `Trade`s.
 */
export interface Portfolio {
  cash: number;
  quantity: number;
  avgPrice: number;
  readonly orders: Order[];
  readonly trades: Trade[];
  /** Buy `qty` shares; clamps to affordable size. Returns the fill or null. */
  buy(qty: number, price: number, time: Date, barIndex: number): Order | null;
  /** Sell up to `qty` shares (capped at the position). Returns the fill or null. */
  sell(qty: number, price: number, time: Date, barIndex: number): Order | null;
  /** cash + quantity * markPrice. */
  equity(markPrice: number): number;
}

export function createPortfolio(
  initialCash: number,
  commission?: Commission,
  slippage = 0
): Portfolio {
  const comm = commissionFn(commission);
  const orders: Order[] = [];
  const trades: Trade[] = [];

  // Open-lot bookkeeping for round-trip accounting.
  let entryTime: Date | null = null;
  let entryBarIndex = 0;
  let entryCommission = 0; // commission paid to open the current position

  const p: Portfolio = {
    cash: initialCash,
    quantity: 0,
    avgPrice: 0,
    orders,
    trades,

    buy(qty, price, time, barIndex) {
      if (qty <= 0) return null;
      const fillPrice = price * (1 + slippage);
      // Clamp to what cash can afford (accounting for commission).
      let q = Math.floor(qty);
      while (q > 0 && q * fillPrice + comm(q * fillPrice) > p.cash) q--;
      if (q <= 0) return null;

      const notional = q * fillPrice;
      const fee = comm(notional);
      p.cash -= notional + fee;

      if (p.quantity === 0) {
        p.avgPrice = fillPrice;
        entryTime = time;
        entryBarIndex = barIndex;
        entryCommission = fee;
      } else {
        // Average in (scaling up an existing long).
        const total = p.quantity + q;
        p.avgPrice = (p.avgPrice * p.quantity + fillPrice * q) / total;
        entryCommission += fee;
      }
      p.quantity += q;

      const order: Order = {
        side: 'buy',
        quantity: q,
        fillPrice,
        commission: fee,
        timestamp: time,
        barIndex,
      };
      orders.push(order);
      return order;
    },

    sell(qty, price, time, barIndex) {
      if (qty <= 0 || p.quantity <= 0) return null;
      const q = Math.min(Math.floor(qty), p.quantity);
      if (q <= 0) return null;

      const fillPrice = price * (1 - slippage);
      const notional = q * fillPrice;
      const fee = comm(notional);
      p.cash += notional - fee;

      // Commission attributable to this exit: the portion of the entry commission
      // for the shares being closed, plus this exit fee.
      const entryFeeShare = p.quantity > 0 ? (entryCommission * q) / p.quantity : 0;
      const tradeCommission = entryFeeShare + fee;
      const grossPnl = q * (fillPrice - p.avgPrice);
      const pnl = grossPnl - tradeCommission;

      trades.push({
        entryTime: entryTime ?? time,
        entryPrice: p.avgPrice,
        exitTime: time,
        exitPrice: fillPrice,
        quantity: q,
        pnl,
        returnPct: p.avgPrice !== 0 ? grossPnl / (q * p.avgPrice) : 0,
        barsHeld: barIndex - entryBarIndex,
        commission: tradeCommission,
      });

      entryCommission -= entryFeeShare;
      p.quantity -= q;
      if (p.quantity === 0) {
        p.avgPrice = 0;
        entryTime = null;
        entryCommission = 0;
      }

      const order: Order = {
        side: 'sell',
        quantity: q,
        fillPrice,
        commission: fee,
        timestamp: time,
        barIndex,
      };
      orders.push(order);
      return order;
    },

    equity(markPrice) {
      return p.cash + p.quantity * markPrice;
    },
  };

  return p;
}
