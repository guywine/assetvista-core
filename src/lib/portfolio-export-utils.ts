import { Asset, FXRates, PortfolioSnapshot } from "@/types/portfolio";
import { calculateAssetValue, formatCurrency } from "./portfolio-utils";
import * as XLSX from "xlsx-js-style";

// Entity order as specified by user
const ENTITY_ORDER = ["Hagit", "Roy", "Guy", "Roni", "Shimon", "Weintraub", "SW2009", "B Joel", "Tom"];

// Asset class and sub-class ordering
const CLASS_ORDER = [
  { class: "Cash", subClasses: ["Cash"] },
  {
    class: "Fixed Income",
    subClasses: [
      "Bank Deposit",
      "Money Market",
      "Gov 1-2",
      "Gov long",
      "CPI linked",
      "Corporate",
      "REIT stock",
      "Private Credit",
    ],
  },
  {
    class: "Public Equity",
    subClasses: ["Big Tech", "China", "other"],
  },
  {
    class: "Commodities & more",
    subClasses: ["Cryptocurrency", "Commodities"],
  },
  {
    class: "Real Estate",
    subClasses: ["Tel-Aviv", "Living", "Abroad"],
  },
];

// Styling constants
export const HEADER_STYLE = {
  font: { name: "Arial", sz: 12, bold: true, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "4472C4" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } },
  },
};

export const DATA_STYLE = {
  font: { name: "Arial", sz: 10 },
  alignment: { horizontal: "left", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "CCCCCC" } },
    bottom: { style: "thin", color: { rgb: "CCCCCC" } },
    left: { style: "thin", color: { rgb: "CCCCCC" } },
    right: { style: "thin", color: { rgb: "CCCCCC" } },
  },
};

export const ALTERNATE_ROW_STYLE = {
  ...DATA_STYLE,
  fill: { fgColor: { rgb: "F8F9FA" } },
};

export const TOTAL_ROW_STYLE = {
  ...DATA_STYLE,
  font: { name: "Arial", sz: 11, bold: true },
  fill: { fgColor: { rgb: "FFE699" } },
};

export const SUBTOTAL_ROW_STYLE = {
  ...DATA_STYLE,
  font: { name: "Arial", sz: 10, bold: true },
  fill: { fgColor: { rgb: "FFF2CC" } },
};

interface AssetGroup {
  name: string;
  currency: string;
  price: number;
  class: string;
  subClass: string;
  entityQuantities: { [entity: string]: number };
  totalQuantity: number;
  totalUSD: number;
  totalILS: number;
}

// Group assets by name (excluding specified classes)
function groupAssetsByName(assets: Asset[], excludeClasses: string[], fxRates: FXRates): AssetGroup[] {
  const groups = new Map<string, AssetGroup>();

  const filteredAssets = assets.filter((a) => !excludeClasses.includes(a.class));

  filteredAssets.forEach((asset) => {
    const key = asset.name;
    const calc = calculateAssetValue(asset, fxRates, "USD");

    if (!groups.has(key)) {
      groups.set(key, {
        name: asset.name,
        currency: asset.origin_currency,
        price: asset.price,
        class: asset.class,
        subClass: asset.sub_class,
        entityQuantities: {},
        totalQuantity: 0,
        totalUSD: 0,
        totalILS: 0,
      });
    }

    const group = groups.get(key)!;
    const entity = asset.account_entity;

    group.entityQuantities[entity] = (group.entityQuantities[entity] || 0) + asset.quantity;
    group.totalQuantity += asset.quantity;
    group.totalUSD += calc.converted_value;

    // Calculate ILS value
    const ilsCalc = calculateAssetValue(asset, fxRates, "ILS");
    group.totalILS += ilsCalc.converted_value;
  });

  return Array.from(groups.values());
}

