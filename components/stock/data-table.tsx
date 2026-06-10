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
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type DataTableColumn<T extends Record<string, unknown>> = {
  key: Extract<keyof T, string>
  header: string
  align?: "left" | "right"
}

function formatValue(value: unknown) {
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

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  emptyText = "No records found.",
}: {
  columns: DataTableColumn<T>[]
  data: T[]
  emptyText?: string
}) {
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
              "h-7 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
              column.align === "right" && "ml-auto"
            )}
            onClick={() =>
              tableColumn.toggleSorting(tableColumn.getIsSorted() === "asc")
            }
          >
            {column.header}
            <ArrowUpDown className="size-3" />
          </Button>
        ),
        cell: ({ getValue }) => (
          <div
            className={cn(
              "min-w-0 truncate text-sm",
              column.align === "right" && "text-right tabular-nums"
            )}
            title={String(formatValue(getValue()))}
          >
            {formatValue(getValue())}
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
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead className="bg-muted/70">
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
                  className="border-t transition-colors hover:bg-muted/40"
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
                  className="px-3 py-10 text-center text-sm text-muted-foreground"
                >
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
