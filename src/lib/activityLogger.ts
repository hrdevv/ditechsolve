import { ActivityEntry, ActivityFilters, ActivityType, ActivityStatus } from "@/types/activity";

const STORAGE_KEY = "ditech_activity_log";
const MAX_ENTRIES = 100; // Reduced from 500 for security

const generateId = () => Math.random().toString(36).substring(2, 15);

/**
 * Sanitizes sensitive data from log entries
 * - Removes full URLs (replaces with domain or [URL])
 * - Redacts API credentials
 * - Sanitizes error messages
 */
function sanitizeForLog(text: string): string {
  if (!text || typeof text !== 'string') return text;
  
  return text
    // Replace full URLs with just domain or [URL]
    .replace(/https?:\/\/([^\/\s]+)[^\s]*/g, (_, domain) => `[${domain}]`)
    // Redact WooCommerce consumer keys
    .replace(/ck_[a-zA-Z0-9_]+/gi, '[API_KEY]')
    // Redact WooCommerce consumer secrets
    .replace(/cs_[a-zA-Z0-9_]+/gi, '[API_SECRET]')
    // Redact any base64 encoded auth strings (Basic auth)
    .replace(/Basic\s+[A-Za-z0-9+/=]+/gi, 'Basic [REDACTED]')
    // Redact email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    // Redact IP addresses
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]');
}

/**
 * Sanitizes an entity name for logging
 */
function sanitizeEntityName(name: string): string {
  // For connection-related entries, sanitize URLs
  if (name.includes('http://') || name.includes('https://')) {
    try {
      const url = new URL(name);
      return url.hostname; // Return just the domain
    } catch {
      return sanitizeForLog(name);
    }
  }
  return sanitizeForLog(name);
}

/**
 * Sanitizes error details for logging
 */
function sanitizeDetails(details: string | undefined): string | undefined {
  if (!details) return details;
  
  // Sanitize any sensitive data in details
  let sanitized = sanitizeForLog(details);
  
  // Generic error messages for certain patterns
  if (sanitized.toLowerCase().includes('cors')) {
    sanitized = 'Connection blocked - check site configuration';
  }
  if (sanitized.toLowerCase().includes('unauthorized') || sanitized.toLowerCase().includes('401')) {
    sanitized = 'Authentication failed - check credentials';
  }
  if (sanitized.toLowerCase().includes('not found') || sanitized.toLowerCase().includes('404')) {
    sanitized = 'Resource not found';
  }
  
  return sanitized;
}

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
    // Sanitize all inputs before logging
    const sanitizedEntityName = sanitizeEntityName(entityName);
    const sanitizedDetails = sanitizeDetails(options?.details);
    
    const entry: ActivityEntry = {
      id: generateId(),
      type,
      entityName: sanitizedEntityName,
      entityId: options?.entityId,
      details: sanitizedDetails,
      timestamp: new Date().toISOString(),
      status: options?.status || "success",
      userId: options?.userId,
    };

    const activities = this.getAll();
    activities.unshift(entry);

    // Prune oldest entries if over limit (reduced to 100)
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
      // Escape commas in CSV fields
      `"${(a.entityName || '').replace(/"/g, '""')}"`,
      `"${(a.details || '').replace(/"/g, '""')}"`,
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
