import { describe, it, expect } from "vitest";
import {
  paginationSchema,
  organizationSchema,
  validateSchema,
} from "../validations/common";

describe("Zod Validation Schemas", () => {
  it("validates and defaults pagination parameters", () => {
    const parsed = paginationSchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(20);
    expect(parsed.sortOrder).toBe("asc");

    const custom = paginationSchema.parse({ page: "3", limit: "50", sortOrder: "desc" });
    expect(custom.page).toBe(3);
    expect(custom.limit).toBe(50);
    expect(custom.sortOrder).toBe("desc");
  });

  it("validates valid organization data", () => {
    const validData = {
      name: "Heritage Grammar School",
      slug: "heritage-grammar",
      code: "HGS",
      website: "https://heritage.edu",
    };

    const result = validateSchema(organizationSchema, validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Heritage Grammar School");
      expect(result.data.code).toBe("HGS");
    }
  });

  it("catches invalid slug and name format in organization data", () => {
    const invalidData = {
      name: "A", // too short
      slug: "invalid slug with spaces!",
      website: "not-a-url",
    };

    const result = validateSchema(organizationSchema, invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.name).toBeDefined();
      expect(result.fieldErrors.slug).toBeDefined();
      expect(result.fieldErrors.website).toBeDefined();
    }
  });
});
