import { useState, useRef, useEffect, useMemo } from "react";
import { Asset } from "@/types/portfolio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Edit2, Check, X, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { validateNumericInput } from "@/lib/utils";

interface PricingTableProps {
  groupAAssets: Asset[];
  groupBAssets: Asset[];
  onUpdateAsset: (asset: Asset) => Promise<Asset>;
}

interface EditingAsset {
  id: string;
  price: string;
  ytw: string;
  field?: "price" | "ytw"; // Track which field was double-clicked
}

export function PricingTable({ groupAAssets, groupBAssets, onUpdateAsset }: PricingTableProps) {
  const [editingAsset, setEditingAsset] = useState<EditingAsset | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "sub_class" | "updated_at">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const { toast } = useToast();
  const priceInputRef = useRef<HTMLInputElement>(null);
  const ytwInputRef = useRef<HTMLInputElement>(null);

  const allAssets = [...groupAAssets, ...groupBAssets];

  // Consolidate assets by name - each asset name appears only once
  const consolidatedAssets = useMemo(() => {
    const assetMap = new Map<string, Asset[]>();

    allAssets.forEach((asset) => {
      if (!assetMap.has(asset.name)) {
        assetMap.set(asset.name, []);
      }
      assetMap.get(asset.name)!.push(asset);
    });

    // Create a representative asset for each name (using the most recently updated one)
    return Array.from(assetMap.entries()).map(([name, assets]) => {
      const mostRecent = assets.reduce((latest, current) =>
        new Date(current.updated_at) > new Date(latest.updated_at) ? current : latest,
      );
      return {
        ...mostRecent,
        // Store all asset IDs that share this name for bulk updates
        _allAssetIds: assets.map((a) => a.id),
      };
    });
  }, [allAssets]);

  // Sort assets based on current sort settings
  const sortedAssets = useMemo(() => {
    const sorted = [...consolidatedAssets].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "sub_class":
          comparison = a.sub_class.localeCompare(b.sub_class);
          if (comparison === 0) {
            comparison = a.name.localeCompare(b.name);
          }
          break;
        case "updated_at":
          comparison = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          break;
        case "name":
        default:
          comparison = a.name.localeCompare(b.name);
          break;
      }

      return sortDirection === "desc" ? -comparison : comparison;
    });

    return sorted;
  }, [consolidatedAssets, sortBy, sortDirection]);

  const handleSort = (column: "name" | "sub_class" | "updated_at") => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ column }: { column: "name" | "sub_class" | "updated_at" }) => {
    if (sortBy !== column) {
      return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
    }
    return sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (editingAsset?.field === "price" && priceInputRef.current) {
      priceInputRef.current.focus();
    } else if (editingAsset?.field === "ytw" && ytwInputRef.current) {
      ytwInputRef.current.focus();
    }
  }, [editingAsset?.id, editingAsset?.field]);

  const handleStartEdit = (asset: Asset, field?: "price" | "ytw") => {
    setEditingAsset({
      id: asset.id,
      price: asset.price.toString(),
      ytw: asset.ytw ? (asset.ytw * 100).toString() : "", // Convert to percentage for editing
      field,
    });
  };

  const handleSave = async () => {
    if (!editingAsset) return;

    const originalAsset = sortedAssets.find((a) => a.id === editingAsset.id);
    if (!originalAsset) return;

    try {
      const price = parseFloat(editingAsset.price);
      const ytw = editingAsset.ytw ? parseFloat(editingAsset.ytw) / 100 : undefined;

      if (isNaN(price) || price < 0) {
        toast({
          title: "Invalid Input",
          description: "Price must be a valid positive number",
          variant: "destructive",
        });
        return;
      }

      if (editingAsset.ytw && (isNaN(ytw!) || ytw! < 0)) {
        toast({
          title: "Invalid Input",
          description: "YTW must be a valid positive number",
          variant: "destructive",
        });
        return;
      }

      // Update ALL assets with the same name
      const assetIdsToUpdate = (originalAsset as any)._allAssetIds || [originalAsset.id];
      const updatePromises = assetIdsToUpdate.map((assetId: string) => {
        const assetToUpdate = allAssets.find((a) => a.id === assetId);
        if (!assetToUpdate) return Promise.resolve(null);

        const updatedAsset: Asset = {
          ...assetToUpdate,
          price,
          ytw,
          updated_at: new Date().toISOString(),
        };

        return onUpdateAsset(updatedAsset);
      });

      await Promise.all(updatePromises);
      setEditingAsset(null);

      const count = assetIdsToUpdate.length;
      toast({
        title: "Success",
        description: `Updated ${count} holding${count > 1 ? "s" : ""} of ${originalAsset.name}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update asset pricing",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setEditingAsset(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleDoubleClick = (asset: Asset, field: "price" | "ytw") => {
    handleStartEdit(asset, field);
  };

  const isGroupB = (asset: Asset) => {
    return (
      asset.class === "Fixed Income" && ["Corporate", "Gov long", "Gov 1-2", "CPI linked", "REIT stock"].includes(asset.sub_class)
    );
  };

  const formatLastUpdated = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Quick Pricing Updates ({consolidatedAssets.length} unique assets, {allAssets.length} total holdings)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Update prices and YTW for assets that require regular pricing updates.
          <span className="text-xs opacity-75">Double-click values to edit, Enter to save, Escape to cancel.</span>
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted-foreground border-b z-10">
              <tr className="text-left">
                <th
                  className="p-2 font-medium text-muted cursor-pointer hover:text-foreground transition-colors select-none"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    Asset Name
                    <SortIcon column="name" />
                  </div>
                </th>
                <th className="p-2 font-medium text-muted">ISIN</th>
                <th
                  className="p-2 font-medium text-muted cursor-pointer hover:text-foreground transition-colors select-none"
                  onClick={() => handleSort("sub_class")}
                >
                  <div className="flex items-center gap-1">
                    Sub Class
                    <SortIcon column="sub_class" />
                  </div>
                </th>
                <th className="p-2 font-medium text-muted text-right">Price</th>
                <th className="p-2 font-medium text-muted text-right">YTW</th>
                <th
                  className="p-2 font-medium text-muted cursor-pointer hover:text-foreground transition-colors select-none"
                  onClick={() => handleSort("updated_at")}
                >
                  <div className="flex items-center gap-1">
                    Last Updated
                    <SortIcon column="updated_at" />
                  </div>
                </th>
                <th className="p-2 font-medium text-muted w-16">Edit</th>
              </tr>
            </thead>
            <tbody>
              {sortedAssets.map((asset, index) => {
                const isEditing = editingAsset?.id === asset.id;
                const showYTW = isGroupB(asset);
                const isEven = index % 2 === 0;

                return (
                  <tr
                    key={asset.id}
                    className={`hover:bg-financial-success/50 transition-colors ${isEven ? "bg-muted/20" : "bg-background"}`}
                  >
                    <td className="p-2 py-1.5 font-medium max-w-[200px] truncate">{asset.name}</td>
                    <td className="p-2 py-1.5 text-xs text-muted-foreground">{asset.ISIN || '-'}</td>
                    <td className="p-2 py-1.5 text-xs text-muted-foreground">{asset.sub_class}</td>
                    <td className="p-2 py-1.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isEditing ? (
                          <>
                            <Input
                              ref={priceInputRef}
                              type="text"
                              inputMode="decimal"
                              value={editingAsset.price}
                              onChange={(e) =>
                                setEditingAsset((prev) =>
                                  prev ? { ...prev, price: validateNumericInput(e.target.value) } : null,
                                )
                              }
                              onKeyDown={handleKeyDown}
                              className="w-20 h-7 text-xs text-right"
                            />
                            <span className="text-xs text-muted-foreground min-w-[28px]">{asset.origin_currency}</span>
                          </>
                        ) : (
                          <>
                            <span
                              className="font-medium cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded transition-colors"
                              onDoubleClick={() => handleDoubleClick(asset, "price")}
                              title="Double-click to edit"
                            >
                              {asset.price}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">{asset.origin_currency}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-2 py-1.5 text-right">
                      {showYTW ? (
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <Input
                                ref={ytwInputRef}
                                type="text"
                                inputMode="decimal"
                                value={editingAsset.ytw}
                                onChange={(e) =>
                                  setEditingAsset((prev) =>
                                    prev ? { ...prev, ytw: validateNumericInput(e.target.value) } : null,
                                  )
                                }
                                onKeyDown={handleKeyDown}
                                className="w-16 h-7 text-xs text-right"
                                placeholder="0.00"
                              />
                              <span className="text-xs text-muted-foreground">%</span>
                            </>
                          ) : (
                            <>
                              <span
                                className="font-medium cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded transition-colors"
                                onDoubleClick={() => handleDoubleClick(asset, "ytw")}
                                title="Double-click to edit"
                              >
                                {asset.ytw ? (asset.ytw * 100).toFixed(2) : "-"}
                              </span>
                              {asset.ytw && <span className="text-xs text-muted-foreground">%</span>}
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-2 py-1.5 text-xs text-muted-foreground">{formatLastUpdated(asset.updated_at)}</td>
                    <td className="p-2 py-1.5">
                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleSave}
                              className="h-6 w-6 p-0 text-financial-success hover:text-financial-success hover:bg-financial-success/10"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancel}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(asset)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {sortedAssets.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No assets found that require regular pricing updates.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
