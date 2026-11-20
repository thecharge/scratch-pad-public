import {
  CHART_COLOR_ONE,
  CHART_FILL_COUNT,
  ConsoleResource,
  LATENCY_DIGITS,
  MessageId,
  MIN_RATE_WINDOW_MINUTES,
  MS_PER_MINUTE,
  Text,
} from "@platform/constants";
import { message } from "@platform/messages";
import { type CapabilityStats, StatsSnapshotSchema } from "@platform/types";
import { useOne } from "@refinedev/core";
import { useState } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CHART_CONFIG = {
  count: { label: message(MessageId.UiColRequests), color: CHART_COLOR_ONE },
};

function ratePerMinute(stats: CapabilityStats): number {
  const span = Date.parse(stats.lastSeen) - Date.parse(stats.firstSeen);
  return stats.count / Math.max(span / MS_PER_MINUTE, MIN_RATE_WINDOW_MINUTES);
}

export function StatsView() {
  const [filter, setFilter] = useState<string>(Text.Empty);
  const { result } = useOne({ resource: ConsoleResource.Stats, id: ConsoleResource.Stats });
  const parsed = StatsSnapshotSchema.safeParse(result);
  const entries = Object.entries(parsed.success ? parsed.data.byCapability : {}).filter(([name]) =>
    name.includes(filter),
  );
  const sum = (pick: (stats: CapabilityStats) => number) =>
    entries.reduce((total, [, stats]) => total + pick(stats), 0);
  const data = entries.map(([name, stats]) => ({ name, count: stats.count }));
  return (
    <div className="grid gap-4">
      <Input
        aria-label={message(MessageId.UiFilterStats)}
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        className="max-w-xs"
      />
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{message(MessageId.UiStatTotal)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl" data-stat="total">
              {sum((stats) => stats.count)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{message(MessageId.UiStatErrors)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl" data-stat="errors">
              {sum((stats) => stats.errors)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{message(MessageId.UiStatCacheHits)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl" data-stat="cache">
              {sum((stats) => stats.cacheHits)}
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{message(MessageId.UiStatChartTitle)}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={CHART_CONFIG} className="h-60 w-full">
            <BarChart data={data}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill={CHART_FILL_COUNT} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{message(MessageId.UiStatsTable)}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{message(MessageId.UiColCapability)}</TableHead>
                <TableHead>{message(MessageId.UiColRequests)}</TableHead>
                <TableHead>{message(MessageId.UiColErrors)}</TableHead>
                <TableHead>{message(MessageId.UiColCacheHits)}</TableHead>
                <TableHead>{message(MessageId.UiColAvgLatency)}</TableHead>
                <TableHead>{message(MessageId.UiColRate)}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map(([name, stats]) => (
                <TableRow key={name} data-row="stat">
                  <TableCell>{name}</TableCell>
                  <TableCell>{stats.count}</TableCell>
                  <TableCell>{stats.errors}</TableCell>
                  <TableCell>{stats.cacheHits}</TableCell>
                  <TableCell>
                    {(stats.totalLatencyMs / stats.count).toFixed(LATENCY_DIGITS)}
                  </TableCell>
                  <TableCell>{ratePerMinute(stats).toFixed(LATENCY_DIGITS)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
