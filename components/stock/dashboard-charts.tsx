"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { ChartPoint, MovementTrendPoint } from "@/lib/stock/types"

const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

export function StockDashboardCharts({
  categoryMix,
  locationStock,
  movementTrend,
}: {
  categoryMix: ChartPoint[]
  locationStock: ChartPoint[]
  movementTrend: MovementTrendPoint[]
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-4">
          <h3 className="text-base font-semibold">Stock by category</h3>
          <p className="text-sm text-muted-foreground">Total kg on hand</p>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryMix}
                dataKey="value"
                nameKey="name"
                innerRadius={62}
                outerRadius={100}
                paddingAngle={3}
              >
                {categoryMix.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={chartColors[index % chartColors.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} kg`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="mb-4">
          <h3 className="text-base font-semibold">Stock by location</h3>
          <p className="text-sm text-muted-foreground">Current stock weight</p>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={locationStock}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip formatter={(value) => `${value} kg`} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="var(--chart-2)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 xl:col-span-2">
        <div className="mb-4">
          <h3 className="text-base font-semibold">Movement trend</h3>
          <p className="text-sm text-muted-foreground">
            Inbound, outbound, and transfer kg
          </p>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={movementTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip formatter={(value) => `${value} kg`} />
              <Area
                type="monotone"
                dataKey="inbound"
                stackId="1"
                stroke="var(--chart-2)"
                fill="var(--chart-2)"
                fillOpacity={0.65}
              />
              <Area
                type="monotone"
                dataKey="outbound"
                stackId="1"
                stroke="var(--chart-1)"
                fill="var(--chart-1)"
                fillOpacity={0.65}
              />
              <Area
                type="monotone"
                dataKey="transfer"
                stackId="1"
                stroke="var(--chart-4)"
                fill="var(--chart-4)"
                fillOpacity={0.55}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
