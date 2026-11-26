import { expect, it, vi } from "vitest";
import { getProductPerformance } from "@/api/product-performance";
import { getBusinessMovement } from "@/api/business-movement";

const request = vi.hoisted(() => vi.fn());
vi.mock("@/services/api.service", () => ({ apiRequest: request }));

it("rejects a partial response from a backend that does not support full snapshots", async () => {
  request.mockResolvedValue({ items: [{}], pagination: { total: 2 } });
  await expect(getProductPerformance({ from: "2026-04-20", to: "2026-04-26" })).rejects.toThrow("cập nhật backend");
  expect(request).toHaveBeenCalledWith(expect.stringContaining("all=true"));
});

it("rejects an incomplete movement snapshot rather than showing partial contributions", async () => {
  request.mockResolvedValue({ items: [{}], pagination: { total: 2 } });
  await expect(getBusinessMovement({ from: "2026-04-20", to: "2026-04-26" })).rejects.toThrow("cập nhật backend");
  expect(request).toHaveBeenLastCalledWith("/business-data/business-movement?from=2026-04-20&to=2026-04-26");
});
