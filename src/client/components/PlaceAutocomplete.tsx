import { useState, useRef, useCallback, useEffect } from "react";
import { useGeolocation } from "../hooks/useGeolocation";

function generateSessionToken(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface PlaceSuggestion {
  readonly place_id: string;
  readonly name: string;
  readonly secondary_text: string | null;
}

export interface PlaceSelection {
  readonly name: string;
  readonly address: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly google_place_id: string;
  readonly cuisine: string | null;
  readonly google_maps_uri: string | null;
}

interface PlaceAutocompleteProps {
  readonly token: string;
  readonly onSelect: (place: PlaceSelection) => void;
  readonly onManualInput: (name: string) => void;
  readonly initialValue?: string;
}

export function PlaceAutocomplete({ token, onSelect, onManualInput, initialValue = "" }: PlaceAutocompleteProps) {
  const [input, setInput] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<readonly PlaceSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTokenRef = useRef(generateSessionToken());
  const abortRef = useRef<AbortController | null>(null);

  const { position } = useGeolocation();

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    // Cancel previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const res = await fetch("/api/places/autocomplete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          input: query,
          latitude: position?.latitude,
          longitude: position?.longitude,
          sessionToken: sessionTokenRef.current,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      const json = (await res.json()) as { data: PlaceSuggestion[] };
      setSuggestions(json.data);
      setIsOpen(json.data.length > 0);
      setActiveIndex(-1);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  }, [token, position]);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    setSelected(false);
    onManualInput(value);

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  }, [fetchSuggestions, onManualInput]);

  const selectPlace = useCallback(async (suggestion: PlaceSuggestion) => {
    setInput(suggestion.name);
    setSuggestions([]);
    setIsOpen(false);
    setSelected(true);

    try {
      const res = await fetch(
        `/api/places/${suggestion.place_id}?sessionToken=${sessionTokenRef.current}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Generate new session token for next search
      sessionTokenRef.current = generateSessionToken();

      if (!res.ok) {
        // Fallback: use what we have from autocomplete
        onSelect({
          name: suggestion.name,
          address: suggestion.secondary_text,
          latitude: null,
          longitude: null,
          google_place_id: suggestion.place_id,
          cuisine: null,
          google_maps_uri: null,
        });
        return;
      }

      const json = (await res.json()) as { data: PlaceSelection };
      onSelect(json.data);
    } catch {
      onSelect({
        name: suggestion.name,
        address: suggestion.secondary_text,
        latitude: null,
        longitude: null,
        google_place_id: suggestion.place_id,
        cuisine: null,
        google_maps_uri: null,
      });
    }
  }, [token, onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          selectPlace(suggestions[activeIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  }, [isOpen, activeIndex, suggestions, selectPlace]);

  // Scroll active option into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[activeIndex] as HTMLElement;
      activeEl?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const listboxId = "place-autocomplete-list";

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Delay to allow click on suggestion
          setTimeout(() => setIsOpen(false), 200);
        }}
        onFocus={() => {
          if (suggestions.length > 0 && !selected) setIsOpen(true);
        }}
        placeholder="Search for a restaurant..."
        autoFocus
        role="combobox"
        aria-expanded={isOpen}
        aria-owns={listboxId}
        aria-activedescendant={activeIndex >= 0 ? `place-option-${activeIndex}` : undefined}
        aria-autocomplete="list"
        aria-label="Restaurant name"
        className="w-full px-4 py-3.5 bg-stone-800 border border-stone-700 rounded-xl text-stone-50 placeholder:text-stone-500 focus:outline-none focus:border-coral-500 focus:ring-1 focus:ring-coral-500/50 transition-colors"
      />

      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-coral-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {isOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.place_id}
              id={`place-option-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={() => selectPlace(s)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`px-4 py-3 cursor-pointer transition-colors ${
                i === activeIndex
                  ? "bg-coral-500/20 text-stone-50"
                  : "text-stone-300 hover:bg-stone-700/50"
              }`}
            >
              <div className="font-medium text-sm">{s.name}</div>
              {s.secondary_text && (
                <div className="text-xs text-stone-500 mt-0.5">{s.secondary_text}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
