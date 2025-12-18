import { useState, useEffect, useRef } from "react";
import { Search, FolderKanban, CheckSquare, Users, Package, FileText, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface GlobalSearchProps {
  onNavigate: (section: string, itemId?: string) => void;
}

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: "project" | "task" | "employee" | "inventory" | "contract";
}

export const GlobalSearch = ({ onNavigate }: GlobalSearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const typeConfig = {
    project: { icon: FolderKanban, label: "Dự án", color: "text-blue-500" },
    task: { icon: CheckSquare, label: "Nhiệm vụ", color: "text-green-500" },
    employee: { icon: Users, label: "Nhân sự", color: "text-purple-500" },
    inventory: { icon: Package, label: "Kho", color: "text-orange-500" },
    contract: { icon: FileText, label: "Hợp đồng", color: "text-cyan-500" },
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const searchDebounce = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        performSearch(searchTerm.trim());
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(searchDebounce);
  }, [searchTerm]);

  const performSearch = async (term: string) => {
    setLoading(true);
    setShowResults(true);

    try {
      const searchResults: SearchResult[] = [];

      // Search projects
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name, location")
        .or(`name.ilike.%${term}%,location.ilike.%${term}%,description.ilike.%${term}%`)
        .limit(5);

      if (projects) {
        projects.forEach((p) => {
          searchResults.push({
            id: p.id,
            title: p.name,
            subtitle: p.location || undefined,
            type: "project",
          });
        });
      }

      // Search tasks
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, description")
        .or(`title.ilike.%${term}%,description.ilike.%${term}%`)
        .limit(5);

      if (tasks) {
        tasks.forEach((t) => {
          searchResults.push({
            id: t.id,
            title: t.title,
            subtitle: t.description || undefined,
            type: "task",
          });
        });
      }

      // Search employees
      const { data: employees } = await supabase
        .from("employees")
        .select("id, full_name, position, department")
        .or(`full_name.ilike.%${term}%,position.ilike.%${term}%,department.ilike.%${term}%`)
        .limit(5);

      if (employees) {
        employees.forEach((e) => {
          searchResults.push({
            id: e.id,
            title: e.full_name,
            subtitle: [e.position, e.department].filter(Boolean).join(" - ") || undefined,
            type: "employee",
          });
        });
      }

      // Search inventory items
      const { data: inventory } = await supabase
        .from("inventory_items")
        .select("id, product_name, product_code")
        .or(`product_name.ilike.%${term}%,product_code.ilike.%${term}%`)
        .limit(5);

      if (inventory) {
        inventory.forEach((i) => {
          searchResults.push({
            id: i.id,
            title: i.product_name,
            subtitle: i.product_code,
            type: "inventory",
          });
        });
      }

      // Search contracts
      const { data: contracts } = await supabase
        .from("contracts")
        .select("id, contract_number, client_name")
        .or(`contract_number.ilike.%${term}%,client_name.ilike.%${term}%`)
        .limit(5);

      if (contracts) {
        contracts.forEach((c) => {
          searchResults.push({
            id: c.id,
            title: c.contract_number,
            subtitle: c.client_name,
            type: "contract",
          });
        });
      }

      setResults(searchResults);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    const sectionMap: Record<string, string> = {
      project: "projects",
      task: "tasks",
      employee: "hr",
      inventory: "inventory",
      contract: "accounting",
    };
    
    onNavigate(sectionMap[result.type], result.id);
    setShowResults(false);
    setSearchTerm("");
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Tìm kiếm dự án, nhiệm vụ, nhân sự, kho..."
        className="pl-10 w-full"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => {
          if (results.length > 0) setShowResults(true);
        }}
      />

      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Đang tìm kiếm...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Không tìm thấy kết quả cho "{searchTerm}"
            </div>
          ) : (
            <div className="py-2">
              {results.map((result) => {
                const config = typeConfig[result.type];
                const Icon = config.icon;

                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className={cn("p-2 rounded-lg bg-muted", config.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {result.title}
                      </p>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {config.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
