import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Edit,
  Trash2,
  FolderPlus,
  FolderMinus,
  Upload,
  CheckCircle,
  Link,
  Unlink,
  Settings,
  Search,
  Download,
  Filter,
  ClipboardList,
} from "lucide-react";
import { activityLogger, getActivityLabel } from "@/lib/activityLogger";
import { ActivityEntry, ActivityType } from "@/types/activity";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { Link as RouterLink } from "react-router-dom";

const activityIcons: Record<ActivityType, React.ReactNode> = {
  product_created: <Package className="w-4 h-4" />,
  product_updated: <Edit className="w-4 h-4" />,
  product_deleted: <Trash2 className="w-4 h-4" />,
  category_created: <FolderPlus className="w-4 h-4" />,
  category_updated: <Edit className="w-4 h-4" />,
  category_deleted: <FolderMinus className="w-4 h-4" />,
  bulk_upload_started: <Upload className="w-4 h-4" />,
  bulk_upload_completed: <CheckCircle className="w-4 h-4" />,
  connection_established: <Link className="w-4 h-4" />,
  connection_failed: <Unlink className="w-4 h-4" />,
  settings_updated: <Settings className="w-4 h-4" />,
};

const statusColors: Record<string, string> = {
  success: "bg-success/10 text-success border-success/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
  pending: "bg-warning/10 text-warning border-warning/20",
};

const formatDate = (dateStr: string): string => {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
};

const formatTime = (dateStr: string): string => {
  return format(parseISO(dateStr), "h:mm a");
};

const ActivityLog = () => {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const perPage = 25;

  useEffect(() => {
    loadActivities();

    const handleActivityLogged = () => loadActivities();
    window.addEventListener("activity-logged", handleActivityLogged);
    window.addEventListener("activity-cleared", handleActivityLogged);

    return () => {
      window.removeEventListener("activity-logged", handleActivityLogged);
      window.removeEventListener("activity-cleared", handleActivityLogged);
    };
  }, []);

  const loadActivities = () => {
    setActivities(activityLogger.getAll());
  };

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch =
      !search ||
      activity.entityName.toLowerCase().includes(search.toLowerCase()) ||
      activity.details?.toLowerCase().includes(search.toLowerCase());

    const matchesType =
      typeFilter === "all" || activity.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const paginatedActivities = filteredActivities.slice(
    (page - 1) * perPage,
    page * perPage
  );

  const totalPages = Math.ceil(filteredActivities.length / perPage);

  // Group by date
  const groupedActivities = paginatedActivities.reduce((groups, activity) => {
    const dateKey = formatDate(activity.timestamp);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(activity);
    return groups;
  }, {} as Record<string, ActivityEntry[]>);

  const handleExport = () => {
    const csv = activityLogger.exportToCsv();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear all activity logs?")) {
      activityLogger.clear();
      loadActivities();
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <ClipboardList className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Activity Log</h1>
        </div>
        <p className="text-muted-foreground">
          Track all product operations, bulk uploads, and system changes
        </p>
      </div>

      <Card className="p-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <div className="flex-1 relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-3">
            <Select
              value={typeFilter}
              onValueChange={(value) => {
                setTypeFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="product_created">Product Created</SelectItem>
                <SelectItem value="product_updated">Product Updated</SelectItem>
                <SelectItem value="product_deleted">Product Deleted</SelectItem>
                <SelectItem value="category_created">Category Created</SelectItem>
                <SelectItem value="category_updated">Category Updated</SelectItem>
                <SelectItem value="category_deleted">Category Deleted</SelectItem>
                <SelectItem value="bulk_upload_started">Bulk Upload Started</SelectItem>
                <SelectItem value="bulk_upload_completed">Bulk Upload Completed</SelectItem>
                <SelectItem value="connection_established">Connected</SelectItem>
                <SelectItem value="connection_failed">Connection Failed</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>

            <Button variant="outline" onClick={handleClear}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>

        {/* Activity Timeline */}
        {Object.keys(groupedActivities).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedActivities).map(([date, dateActivities]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-muted-foreground mb-4 sticky top-0 bg-card py-2">
                  {date}
                </h3>
                <div className="space-y-3">
                  {dateActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-secondary/30 transition-colors"
                    >
                      <div
                        className={`p-2 rounded-lg ${
                          activity.status === "error"
                            ? "bg-destructive/10 text-destructive"
                            : activity.status === "pending"
                            ? "bg-warning/10 text-warning"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {activityIcons[activity.type]}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">
                            {getActivityLabel(activity.type)}
                          </span>
                          <Badge
                            variant="outline"
                            className={statusColors[activity.status]}
                          >
                            {activity.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground font-medium">
                          {activity.entityName}
                        </p>
                        {activity.details && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {activity.details}
                          </p>
                        )}
                      </div>

                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTime(activity.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No activities yet
            </h3>
            <p className="text-muted-foreground mb-4">
              Activities will appear here as you manage products and categories
            </p>
            <RouterLink to="/products">
              <Button>
                <Package className="w-4 h-4 mr-2" />
                Go to Products
              </Button>
            </RouterLink>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * perPage + 1} to{" "}
              {Math.min(page * perPage, filteredActivities.length)} of{" "}
              {filteredActivities.length} activities
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ActivityLog;
