"use client"

import {
  type ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { useDebounce } from "@/src/lib/hooks/ui/use-debounce"
import { filterUsers } from "@/src/lib/utils/table-utils"
import type { User, UserFilters } from "@/src/types/admin"

interface UseUsersTableProps {
  users: User[]
  columns: any[]
}

export function useUsersTable({ users, columns }: UseUsersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [filters, setFilters] = useState<UserFilters>({ search: "" })

  const debouncedSearch = useDebounce(filters.search, 300)

  const filteredUsers = useMemo(() => {
    let result = users

    // Apply global search filter
    if (debouncedSearch.trim()) {
      result = filterUsers(result, debouncedSearch)
    }

    // Apply role filter
    if (filters.role) {
      result = result.filter(user => user.role === filters.role)
    }

    // Apply status filter
    if (filters.status) {
      const isVerified = filters.status === "verified"
      result = result.filter(user => user.emailVerified === isVerified)
    }

    // Apply date range filter
    if (filters.dateRange?.from && filters.dateRange?.to) {
      const fromDate = new Date(filters.dateRange.from)
      const toDate = new Date(filters.dateRange.to)
      toDate.setHours(23, 59, 59, 999) // End of day

      result = result.filter(user => {
        const userDate = new Date(user.createdAt)
        return userDate >= fromDate && userDate <= toDate
      })
    }

    return result
  }, [users, debouncedSearch, filters.role, filters.status, filters.dateRange])

  const table = useReactTable({
    data: filteredUsers,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  })

  const selectedUsers = useMemo(() => {
    const selectedRowIds = Object.keys(rowSelection).filter(id => rowSelection[id])
    return selectedRowIds.map(id => filteredUsers[parseInt(id, 10)]).filter(Boolean)
  }, [rowSelection, filteredUsers])

  const stats = useMemo(() => {
    const total = users.length
    const verified = users.filter(u => u.emailVerified).length
    const pending = total - verified
    const devs = users.filter(u => u.role === "dev").length
    const regularUsers = total - devs

    return {
      total,
      verified,
      pending,
      devs,
      regularUsers,
      filtered: filteredUsers.length,
      selected: selectedUsers.length,
    }
  }, [users, filteredUsers, selectedUsers])

  const resetSelection = () => setRowSelection({})

  const selectAll = () => {
    const allRowIds = filteredUsers.reduce(
      (acc, _, index) => {
        acc[index] = true
        return acc
      },
      {} as Record<string, boolean>
    )
    setRowSelection(allRowIds)
  }

  return {
    table,
    filters,
    setFilters,
    selectedUsers,
    stats,
    resetSelection,
    selectAll,
    isLoading: false,
  }
}
