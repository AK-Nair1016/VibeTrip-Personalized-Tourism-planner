// The one place a price becomes text. Amounts arrive as plain numbers, so 78.2 must show as 78.20
// and JPY (no decimals) as 7,820. Intl.NumberFormat knows each currency's decimals.
export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency
  }).format(amount);
}
