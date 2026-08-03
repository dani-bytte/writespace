"use client"

import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table"
import {
  ArrowUpDown,
  ChevronDown,
  Copy,
  Eye,
  Mail,
  MoreHorizontal,
  Send,
  XCircle,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Checkbox } from "@/src/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu"
import { Input } from "@/src/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table"
import type { UserInvite } from "@/src/lib/hooks/admin/use-admin-query"
import { copyToClipboard } from "@/src/lib/utils/table-utils"

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-muted text-warning"
    case "accepted":
      return "bg-muted text-success"
    case "expired":
      return "bg-muted text-destructive"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export const inviteColumns: ColumnDef<UserInvite>[] = [
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
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Email do Destinatário
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="font-medium">{row.getValue("email")}</div>,
  },
  {
    accessorKey: "documentTitle",
    header: "Documento",
    cell: ({ row }) => (
      <div className="max-w-xs truncate" title={row.getValue("documentTitle")}>
        {row.getValue("documentTitle")}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <Badge className={getStatusColor(status)}>
          {status === "pending" ? "Pendente" : status === "accepted" ? "Aceito" : "Expirado"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Data de Envio
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"))
      return <div className="text-sm">{date.toLocaleDateString("pt-BR")}</div>
    },
  },
  {
    accessorKey: "expiresAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Expiração
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("expiresAt"))
      const now = new Date()
      const isExpired = date < now
      return (
        <div className={`text-sm ${isExpired ? "text-destructive" : "text-muted-foreground"}`}>
          {date.toLocaleDateString("pt-BR")}
        </div>
      )
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const invite = row.original

      const handleCopyInviteId = async () => {
        try {
          await copyToClipboard(invite.id)
          toast.success("ID do convite copiado")
        } catch {
          toast.error("Nao foi possivel copiar o ID do convite")
        }
      }

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="size-8 p-0 hover:bg-muted" aria-haspopup="menu">
              <span className="sr-only">Abrir menu</span>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Ações</span>
              <span className="truncate text-sm font-medium text-foreground" title={invite.email}>
                {invite.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={handleCopyInviteId}>
              <Copy className="mr-2 size-4" />
              Copiar ID do convite
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => toast.info(`Abrindo documento: ${invite.documentTitle}`)}
            >
              <Eye className="mr-2 size-4" />
              Ver documento
            </DropdownMenuItem>
            {invite.status === "pending" && (
              <>
                <DropdownMenuItem
                  onClick={() => toast.info(`Reenviar convite para ${invite.email}`)}
                >
                  <Send className="mr-2 size-4" />
                  Reenviar convite
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    const confirmed = window.confirm(
                      `Tem certeza que deseja cancelar o convite para ${invite.email}?`
                    )
                    if (!confirmed) return
                    toast.warning(`Cancelar convite para ${invite.email}`)
                  }}
                >
                  <XCircle className="mr-2 size-4" />
                  Cancelar convite
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

interface InvitesDataTableProps {
  data: UserInvite[]
}

export function InvitesDataTable({ data }: InvitesDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const pendingCount = data.filter(invite => invite.status === "pending").length
  const acceptedCount = data.filter(invite => invite.status === "accepted").length
  const expiredCount = data.filter(invite => invite.status === "expired").length

  const table = useReactTable({
    data,
    columns: inviteColumns,
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
  })

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="rounded-xl border bg-background/70 p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border bg-muted/40 p-2">
                <Mail aria-hidden="true" className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Historico de convites</p>
                <p className="text-xs text-muted-foreground">
                  Acompanhe status de entrega e resposta dos convites enviados.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs sm:w-auto sm:text-sm">
              <div className="rounded-lg border bg-background px-3 py-2">
                <p className="text-muted-foreground">Pendentes</p>
                <p className="font-semibold text-foreground">{pendingCount}</p>
              </div>
              <div className="rounded-lg border bg-background px-3 py-2">
                <p className="text-muted-foreground">Aceitos</p>
                <p className="font-semibold text-foreground">{acceptedCount}</p>
              </div>
              <div className="rounded-lg border bg-background px-3 py-2">
                <p className="text-muted-foreground">Expirados</p>
                <p className="font-semibold text-foreground">{expiredCount}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Filtrar por email..."
                value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
                onChange={event => table.getColumn("email")?.setFilterValue(event.target.value)}
                className="max-w-sm bg-background/80"
                aria-label="Filtrar convites por email"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {table.getFilteredRowModel().rows.length} convite(s) encontrado(s)
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                table.getColumn("email")?.setFilterValue("")
              }}
              className="bg-background/80"
              disabled={!table.getColumn("email")?.getFilterValue()}
            >
              Limpar busca
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end">
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
              .map(column => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={value => column.toggleVisibility(!!value)}
                  >
                    {column.id === "email"
                      ? "Email"
                      : column.id === "documentTitle"
                        ? "Documento"
                        : column.id === "status"
                          ? "Status"
                          : column.id === "createdAt"
                            ? "Data de Envio"
                            : column.id === "expiresAt"
                              ? "Expiracao"
                              : column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-hidden rounded-xl border bg-background/90">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map(header => {
                  return (
                    <TableHead
                      key={header.id}
                      className="h-12 text-xs uppercase tracking-wide text-muted-foreground"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
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
                <TableCell colSpan={inviteColumns.length} className="h-32 text-center">
                  <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3">
                    <div className="rounded-full border bg-muted/40 p-3">
                      <Mail aria-hidden="true" className="size-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Nenhum convite encontrado.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} de{" "}
          {table.getFilteredRowModel().rows.length} linha(s) selecionada(s).
        </div>
        <div className="flex items-center gap-6 lg:gap-8">
          <div className="flex items-center gap-2">
            <label htmlFor="invites-page-size" className="text-sm font-medium">
              Linhas por página
            </label>
            <select
              id="invites-page-size"
              value={table.getState().pagination.pageSize}
              onChange={e => {
                table.setPageSize(Number(e.target.value))
              }}
              className="h-8 w-17.5 border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {[10, 20, 30, 40, 50].map(pageSize => (
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
