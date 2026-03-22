import { cuisineLabel } from "../utils/cuisines";

interface SearchFilterBarProps {
  readonly search: string;
  readonly onSearchChange: (value: string) => void;
  readonly placeholder?: string;
  readonly searchAriaLabel?: string;
  readonly cuisines: readonly string[];
  readonly cuisineFilter: string | null;
  readonly onCuisineChange: (cuisine: string | null) => void;
  readonly allActive: boolean;
  readonly onAllClick: () => void;
  readonly hasFilters: boolean;
  readonly onClearFilters: () => void;
  readonly extraChips?: React.ReactNode;
}

export function SearchFilterBar({
  search,
  onSearchChange,
  placeholder = "Search restaurants...",
  searchAriaLabel = "Search restaurants",
  cuisines,
  cuisineFilter,
  onCuisineChange,
  allActive,
  onAllClick,
  hasFilters,
  onClearFilters,
  extraChips,
}: SearchFilterBarProps) {
  return (
    <>
      <div className="pb-2">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            aria-label={searchAriaLabel}
            className="w-full pl-9 pr-4 py-2.5 bg-stone-800/50 border border-stone-800 rounded-xl text-stone-50 text-sm placeholder:text-stone-500 focus:outline-none focus:border-coral-500/50 transition-colors"
          />
          {hasFilters && (
            <button
              onClick={onClearFilters}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 text-xs"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {(cuisines.length > 0 || extraChips) && (
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-none">
          <button
            onClick={onAllClick}
            className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              allActive
                ? "bg-coral-500/20 text-coral-500 border border-coral-500/30"
                : "bg-stone-800 text-stone-400 border border-stone-700"
            }`}
          >
            All
          </button>
          {extraChips}
          {cuisines.map((c) => (
            <button
              key={c}
              onClick={() => onCuisineChange(cuisineFilter === c ? null : c)}
              className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                cuisineFilter === c
                  ? "bg-coral-500/20 text-coral-500 border border-coral-500/30"
                  : "bg-stone-800 text-stone-400 border border-stone-700"
              }`}
            >
              {cuisineLabel(c)}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
