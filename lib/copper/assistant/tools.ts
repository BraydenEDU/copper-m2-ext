// Module 2: the tools Ask Copper can use (the four from the spec, plus
// compare_products from the copper-m2-ext extension). Products and prices come from
// lib/copper/catalog.ts and stock from lib/copper/inventory.ts, so the
// chatbot never has to make them up.
// The contract for each tool is in specs/module-2/spec.md.
import { tool } from "ai";
import { z } from "zod";
import { getPlans, getProducts } from "@/lib/copper/catalog";
import type { Plan, ProductId } from "@/lib/copper/catalog";
import { readInventory } from "@/lib/copper/inventory";

export type ProductList = {
  products: {
    id: ProductId;
    name: string;
    type: string;
    priceUsd: number;
    colors: string[];
  }[];
};

export type Prices = {
  products: { id: ProductId; name: string; priceUsd: number }[];
  plans: {
    id: Plan["id"];
    name: string;
    monthlyUsd: number;
    annualUsd: number;
  }[];
};

export type CalculateCostInput = {
  products: ProductId[];
  plan: Plan["id"];
  billing: "monthly" | "annual";
  years: number;
};

export type CostBreakdown = {
  lines: { item: string; usd: number }[];
  totalUsd: number;
};

export type CheckAvailabilityInput = { product: ProductId; color?: string };

export type CompareProductsInput = { products: [ProductId, ProductId] };

export type Comparison = {
  products: {
    id: ProductId;
    name: string;
    type: string;
    priceUsd: number;
    features: string[];
    colors: string[];
  }[];
  sharedColors: string[];
  onlyIn: { product: string; colors: string[] }[];
  /** How much more the pricier product costs, and which one it is. */
  priceDifference: { usd: number; moreExpensive: string | null };
};

export type Stock = "in_stock" | "low_stock" | "backordered";

export type Availability =
  | {
      status: "ok";
      product: string;
      colors: { color: string; stock: Stock; restockDate: string | null }[];
    }
  | { status: "not_a_color"; product: string; color: string; colors: string[] }
  | { status: "unavailable"; message: string };

const roundCents = (amount: number) => Math.round(amount * 100) / 100;

/** get_products: what Copper sells and which colors each one comes in. */
export function listProducts(): ProductList {
  return {
    products: getProducts().map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      priceUsd: p.priceUsd,
      colors: p.colors,
    })),
  };
}

/** get_prices: every product and plan price, read from the catalog. */
export function getPrices(): Prices {
  return {
    products: getProducts().map((p) => ({
      id: p.id,
      name: p.name,
      priceUsd: p.priceUsd,
    })),
    plans: getPlans().map((p) => ({
      id: p.id,
      name: p.name,
      monthlyUsd: p.monthlyUsd,
      annualUsd: p.annualUsd,
    })),
  };
}

const productIdSchema = z.enum(["copper-home", "copper-notes"]);

export const calculateCostInput: z.ZodType<CalculateCostInput> = z.object({
  products: z.array(productIdSchema).max(5),
  plan: z.enum(["free", "copper-plus"]),
  billing: z.enum(["monthly", "annual"]),
  years: z.number().int().min(1).max(5),
});

/** calculate_cost: the total cost of devices plus a plan over some years. */
export function calculateCost(input: CalculateCostInput): CostBreakdown {
  const products = getProducts();
  const lines = input.products.map((id) => {
    const product = products.find((p) => p.id === id)!;
    return { item: product.name, usd: roundCents(product.priceUsd) };
  });

  const plan = getPlans().find((p) => p.id === input.plan)!;
  const planUsd =
    input.billing === "monthly"
      ? plan.monthlyUsd * 12 * input.years
      : plan.annualUsd * input.years;
  // The free plan costs nothing, so it gets no line.
  if (planUsd > 0) {
    lines.push({
      item: `${plan.name}, ${input.billing}, ${input.years} ${input.years === 1 ? "year" : "years"}`,
      usd: roundCents(planUsd),
    });
  }

  return {
    lines,
    totalUsd: roundCents(lines.reduce((sum, line) => sum + line.usd, 0)),
  };
}

