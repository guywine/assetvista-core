import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Download, Calendar, Trash2 } from "lucide-react";
import { PortfolioSnapshot } from "@/types/portfolio";
import { formatCurrency, calculateAssetValue } from "@/lib/portfolio-utils";
import {
  buildSmartSummaryData,
  buildPESummaryData,
  buildChartDataSheets,
  applySheetStyling,
  HEADER_STYLE,
  DATA_STYLE,
  ALTERNATE_ROW_STYLE,
  TOTAL_ROW_STYLE,
  SUBTOTAL_ROW_STYLE,
} from "@/lib/portfolio-export-utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx-js-style";

export function PortfolioHistory() {
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSnapshots();
  }, []);

  const loadSnapshots = async () => {
    try {
      const { data, error } = await supabase
        .from("portfolio_snapshots")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setSnapshots(
        (data || []).map((row) => ({
          ...row,
          assets: row.assets as any[],
          fx_rates: row.fx_rates as any,
        })),
      );
    } catch (error) {
      console.error("Error loading snapshots:", error);
      toast({
        title: "Error",
        description: "Failed to load portfolio history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const deleteSnapshot = async (snapshot: PortfolioSnapshot) => {
    try {
      const { error } = await supabase.from("portfolio_snapshots").delete().eq("id", snapshot.id);

      if (error) throw error;

      setSnapshots((prev) => prev.filter((s) => s.id !== snapshot.id));

      toast({
        title: "Deleted",
        description: `Portfolio snapshot "${snapshot.name}" has been deleted`,
      });
    } catch (error) {
      console.error("Error deleting snapshot:", error);
      toast({
        title: "Error",
        description: "Failed to delete portfolio snapshot",
        variant: "destructive",
      });
    }
  };

  const downloadSnapshot = async (snapshot: PortfolioSnapshot) => {
    const workbook = XLSX.utils.book_new();

    // Fetch liquidation settings
    let liquidationSettings: any[] = [];
    try {
      const { data } = await supabase.from("asset_liquidation_settings").select("*").order("asset_name");
      liquidationSettings = data || [];
    } catch (error) {
      console.error("Error fetching liquidation settings:", error);
    }

    // Define styling constants
    const headerStyle = {
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

    const dataStyle = {
      font: { name: "Arial", sz: 10 },
      alignment: { horizontal: "left", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "CCCCCC" } },
        bottom: { style: "thin", color: { rgb: "CCCCCC" } },
        left: { style: "thin", color: { rgb: "CCCCCC" } },
        right: { style: "thin", color: { rgb: "CCCCCC" } },
      },
    };

    const alternateRowStyle = {
      ...dataStyle,
      fill: { fgColor: { rgb: "F8F9FA" } },
    };

    const currencyStyle = {
      ...dataStyle,
      numFmt: "$#,##0.00",
    };

    const numberStyle = {
      ...dataStyle,
      numFmt: "#,##0.0000",
    };

    // Assets sheet - Calculate total value first (using display_value which includes factor)
    const totalPortfolioValue = snapshot.assets.reduce((sum, asset) => {
      const calc = calculateAssetValue(asset, snapshot.fx_rates, "USD");
      return sum + calc.display_value; // Use display_value to include factor for PE/RE
    }, 0);

    const assetsData = snapshot.assets.map((asset) => {
      const calc = calculateAssetValue(asset, snapshot.fx_rates, "USD");
      const valueUSD = calc.display_value; // Use display_value which includes factor for PE/RE
      const percentageOfTotal = totalPortfolioValue > 0 ? (valueUSD / totalPortfolioValue) * 100 : 0;

      return {
        Name: asset.name,
        Class: asset.class,
        "Sub Class": asset.sub_class,
        ISIN: asset.ISIN || "",
        "Account Entity": asset.account_entity,
        "Account Bank": asset.account_bank,
        Quantity: asset.quantity,
        Price: asset.price,
        Factor: asset.factor || "",
        "Origin Currency": asset.origin_currency,
        "Maturity Date":
          asset.maturity_date && asset.maturity_date !== "none" && !isNaN(Date.parse(asset.maturity_date))
            ? format(new Date(asset.maturity_date), "yyyy-MM-dd")
            : "",
        YTW: asset.ytw ? asset.ytw * 100 : "",
        "Company Market Value": asset.pe_company_value || "",
        "Percentage of Holding": asset.pe_holding_percentage || "",
        "Value (USD)": valueUSD,
        "% of Total": percentageOfTotal,
      };
    });

    // Add grand total row
    assetsData.push({
      Name: "GRAND TOTAL",
      Class: "" as any,
      "Sub Class": "" as any,
      ISIN: "",
      "Account Entity": "" as any,
      "Account Bank": "" as any,
      Quantity: "" as any,
      Price: "" as any,
      Factor: "",
      "Origin Currency": "" as any,
      "Maturity Date": "",
      YTW: "",
      "Company Market Value": "",
      "Percentage of Holding": "",
      "Value (USD)": totalPortfolioValue,
      "% of Total": 100,
    });

    const assetsSheet = XLSX.utils.json_to_sheet(assetsData);

    // Freeze the header row (row 1) for Assets sheet
    assetsSheet["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
    assetsSheet["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };

    // Apply styling to Assets sheet
    const assetsRange = XLSX.utils.decode_range(assetsSheet["!ref"] || "A1");

    // Set column widths
    assetsSheet["!cols"] = [
      { wch: 25 }, // Name
      { wch: 15 }, // Class
      { wch: 18 }, // Sub Class
      { wch: 15 }, // ISIN
      { wch: 15 }, // Account Entity
      { wch: 15 }, // Account Bank
      { wch: 12 }, // Quantity
      { wch: 12 }, // Price
      { wch: 10 }, // Factor
      { wch: 15 }, // Origin Currency
      { wch: 15 }, // Maturity Date
      { wch: 10 }, // YTW
      { wch: 20 }, // Company Market Value
      { wch: 20 }, // Percentage of Holding
      { wch: 18 }, // Value (USD)
      { wch: 12 }, // % of Total
    ];

    // Style headers and data
    for (let C = assetsRange.s.c; C <= assetsRange.e.c; ++C) {
      const headerAddr = XLSX.utils.encode_cell({ r: 0, c: C });
      if (assetsSheet[headerAddr]) {
        assetsSheet[headerAddr].s = headerStyle;
      }
    }

    const assetsTotalRowStyle = {
      ...dataStyle,
      font: { name: "Arial", sz: 11, bold: true },
      fill: { fgColor: { rgb: "FFE699" } },
    };

    for (let R = 1; R <= assetsRange.e.r; ++R) {
      const isTotalRow = R === assetsRange.e.r; // Last row is the grand total

      for (let C = assetsRange.s.c; C <= assetsRange.e.c; ++C) {
        const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
        if (assetsSheet[cellAddr]) {
          const isAlternateRow = R % 2 === 0;
          let baseStyle = isTotalRow ? assetsTotalRowStyle : isAlternateRow ? alternateRowStyle : dataStyle;

          // Apply currency style to Price and Value (USD) columns
          if (C === 7 || C === 14) {
            assetsSheet[cellAddr].s = { ...baseStyle, numFmt: "$#,##0.00" };
          } else if (C === 15) {
            // % of Total column
            assetsSheet[cellAddr].s = { ...baseStyle, numFmt: '0.00"%"' };
          } else {
            assetsSheet[cellAddr].s = baseStyle;
          }
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, assetsSheet, "Assets");

    // FX Rates sheet
    const fxData = Object.entries(snapshot.fx_rates).map(([currency, rates]) => ({
      Currency: currency,
      "To USD": (rates as any).to_USD,
      "To ILS": (rates as any).to_ILS,
      "Last Updated": (rates as any).last_updated,
    }));

    const fxSheet = XLSX.utils.json_to_sheet(fxData);

    // Apply styling to FX Rates sheet
    const fxRange = XLSX.utils.decode_range(fxSheet["!ref"] || "A1");

    fxSheet["!cols"] = [
      { wch: 12 }, // Currency
      { wch: 15 }, // To USD
      { wch: 15 }, // To ILS
      { wch: 20 }, // Last Updated
    ];

    // Style headers
    for (let C = fxRange.s.c; C <= fxRange.e.c; ++C) {
      const headerAddr = XLSX.utils.encode_cell({ r: 0, c: C });
      if (fxSheet[headerAddr]) {
        fxSheet[headerAddr].s = headerStyle;
      }
    }

    // Style data rows
    for (let R = 1; R <= fxRange.e.r; ++R) {
      for (let C = fxRange.s.c; C <= fxRange.e.c; ++C) {
        const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
        if (fxSheet[cellAddr]) {
          const isAlternateRow = R % 2 === 0;
          if (C === 1 || C === 2) {
            // To USD and To ILS columns
            fxSheet[cellAddr].s = { ...(isAlternateRow ? alternateRowStyle : dataStyle), ...numberStyle };
          } else {
            fxSheet[cellAddr].s = isAlternateRow ? alternateRowStyle : dataStyle;
          }
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, fxSheet, "FX Rates");

    // Summary sheet
    const summaryData = [
      { Metric: "Total Value (USD)", Value: snapshot.total_value_usd },
      { Metric: "Liquid + Fixed Income (USD)", Value: snapshot.liquid_fixed_income_value_usd },
      { Metric: "Private Equity (USD)", Value: snapshot.private_equity_value_usd },
      { Metric: "Real Estate (USD)", Value: snapshot.real_estate_value_usd },
      { Metric: "Snapshot Date", Value: snapshot.snapshot_date },
      { Metric: "Description", Value: snapshot.description || "" },
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);

    // Apply styling to Summary sheet
    const summaryRange = XLSX.utils.decode_range(summarySheet["!ref"] || "A1");

    summarySheet["!cols"] = [
      { wch: 25 }, // Metric
      { wch: 20 }, // Value
    ];

    const summaryHeaderStyle = {
      ...headerStyle,
      font: { name: "Arial", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
    };

    const totalRowStyle = {
      ...dataStyle,
      font: { name: "Arial", sz: 12, bold: true },
      fill: { fgColor: { rgb: "E7F3FF" } },
    };

    // Style headers
    for (let C = summaryRange.s.c; C <= summaryRange.e.c; ++C) {
      const headerAddr = XLSX.utils.encode_cell({ r: 0, c: C });
      if (summarySheet[headerAddr]) {
        summarySheet[headerAddr].s = summaryHeaderStyle;
      }
    }

    // Style data rows
    for (let R = 1; R <= summaryRange.e.r; ++R) {
      for (let C = summaryRange.s.c; C <= summaryRange.e.c; ++C) {
        const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
        if (summarySheet[cellAddr]) {
          const isTotalRow = R === 1; // Total Value row
          const isAlternateRow = R % 2 === 0;

          if (isTotalRow) {
            if (C === 1) {
              // Value column for Total Value
              summarySheet[cellAddr].s = { ...totalRowStyle, ...currencyStyle };
            } else {
              summarySheet[cellAddr].s = totalRowStyle;
            }
          } else if (C === 1 && (R === 2 || R === 3 || R === 4)) {
            // Currency value columns
            summarySheet[cellAddr].s = { ...(isAlternateRow ? alternateRowStyle : dataStyle), ...currencyStyle };
          } else {
            summarySheet[cellAddr].s = isAlternateRow ? alternateRowStyle : dataStyle;
          }
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // Asset Liquidation Settings sheet
    const liquidationData = liquidationSettings.map((setting) => ({
      "Asset Name": setting.asset_name,
      "Liquidation Year": setting.liquidation_year,
    }));

    const liquidationSheet = XLSX.utils.json_to_sheet(liquidationData);

    // Apply styling to Liquidation Settings sheet
    const liquidationRange = XLSX.utils.decode_range(liquidationSheet["!ref"] || "A1");

    liquidationSheet["!cols"] = [
      { wch: 25 }, // Asset Name
      { wch: 20 }, // Liquidation Year
    ];

    // Style headers
    for (let C = liquidationRange.s.c; C <= liquidationRange.e.c; ++C) {
      const headerAddr = XLSX.utils.encode_cell({ r: 0, c: C });
      if (liquidationSheet[headerAddr]) {
        liquidationSheet[headerAddr].s = HEADER_STYLE;
      }
    }

    // Style data rows
    for (let R = 1; R <= liquidationRange.e.r; ++R) {
      for (let C = liquidationRange.s.c; C <= liquidationRange.e.c; ++C) {
        const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
        if (liquidationSheet[cellAddr]) {
          const isAlternateRow = R % 2 === 0;
          liquidationSheet[cellAddr].s = isAlternateRow ? ALTERNATE_ROW_STYLE : DATA_STYLE;
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, liquidationSheet, "Asset Liquidation Settings");

    // Smart Summary sheet
    const smartSummaryData = buildSmartSummaryData(snapshot.assets, snapshot.fx_rates);
    const smartSummarySheet = XLSX.utils.aoa_to_sheet(smartSummaryData);

    // Freeze the header row (row 1)
    smartSummarySheet["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };

    // Apply styling to Smart Summary
    const smartSummaryRange = XLSX.utils.decode_range(smartSummarySheet["!ref"] || "A1");

    smartSummarySheet["!cols"] = [
      { wch: 30 }, // Asset Name
      { wch: 10 }, // Currency
      { wch: 12 }, // Price
      ...Array(9).fill({ wch: 12 }), // Entity columns
      { wch: 12 }, // Total Qty
      { wch: 15 }, // Total USD
      { wch: 15 }, // Total ILS
    ];

    // Style headers
    for (let C = smartSummaryRange.s.c; C <= smartSummaryRange.e.c; ++C) {
      const headerAddr = XLSX.utils.encode_cell({ r: 0, c: C });
      if (smartSummarySheet[headerAddr]) {
        smartSummarySheet[headerAddr].s = HEADER_STYLE;
      }
    }

    // Style data rows and apply special styling for total rows and header rows
    for (let R = 1; R <= smartSummaryRange.e.r; ++R) {
      const firstCell = smartSummarySheet[XLSX.utils.encode_cell({ r: R, c: 0 })];
      const cellValue = firstCell?.v?.toString() || "";
      const isTotalRow = cellValue.startsWith("Total ") || cellValue.startsWith("Grand Total");
      const isSubtotalRow = cellValue.includes("Total ") && !cellValue.startsWith("Grand Total");
      const isAlternate = R % 2 === 0;

      // Check if this is a header row (class or subclass name with empty cells)
      const secondCell = smartSummarySheet[XLSX.utils.encode_cell({ r: R, c: 1 })];
      const isHeaderRow =
        cellValue &&
        !isTotalRow &&
        (!secondCell || secondCell.v === "" || secondCell.v === null || secondCell.v === undefined);

      // Determine if it's a class header or subclass header based on context
      const isClassHeader =
        isHeaderRow &&
        (cellValue === "Cash" ||
          cellValue === "Fixed Income" ||
          cellValue === "Public Equity" ||
          cellValue === "Commodities & more" ||
          cellValue === "Real Estate");
      const isSubclassHeader = isHeaderRow && !isClassHeader;

      // Determine if it's a class total or subclass total
      const isClassTotal =
        isTotalRow &&
        (cellValue.includes("Total Cash") ||
          cellValue.includes("Total Fixed Income") ||
          cellValue.includes("Total Public Equity") ||
          cellValue.includes("Total Commodities & more") ||
          cellValue.includes("Total Real Estate"));
      const isSubclassTotal = isTotalRow && !isClassTotal && !cellValue.startsWith("Grand Total");

      for (let C = smartSummaryRange.s.c; C <= smartSummaryRange.e.c; ++C) {
        const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
        if (smartSummarySheet[cellAddr]) {
          let style: any = isAlternate && !isTotalRow && !isHeaderRow ? ALTERNATE_ROW_STYLE : DATA_STYLE;

          if (cellValue.startsWith("Grand Total")) {
            style = TOTAL_ROW_STYLE;
          } else if (isClassTotal) {
            style = {
              ...DATA_STYLE,
              font: { name: "Arial", sz: 12, bold: true },
              fill: { fgColor: { rgb: "B4C7E7" } },
            };
          } else if (isSubclassTotal) {
            style = {
              ...DATA_STYLE,
              font: { name: "Arial", sz: 10, bold: true },
              fill: { fgColor: { rgb: "D9D9D9" } },
            };
          } else if (isClassHeader) {
            style = {
              ...DATA_STYLE,
              font: { name: "Arial", sz: 14, bold: true },
              fill: { fgColor: { rgb: "D9E2F3" } },
              alignment: { horizontal: "center", vertical: "center" },
            };
          } else if (isSubclassHeader) {
            style = {
              ...DATA_STYLE,
              font: { name: "Arial", sz: 11, bold: true },
              fill: { fgColor: { rgb: "808080" } },
              alignment: { horizontal: "center", vertical: "center" },
            };
          }

          // Apply number formatting for numeric columns
          if (smartSummarySheet[cellAddr].t === "n") {
            style = { ...style, numFmt: "#,##0.00" };
          }

          smartSummarySheet[cellAddr].s = style;
        }
      }

      // Merge cells for header rows
      if (isHeaderRow) {
        const mergeRange = { s: { r: R, c: 0 }, e: { r: R, c: smartSummaryRange.e.c } };
        if (!smartSummarySheet["!merges"]) smartSummarySheet["!merges"] = [];
        smartSummarySheet["!merges"].push(mergeRange);
      }
    }

    XLSX.utils.book_append_sheet(workbook, smartSummarySheet, "Smart Summary");

    // Private Equity Summary sheet
    const peData = buildPESummaryData(snapshot.assets, snapshot.fx_rates, liquidationSettings);
    const peSheet = XLSX.utils.aoa_to_sheet(peData);

    // Freeze the header row (row 1) for PE Summary sheet
    peSheet["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };

    // Apply styling to PE Summary
    const peRange = XLSX.utils.decode_range(peSheet["!ref"] || "A1");

    peSheet["!cols"] = [
      { wch: 30 }, // Company
      { wch: 20 }, // Holding Valuation (Price)
      { wch: 10 }, // Factor
      { wch: 15 }, // Liquidation Year
      { wch: 20 }, // Total USD (Factored)
    ];

    // Style headers
    for (let C = peRange.s.c; C <= peRange.e.c; ++C) {
      const headerAddr = XLSX.utils.encode_cell({ r: 0, c: C });
      if (peSheet[headerAddr]) {
        peSheet[headerAddr].s = HEADER_STYLE;
      }
    }

    // Style data rows
    for (let R = 1; R <= peRange.e.r; ++R) {
      const firstCell = peSheet[XLSX.utils.encode_cell({ r: R, c: 0 })];
      const cellValue = firstCell?.v?.toString() || "";
      const isTotalRow = cellValue.startsWith("Total ") || cellValue.startsWith("Grand Total");
      const isAlternate = R % 2 === 0;

      // Check if this is a header row (subclass name)
      const secondCell = peSheet[XLSX.utils.encode_cell({ r: R, c: 1 })];
      const isHeaderRow =
        cellValue &&
        !isTotalRow &&
        (!secondCell || secondCell.v === "" || secondCell.v === null || secondCell.v === undefined);

      for (let C = peRange.s.c; C <= peRange.e.c; ++C) {
        const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
        if (peSheet[cellAddr]) {
          let style: any = isAlternate && !isTotalRow && !isHeaderRow ? ALTERNATE_ROW_STYLE : DATA_STYLE;

          if (cellValue.startsWith("Grand Total")) {
            style = TOTAL_ROW_STYLE;
          } else if (isTotalRow) {
            style = SUBTOTAL_ROW_STYLE;
          } else if (isHeaderRow) {
            // Header row style (subclass name)
            style = {
              ...DATA_STYLE,
              font: { name: "Arial", sz: 11, bold: true },
              fill: { fgColor: { rgb: "E7E6E6" } },
              alignment: { horizontal: "center", vertical: "center" },
            };
          }

          // Apply number formatting for numeric columns
          if (peSheet[cellAddr].t === "n") {
            style = { ...style, numFmt: "#,##0.00" };
          }

          peSheet[cellAddr].s = style;
        }
      }

      // Merge cells for header rows
      if (isHeaderRow) {
        const mergeRange = { s: { r: R, c: 0 }, e: { r: R, c: peRange.e.c } };
        if (!peSheet["!merges"]) peSheet["!merges"] = [];
        peSheet["!merges"].push(mergeRange);
      }
    }

    XLSX.utils.book_append_sheet(workbook, peSheet, "Private Equity Summary");

    // Chart Data sheets - use 'USD' as default since view_currency is not stored in snapshots
    const chartDataSheets = buildChartDataSheets(snapshot.assets, snapshot.fx_rates, "USD");

    Object.entries(chartDataSheets).forEach(([sheetName, data]) => {
      const sheet = XLSX.utils.aoa_to_sheet(data);

      // Apply styling
      const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");

      sheet["!cols"] = [
        { wch: 25 }, // First column (name/category)
        { wch: 18 }, // Value USD
        { wch: 18 }, // Value ILS
        { wch: 15 }, // Percentage
      ];

      // Style headers
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const headerAddr = XLSX.utils.encode_cell({ r: 0, c: C });
        if (sheet[headerAddr]) {
          sheet[headerAddr].s = HEADER_STYLE;
        }
      }

      // Style data rows
      for (let R = 1; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
          if (sheet[cellAddr]) {
            const isAlternateRow = R % 2 === 0;
            let style: any = isAlternateRow ? ALTERNATE_ROW_STYLE : DATA_STYLE;

            // Apply number formatting for numeric columns (USD and ILS)
            if (sheet[cellAddr].t === "n" && C >= 1 && C <= 2) {
              style = { ...style, numFmt: "#,##0.00" };
            }

            sheet[cellAddr].s = style;
          }
        }
      }

      XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
    });

    // Download - use writeFileXLSX for better freeze pane support
    const fileName = `${snapshot.name.replace(/[^a-zA-Z0-9-_]/g, "_")}.xlsx`;
    XLSX.writeFileXLSX(workbook, fileName);

    toast({
      title: "Downloaded",
      description: `Portfolio snapshot exported as ${fileName}`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-muted-foreground">Loading portfolio history...</div>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Portfolio History</h3>
        <p className="text-muted-foreground mb-4">Save your first portfolio snapshot to see it here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Portfolio History</h3>
        <Badge variant="secondary">{snapshots.length} snapshots</Badge>
      </div>

      <div className="grid gap-4">
        {snapshots.map((snapshot) => (
          <Card key={snapshot.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{snapshot.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{format(new Date(snapshot.created_at), "PPP")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Portfolio Snapshot</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{snapshot.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteSnapshot(snapshot)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button variant="outline" size="sm" onClick={() => downloadSnapshot(snapshot)} className="gap-2">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
              {snapshot.description && <p className="text-sm text-muted-foreground mt-2">{snapshot.description}</p>}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Total Value</div>
                  <div className="font-semibold text-lg">{formatCurrency(snapshot.total_value_usd, "USD")}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Liquid + Fixed Income</div>
                  <div className="font-semibold">{formatCurrency(snapshot.liquid_fixed_income_value_usd, "USD")}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Private Equity</div>
                  <div className="font-semibold">{formatCurrency(snapshot.private_equity_value_usd, "USD")}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Real Estate</div>
                  <div className="font-semibold">{formatCurrency(snapshot.real_estate_value_usd, "USD")}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
