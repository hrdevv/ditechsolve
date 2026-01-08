export type ActivityType =
  | "product_created"
  | "product_updated"
  | "product_deleted"
  | "category_created"
  | "category_updated"
  | "category_deleted"
  | "bulk_upload_started"
  | "bulk_upload_completed"
  | "connection_established"
  | "connection_failed"
  | "settings_updated";

export type ActivityStatus = "success" | "error" | "pending";

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  entityId?: string;
  entityName: string;
  details?: string;
  timestamp: string;
  status: ActivityStatus;
  userId?: string;
}

export interface ActivityFilters {
  type?: ActivityType;
  status?: ActivityStatus;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}
