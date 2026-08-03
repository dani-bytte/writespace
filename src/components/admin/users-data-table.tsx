"use client"

import { type ColumnDef, flexRender } from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, Users } from "lucide-react"
import { useMemo } from "react"
import { AdvancedFilters } from "@/src/components/ui/advanced-filters"
import { Badge } from "@/src/components/ui/badge"
import { BulkActionsToolbar } from "@/src/components/ui/bulk-actions-toolbar"
import { Button } from "@/src/components/ui/button"
import { Checkbox } from "@/src/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table"
import { TableSkeleton } from "@/src/components/ui/table-skeleton"
import { UserActionsMenu } from "@/src/components/ui/user-actions-menu"
import { useUsersTable } from "@/src/lib/hooks/admin/use-users-table"
import {
  formatDate,
  getColumnDisplayName,
  getRoleColor,
  getRoleLabel,
  getStatusColor,
  getStatusLabel,
} from "@/src/lib/utils/table-utils"
import type { User } from "@/src/types/admin"

const createUserColumns = ({
  onView,
  onEdit,
  onDelete,
  onResendVerification,
  onChangeRole,
}: {
  onView?: (user: User) => void
  onEdit?: (user: User) => void
  onDelete?: (user: User) => void
  onResendVerification?: (user: User) => void
  onChangeRole?: (user: User, newRole: "dev" | "user") => void
}): ColumnDef<User>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Selecionar todos"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={value => row.toggleSelected(!!value)}
        aria-label="Selecionar linha"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Nome
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const user = row.original
      return (
        <div>
          <div className="font-medium">{user.name}</div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
        </div>
      )
    },
  },
  {
    accessorKey: "role",
    header: "Função",
    cell: ({ row }) => {
      const role = row.getValue("role") as User["role"]
      return <Badge className={getRoleColor(role)}>{getRoleLabel(role)}</Badge>
    },
  },
  {
    accessorKey: "emailVerified",
    header: "Status Email",
    cell: ({ row }) => {
      const verified = row.getValue("emailVerified") as boolean
      return <Badge variant={getStatusColor(verified)}>{getStatusLabel(verified)}</Badge>
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Data de Registro
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const dateString = row.getValue("createdAt") as string
      return <div className="text-sm">{formatDate(dateString)}</div>
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const user = row.original
      return (
        <UserActionsMenu
          user={user}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onResendVerification={onResendVerification}
          onChangeRole={onChangeRole}
        />
      )
    },
  },
]

interface UsersDataTableProps {
  data: User[]
  isLoading?: boolean
  onView?: (user: User) => void
  onEdit?: (user: User) => void
  onDelete?: (user: User) => void
  onResendVerification?: (user: User) => void
  onChangeRole?: (user: User, newRole: "dev" | "user") => void
  onBulkDelete?: (users: User[]) => void
  onBulkChangeRole?: (users: User[], newRole: "dev" | "user") => void
  onBulkResendVerification?: (users: User[]) => void
}

export function UsersDataTable({
  data,
  isLoading = false,
  onView,
  onEdit,
  onDelete,
  onResendVerification,
  onChangeRole,
  onBulkDelete,
  onBulkChangeRole,
  onBulkResendVerification,
}: UsersDataTableProps) {
  const columns = useMemo(
    () =>
      createUserColumns({
        onView,
        onEdit,
        onDelete,
        onResendVerification,
        onChangeRole,
      }),
    [onView, onEdit, onDelete, onResendVerification, onChangeRole]
  )

  const { table, filters, setFilters, selectedUsers, stats, resetSelection } = useUsersTable({
    users: data,
    columns,
  })
  const verifiedUsers = data.filter(user => user.emailVerified).length
  const unverifiedUsers = Math.max(0, data.length - verifiedUsers)

  if (isLoading) {
    return <TableSkeleton rows={5} columns={6} />
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="rounded-xl border bg-background/70 p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border bg-muted/40 p-2">
                <Users aria-hidden="true" className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Operacoes de usuarios</p>
                <p className="text-xs text-muted-foreground">
                  Filtros, selecao em massa e colunas personalizaveis.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs sm:w-auto sm:text-sm">
              <div className="rounded-lg border bg-background px-3 py-2">
                <p className="text-muted-foreground">Total</p>
                <p className="font-semibold text-foreground">{stats.total}</p>
              </div>
              <div className="rounded-lg border bg-background px-3 py-2">
                <p className="text-muted-foreground">Verificados</p>
                <p className="font-semibold text-foreground">{verifiedUsers}</p>
              </div>
              <div className="rounded-lg border bg-background px-3 py-2">
                <p className="text-muted-foreground">Pendentes</p>
                <p className="font-semibold text-foreground">{unverifiedUsers}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {stats.filtered !== stats.total && (
                <span>
                  {stats.filtered} de {stats.total} usuarios mostrados
                </span>
              )}
              {stats.filtered === stats.total && (
                <span>
                  {stats.total} usuario{stats.total !== 1 ? "s" : ""} total
                </span>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-background/80">
                  Colunas <ChevronDown className="ml-2 size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter(column => column.getCanHide())
                  .map(column => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={value => column.toggleVisibility(!!value)}
                    >
                      {getColumnDisplayName(column.id)}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <AdvancedFilters filters={filters} onFiltersChange={setFilters} />

          <BulkActionsToolbar
            selectedUsers={selectedUsers}
            onClearSelection={resetSelection}
            onDeleteUsers={onBulkDelete}
            onChangeRole={onBulkChangeRole}
            onResendVerification={onBulkResendVerification}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-background/90">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className="h-12 text-xs uppercase tracking-wide text-muted-foreground"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3">
                    <div className="rounded-full border bg-muted/40 p-3">
                      <Users aria-hidden="true" className="size-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {filters.search || filters.role || filters.status || filters.dateRange
                        ? "Nenhum usuario encontrado com os filtros aplicados."
                        : "Nenhum usuario cadastrado ainda."}
                    </p>
                    {(filters.search || filters.role || filters.status || filters.dateRange) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilters({ search: "" })}
                      >
                        Limpar filtros
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {selectedUsers.length > 0 ? (
            <span>
              {selectedUsers.length} de {table.getFilteredRowModel().rows.length} usuario(s)
              selecionado(s)
            </span>
          ) : (
            <span>{table.getFilteredRowModel().rows.length} usuario(s) encontrado(s)</span>
          )}
        </div>
        <div className="flex items-center gap-6 lg:gap-8">
          <div className="flex items-center gap-2">
            <label htmlFor="users-page-size" className="text-sm font-medium">
              Linhas por página
            </label>
            <select
              id="users-page-size"
              value={table.getState().pagination.pageSize}
              onChange={e => table.setPageSize(Number(e.target.value))}
              className="h-8 w-17.5 border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {[10, 20, 30, 50, 100].map(pageSize => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </div>
          <div className="flex w-25 items-center justify-center text-sm font-medium">
            Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="hidden size-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Ir para primeira página</span>
              {"<<"}
            </Button>
            <Button
              variant="outline"
              className="size-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Página anterior</span>
              {"<"}
            </Button>
            <Button
              variant="outline"
              className="size-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Próxima página</span>
              {">"}
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Ir para última página</span>
              {">>"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
