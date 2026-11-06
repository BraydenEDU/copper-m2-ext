import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Answer } from "@/components/copper/ask-copper-steps";
import { compareProducts } from "@/lib/copper/assistant/tools";
import type { Progress } from "@/lib/copper/assistant/progress";

afterEach(cleanup);

const input = { products: ["copper-home", "copper-notes"] as const };

const progress: Progress = {
  steps: [
    {
      type: "tool",
      id: "1",
      name: "compare_products",
      state: "done",
      input,
      output: compareProducts({ products: [...input.products] }),
    },
  ],
  reply: "Copper Home costs $20 more.",
  status: "done",
};

describe("compare_products card", () => {
  it("shows what Copper sent and what came back", () => {
    render(<Answer progress={progress} useTools />);
    const card = within(screen.getByTestId("tool-call"));
    expect(card.getByText("compare_products()")).toBeTruthy();
    expect(card.getByText("Copper Home vs Copper Notes")).toBeTruthy();
    expect(card.queryByText("undefined")).toBeNull();
    expect(card.getByText(/^Copper Home costs \$20(\.00)? more$/)).toBeTruthy();
    expect(card.getByText("Night Sky")).toBeTruthy();
    expect(card.getByText("Only Copper Notes")).toBeTruthy();
    expect(card.getByText("Desert Sand")).toBeTruthy();
  });
});
