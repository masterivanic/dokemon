import { useState } from "react";

interface UseFilterAndSortOptions<T> {
  initialSortKey?: keyof T;
  initialSortDirection?: "asc" | "desc";
  filterKeys?: (keyof T)[];
}

export function useFilterAndSort<T extends Record<string, any>>(
  initialItems: T[] = [],
  options: UseFilterAndSortOptions<T> = {}
) {
  const items = Array.isArray(initialItems) ? initialItems : [];
  const {
    initialSortKey,
    initialSortDirection = "asc",
    filterKeys = [],
  } = options;

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T | "";
    direction: "asc" | "desc";
  }>({
    key: initialSortKey || "",
    direction: initialSortDirection
  });

  const filteredItems = items.filter((item: T) => {
    if (!searchTerm) return true;
    return filterKeys.some((key) => {
      const value = item[key];
      return value &&
        typeof value === 'string' &&
        value.toLowerCase().includes(searchTerm.toLowerCase());
    });
  });

  const sortedItems = [...filteredItems].sort((a: T, b: T) => {
    if (!sortConfig.key) return 0;

    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue === undefined || bValue === undefined) return 0;

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      if (aValue.toLowerCase() < bValue.toLowerCase()) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue.toLowerCase() > bValue.toLowerCase()) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
    } else {
      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
    }
    return 0;
  });

  const requestSort = (key: keyof T) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  return {
    searchTerm,
    setSearchTerm,
    sortedItems,
    requestSort,
    sortConfig,
  };
}
