import { useState, useEffect } from "react"

export interface PaginationConfig {
  pageSize: number
  currentPage: number
  totalItems: number
  totalPages: number
}

export interface PaginationFunctions {
  goToPage: (page: number) => void
  setPageSize: (size: number) => void
  nextPage: () => void
  prevPage: () => void
  goToFirstPage: () => void
  goToLastPage: () => void
}

export function usePagination<T>(items: T[], defaultPageSize: number = 10, key: string) {
  const getStoredValues = () => {
    try {
      const storedPageSize = localStorage.getItem(`${key}_pageSize`);
      const storedCurrentPage = localStorage.getItem(`${key}_currentPage`);

      return {
        pageSize: storedPageSize ? parseInt(storedPageSize) : defaultPageSize,
        currentPage: storedCurrentPage ? parseInt(storedCurrentPage) : 1
      };
    } catch {
      return {
        pageSize: defaultPageSize,
        currentPage: 1
      };
    }
  };

  const storedValues = getStoredValues();
  const [pageSize, setPageSize] = useState(storedValues.pageSize);
  const [currentPage, setCurrentPage] = useState(storedValues.currentPage);

  useEffect(() => {
    localStorage.setItem(`${key}_pageSize`, pageSize.toString());
  }, [pageSize, key]);

  useEffect(() => {
    localStorage.setItem(`${key}_currentPage`, currentPage.toString());
  }, [currentPage, key]);

  const setPersistedPageSize = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedItems = items.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const prevPage = () => goToPage(currentPage - 1);
  const nextPage = () => goToPage(currentPage + 1);

  const paginationConfig: PaginationConfig = {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
  };

  const paginationFunctions: PaginationFunctions = {
    goToPage,
    setPageSize: setPersistedPageSize,
    goToFirstPage,
    prevPage,
    nextPage,
    goToLastPage,
  };

  return [paginationConfig, paginationFunctions, paginatedItems] as const;
}
