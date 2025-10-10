import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Asset } from "@/types/portfolio";
import { useAssetLookup } from "@/hooks/useAssetLookup";

interface AssetSearchProps {
  assets: Asset[];
  onSearchChange: (searchTerm: string) => void;
  currentSearchTerm: string;
}

export function AssetSearch({ assets, onSearchChange, currentSearchTerm }: AssetSearchProps) {
  const [inputValue, setInputValue] = useState(currentSearchTerm);
  const [isOpen, setIsOpen] = useState(false);
  const { findSimilarAssetNames } = useAssetLookup(assets);

  const suggestions = useMemo(() => {
    if (!inputValue.trim()) return [];
    return findSimilarAssetNames(inputValue).slice(0, 10);
  }, [inputValue, findSimilarAssetNames]);

  const handleSearch = () => {
    onSearchChange(inputValue);
    setIsOpen(false);
  };

  const handleClear = () => {
    setInputValue("");
    onSearchChange("");
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSuggestionClick = (name: string) => {
    setInputValue(name);
    onSearchChange(name);
    setIsOpen(false);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setIsOpen(true);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsOpen(true)}
              onBlur={() => setTimeout(() => setIsOpen(false), 200)}
              placeholder="Search assets by name..."
              className="pl-9 pr-9"
            />
            {inputValue && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {isOpen && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover p-2 shadow-md">
              <div className="space-y-1">
                {suggestions.map((name) => (
                  <button
                    key={name}
                    onClick={() => handleSuggestionClick(name)}
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <Button onClick={handleSearch}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>
      {currentSearchTerm && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Active search:</span>
          <Badge variant="secondary" className="gap-1">
            {currentSearchTerm}
            <button onClick={handleClear} className="ml-1 hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      )}
    </Card>
  );
}
