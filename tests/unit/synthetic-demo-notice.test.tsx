import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SyntheticDemoNotice } from "@/pages/ai-insights/synthetic-demo-notice";

describe("SyntheticDemoNotice", () => {
  it("labels visible rows whose SKU uses the reserved demo prefix", () => {
    render(<SyntheticDemoNotice items={[{ sku: "DEMO-AI-KCN-50" }]} />);

    expect(screen.getByRole("status")).toHaveTextContent(/dữ liệu giả lập phục vụ trình diễn/);
  });

  it("does not label rows with ordinary SKUs", () => {
    render(<SyntheticDemoNotice items={[{ sku: "KCN-50" }]} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
