import { describe, it, expect } from "vitest";
import { successResponse, errorResponse, paginatedResponse } from "../api-response";

describe("API Response Utilities", () => {
  it("creates a properly structured success response", () => {
    const data = { id: "camp-1", name: "Main Campus" };
    const response = successResponse(data, "Campus loaded successfully");

    expect(response.success).toBe(true);
    expect(response.data).toEqual(data);
    expect(response.message).toBe("Campus loaded successfully");
    expect(response.meta.timestamp).toBeDefined();
    expect(new Date(response.meta.timestamp).getTime()).not.toBeNaN();
  });

  it("creates a properly structured error response", () => {
    const response = errorResponse("Entity not found", "NOT_FOUND", { id: "123" });

    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
    expect(response.error?.message).toBe("Entity not found");
    expect(response.error?.code).toBe("NOT_FOUND");
    expect(response.error?.details).toEqual({ id: "123" });
    expect(response.code).toBe("NOT_FOUND");
    expect(response.meta.timestamp).toBeDefined();
  });

  it("computes accurate pagination metadata", () => {
    const items = [{ id: 1 }, { id: 2 }];
    const total = 45;
    const page = 2;
    const limit = 10;

    const response = paginatedResponse(items, total, page, limit);

    expect(response.success).toBe(true);
    expect(response.data).toEqual(items);
    expect(response.meta.pagination).toBeDefined();
    expect(response.meta.pagination?.page).toBe(2);
    expect(response.meta.pagination?.limit).toBe(10);
    expect(response.meta.pagination?.total).toBe(45);
    expect(response.meta.pagination?.totalPages).toBe(5);
    expect(response.meta.pagination?.hasNext).toBe(true);
    expect(response.meta.pagination?.hasPrev).toBe(true);
  });

  it("handles edge cases in pagination gracefully", () => {
    // Page 1 with single page of results
    const response = paginatedResponse([{ id: 1 }], 1, 1, 10);
    expect(response.meta.pagination?.totalPages).toBe(1);
    expect(response.meta.pagination?.hasNext).toBe(false);
    expect(response.meta.pagination?.hasPrev).toBe(false);
  });
});