export const checkAvailabilityInput: z.ZodType<CheckAvailabilityInput> =
  z.object({
    product: productIdSchema,
    color: z.string().optional(),
  });

/** check_availability: stock for one product (or one of its colors), read fresh each time. */
export async function checkAvailability(
  input: CheckAvailabilityInput,
): Promise<Availability> {
  const product = getProducts().find((p) => p.id === input.product)!;

  // Check the color against the catalog before reading stock.
  let colors = product.colors;
  if (input.color !== undefined) {
    const wanted = input.color.trim().toLowerCase();
    colors = product.colors.filter((c) => c.toLowerCase() === wanted);
    if (colors.length === 0) {
      return {
        status: "not_a_color",
        product: product.name,
        color: input.color,
        colors: product.colors,
      };
    }
  }

  const rows = await readInventory();
  if (rows === null) {
    return {
      status: "unavailable",
      message: "Stock can't be checked right now. Please try again later.",
    };
  }

  const result: Extract<Availability, { status: "ok" }>["colors"] = [];
  for (const color of colors) {
    const row = rows.find(
      (r) => r.product === product.name && r.color === color,
    );
    if (!row) continue;
    const units = row.units_in_stock;
    const stock: Stock =
      units === 0 ? "backordered" : units < 10 ? "low_stock" : "in_stock";
    result.push({
      color,
      stock,
      restockDate: stock === "backordered" ? row.next_shipment : null,
    });
  }
  return { status: "ok", product: product.name, colors: result };
}

export const compareProductsInput: z.ZodType<CompareProductsInput> = z.object({
  products: z
    .tuple([productIdSchema, productIdSchema])
    .refine(([a, b]) => a !== b, "Pick two different products"),
});

/** compare_products: two products side by side, read from the catalog. */
export function compareProducts(input: CompareProductsInput): Comparison {
  const catalog = getProducts();
  const [a, b] = input.products.map(
    (id) => catalog.find((p) => p.id === id)!,
  );

  const sharedColors = a.colors.filter((c) => b.colors.includes(c));
  const diff = roundCents(Math.abs(a.priceUsd - b.priceUsd));

  return {
    products: [a, b].map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      priceUsd: p.priceUsd,
      features: p.features.map((f) => f.name),
      colors: p.colors,
    })),
    sharedColors,
    onlyIn: [a, b].map((p) => ({
      product: p.name,
      colors: p.colors.filter((c) => !sharedColors.includes(c)),
    })),
    priceDifference: {
      usd: diff,
      moreExpensive:
        diff === 0 ? null : a.priceUsd > b.priceUsd ? a.name : b.name,
    },
  };
}

/** The tools the model can call. They only read: nothing is bought or changed. */
export const copperTools = {
  get_products: tool({
    description:
      "List every Copper product with its type, price and the colors it comes in (not stock).",
    inputSchema: z.object({}),
    execute: async () => listProducts(),
  }),
  get_prices: tool({
    description: "Get the price of every Copper product and Copper Plus plan.",
    inputSchema: z.object({}),
    execute: async () => getPrices(),
  }),
  calculate_cost: tool({
    description:
      "Work out the total cost of devices plus a plan over 1 to 5 years; never do this math yourself.",
    inputSchema: calculateCostInput,
    execute: async (input) => calculateCost(input),
  }),
  check_availability: tool({
    description:
      "Check today's stock for a Copper product, or for one color of it, from the stock list.",
    inputSchema: checkAvailabilityInput,
    execute: async (input) => checkAvailability(input),
  }),
  compare_products: tool({
    description:
      "Compare two Copper products side by side: type, price difference, features and which colors they share.",
    inputSchema: compareProductsInput,
    execute: async (input) => compareProducts(input),
  }),
};
