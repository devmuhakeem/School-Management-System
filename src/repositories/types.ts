/**
 * Tenant & Security Context for Server-Side Data Access
 * Enforces multi-tenant isolation across all repositories
 */

export interface TenantContext {
  /**
   * The authenticated institution's organizationId. Mandatory for tenant isolation.
   */
  organizationId: string;

  /**
   * Optional campus boundary. When specified, queries filter to this specific campus.
   */
  campusId?: string;

  /**
   * The authenticated user performing the operation (for audit trails & permissions).
   */
  userId?: string;

  /**
   * Roles assigned to the user for role-based filtering or elevation checks
   */
  userRoles?: string[];
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}
