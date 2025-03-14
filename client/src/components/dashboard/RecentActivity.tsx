import { Check as CheckType } from "@shared/schema";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface RecentActivityProps {
  checks: CheckType[];
}

export default function RecentActivity({ checks }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Total Numbers</TableHead>
              <TableHead>Found</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {checks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  No activity found. Start by checking some accounts!
                </TableCell>
              </TableRow>
            ) : (
              checks.map((check) => (
                <TableRow key={check.id}>
                  <TableCell className="font-medium">
                    {check.createdAt
                      ? formatDistanceToNow(new Date(check.createdAt), {
                          addSuffix: true,
                        })
                      : "Unknown"}
                  </TableCell>
                  <TableCell>
                    {check.fileName || `Batch #${check.id}`}
                  </TableCell>
                  <TableCell>{check.totalNumbers.toLocaleString()}</TableCell>
                  <TableCell>
                    {check.status === "completed"
                      ? check.foundNumbers?.toLocaleString()
                      : "--"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={check.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "completed":
      return (
        <Badge variant="outline" className="bg-green-100 text-green-700 hover:bg-green-100">
          Completed
        </Badge>
      );
    case "in_progress":
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
          In Progress
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="outline" className="bg-red-100 text-red-700 hover:bg-red-100">
          Failed
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-orange-100 text-orange-700 hover:bg-orange-100">
          Pending
        </Badge>
      );
  }
};
