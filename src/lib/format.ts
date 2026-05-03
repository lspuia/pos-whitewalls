const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatPrice(amount: number): string {
  return inrFormatter.format(amount)
}

export function formatQty(qty: number): string {
  return new Intl.NumberFormat('en-IN').format(qty)
}
