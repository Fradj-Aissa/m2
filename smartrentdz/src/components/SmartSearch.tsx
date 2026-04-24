import { KeyboardEvent, useState } from "react";
import { LoaderCircle, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseSmartSearchQuery, SmartSearchFilters } from "@/services/aiSearchService";

interface SmartSearchProps {
  onApplyFilters: (filters: SmartSearchFilters, query: string) => void;
}

const SmartSearch = ({ onApplyFilters }: SmartSearchProps) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim() || isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const filters = await parseSmartSearchQuery(query);
      onApplyFilters(filters, query.trim());
    } catch (error) {
      console.error("[SMART SEARCH] Failed to convert natural language query:", {
        query,
        error,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleSearch();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-r from-primary/5 via-background to-sky-500/5 p-4 shadow-sm">
      <div className="absolute inset-y-0 left-0 w-24 bg-primary/5 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-3 text-primary">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">البحث الذكي</p>
            <p className="text-xs text-muted-foreground">
              اكتب طلبك بلغتك وسنحوّله إلى فلاتر بحث مباشرة
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 md:flex-row">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="مثال: أريد شقة في الجلفة أكثر من 3 غرف بسعر أقل من 4 ملاين"
            className="h-12 rounded-2xl border-primary/20 bg-background/90 text-right shadow-sm"
            dir="rtl"
          />
          <Button
            type="button"
            onClick={() => void handleSearch()}
            disabled={isLoading || !query.trim()}
            className="h-12 rounded-2xl px-5"
          >
            {isLoading ? (
              <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="ml-2 h-4 w-4" />
            )}
            {isLoading ? "جاري التحليل..." : "حلل وابحث"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SmartSearch;
