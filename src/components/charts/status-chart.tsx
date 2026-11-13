'use client'

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { appointmentStatuses, statusLabels, type AppointmentStatus } from '@/lib/api/types'
import type { DayStatusRow } from '@/lib/overview'
import { formatLocalDate } from '@/lib/time'

/** Fixed color per status (CSS variables in globals.css, validated in light and dark). */
export const statusColor: Record<AppointmentStatus, string> = {
  Scheduled: 'var(--series-scheduled)',
  Cancelled: 'var(--series-cancelled)',
  Completed: 'var(--series-completed)',
  NoShow: 'var(--series-noshow)',
}

/**
 * Appointments per day by status, stacked. Recessive grid and axes, a 2 px surface gap between stacked
 * segments, a hover tooltip, a legend (color is never the only cue) and a table view below for the
 * values (and for the light-mode colors under 3:1 contrast).
 */
export function StatusChart({ rows }: { rows: DayStatusRow[] }) {
  const data = rows.map((row) => ({ ...row, label: formatLocalDate(row.date) }))
  return (
    <div>
      <div className="h-64 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barCategoryGap="25%">
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
              contentStyle={{
                background: 'var(--popover)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--popover-foreground)',
                fontSize: 12,
              }}
              labelStyle={{ color: 'var(--popover-foreground)', fontWeight: 600 }}
              itemStyle={{ color: 'var(--popover-foreground)' }}
            />
            <Legend
              itemSorter={null}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, color: 'var(--muted-foreground)' }}
              formatter={(value: string) => <span style={{ color: 'var(--foreground)' }}>{value}</span>}
            />
            {appointmentStatuses.map((status, index) => (
              <Bar
                key={status}
                dataKey={status}
                name={statusLabels[status]}
                stackId="status"
                fill={statusColor[status]}
                stroke="var(--card)"
                strokeWidth={2}
                maxBarSize={28}
                radius={index === appointmentStatuses.length - 1 ? [4, 4, 0, 0] : 0}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 text-sm">
        <summary className="text-muted-foreground hover:text-foreground cursor-pointer">
          Show as table
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Appointments per day by status</caption>
            <thead>
              <tr className="text-muted-foreground border-b">
                <th scope="col" className="py-1 pr-3 font-medium">
                  Day
                </th>
                {appointmentStatuses.map((s) => (
                  <th key={s} scope="col" className="py-1 pr-3 text-right font-medium">
                    {statusLabels[s]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.date} className="border-b last:border-0">
                  <th scope="row" className="py-1 pr-3 font-normal">
                    {row.label}
                  </th>
                  {appointmentStatuses.map((s) => (
                    <td key={s} className="py-1 pr-3 text-right tabular-nums">
                      {row[s]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
