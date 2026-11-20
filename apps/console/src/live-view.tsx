import {
  CONSOLE_LIVE_ROWS_MAX,
  ConsoleResource,
  EventKind,
  KEY_JOINER,
  MessageId,
  Text,
} from "@platform/constants";
import { message } from "@platform/messages";
import type { ApiEvent } from "@platform/types";
import { useSubscription } from "@refinedev/core";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function outcomeOf(event: ApiEvent): string {
  return event.kind === EventKind.Request ? String(event.status) : Text.Empty;
}

function latencyOf(event: ApiEvent): string {
  return event.kind === EventKind.Request ? String(event.latencyMs.toFixed(1)) : Text.Empty;
}

export function LiveView() {
  const [rows, setRows] = useState<ApiEvent[]>([]);
  useSubscription({
    channel: ConsoleResource.Logs,
    onLiveEvent: (event) => {
      setRows((current) => [event.payload as ApiEvent, ...current].slice(0, CONSOLE_LIVE_ROWS_MAX));
    },
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{message(MessageId.UiNavLive)}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? <p>{message(MessageId.UiLiveWaiting)}</p> : null}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{message(MessageId.UiColKind)}</TableHead>
              <TableHead>{message(MessageId.UiColCapability)}</TableHead>
              <TableHead>{message(MessageId.UiColTransport)}</TableHead>
              <TableHead>{message(MessageId.UiColPrincipal)}</TableHead>
              <TableHead>{message(MessageId.UiColOutcome)}</TableHead>
              <TableHead>{message(MessageId.UiColLatency)}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={[row.requestId, row.kind, row.time].join(KEY_JOINER)} data-row="live">
                <TableCell>
                  <Badge variant="secondary">{row.kind}</Badge>
                </TableCell>
                <TableCell>{row.capability}</TableCell>
                <TableCell>{row.transport}</TableCell>
                <TableCell>{row.principalKind}</TableCell>
                <TableCell>{outcomeOf(row)}</TableCell>
                <TableCell>{latencyOf(row)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
