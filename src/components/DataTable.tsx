import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyIcon?: React.ReactNode;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  emptyIcon,
  emptyMessage = "No data found",
  className,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="bg-card border rounded-lg flex flex-col items-center justify-center py-16 text-muted-foreground">
        {emptyIcon}
        <p className="mt-2 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("bg-card border rounded-lg overflow-hidden", className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn("text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10", col.className)}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => (
            <TableRow
              key={i}
              className={cn(
                "transition-colors",
                onRowClick && "cursor-pointer hover:bg-muted/30"
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <TableCell key={col.key} className={cn("py-3", col.className)}>
                  {col.render(row, i)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
