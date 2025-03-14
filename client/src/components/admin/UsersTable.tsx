import { useState } from "react";
import { User } from "@shared/schema";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, MoreVertical, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface UsersTableProps {
  users: User[];
}

export default function UsersTable({ users }: UsersTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Filter users based on search query
  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.fullName && user.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAction = (action: string, user: User) => {
    switch (action) {
      case "edit":
        toast({
          title: "Edit User",
          description: `Editing user ${user.username}`,
        });
        break;
      case "suspend":
        toast({
          title: "Suspend User",
          description: `User ${user.username} has been suspended`,
        });
        break;
      case "activate":
        toast({
          title: "Activate User",
          description: `User ${user.username} has been activated`,
        });
        break;
      case "delete":
        toast({
          title: "Delete User",
          description: `User ${user.username} has been deleted`,
          variant: "destructive",
        });
        break;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>Users</CardTitle>
          <div className="flex space-x-2 items-center">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-8 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button size="sm" className="h-9">
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                  {searchQuery ? "No users found matching your search" : "No users found"}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.fullName || "—"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === "admin" ? "secondary" : "outline"}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={user.status} />
                  </TableCell>
                  <TableCell>
                    {format(new Date(user.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleAction("edit", user)}>
                          Edit
                        </DropdownMenuItem>
                        {user.status === "active" ? (
                          <DropdownMenuItem onClick={() => handleAction("suspend", user)}>
                            Suspend
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleAction("activate", user)}>
                            Activate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleAction("delete", user)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
    case "active":
      return (
        <Badge variant="outline" className="bg-green-100 text-green-700 hover:bg-green-100">
          Active
        </Badge>
      );
    case "inactive":
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
          Inactive
        </Badge>
      );
    case "suspended":
      return (
        <Badge variant="outline" className="bg-red-100 text-red-700 hover:bg-red-100">
          Suspended
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">{status}</Badge>
      );
  }
};
