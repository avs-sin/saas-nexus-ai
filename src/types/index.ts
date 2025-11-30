// User roles within a tenant
export type UserRole = "admin" | "manager" | "operator" | "viewer";

// Role display names and descriptions
export const USER_ROLES: Record<UserRole, { label: string; description: string }> = {
  admin: {
    label: "Administrator",
    description: "Full access to all features and settings",
  },
  manager: {
    label: "Manager",
    description: "Can manage inventory, orders, and view reports",
  },
  operator: {
    label: "Operator",
    description: "Can update inventory and process orders",
  },
  viewer: {
    label: "Viewer",
    description: "Read-only access to dashboards and reports",
  },
};

// Tenant settings type
export interface TenantSettings {
  timezone?: string;
  currency?: string;
  dateFormat?: string;
  lowStockThreshold?: number;
}

// Tenant type
export interface Tenant {
  _id: string;
  orgId: string;
  name: string;
  slug: string;
  settings?: TenantSettings;
  createdAt: number;
  updatedAt: number;
}

// User type
export interface User {
  _id: string;
  clerkUserId: string;
  tenantId: string;
  role: UserRole;
  email: string;
  name: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  lastLoginAt?: number;
}

// Warehouse location type
export interface WarehouseLocation {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

// Warehouse type
export interface Warehouse {
  _id: string;
  tenantId: string;
  name: string;
  code: string;
  location: WarehouseLocation;
  capacity: number;
  utilizationPercent: number;
  isActive: boolean;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  createdAt: number;
  updatedAt: number;
}

// Activity log entry type
export interface ActivityLogEntry {
  _id: string;
  tenantId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  metadata?: unknown;
  createdAt: number;
  userName?: string;
}

// Navigation item for sidebar
export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  disabled?: boolean;
}

// Dashboard widget props
export interface DashboardWidgetProps {
  title: string;
  description?: string;
  isLoading?: boolean;
  children?: React.ReactNode;
}