// Build smart summary data with subtotals and totals
export function buildSmartSummaryData(assets: Asset[], fxRates: FXRates): any[] {
  const groups = groupAssetsByName(assets, ["Private Equity"], fxRates);
  const rows: any[] = [];

  // Calculate total values for percentage calculations
  // Total excluding Private Equity (but including Real Estate with factor)
  const totalValueExclPE = assets
    .filter((a) => a.class !== "Private Equity")
    .reduce((sum, a) => {
      const calc = calculateAssetValue(a, fxRates, "USD");
      const factor = a.class === "Real Estate" ? a.factor || 1 : 1;
      return sum + calc.converted_value * factor;
    }, 0);

  const totalValueExclREAndPE = assets
    .filter((a) => !["Private Equity", "Real Estate"].includes(a.class))
    .reduce((sum, a) => {
      const calc = calculateAssetValue(a, fxRates, "USD");
      return sum + calc.converted_value;
    }, 0);

  // Calculate class totals for "% of [Class]" calculation
  const classTotals: { [className: string]: number } = {};
  assets.forEach((a) => {
    if (!classTotals[a.class]) {
      classTotals[a.class] = 0;
    }
    const calc = calculateAssetValue(a, fxRates, "USD");
    const factor = a.class === "Private Equity" || a.class === "Real Estate" ? a.factor || 1 : 1;
    classTotals[a.class] += calc.converted_value * factor;
  });

  // Header row
  const headers = [
    "Asset Name",
    "Currency",
    "Price",
    ...ENTITY_ORDER,
    "Total Qty",
    "Total USD",
    "Total ILS",
    "% of [Class]",
    "% of Total (excl. Real Estate and PE)",
    "% of Total (incl. Real Estate)",
  ];
  rows.push(headers);

  let grandTotalUSD = 0;
  let grandTotalILS = 0;
  const grandEntityTotals: { [entity: string]: number } = {};

  CLASS_ORDER.forEach(({ class: className, subClasses }) => {
    // Skip Real Estate in the main loop - we'll handle it separately at the end
    if (className === "Real Estate") return;

    let classTotalUSD = 0;
    let classTotalILS = 0;
    const classEntityTotalsUSD: { [entity: string]: number } = {};
    const classEntityTotalsILS: { [entity: string]: number } = {};

    // Add class header row
    rows.push([className, "", "", ...ENTITY_ORDER.map(() => ""), "", "", "", "", "", ""]);

    // Special handling for Cash class - group by currency
    if (className === "Cash") {
      const currencies = ["USD", "ILS", "EUR", "CHF", "CAD", "HKD", "GBP"];

      currencies.forEach((currency) => {
        const cashAssets = assets.filter(
          (a) =>
            a.class === "Cash" &&
            a.origin_currency === currency &&
            !["Private Equity", "Real Estate"].includes(a.class),
        );

        if (cashAssets.length === 0) return;

        let currencyTotalUSD = 0;
        let currencyTotalILS = 0;
        let currencyTotalQty = 0;
        const currencyEntityQty: { [entity: string]: number } = {};
        const currencyEntityUSD: { [entity: string]: number } = {};
        const currencyEntityILS: { [entity: string]: number } = {};

        cashAssets.forEach((asset) => {
          const entity = asset.account_entity;
          const calcUSD = calculateAssetValue(asset, fxRates, "USD");
          const calcILS = calculateAssetValue(asset, fxRates, "ILS");

          currencyEntityQty[entity] = (currencyEntityQty[entity] || 0) + asset.quantity;
          currencyEntityUSD[entity] = (currencyEntityUSD[entity] || 0) + calcUSD.converted_value;
          currencyEntityILS[entity] = (currencyEntityILS[entity] || 0) + calcILS.converted_value;

          currencyTotalQty += asset.quantity;
          currencyTotalUSD += calcUSD.converted_value;
          currencyTotalILS += calcILS.converted_value;
        });

        // Add currency row
        const pctOfClass =
          classTotals[className] > 0 ? ((currencyTotalUSD / classTotals[className]) * 100).toFixed(2) + "%" : "0%";
        const pctExclREPE =
          totalValueExclREAndPE > 0 ? ((currencyTotalUSD / totalValueExclREAndPE) * 100).toFixed(2) + "%" : "0%";
        const pctInclRE = totalValueExclPE > 0 ? ((currencyTotalUSD / totalValueExclPE) * 100).toFixed(2) + "%" : "0%";

        const row = [
          currency,
          currency,
          1, // Price is 1 for cash
          ...ENTITY_ORDER.map((entity) => Math.round(currencyEntityQty[entity] || 0)),
          Math.round(currencyTotalQty),
          currencyTotalUSD,
          currencyTotalILS,
          pctOfClass,
          pctExclREPE,
          pctInclRE,
        ];
        rows.push(row);

        classTotalUSD += currencyTotalUSD;
        classTotalILS += currencyTotalILS;

        ENTITY_ORDER.forEach((entity) => {
          if (currencyEntityUSD[entity]) {
            classEntityTotalsUSD[entity] = (classEntityTotalsUSD[entity] || 0) + currencyEntityUSD[entity];
            classEntityTotalsILS[entity] = (classEntityTotalsILS[entity] || 0) + currencyEntityILS[entity];
            grandEntityTotals[entity] = (grandEntityTotals[entity] || 0) + currencyEntityUSD[entity];
          }
        });
      });

      // Add Cash class total rows
      if (classTotalUSD > 0 || classTotalILS > 0) {
        const classPctOfClass = "100.00%";
        const classPctExclREPE =
          totalValueExclREAndPE > 0 ? ((classTotalUSD / totalValueExclREAndPE) * 100).toFixed(2) + "%" : "0%";
        const classPctInclRE =
          totalValueExclPE > 0 ? ((classTotalUSD / totalValueExclPE) * 100).toFixed(2) + "%" : "0%";

        rows.push([
          "Total Cash USD",
          "",
          "",
          ...ENTITY_ORDER.map((entity) => classEntityTotalsUSD[entity] || 0),
          "",
          classTotalUSD,
          "",
          classPctOfClass,
          classPctExclREPE,
          classPctInclRE,
        ]);

        rows.push([
          "Total Cash ILS",
          "",
          "",
          ...ENTITY_ORDER.map((entity) => classEntityTotalsILS[entity] || 0),
          "",
          "",
        classTotalILS,
        "",
        "",
        "", // Empty percentage columns for totals
      ]);

      rows.push([]);
      rows.push([]); // Two empty rows after Cash total

      grandTotalUSD += classTotalUSD;
      grandTotalILS += classTotalILS;
    }

      return; // Skip the normal subclass processing for Cash
    }

    subClasses.forEach((subClass) => {
      const subClassGroups = groups.filter((g) => g.class === className && g.subClass === subClass);

      if (subClassGroups.length === 0) return;

      // Add sub-class header row
      rows.push([subClass, "", "", ...ENTITY_ORDER.map(() => ""), "", "", "", "", "", ""]);

      let subClassTotalUSD = 0;
      let subClassTotalILS = 0;
      const subClassEntityTotalsUSD: { [entity: string]: number } = {};
      const subClassEntityTotalsILS: { [entity: string]: number } = {};

      // Add asset rows for this sub-class
      subClassGroups.forEach((group) => {
        const pctOfClass =
          classTotals[className] > 0 ? ((group.totalUSD / classTotals[className]) * 100).toFixed(2) + "%" : "0%";
        const pctExclREPE =
          totalValueExclREAndPE > 0 ? ((group.totalUSD / totalValueExclREAndPE) * 100).toFixed(2) + "%" : "0%";
        const pctInclRE = totalValueExclPE > 0 ? ((group.totalUSD / totalValueExclPE) * 100).toFixed(2) + "%" : "0%";

        const row = [
          group.name,
          group.currency,
          group.price,
          ...ENTITY_ORDER.map((entity) => Math.round(group.entityQuantities[entity] || 0)),
          Math.round(group.totalQuantity),
          group.totalUSD,
          group.totalILS,
          pctOfClass,
          pctExclREPE,
          pctInclRE,
        ];
        rows.push(row);

        subClassTotalUSD += group.totalUSD;
        subClassTotalILS += group.totalILS;

        ENTITY_ORDER.forEach((entity) => {
          if (group.entityQuantities[entity]) {
            const entityAssets = assets.filter((a) => a.name === group.name && a.account_entity === entity);
            const entityUSD = entityAssets.reduce(
              (sum, a) => sum + calculateAssetValue(a, fxRates, "USD").converted_value,
              0,
            );
            const entityILS = entityAssets.reduce(
              (sum, a) => sum + calculateAssetValue(a, fxRates, "ILS").converted_value,
              0,
            );

            subClassEntityTotalsUSD[entity] = (subClassEntityTotalsUSD[entity] || 0) + entityUSD;
            subClassEntityTotalsILS[entity] = (subClassEntityTotalsILS[entity] || 0) + entityILS;
            classEntityTotalsUSD[entity] = (classEntityTotalsUSD[entity] || 0) + entityUSD;
            classEntityTotalsILS[entity] = (classEntityTotalsILS[entity] || 0) + entityILS;
            grandEntityTotals[entity] = (grandEntityTotals[entity] || 0) + entityUSD;
          }
        });
      });

      // Add sub-class total rows (USD then ILS)
      const subClassPctOfClass =
        classTotals[className] > 0 ? ((subClassTotalUSD / classTotals[className]) * 100).toFixed(2) + "%" : "0%";
      const subClassPctExclREPE =
        totalValueExclREAndPE > 0 ? ((subClassTotalUSD / totalValueExclREAndPE) * 100).toFixed(2) + "%" : "0%";
      const subClassPctInclRE =
        totalValueExclPE > 0 ? ((subClassTotalUSD / totalValueExclPE) * 100).toFixed(2) + "%" : "0%";

      rows.push([
        `Total ${subClass} USD`,
        "",
        "",
        ...ENTITY_ORDER.map((entity) => subClassEntityTotalsUSD[entity] || 0),
        "",
        subClassTotalUSD,
        "",
        subClassPctOfClass,
        subClassPctExclREPE,
        subClassPctInclRE,
      ]);

      rows.push([
        `Total ${subClass} ILS`,
        "",
        "",
        ...ENTITY_ORDER.map((entity) => subClassEntityTotalsILS[entity] || 0),
        "",
        "",
        subClassTotalILS,
        "",
        "",
        "", // Empty percentage columns for totals
      ]);

      rows.push([]); // Empty row after subclass total

      classTotalUSD += subClassTotalUSD;
      classTotalILS += subClassTotalILS;
    });

    // Add class total rows if there were any assets in this class
    if (classTotalUSD > 0 || classTotalILS > 0) {
      const classPctOfClass = "100.00%";
      const classPctExclREPE =
        totalValueExclREAndPE > 0 ? ((classTotalUSD / totalValueExclREAndPE) * 100).toFixed(2) + "%" : "0%";
      const classPctInclRE = totalValueExclPE > 0 ? ((classTotalUSD / totalValueExclPE) * 100).toFixed(2) + "%" : "0%";

      rows.push([
        `Total ${className} USD`,
        "",
        "",
        ...ENTITY_ORDER.map((entity) => classEntityTotalsUSD[entity] || 0),
        "",
        classTotalUSD,
        "",
        classPctOfClass,
        classPctExclREPE,
        classPctInclRE,
      ]);

      rows.push([
        `Total ${className} ILS`,
        "",
        "",
        ...ENTITY_ORDER.map((entity) => classEntityTotalsILS[entity] || 0),
        "",
        "",
        classTotalILS,
        "",
        "",
        "", // Empty percentage columns for totals
      ]);

      // Add spacing after Class totals
      rows.push([]);
      rows.push([]);

      grandTotalUSD += classTotalUSD;
      grandTotalILS += classTotalILS;
    }
  });

  // Add grand total rows (excluding Real Estate)
  rows.push([
    "Grand Total USD (Excl. Real Estate)",
    "",
    "",
    ...ENTITY_ORDER.map((entity) => grandEntityTotals[entity] || 0),
    "",
    grandTotalUSD,
    "",
    "",
    "",
    "", // Empty percentage columns for totals
  ]);

  // Calculate grand entity totals in ILS (excluding Real Estate)
  const grandEntityTotalsILS: { [entity: string]: number } = {};
  ENTITY_ORDER.forEach((entity) => {
    const entityAssets = assets.filter(
      (a) => a.account_entity === entity && !["Private Equity", "Real Estate"].includes(a.class),
    );
    grandEntityTotalsILS[entity] = entityAssets.reduce(
      (sum, a) => sum + calculateAssetValue(a, fxRates, "ILS").converted_value,
      0,
    );
  });

  rows.push([
    "Grand Total ILS (Excl. Real Estate)",
    "",
    "",
    ...ENTITY_ORDER.map((entity) => grandEntityTotalsILS[entity] || 0),
    "",
    "",
    grandTotalILS,
    "",
    "",
    "", // Empty percentage columns for totals
  ]);

  // Add 3 empty rows after Grand Total ILS (Excl. Real Estate)
  rows.push([]);
  rows.push([]);
  rows.push([]);

  // Now add Real Estate at the end
  const reClassOrder = CLASS_ORDER.find((c) => c.class === "Real Estate");
  if (reClassOrder) {
    const { class: className, subClasses } = reClassOrder;

    // Add Real Estate class header
    rows.push([className, "", "", ...ENTITY_ORDER.map(() => ""), "", "", "", "", "", ""]);

    let classTotalUSD = 0;
    let classTotalILS = 0;
    const classEntityTotalsUSD: { [entity: string]: number } = {};
    const classEntityTotalsILS: { [entity: string]: number } = {};

    subClasses.forEach((subClass) => {
      const subClassAssets = assets.filter((a) => a.class === "Real Estate" && a.sub_class === subClass);

      if (subClassAssets.length === 0) return;

      // Add sub-class header
      rows.push([subClass, "", "", ...ENTITY_ORDER.map(() => ""), "", "", "", "", "", ""]);

      let subClassTotalUSD = 0;
      let subClassTotalILS = 0;
      const subClassEntityTotalsUSD: { [entity: string]: number } = {};
      const subClassEntityTotalsILS: { [entity: string]: number } = {};

      // Group Real Estate assets by name
      const assetGroups = new Map<string, Asset[]>();
      subClassAssets.forEach((asset) => {
        if (!assetGroups.has(asset.name)) {
          assetGroups.set(asset.name, []);
        }
        assetGroups.get(asset.name)!.push(asset);
      });

      // Add row for each Real Estate asset group
      assetGroups.forEach((groupAssets, assetName) => {
        const firstAsset = groupAssets[0];
        let totalQty = 0;
        let totalUSD = 0;
        let totalILS = 0;
        const entityQty: { [entity: string]: number } = {};
        const entityUSD: { [entity: string]: number } = {};
        const entityILS: { [entity: string]: number } = {};

        groupAssets.forEach((asset) => {
          const entity = asset.account_entity;
          const factor = asset.factor || 1;
          const calcUSD = calculateAssetValue(asset, fxRates, "USD");
          const calcILS = calculateAssetValue(asset, fxRates, "ILS");

          const factoredUSD = calcUSD.converted_value * factor;
          const factoredILS = calcILS.converted_value * factor;

          entityQty[entity] = (entityQty[entity] || 0) + asset.quantity;
          entityUSD[entity] = (entityUSD[entity] || 0) + factoredUSD;
          entityILS[entity] = (entityILS[entity] || 0) + factoredILS;

          totalQty += asset.quantity;
          totalUSD += factoredUSD;
          totalILS += factoredILS;
        });

        const pctOfClass =
          classTotals["Real Estate"] > 0 ? ((totalUSD / classTotals["Real Estate"]) * 100).toFixed(2) + "%" : "0%";
        const pctExclREPE = ""; // Real Estate is excluded from this calculation
        const pctInclRE = totalValueExclPE > 0 ? ((totalUSD / totalValueExclPE) * 100).toFixed(2) + "%" : "0%";

        const row = [
          assetName,
          firstAsset.origin_currency,
          firstAsset.price,
          ...ENTITY_ORDER.map((entity) => entityQty[entity] || 0),
          totalQty,
          totalUSD,
          totalILS,
          pctOfClass,
          pctExclREPE,
          pctInclRE,
        ];
        rows.push(row);

        subClassTotalUSD += totalUSD;
        subClassTotalILS += totalILS;

        ENTITY_ORDER.forEach((entity) => {
          if (entityUSD[entity]) {
            subClassEntityTotalsUSD[entity] = (subClassEntityTotalsUSD[entity] || 0) + entityUSD[entity];
            subClassEntityTotalsILS[entity] = (subClassEntityTotalsILS[entity] || 0) + entityILS[entity];
          }
        });
      });

      // Add sub-class total rows
      const subClassPctOfClass =
        classTotals["Real Estate"] > 0
          ? ((subClassTotalUSD / classTotals["Real Estate"]) * 100).toFixed(2) + "%"
          : "0%";
      const subClassPctExclREPE = ""; // Real Estate is excluded from this calculation
      const subClassPctInclRE =
        totalValueExclPE > 0 ? ((subClassTotalUSD / totalValueExclPE) * 100).toFixed(2) + "%" : "0%";

      rows.push([
        `Total ${subClass} USD`,
        "",
        "",
        ...ENTITY_ORDER.map((entity) => subClassEntityTotalsUSD[entity] || 0),
        "",
        subClassTotalUSD,
        "",
        subClassPctOfClass,
        subClassPctExclREPE,
        subClassPctInclRE,
      ]);

      rows.push([
        `Total ${subClass} ILS`,
        "",
        "",
        ...ENTITY_ORDER.map((entity) => subClassEntityTotalsILS[entity] || 0),
        "",
        "",
        subClassTotalILS,
        "",
        "",
        "", // Empty percentage columns for totals
      ]);

      rows.push([]); // Empty row after Real Estate subclass total

      classTotalUSD += subClassTotalUSD;
      classTotalILS += subClassTotalILS;

      ENTITY_ORDER.forEach((entity) => {
        classEntityTotalsUSD[entity] = (classEntityTotalsUSD[entity] || 0) + (subClassEntityTotalsUSD[entity] || 0);
        classEntityTotalsILS[entity] = (classEntityTotalsILS[entity] || 0) + (subClassEntityTotalsILS[entity] || 0);
      });
    });

    // Add Real Estate class total rows
    if (classTotalUSD > 0 || classTotalILS > 0) {
      const classPctOfClass = "100.00%";
      const classPctExclREPE = ""; // Real Estate is excluded from this calculation
      const classPctInclRE = totalValueExclPE > 0 ? ((classTotalUSD / totalValueExclPE) * 100).toFixed(2) + "%" : "0%";

      rows.push([
        "Total Real Estate USD",
        "",
        "",
        ...ENTITY_ORDER.map((entity) => classEntityTotalsUSD[entity] || 0),
        "",
        classTotalUSD,
        "",
        classPctOfClass,
        classPctExclREPE,
        classPctInclRE,
      ]);

      rows.push([
        "Total Real Estate ILS",
        "",
        "",
        ...ENTITY_ORDER.map((entity) => classEntityTotalsILS[entity] || 0),
        "",
        "",
        classTotalILS,
        "",
        "",
        "", // Empty percentage columns for totals
      ]);

      // Add spacing after Real Estate class totals
      rows.push([]);
      rows.push([]);

      // Add final grand total including Real Estate
      const finalGrandTotalUSD = grandTotalUSD + classTotalUSD;
      const finalGrandTotalILS = grandTotalILS + classTotalILS;
      const finalGrandEntityTotalsUSD: { [entity: string]: number } = {};
      const finalGrandEntityTotalsILS: { [entity: string]: number } = {};

      ENTITY_ORDER.forEach((entity) => {
        finalGrandEntityTotalsUSD[entity] = (grandEntityTotals[entity] || 0) + (classEntityTotalsUSD[entity] || 0);
        finalGrandEntityTotalsILS[entity] = (grandEntityTotalsILS[entity] || 0) + (classEntityTotalsILS[entity] || 0);
      });

      rows.push([
        "Grand Total USD (Incl. Real Estate)",
        "",
        "",
        ...ENTITY_ORDER.map((entity) => finalGrandEntityTotalsUSD[entity] || 0),
        "",
        finalGrandTotalUSD,
        "",
        "",
        "",
        "", // Empty percentage columns for totals
      ]);

      rows.push([
        "Grand Total ILS (Incl. Real Estate)",
        "",
        "",
        ...ENTITY_ORDER.map((entity) => finalGrandEntityTotalsILS[entity] || 0),
        "",
        "",
        finalGrandTotalILS,
        "",
        "",
        "", // Empty percentage columns for totals
      ]);
    }
  }

  return rows;
}

