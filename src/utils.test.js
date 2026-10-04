import { describe, expect, it } from "vitest";
import {
  aiFieldKeys,
  displayValue,
  erpHeaderFields,
  fieldLabel,
  findAzureLine,
  statusLabel,
} from "./utils.js";

describe("displayValue", () => {
  it("shows an em dash for empty values", () => {
    expect(displayValue(null)).toBe("—");
    expect(displayValue(undefined)).toBe("—");
    expect(displayValue("")).toBe("—");
  });

  it("stringifies objects and other values", () => {
    expect(displayValue({ a: 1 })).toBe('{"a":1}');
    expect(displayValue(12)).toBe("12");
  });
});

describe("fieldLabel", () => {
  it("uses friendly labels for known keys", () => {
    expect(fieldLabel("itemname")).toBe("Item name");
    expect(fieldLabel("po_type")).toBe("PO type");
  });

  it("title-cases unknown keys", () => {
    expect(fieldLabel("custom_field")).toBe("Custom Field");
  });
});

describe("statusLabel", () => {
  it("maps known statuses", () => {
    expect(statusLabel("pending")).toBe("Pending");
    expect(statusLabel("failed")).toBe("Failed");
  });
});

describe("erpHeaderFields", () => {
  it("drops lines and keeps header fields", () => {
    expect(
      erpHeaderFields({ purchaseordernumber: "PO-1", lines: [{ polinenumber: 1 }] }),
    ).toEqual({ purchaseordernumber: "PO-1" });
  });
});

describe("findAzureLine", () => {
  const azure = {
    lines: [
      { polineid: 10, assetclass: "IT" },
      { polinenumber: 20, category: "Furniture" },
    ],
  };

  it("matches polineid then polinenumber", () => {
    expect(findAzureLine(azure, 10).assetclass).toBe("IT");
    expect(findAzureLine(azure, 20).category).toBe("Furniture");
    expect(findAzureLine(azure, 99)).toBeNull();
  });
});

describe("aiFieldKeys", () => {
  it("returns AI keys and skips echoed input fields", () => {
    const keys = aiFieldKeys({
      lines: [
        {
          polineid: 1,
          itemname: "x",
          description: "y",
          assetclass: "IT",
          confidencescore: 0.9,
        },
      ],
    });
    expect(keys).toContain("assetclass");
    expect(keys).toContain("confidencescore");
    expect(keys).not.toContain("itemname");
    expect(keys).not.toContain("polineid");
  });
});
