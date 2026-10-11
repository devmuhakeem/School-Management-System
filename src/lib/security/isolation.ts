import { TenantContext } from "@/repositories/types";
import { ForbiddenError, ValidationError } from "@/lib/errors";

/**
 * Enforces Tenant Isolation boundary.
 * Throws ForbiddenError if target resource does not belong to the user's organization.
 */
export function enforceTenantIsolation(ctx: TenantContext, resourceOrgId: string): void {
  if (ctx.organizationId !== resourceOrgId) {
    throw new ForbiddenError("Access denied: Tenant isolation policy violation.");
  }
}

/**
 * Enforces Campus Isolation boundary.
 * If user has a campusId in context and requests a different campusId without
 * Super Administrator or Organization Administrator privileges, throws ForbiddenError.
 * Returns the validated effective campusId.
 */
export function enforceCampusIsolation(
  ctx: TenantContext,
  requestedCampusId?: string | null
): string | undefined {
  if (!requestedCampusId) {
    return ctx.campusId;
  }

  if (ctx.campusId && requestedCampusId !== ctx.campusId) {
    const isSuper =
      ctx.userRoles?.includes("Super Administrator") ||
      ctx.userRoles?.includes("Organization Administrator") ||
      ctx.userRoles?.includes("Enterprise Administrator");

    if (!isSuper) {
      throw new ForbiddenError(
        "Access denied: You do not have access to this campus branch."
      );
    }
  }

  return requestedCampusId;
}

/**
 * Checks if a user has cross-campus administrative privileges
 */
export function hasCrossCampusPrivilege(ctx: TenantContext): boolean {
  return Boolean(
    ctx.userRoles?.includes("Super Administrator") ||
      ctx.userRoles?.includes("Organization Administrator") ||
      ctx.userRoles?.includes("Enterprise Administrator")
  );
}

/**
 * Asserts that an entity belongs to the current tenant organization context.
 * Throws ForbiddenError if entity.organizationId does not match ctx.organizationId.
 */
export function assertBelongsToTenant<T extends { organizationId?: string }>(
  entity: T,
  ctx: TenantContext,
  entityName: string = "Resource"
): void {
  if (!entity || !entity.organizationId || entity.organizationId !== ctx.organizationId) {
    throw new ForbiddenError(
      `Access denied: ${entityName} does not belong to your authorized organization.`
    );
  }
}

/**
 * Asserts that an entity belongs to the authorized campus or user has cross-campus authority.
 */
export function assertBelongsToCampus<T extends { campusId?: string | null }>(
  entity: T,
  ctx: TenantContext,
  entityName: string = "Resource"
): void {
  if (
    ctx.campusId &&
    entity.campusId &&
    entity.campusId !== ctx.campusId &&
    !hasCrossCampusPrivilege(ctx)
  ) {
    throw new ForbiddenError(
      `Access denied: ${entityName} belongs to a different campus branch.`
    );
  }
}

/**
 * Asserts that a student is linked to a guardian in the relationship matrix.
 */
export function assertStudentLinkedToGuardian(
  guardianId: string,
  studentId: string,
  links: Array<{ guardianId: string; studentId: string }>
): void {
  const isLinked = links.some(
    (l) => l.guardianId === guardianId && l.studentId === studentId
  );
  if (!isLinked) {
    throw new ForbiddenError(
      "Access denied: You do not have authorization to view or manage records for this student."
    );
  }
}