// Build PE summary with subclasses
export function buildPESummaryData(
  assets: Asset[],
  fxRates: FXRates,
  liquidationSettings: { asset_name: string; liquidation_year: string }[],
): any[] {
  const peAssets = assets.filter((a) => a.class === "Private Equity");

  if (peAssets.length === 0) {
    return [["No Private Equity holdings"]];
  }

  const rows: any[] = [];

  // Header row
  const headers = ["Company", "Holding Valuation (Price)", "Factor", "Liquidation Year", "Total USD (Factored)"];
  rows.push(headers);

  // Define subclass order
  const subClasses = ["Near Future", "Growth", "Initial"];

  let grandTotalUSD = 0;

  // Process each subclass
  subClasses.forEach((subClass) => {
    const subClassAssets = peAssets.filter((a) => a.sub_class === subClass);

    if (subClassAssets.length === 0) return;

    // Add sub-class header
    rows.push([subClass, "", "", "", ""]);

    let subClassTotalUSD = 0;

    // Group assets by name (company)
    const assetGroups = new Map<string, Asset[]>();
    subClassAssets.forEach((asset) => {
      if (!assetGroups.has(asset.name)) {
        assetGroups.set(asset.name, []);
      }
      assetGroups.get(asset.name)!.push(asset);
    });

    // Calculate totals for sorting
    const groupsWithTotals = Array.from(assetGroups.entries()).map(([companyName, groupAssets]) => {
      const firstAsset = groupAssets[0];
      const liquidationYear = liquidationSettings.find((s) => s.asset_name === companyName)?.liquidation_year || "";
      const factor = firstAsset.factor || 1;

      let totalFactoredUSD = 0;
      let totalHoldingValuation = 0;

      groupAssets.forEach((asset) => {
        const calcUSD = calculateAssetValue(asset, fxRates, "USD");
        totalFactoredUSD += calcUSD.converted_value * (asset.factor || 1);
        totalHoldingValuation += asset.price || 0;
      });

      return {
        companyName,
        firstAsset,
        liquidationYear,
        factor,
        totalFactoredUSD,
        totalHoldingValuation,
      };
    });

    // Sort by factored USD value (largest to smallest)
    groupsWithTotals.sort((a, b) => b.totalFactoredUSD - a.totalFactoredUSD);

    // Add row for each company
    groupsWithTotals.forEach(
      ({ companyName, firstAsset, liquidationYear, factor, totalFactoredUSD, totalHoldingValuation }) => {
        const row = [companyName, totalHoldingValuation, factor, liquidationYear, totalFactoredUSD];
        rows.push(row);

        subClassTotalUSD += totalFactoredUSD;
      },
    );

    // Add sub-class total
    rows.push([`Total ${subClass}`, "", "", "", subClassTotalUSD]);

    grandTotalUSD += subClassTotalUSD;
  });

  // Add grand total
  rows.push(["Grand Total Private Equity", "", "", "", grandTotalUSD]);

  return rows;
}

