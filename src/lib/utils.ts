import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrencyInput(value: string | number) {
  const digits = String(value).replace(/\D/g, "").replace(/^0+(?=\d)/, "")
  const cents = Number(digits || "0")

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function currencyInputToNumber(value: string) {
  const digits = value.replace(/\D/g, "")
  return Number(digits || "0") / 100
}

export function numberToCurrencyInput(value: number) {
  return formatCurrencyInput(Math.round(Number(value) * 100).toString())
}
