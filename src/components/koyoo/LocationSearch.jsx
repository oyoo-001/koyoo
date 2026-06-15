import React, { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import debounce from "lodash/debounce";

export default function LocationSearch({ label, icon: Icon = MapPin, value, onSelect, placeholder }) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const inputRef = useRef(null);

  // Sync external value changes into internal query state
  useEffect(() => {
    if (value !== undefined && value !== null) {
      setQuery(value);
    }
  }, [value]);

  const searchPlaces = useCallback(
    debounce(async (q) => {
      if (!q || q.length < 3) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=ke&viewbox=36.6,-1.45,37.6,-0.3&bounded=1`
        );
        const data = await res.json();
        setResults(data.map((d) => ({
          name: d.display_name,
          lat: parseFloat(d.lat),
          lng: parseFloat(d.lon),
        })));
      } catch {
        setResults([]);
      }
      setIsSearching(false);
    }, 400),
    []
  );

  const updatePosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 99999,
      });
    }
  };

  const handleFocus = () => {
    updatePosition();
    if (query.length >= 3) searchPlaces(query);
  };

  const handleSelect = (r) => {
    setQuery(r.name.split(",")[0]);
    setResults([]);
    onSelect(r);
  };

  return (
    <div className="relative">
      {label ? <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label> : null}
      <div className="relative" ref={inputRef}>
        <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
        <Input
          className="pl-9 bg-secondary border-0 h-11 text-sm"
          placeholder={placeholder || "Search location..."}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            updatePosition();
            searchPlaces(e.target.value);
          }}
          onFocus={handleFocus}
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      {results.length > 0 &&
        createPortal(
          <div className="bg-card border border-border rounded-lg shadow-2xl max-h-48 overflow-y-auto" style={dropdownStyle}>
            {results.map((r, i) => (
              <button
                key={i}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-secondary transition-colors flex items-start gap-2"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(r);
                }}
              >
                <MapPin size={14} className="mt-0.5 text-muted-foreground shrink-0" />
                <span className="line-clamp-2">{r.name}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}