// Build chart data tables
export function buildChartDataSheets(
  assets: Asset[],
  fxRates: FXRates,
  viewCurrency: "USD" | "ILS" = "USD",
): { [sheetName: string]: any[] } {
  const sheets: { [sheetName: string]: any[] } = {};

  // Helper to calculate totals by class
  const getClassTotals = () => {
    const totals: { [className: string]: { usd: number; ils: number } } = {};
    let grandTotal = 0;

    assets.forEach((asset) => {
      const className = asset.class;
      if (!totals[className]) {
        totals[className] = { usd: 0, ils: 0 };
      }

      const calcUSD = calculateAssetValue(asset, fxRates, "USD");
      const calcILS = calculateAssetValue(asset, fxRates, "ILS");

      // Apply factor for Private Equity and Real Estate
      const factor = asset.class === "Private Equity" || asset.class === "Real Estate" ? asset.factor || 1 : 1;

      totals[className].usd += calcUSD.converted_value * factor;
      totals[className].ils += calcILS.converted_value * factor;
      grandTotal += calcUSD.converted_value * factor;
    });

    return { totals, grandTotal };
  };

  // 1. Asset Class Distribution
  const { totals: classTotals, grandTotal } = getClassTotals();
  const grandTotalILS = Object.values(classTotals).reduce((sum, values) => sum + values.ils, 0);

  sheets["Asset Class Distribution"] = [
    ["Asset Class", "Value (USD)", "Value (ILS)", "Percentage"],
    ...Object.entries(classTotals).map(([className, values]) => [
      className,
      values.usd,
      values.ils,
      ((values.usd / grandTotal) * 100).toFixed(2) + "%",
    ]),
    ["Total", grandTotal, grandTotalILS, "100.00%"],
  ];

  // 2. Beneficiaries Breakdown
  const beneficiaryTotals: { [beneficiary: string]: { usd: number; ils: number } } = {};
  let beneficiaryGrandTotalUSD = 0;
  let beneficiaryGrandTotalILS = 0;

  assets.forEach((asset) => {
    const beneficiary = asset.beneficiary;
    if (!beneficiaryTotals[beneficiary]) {
      beneficiaryTotals[beneficiary] = { usd: 0, ils: 0 };
    }

    const calcUSD = calculateAssetValue(asset, fxRates, "USD");
    const calcILS = calculateAssetValue(asset, fxRates, "ILS");

    // Apply factor for Private Equity and Real Estate
    const factor = asset.class === "Private Equity" || asset.class === "Real Estate" ? asset.factor || 1 : 1;

    const factoredUSD = calcUSD.converted_value * factor;
    const factoredILS = calcILS.converted_value * factor;

    beneficiaryTotals[beneficiary].usd += factoredUSD;
    beneficiaryTotals[beneficiary].ils += factoredILS;
    beneficiaryGrandTotalUSD += factoredUSD;
    beneficiaryGrandTotalILS += factoredILS;
  });

  sheets["Beneficiaries Breakdown"] = [
    ["Beneficiary", "Value (USD)", "Value (ILS)", "Percentage"],
    ...Object.entries(beneficiaryTotals).map(([beneficiary, values]) => [
      beneficiary,
      values.usd,
      values.ils,
      ((values.usd / beneficiaryGrandTotalUSD) * 100).toFixed(2) + "%",
    ]),
    ["Total", beneficiaryGrandTotalUSD, beneficiaryGrandTotalILS, "100.00%"],
  ];

  // 3. Currency Exposure
  const currencyTotals: { [currency: string]: { usd: number; ils: number } } = {};
  let currencyGrandTotalUSD = 0;
  let currencyGrandTotalILS = 0;

  assets.forEach((asset) => {
    const currency = asset.origin_currency;
    if (!currencyTotals[currency]) {
      currencyTotals[currency] = { usd: 0, ils: 0 };
    }

    const calcUSD = calculateAssetValue(asset, fxRates, "USD");
    const calcILS = calculateAssetValue(asset, fxRates, "ILS");

    // Apply factor for Private Equity and Real Estate
    const factor = asset.class === "Private Equity" || asset.class === "Real Estate" ? asset.factor || 1 : 1;

    const factoredUSD = calcUSD.converted_value * factor;
    const factoredILS = calcILS.converted_value * factor;

    currencyTotals[currency].usd += factoredUSD;
    currencyTotals[currency].ils += factoredILS;
    currencyGrandTotalUSD += factoredUSD;
    currencyGrandTotalILS += factoredILS;
  });

  sheets["Currency Exposure"] = [
    ["Currency", "Value (USD)", "Value (ILS)", "Percentage"],
    ...Object.entries(currencyTotals).map(([currency, values]) => [
      currency,
      values.usd,
      values.ils,
      ((values.usd / currencyGrandTotalUSD) * 100).toFixed(2) + "%",
    ]),
    ["Total", currencyGrandTotalUSD, currencyGrandTotalILS, "100.00%"],
  ];

  // 4. Fixed Income Sub-Classes with YTW
  const fixedIncomeAssets = assets.filter((a) => a.class === "Fixed Income");
  const fixedIncomeTotal = fixedIncomeAssets.reduce(
    (sum, a) => sum + calculateAssetValue(a, fxRates, "USD").converted_value,
    0,
  );
  const fixedIncomeTotalILS = fixedIncomeAssets.reduce(
    (sum, a) => sum + calculateAssetValue(a, fxRates, "ILS").converted_value,
    0,
  );

  const fixedIncomeSubClasses: {
    [subClass: string]: { usd: number; ils: number; totalValue: number; weightedYTW: number };
  } = {};
  fixedIncomeAssets.forEach((asset) => {
    const subClass = asset.sub_class;
    if (!fixedIncomeSubClasses[subClass]) {
      fixedIncomeSubClasses[subClass] = { usd: 0, ils: 0, totalValue: 0, weightedYTW: 0 };
    }

    const calcUSD = calculateAssetValue(asset, fxRates, "USD");
    const calcILS = calculateAssetValue(asset, fxRates, "ILS");

    fixedIncomeSubClasses[subClass].usd += calcUSD.converted_value;
    fixedIncomeSubClasses[subClass].ils += calcILS.converted_value;

    // For YTW calculation, use the display value
    const displayValue = viewCurrency === "USD" ? calcUSD.converted_value : calcILS.converted_value;
    fixedIncomeSubClasses[subClass].totalValue += displayValue;
    if (asset.ytw !== undefined && asset.ytw !== null) {
      fixedIncomeSubClasses[subClass].weightedYTW += asset.ytw * displayValue;
    }
  });

  // Calculate average YTW for each sub-class
  const fixedIncomeWithYTW = Object.entries(fixedIncomeSubClasses).map(([subClass, values]) => ({
    subClass,
    usd: values.usd,
    ils: values.ils,
    ytw: values.totalValue > 0 ? values.weightedYTW / values.totalValue : 0,
  }));

  // Calculate total YTW (all fixed income)
  const totalFixedIncomeValue = fixedIncomeWithYTW.reduce(
    (sum, item) => sum + (viewCurrency === "USD" ? item.usd : item.ils),
    0,
  );
  const totalWeightedYTW = fixedIncomeWithYTW.reduce(
    (sum, item) => sum + item.ytw * (viewCurrency === "USD" ? item.usd : item.ils),
    0,
  );
  const avgYTWAll = totalFixedIncomeValue > 0 ? totalWeightedYTW / totalFixedIncomeValue : 0;

  // Calculate YTW excluding Bank Deposits and Money Market
  const excludedSubClasses = ["Bank Deposit", "Money Market"];
  const fixedIncomeExcluding = fixedIncomeWithYTW.filter((item) => !excludedSubClasses.includes(item.subClass));
  const totalValueExcluding = fixedIncomeExcluding.reduce(
    (sum, item) => sum + (viewCurrency === "USD" ? item.usd : item.ils),
    0,
  );
  const totalWeightedYTWExcluding = fixedIncomeExcluding.reduce(
    (sum, item) => sum + item.ytw * (viewCurrency === "USD" ? item.usd : item.ils),
    0,
  );
  const avgYTWExcluding = totalValueExcluding > 0 ? totalWeightedYTWExcluding / totalValueExcluding : 0;

  sheets["Fixed Income Sub-Classes"] = [
    ["Sub-Class", "Value (USD)", "Value (ILS)", "Percentage", "YTW (%)"],
    ...fixedIncomeWithYTW.map((item) => [
      item.subClass,
      item.usd,
      item.ils,
      ((item.usd / fixedIncomeTotal) * 100).toFixed(2) + "%",
      item.ytw * 100,
    ]),
    ["Total", fixedIncomeTotal, fixedIncomeTotalILS, "100.00%", avgYTWAll * 100],
    [
      "Total (excl. Bank Deposits & Money Market)",
      fixedIncomeExcluding.reduce((sum, item) => sum + item.usd, 0),
      fixedIncomeExcluding.reduce((sum, item) => sum + item.ils, 0),
      "", // No percentage for this row
      avgYTWExcluding * 100,
    ],
  ];

  // 5. Public Equity Sub-Classes
  const publicEquityAssets = assets.filter((a) => a.class === "Public Equity" || a.class === "Commodities & more");
  const publicEquityTotal = publicEquityAssets.reduce(
    (sum, a) => sum + calculateAssetValue(a, fxRates, "USD").converted_value,
    0,
  );
  const publicEquityTotalILS = publicEquityAssets.reduce(
    (sum, a) => sum + calculateAssetValue(a, fxRates, "ILS").converted_value,
    0,
  );

  const publicEquitySubClasses: { [subClass: string]: { usd: number; ils: number } } = {};
  publicEquityAssets.forEach((asset) => {
    const subClass = asset.sub_class;
    if (!publicEquitySubClasses[subClass]) {
      publicEquitySubClasses[subClass] = { usd: 0, ils: 0 };
    }

    const calcUSD = calculateAssetValue(asset, fxRates, "USD");
    const calcILS = calculateAssetValue(asset, fxRates, "ILS");

    publicEquitySubClasses[subClass].usd += calcUSD.converted_value;
    publicEquitySubClasses[subClass].ils += calcILS.converted_value;
  });

  sheets["Public Equity Sub-Classes"] = [
    ["Sub-Class", "Value (USD)", "Value (ILS)", "Percentage"],
    ...Object.entries(publicEquitySubClasses).map(([subClass, values]) => [
      subClass,
      values.usd,
      values.ils,
      ((values.usd / publicEquityTotal) * 100).toFixed(2) + "%",
    ]),
    ["Total", publicEquityTotal, publicEquityTotalILS, "100.00%"],
  ];

  // 6. Top 10 Public Equity Holdings (with Bitcoin consolidation)
  // Helper function to detect Bitcoin-related assets
  const isBitcoinAsset = (assetName: string): boolean => {
    const name = assetName.toLowerCase();
    return name.includes("bitcoin") || name.includes("btc");
  };

  const publicEquityHoldings: { [name: string]: { usd: number; ils: number } } = {};
  publicEquityAssets.forEach((asset) => {
    // Group all Bitcoin-related assets under one name
    const groupName = isBitcoinAsset(asset.name) ? "Bitcoin (All)" : asset.name;

    if (!publicEquityHoldings[groupName]) {
      publicEquityHoldings[groupName] = { usd: 0, ils: 0 };
    }

    const calcUSD = calculateAssetValue(asset, fxRates, "USD");
    const calcILS = calculateAssetValue(asset, fxRates, "ILS");

    publicEquityHoldings[groupName].usd += calcUSD.converted_value;
    publicEquityHoldings[groupName].ils += calcILS.converted_value;
  });

  const topPublicEquity = Object.entries(publicEquityHoldings)
    .sort((a, b) => b[1].usd - a[1].usd)
    .slice(0, 10);

  sheets["Top 10 Public Equity"] = [
    ["Asset Name", "Value (USD)", "Value (ILS)", "% of Public Equity & Commodities"],
    ...topPublicEquity.map(([name, values]) => [
      name,
      values.usd,
      values.ils,
      ((values.usd / publicEquityTotal) * 100).toFixed(2) + "%",
    ]),
  ];

  // 7. Top 10 Private Equity Holdings (with factored values)
  const privateEquityAssets = assets.filter((a) => a.class === "Private Equity");

  const privateEquityHoldings: { [name: string]: { usd: number; ils: number } } = {};
  let privateEquityTotal = 0;
  let privateEquityTotalILS = 0;

  privateEquityAssets.forEach((asset) => {
    const name = asset.name;
    if (!privateEquityHoldings[name]) {
      privateEquityHoldings[name] = { usd: 0, ils: 0 };
    }

    const calcUSD = calculateAssetValue(asset, fxRates, "USD");
    const calcILS = calculateAssetValue(asset, fxRates, "ILS");
    const factor = asset.factor || 1;

    const factoredUSD = calcUSD.converted_value * factor;
    const factoredILS = calcILS.converted_value * factor;

    privateEquityHoldings[name].usd += factoredUSD;
    privateEquityHoldings[name].ils += factoredILS;
    privateEquityTotal += factoredUSD;
    privateEquityTotalILS += factoredILS;
  });

  const topPrivateEquity = Object.entries(privateEquityHoldings)
    .sort((a, b) => b[1].usd - a[1].usd)
    .slice(0, 10);

  sheets["Top 10 Private Equity"] = [
    ["Asset Name", "Value (USD)", "Value (ILS)", "% of Private Equity"],
    ...topPrivateEquity.map(([name, values]) => [
      name,
      values.usd,
      values.ils,
      privateEquityTotal > 0 ? ((values.usd / privateEquityTotal) * 100).toFixed(2) + "%" : "0%",
    ]),
  ];

  return sheets;
}

