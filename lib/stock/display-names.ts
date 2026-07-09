import type { Brand, Item } from "@/lib/stock/types"

function normalizeDisplayText(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

export function stockProductName(
  item: Pick<Item, "section" | "name"> | undefined,
  fallback = "Unknown product"
) {
  if (!item) {
    return fallback
  }

  const section = normalizeDisplayText(item.section)
  const name = normalizeDisplayText(item.name)

  if (!name) {
    return section || fallback
  }

  if (
    !section ||
    section.toUpperCase() === "GENERAL" ||
    name.toLowerCase().startsWith(section.toLowerCase())
  ) {
    return name
  }

  return `${section} ${name}`
}

export function stockDisplayItemName(
  item: Pick<Item, "section" | "name" | "displayName"> | undefined,
  manufacturer?: Pick<Brand, "name"> | null,
  fallback = "Unknown product"
) {
  const productName = stockProductName(item, fallback)
  const manufacturerName = manufacturer?.name
    ? normalizeDisplayText(manufacturer.name)
    : ""

  if (!manufacturerName) {
    return item?.displayName ? normalizeDisplayText(item.displayName) : productName
  }

  return normalizeDisplayText(`${manufacturerName} ${productName}`)
}
