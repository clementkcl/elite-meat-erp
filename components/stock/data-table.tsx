"use client"

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge, isStatusLike } from "@/components/ui/status-badge"
import { cn } from "@/lib/utils"

export type DataTableColumn<T extends Record<string, unknown>> = {
  key: Extract<keyof T, string>
  header: string
  align?: "left" | "right"
}

type DisplayLinkValue = {
  kind: "link"
  href: string
  label: string
}

export function tableLink(
  href: string | null | undefined,
  label = "View"
): DisplayLinkValue | null {
  return href ? { kind: "link", href, label } : null
}

function isDisplayLink(value: unknown): value is DisplayLinkValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    (value as { kind?: unknown }).kind === "link" &&
    typeof (value as { href?: unknown }).href === "string" &&
    typeof (value as { label?: unknown }).label === "string"
  )
}

function formatValue(value: unknown) {
  if (isDisplayLink(value)) {
    return value.label
  }

  if (typeof value === "number") {
    return Number.isInteger(value)
      ? value.toLocaleString()
      : value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No"
  }

  if (typeof value === "string") {
    return value
  }

  return "-"
}

function DisplayValue({ value }: { value: unknown }) {
  if (isDisplayLink(value)) {
    return (
      <a
        href={value.href}
        target="_blank"
        rel="noreferrer"
        className="text-primary underline-offset-4 hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        {value.label}
      </a>
    )
  }

  if (isStatusLike(value)) {
    return <StatusBadge value={String(value)} />
  }

  return formatValue(value)
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  emptyText = "No records found.",
  getRowHref,
}: {
  columns: DataTableColumn<T>[]
  data: T[]
  emptyText?: string
  getRowHref?: (row: T) => string | undefined
}) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
  const tableColumns = useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((column) => ({
        accessorKey: column.key,
        header: ({ column: tableColumn }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-auto min-h-11 gap-1 whitespace-normal px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground",
              column.align === "right" && "ml-auto"
            )}
            onClick={() =>
              tableColumn.toggleSorting(tableColumn.getIsSorted() === "asc")
            }
          >
            {column.header}
            <ArrowUpDown className="size-3 shrink-0" />
          </Button>
        ),
        cell: ({ getValue }) => (
          <div
            className={cn(
              "min-w-0 whitespace-normal break-words text-sm text-foreground/90",
              column.align === "right" && "text-right tabular-nums"
            )}
            title={String(formatValue(getValue()))}
          >
            <DisplayValue value={getValue()} />
          </div>
        ),
      })),
    [columns]
  )

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table is the required grid engine for Stock V1.
  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="overflow-hidden rounded-md border bg-card shadow-xs">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead className="bg-muted/60">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2 text-left">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  tabIndex={getRowHref?.(row.original) ? 0 : undefined}
                  onClick={() => {
                    const href = getRowHref?.(row.original)

                    if (href) {
                      router.push(href)
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") {
                      return
                    }

                    const href = getRowHref?.(row.original)

                    if (href) {
                      event.preventDefault()
                      router.push(href)
                    }
                  }}
                  className={cn(
                    "border-t transition-colors hover:bg-muted/40",
                    getRowHref?.(row.original) &&
                      "cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="max-w-72 px-3 py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-6"
                >
                  <EmptyState
                    title={emptyText}
                    description="Check your scope, filters, or create the first record."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
