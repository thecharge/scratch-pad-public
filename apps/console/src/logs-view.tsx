import {
  ALL_KINDS,
  CONSOLE_ROW_HEIGHT,
  ConsoleResource,
  EventField,
  EventKind,
  MessageId,
  OPERATOR_EQ,
  POSITION_RELATIVE,
  PX,
  Text,
  TRANSLATE_PREFIX,
  TRANSLATE_SUFFIX,
} from "@platform/constants";
import { message } from "@platform/messages";
import type { ApiEvent } from "@platform/types";
import { useList } from "@refinedev/core";
import { tableFeatures, useTable } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const FEATURES = tableFeatures({});

const COLUMNS = [
  { accessorKey: EventField.Time, header: message(MessageId.UiColTime) },
  { accessorKey: EventField.Kind, header: message(MessageId.UiColKind) },
  { accessorKey: EventField.Capability, header: message(MessageId.UiColCapability) },
  { accessorKey: EventField.Transport, header: message(MessageId.UiColTransport) },
];

function translate(offset: number): string {
  return [TRANSLATE_PREFIX, offset, PX, TRANSLATE_SUFFIX].join(Text.Empty);
}

export function LogsView() {
  const [kind, setKind] = useState<string>(ALL_KINDS);
  const [capability, setCapability] = useState<string>(Text.Empty);
  const { result } = useList<ApiEvent>({
    resource: ConsoleResource.Logs,
    filters: [
      {
        field: EventField.Kind,
        operator: OPERATOR_EQ,
        value: kind === ALL_KINDS ? undefined : kind,
      },
      { field: EventField.Capability, operator: OPERATOR_EQ, value: capability },
    ],
  });
  const table = useTable({
    features: FEATURES,
    data: result?.data ?? [],
    columns: COLUMNS,
  });
  const parent = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;
  const virtual = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parent.current,
    estimateSize: () => CONSOLE_ROW_HEIGHT,
  });
  return (
    <Card>
      <CardContent>
        <div className="mb-2 flex gap-2">
          <select
            aria-label={message(MessageId.UiFilterKind)}
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            <option value={ALL_KINDS}>{message(MessageId.UiAllKinds)}</option>
            {Object.values(EventKind).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <Input
            aria-label={message(MessageId.UiFilterCapability)}
            value={capability}
            onChange={(event) => setCapability(event.target.value)}
          />
        </div>
        <div ref={parent} className="h-96 overflow-auto">
          <div style={{ height: virtual.getTotalSize(), position: POSITION_RELATIVE }}>
            {virtual.getVirtualItems().map((item) => (
              <div
                key={item.key}
                data-row="log"
                className="absolute flex w-full gap-3 text-sm"
                style={{ height: item.size, transform: translate(item.start) }}
              >
                {rows[item.index]?.getAllCells().map((cell) => (
                  <span key={cell.id}>{String(cell.getValue())}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
