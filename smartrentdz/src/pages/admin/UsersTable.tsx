import { useState, useEffect } from "react";
import { Search, Trash2, MoreHorizontal } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiDelete } from "@/lib/api";

interface User {
  uid: string;
  name: string;
  email: string;
  type: "renter" | "landlord";
  phone: string;
  created_at: string;
  status?: "active" | "inactive" | "blocked";
}

const UsersTable = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Replace with actual API endpoint
      const response = await apiGet<User[]>("/admin/users");
      setUsers(response);
      setFilteredUsers(response);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      // Mock data for demonstration
      const mockUsers: User[] = [
        {
          uid: "1",
          name: "أحمد محمد",
          email: "ahmed@example.com",
          type: "landlord",
          phone: "0561234567",
          created_at: "2024-01-15",
          status: "active",
        },
        {
          uid: "2",
          name: "فاطمة علي",
          email: "fatima@example.com",
          type: "renter",
          phone: "0562345678",
          created_at: "2024-02-20",
          status: "active",
        },
        {
          uid: "3",
          name: "محمد عمر",
          email: "mohamad@example.com",
          type: "landlord",
          phone: "0563456789",
          created_at: "2024-03-10",
          status: "inactive",
        },
      ];
      setUsers(mockUsers);
      setFilteredUsers(mockUsers);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const filtered = users.filter(
      (user) =>
        user.email.toLowerCase().includes(term.toLowerCase()) ||
        user.name.includes(term)
    );
    setFilteredUsers(filtered);
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm("هل تريد حذف هذا المستخدم؟")) return;

    try {
      setDeleting(uid);
      await apiDelete(`/admin/users/${uid}`);
      setUsers(users.filter((user) => user.uid !== uid));
      setFilteredUsers(filteredUsers.filter((user) => user.uid !== uid));
      toast({
        title: "تم الحذف",
        description: "تم حذف المستخدم بنجاح.",
      });
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast({
        title: "خطأ",
        description: "فشل حذف المستخدم.",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const getTypeColor = (type: string) => {
    return type === "landlord"
      ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
      : "bg-green-500/10 text-green-700 dark:text-green-400";
  };

  const getTypeLabel = (type: string) => {
    return type === "landlord" ? "مالك عقار" : "مستأجر";
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "inactive":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "blocked":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case "active":
        return "نشط";
      case "inactive":
        return "غير نشط";
      case "blocked":
        return "محظور";
      default:
        return "غير معروف";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>إدارة المستخدمين</CardTitle>
            <CardDescription>
              {filteredUsers.length} مستخدم{filteredUsers.length !== 1 ? "ين" : ""}
            </CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث بالبريد الإلكتروني أو الاسم..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-3 pr-10"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">جاري تحميل البيانات...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">
              {searchTerm ? "لم يتم العثور على مستخدمين" : "لا توجد بيانات"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">البريد الإلكتروني</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-sm">{user.email}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(
                          user.type
                        )}`}
                      >
                        {getTypeLabel(user.type)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{user.phone}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          user.status
                        )}`}
                      >
                        {getStatusLabel(user.status)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(user.created_at).toLocaleDateString("ar-EG")}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteUser(user.uid)}
                          disabled={deleting === user.uid}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UsersTable;
