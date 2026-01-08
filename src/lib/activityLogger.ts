import { ActivityEntry, ActivityFilters, ActivityType, ActivityStatus } from "@/types/activity";

const STORAGE_KEY = "ditech_activity_log";
const MAX_ENTRIES = 500;

const generateId = () => Math.random().toString(36).substring(2, 15);

export const activityLogger = {
  log(
    type: ActivityType,
    entityName: string,
    options?: {
      entityId?: string;
      details?: string;
      status?: ActivityStatus;
      userId?: string;
    }
  ): ActivityEntry {
    const entry: ActivityEntry = {
      id: generateId(),
      type,
      entityName,
      entityId: options?.entityId,
      details: options?.details,
      timestamp: new Date().toISOString(),
      status: options?.status || "success",
      userId: options?.userId,
    };

    const activities = this.getAll();
    activities.unshift(entry);

    // Prune oldest entries if over limit
    if (activities.length > MAX_ENTRIES) {
      activities.splice(MAX_ENTRIES);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
    window.dispatchEvent(new CustomEvent("activity-logged", { detail: entry }));

    return entry;
  },

  getAll(): ActivityEntry[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  getFiltered(filters: ActivityFilters): ActivityEntry[] {
    let activities = this.getAll();

    if (filters.type) {
      activities = activities.filter((a) => a.type === filters.type);
    }

    if (filters.status) {
      activities = activities.filter((a) => a.status === filters.status);
    }

    if (filters.startDate) {
      activities = activities.filter(
        (a) => new Date(a.timestamp) >= filters.startDate!
      );
    }

    if (filters.endDate) {
      activities = activities.filter(
        (a) => new Date(a.timestamp) <= filters.endDate!
      );
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      activities = activities.filter(
        (a) =>
          a.entityName.toLowerCase().includes(search) ||
          a.details?.toLowerCase().includes(search)
      );
    }

    return activities;
  },

  getRecent(count: number = 5): ActivityEntry[] {
    return this.getAll().slice(0, count);
  },

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("activity-cleared"));
  },

  exportToCsv(): string {
    const activities = this.getAll();
    const headers = ["ID", "Type", "Entity", "Details", "Status", "Timestamp"];
    const rows = activities.map((a) => [
      a.id,
      a.type,
      a.entityName,
      a.details || "",
      a.status,
      a.timestamp,
    ]);

    return [headers, ...rows].map((row) => row.join(",")).join("\n");
  },
};

export const getActivityIcon = (type: ActivityType): string => {
  const icons: Record<ActivityType, string> = {
    product_created: "Package",
    product_updated: "Edit",
    product_deleted: "Trash2",
    category_created: "FolderPlus",
    category_updated: "FolderEdit",
    category_deleted: "FolderMinus",
    bulk_upload_started: "Upload",
    bulk_upload_completed: "CheckCircle",
    connection_established: "Link",
    connection_failed: "Unlink",
    settings_updated: "Settings",
  };
  return icons[type];
};

export const getActivityLabel = (type: ActivityType): string => {
  const labels: Record<ActivityType, string> = {
    product_created: "Product Created",
    product_updated: "Product Updated",
    product_deleted: "Product Deleted",
    category_created: "Category Created",
    category_updated: "Category Updated",
    category_deleted: "Category Deleted",
    bulk_upload_started: "Bulk Upload Started",
    bulk_upload_completed: "Bulk Upload Completed",
    connection_established: "Connected",
    connection_failed: "Connection Failed",
    settings_updated: "Settings Updated",
  };
  return labels[type];
};