// Apply styling to a data sheet with header rows support
export function applySheetStyling(
  sheet: XLSX.WorkSheet,
  rowCount: number,
  isTotalRow: (row: number) => boolean,
  isSubtotalRow: (row: number) => boolean,
  isHeaderRow?: (row: number) => boolean,
) {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");

  // Style headers
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const headerAddr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (sheet[headerAddr]) {
      sheet[headerAddr].s = HEADER_STYLE;
    }
  }

  // Style data rows
  for (let R = 1; R <= range.e.r; ++R) {
    const isTotal = isTotalRow(R);
    const isSubtotal = isSubtotalRow(R);
    const isHeader = isHeaderRow ? isHeaderRow(R) : false;
    const isAlternate = R % 2 === 0;

    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
      if (sheet[cellAddr]) {
        let style: any = isAlternate ? ALTERNATE_ROW_STYLE : DATA_STYLE;

        if (isTotal) {
          style = TOTAL_ROW_STYLE;
        } else if (isSubtotal) {
          style = SUBTOTAL_ROW_STYLE;
        } else if (isHeader) {
          // Header row style (merged cell with class/subclass name)
          style = {
            ...DATA_STYLE,
            font: { name: "Arial", sz: 11, bold: true },
            fill: { fgColor: { rgb: "E7E6E6" } },
            alignment: { horizontal: "center", vertical: "center" },
          };
        }

        // Apply number formatting for numeric columns
        if (sheet[cellAddr].t === "n") {
          style = { ...style, numFmt: "#,##0.00" };
        }

        sheet[cellAddr].s = style;
      }
    }
  }
}
