import { User } from "lucide-react";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { GlobalSearch } from "./GlobalSearch";

interface DashboardHeaderProps {
  onNavigate: (section: string, itemId?: string) => void;
}

export const DashboardHeader = ({ onNavigate }: DashboardHeaderProps) => {
  return (
    <header className="bg-card border-b border-border px-3 sm:px-6 py-3 sm:py-4 lg:mt-0 mt-14">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <GlobalSearch onNavigate={onNavigate} />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationsDropdown />
          
          <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-border">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">Người quản trị</p>
              <p className="text-xs text-muted-foreground">Quản trị viên</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <User className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
          
          {/* Mobile avatar only */}
          <div className="sm:hidden w-9 h-9 rounded-full bg-primary flex items-center justify-center">
            <User className="w-4 h-4 text-primary-foreground" />
          </div>
        </div>
      </div>
    </header>
  );
};