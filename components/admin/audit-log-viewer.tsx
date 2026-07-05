"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Assuming table.tsx exists, if not I will check
import { format } from "date-fns";
import { Search, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface AuditLog {
  id: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/audit-logs");
      const data = await res.json();
      if (res.ok) setLogs(data.logs);
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(
    (log) =>
      log.action.toLowerCase().includes(filter.toLowerCase()) ||
      (log.resourceType || "").toLowerCase().includes(filter.toLowerCase()),
  );

  const getActionBadge = (action: string) => {
    if (action.includes("ENABLED"))
      return (
        <Badge className="bg-green-500/10 text-green-600 border-none">
          Success
        </Badge>
      );
    if (action.includes("DELETED"))
      return (
        <Badge className="bg-red-500/10 text-red-600 border-none">
          Deleted
        </Badge>
      );
    if (action.includes("LOGIN"))
      return (
        <Badge className="bg-blue-500/10 text-blue-600 border-none">
          Login
        </Badge>
      );
    return <Badge variant="outline">{action.split("_").join(" ")}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Filter activities..."
            className="pl-9"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Origin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-12 text-muted-foreground font-medium"
                >
                  No security activities found.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow
                  key={log.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="font-medium">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm">
                        {log.action.split("_").join(" ")}
                      </span>
                      <div className="flex gap-2">
                        {getActionBadge(log.action)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground">
                      {log.resourceType || "N/A"}:{" "}
                      {log.resourceId?.slice(0, 8) || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="text-right text-xs font-mono text-muted-foreground">
                    {log.ipAddress || "Unknown"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
