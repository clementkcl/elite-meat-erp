import type { Brand, Item } from "@/lib/stock/types"

export function stockProductName(
  item: Pick<Item, "section" | "name"> | undefined,
  fallback = "Unknown product"
) {
  if (!item) {
    return fallback
  }

  const section = item.section.trim()
  const name = item.name.trim()

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
  const manufacturerName = manufacturer?.name?.trim()

  if (!manufacturerName) {
    return item?.displayName?.trim() || productName
  }

  return `${manufacturerName} ${productName}`
}
