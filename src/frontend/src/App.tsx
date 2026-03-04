import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { saveAs } from "file-saver";
import {
  CalendarDays,
  ChevronRight,
  Download,
  Droplets,
  Fuel,
  History,
  Loader2,
  Minus,
  Package,
  Plus,
  Printer,
  Save,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { DailyReport } from "./backend.d";
import {
  useGetReport,
  useListReportDates,
  useSaveReport,
} from "./hooks/useQueries";

// ─── Types ────────────────────────────────────────────────
interface NozzleState {
  open: string;
  close: string;
}

interface EngineOilRowState {
  id: string;
  name: string;
  quantity: string;
  price: string;
}

interface ExpenseRowState {
  id: string;
  label: string;
  amount: string;
}

interface ExpensesTabState {
  tabName: string;
  rows: ExpenseRowState[];
}

// ─── Utilities ────────────────────────────────────────────
function toNum(val: string): number {
  const n = Number.parseFloat(val);
  return Number.isNaN(n) ? 0 : n;
}

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function formatINR(value: number): string {
  return value.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

// ─── Empty state factory ──────────────────────────────────
function emptyNozzles(): NozzleState[] {
  return [
    { open: "", close: "" },
    { open: "", close: "" },
    { open: "", close: "" },
    { open: "", close: "" },
  ];
}

function emptyExpenseTabs(): ExpensesTabState[] {
  return [
    { tabName: "Cash Received", rows: [] },
    { tabName: "QR Payments", rows: [] },
    { tabName: "Card Payments", rows: [] },
  ];
}

// ─── Sub-components ───────────────────────────────────────

interface NozzleSectionProps {
  fuelType: "hsd" | "ms";
  nozzles: NozzleState[];
  testing: string;
  price: string;
  onPriceChange: (val: string) => void;
  onNozzleChange: (idx: number, field: "open" | "close", val: string) => void;
  onTestingChange: (val: string) => void;
}

function NozzleSection({
  fuelType,
  nozzles,
  testing,
  price,
  onPriceChange,
  onNozzleChange,
  onTestingChange,
}: NozzleSectionProps) {
  const isHSD = fuelType === "hsd";
  const label = isHSD ? "HSD" : "MS";
  const sublabel = isHSD ? "High Speed Diesel" : "Motor Spirit / Petrol";

  const volumes = nozzles.map((n) => toNum(n.close) - toNum(n.open));
  const totalVolume = volumes.reduce((s, v) => s + v, 0);
  const testingLitres = toNum(testing);
  const totalSale = totalVolume - testingLitres;
  const grossSale = totalSale * toNum(price);

  const cardClass = isHSD ? "dsr-card-hsd" : "dsr-card-ms";
  const headerClass = isHSD ? "dsr-header-hsd" : "dsr-header-ms";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`rounded-xl overflow-hidden border-2 shadow-sm ${cardClass}`}
    >
      {/* Header */}
      <div className={`px-5 py-3.5 flex items-center gap-3 ${headerClass}`}>
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/20">
          <Fuel className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="text-white font-bold text-base tracking-wide">
            {label}
          </div>
          <div className="text-white/70 text-xs">{sublabel}</div>
        </div>
        <div className="dsr-dots">
          {Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: decorative dots
            <span key={i} />
          ))}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Price per litre */}
        <div className="flex items-center gap-4">
          <Label className="text-xs font-bold uppercase tracking-wider text-foreground/60 shrink-0 w-36">
            Price per Litre (₹)
          </Label>
          <div className="relative flex-1 max-w-[180px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono text-foreground/50">
              ₹
            </span>
            <Input
              data-ocid={`${fuelType}.price.input`}
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => onPriceChange(e.target.value)}
              className="pl-7 font-mono dsr-fuel-input"
              placeholder="0.00"
            />
          </div>
        </div>

        <Separator className="opacity-30" />

        {/* Nozzle table header */}
        <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-3 items-center">
          <div className="w-20 text-xs font-bold uppercase tracking-wider text-foreground/50">
            Nozzle
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-foreground/50">
            Opening
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-foreground/50">
            Closing
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-foreground/50">
            Volume (L)
          </div>
        </div>

        {/* Nozzle rows */}
        {nozzles.map((nozzle, idx) => {
          const vol = toNum(nozzle.close) - toNum(nozzle.open);
          return (
            <div
              key={`nozzle-${idx + 1}`}
              className="grid grid-cols-[auto_1fr_1fr_1fr] gap-3 items-center"
            >
              <div className="w-20 flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/30 text-white text-xs font-bold shrink-0">
                  {idx + 1}
                </span>
                <span className="text-xs font-semibold text-foreground/60 hidden sm:inline">
                  N{idx + 1}
                </span>
              </div>
              <Input
                data-ocid={`${fuelType}.nozzle.${idx + 1}.open.input`}
                type="number"
                step="0.01"
                min="0"
                value={nozzle.open}
                onChange={(e) => onNozzleChange(idx, "open", e.target.value)}
                className="font-mono dsr-fuel-input"
                placeholder="0.00"
              />
              <Input
                data-ocid={`${fuelType}.nozzle.${idx + 1}.close.input`}
                type="number"
                step="0.01"
                min="0"
                value={nozzle.close}
                onChange={(e) => onNozzleChange(idx, "close", e.target.value)}
                className="font-mono dsr-fuel-input"
                placeholder="0.00"
              />
              <div
                className={`dsr-calc-field rounded-md px-3 py-2 font-mono text-sm font-semibold border ${vol < 0 ? "text-destructive" : ""}`}
              >
                {vol.toFixed(2)}
              </div>
            </div>
          );
        })}

        <Separator className="opacity-30" />

        {/* Testing row */}
        <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-3 items-center">
          <div className="w-20 text-xs font-bold uppercase tracking-wider text-foreground/60">
            Testing
          </div>
          <Input
            data-ocid={`${fuelType}.testing.input`}
            type="number"
            step="0.01"
            min="0"
            value={testing}
            onChange={(e) => onTestingChange(e.target.value)}
            className="font-mono dsr-fuel-input col-span-2"
            placeholder="0.00"
          />
          <div className="dsr-calc-field rounded-md px-3 py-2 font-mono text-sm font-semibold border text-foreground/50">
            -{testingLitres.toFixed(2)}
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-3 gap-3 pt-1">
          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
              Total Volume (L)
            </Label>
            <div className="dsr-calc-field rounded-md px-3 py-2 font-mono text-sm font-bold border">
              {totalVolume.toFixed(2)}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
              Total Sale (L)
            </Label>
            <div
              className={`dsr-calc-field rounded-md px-3 py-2 font-mono text-sm font-bold border ${totalSale < 0 ? "text-destructive" : ""}`}
            >
              {totalSale.toFixed(2)}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
              Gross Sale
            </Label>
            <div className="dsr-calc-field rounded-md px-3 py-2 font-mono text-sm font-bold border">
              {formatINR(grossSale)}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Engine Oil Section ───────────────────────────────────
interface EngineOilSectionProps {
  rows: EngineOilRowState[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, field: keyof EngineOilRowState, val: string) => void;
}

function EngineOilSection({
  rows,
  onAdd,
  onRemove,
  onChange,
}: EngineOilSectionProps) {
  const total = rows.reduce(
    (s, r) => s + toNum(r.quantity) * toNum(r.price),
    0,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
      className="rounded-xl overflow-hidden border-2 dsr-card-oil shadow-sm"
    >
      <div className="px-5 py-3.5 flex items-center gap-3 dsr-header-oil">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/20">
          <Package className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="text-white font-bold text-base tracking-wide">
            ENGINE OIL
          </div>
          <div className="text-white/70 text-xs">Lubricants & Oil Products</div>
        </div>
        <Button
          data-ocid="engine-oil.add_button"
          variant="ghost"
          size="sm"
          onClick={onAdd}
          className="text-white/90 hover:bg-white/20 hover:text-white gap-1.5 border border-white/30"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Row
        </Button>
      </div>

      <div className="p-5 space-y-3">
        {rows.length === 0 ? (
          <div
            data-ocid="engine-oil.empty_state"
            className="text-center py-8 text-muted-foreground text-sm"
          >
            No engine oil products added. Click <strong>Add Row</strong> to
            start.
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_100px_100px_120px_36px] gap-3 px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground/50">
                Product Name
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-foreground/50">
                Qty
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-foreground/50">
                Price (₹)
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-foreground/50 text-right">
                Total
              </span>
              <span />
            </div>

            <AnimatePresence initial={false}>
              {rows.map((row, idx) => {
                const rowTotal = toNum(row.quantity) * toNum(row.price);
                return (
                  <motion.div
                    key={row.id}
                    data-ocid={`engine-oil.item.${idx + 1}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-[1fr_100px_100px_120px_36px] gap-3 items-center"
                  >
                    <Input
                      data-ocid={`engine-oil.name.input.${idx + 1}`}
                      type="text"
                      value={row.name}
                      onChange={(e) => onChange(row.id, "name", e.target.value)}
                      placeholder="Product name"
                      className="text-sm"
                    />
                    <Input
                      data-ocid={`engine-oil.qty.input.${idx + 1}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.quantity}
                      onChange={(e) =>
                        onChange(row.id, "quantity", e.target.value)
                      }
                      placeholder="0"
                      className="font-mono text-sm"
                    />
                    <Input
                      data-ocid={`engine-oil.price.input.${idx + 1}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.price}
                      onChange={(e) =>
                        onChange(row.id, "price", e.target.value)
                      }
                      placeholder="0.00"
                      className="font-mono text-sm"
                    />
                    <div className="dsr-calc-field rounded-md px-3 py-2 font-mono text-sm font-semibold border text-right">
                      {formatINR(rowTotal)}
                    </div>
                    <Button
                      data-ocid={`engine-oil.delete_button.${idx + 1}`}
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemove(row.id)}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </>
        )}

        {rows.length > 0 && (
          <div className="flex justify-end pt-2 border-t border-dashed border-amber-200">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-foreground/60 uppercase tracking-wide">
                Engine Oil Total
              </span>
              <div className="font-mono font-bold text-lg text-amber-700">
                {formatINR(total)}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Tank Stock Section ───────────────────────────────────
interface TankStockSectionProps {
  hsdTankOpen: string;
  hsdTankClose: string;
  msTankOpen: string;
  msTankClose: string;
  hsdNozzleSaleLitres: number;
  msNozzleSaleLitres: number;
  onHsdTankOpenChange: (val: string) => void;
  onHsdTankCloseChange: (val: string) => void;
  onMsTankOpenChange: (val: string) => void;
  onMsTankCloseChange: (val: string) => void;
}

function TankStockSection({
  hsdTankOpen,
  hsdTankClose,
  msTankOpen,
  msTankClose,
  hsdNozzleSaleLitres,
  msNozzleSaleLitres,
  onHsdTankOpenChange,
  onHsdTankCloseChange,
  onMsTankOpenChange,
  onMsTankCloseChange,
}: TankStockSectionProps) {
  const hsdTankSale = toNum(hsdTankOpen) - toNum(hsdTankClose);
  const msTankSale = toNum(msTankOpen) - toNum(msTankClose);
  const hsdVariance = hsdNozzleSaleLitres - hsdTankSale;
  const msVariance = msNozzleSaleLitres - msTankSale;

  function VarianceBadge({ variance }: { variance: number }) {
    const isZero = Math.abs(variance) < 0.001;
    const isPositive = variance > 0;
    return (
      <div
        className={`rounded-lg px-3 py-2 text-center font-mono text-sm font-bold border-2 min-w-[90px] ${
          isZero
            ? "bg-slate-50 border-slate-200 text-slate-500"
            : isPositive
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-red-50 border-red-200 text-red-700"
        }`}
      >
        {isZero
          ? "0.00"
          : isPositive
            ? `+${variance.toFixed(2)}`
            : variance.toFixed(2)}
      </div>
    );
  }

  const rows = [
    {
      fuel: "HSD",
      color: "bg-blue-100 text-blue-800 border-blue-200",
      tankOpen: hsdTankOpen,
      tankClose: hsdTankClose,
      tankSale: hsdTankSale,
      variance: hsdVariance,
      onOpenChange: onHsdTankOpenChange,
      onCloseChange: onHsdTankCloseChange,
      openOcid: "tanks.hsd.open.input" as const,
      closeOcid: "tanks.hsd.close.input" as const,
    },
    {
      fuel: "MS",
      color: "bg-emerald-100 text-emerald-800 border-emerald-200",
      tankOpen: msTankOpen,
      tankClose: msTankClose,
      tankSale: msTankSale,
      variance: msVariance,
      onOpenChange: onMsTankOpenChange,
      onCloseChange: onMsTankCloseChange,
      openOcid: "tanks.ms.open.input" as const,
      closeOcid: "tanks.ms.close.input" as const,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-xl overflow-hidden border-2 dsr-card-tanks shadow-sm"
    >
      {/* Header */}
      <div className="px-5 py-3.5 flex items-center gap-3 dsr-header-tanks">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/20">
          <Droplets className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="text-white font-bold text-base tracking-wide">
            HSD &amp; MS TANKS
          </div>
          <div className="text-white/70 text-xs">
            Tank Stock — Opening &amp; Closing Reconciliation
          </div>
        </div>
        <div className="dsr-dots">
          {Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: decorative dots
            <span key={i} />
          ))}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Column headers */}
        <div className="grid grid-cols-[60px_1fr_1fr_100px_100px] gap-3 items-center px-1">
          <div className="text-xs font-bold uppercase tracking-wider text-foreground/50">
            Fuel
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-foreground/50">
            Opening Stock (L)
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-foreground/50">
            Closing Stock (L)
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-foreground/50 text-center">
            Tank Sale (L)
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-foreground/50 text-center">
            Tank vs Nozzle
          </div>
        </div>

        {rows.map((row) => (
          <div
            key={row.fuel}
            className="grid grid-cols-[60px_1fr_1fr_100px_100px] gap-3 items-center"
          >
            {/* Fuel badge */}
            <span
              className={`inline-flex items-center justify-center h-7 px-2 rounded-md text-xs font-bold border ${row.color}`}
            >
              {row.fuel}
            </span>

            {/* Opening stock */}
            <Input
              data-ocid={row.openOcid}
              type="number"
              step="0.01"
              min="0"
              value={row.tankOpen}
              onChange={(e) => row.onOpenChange(e.target.value)}
              className="font-mono"
              placeholder="0.00"
            />

            {/* Closing stock */}
            <Input
              data-ocid={row.closeOcid}
              type="number"
              step="0.01"
              min="0"
              value={row.tankClose}
              onChange={(e) => row.onCloseChange(e.target.value)}
              className="font-mono"
              placeholder="0.00"
            />

            {/* Tank sale = Opening − Closing */}
            <div
              className={`rounded-md px-3 py-2 font-mono text-sm font-semibold border text-center ${
                row.tankSale < 0
                  ? "bg-red-50 border-red-200 text-red-700"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              {row.tankSale.toFixed(2)}
            </div>

            {/* Variance badge */}
            <VarianceBadge variance={row.variance} />
          </div>
        ))}

        {/* Info note */}
        <div className="flex items-center gap-2 pt-1 border-t border-dashed border-slate-200">
          <span className="text-xs text-muted-foreground">
            <span className="font-semibold">Tank vs Nozzle:</span> Nozzle Sale −
            Tank Sale.{" "}
            <span className="text-emerald-600 font-semibold">
              0.00 = matched
            </span>
            , <span className="text-emerald-600">+</span> = nozzle over tank,{" "}
            <span className="text-red-500">−</span> = tank over nozzle.
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Expenses Section ─────────────────────────────────────
const EXPENSE_TAB_COLORS = [
  {
    border: "border-slate-300",
    header: "bg-slate-100",
    badge: "bg-slate-200 text-slate-700",
  },
  {
    border: "border-violet-200",
    header: "bg-violet-50",
    badge: "bg-violet-100 text-violet-700",
  },
  {
    border: "border-rose-200",
    header: "bg-rose-50",
    badge: "bg-rose-100 text-rose-700",
  },
];

interface ExpensesSectionProps {
  tabs: ExpensesTabState[];
  onAddRow: (tabIdx: number) => void;
  onRemoveRow: (tabIdx: number, rowId: string) => void;
  onChangeRow: (
    tabIdx: number,
    rowId: string,
    field: "label" | "amount",
    val: string,
  ) => void;
}

function ExpensesSection({
  tabs,
  onAddRow,
  onRemoveRow,
  onChangeRow,
}: ExpensesSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15, ease: "easeOut" }}
      className="rounded-xl overflow-hidden border-2 border-slate-200 bg-white shadow-sm"
    >
      <div className="px-5 py-3.5 flex items-center gap-3 bg-slate-700">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/20">
          <Wallet className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="text-white font-bold text-base tracking-wide">
            EXPENSES / CASH
          </div>
          <div className="text-white/70 text-xs">
            Cash Received, QR & Card Payments
          </div>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {tabs.map((tab, tabIdx) => {
          const colors = EXPENSE_TAB_COLORS[tabIdx] ?? EXPENSE_TAB_COLORS[0];
          const tabTotal = tab.rows.reduce((s, r) => s + toNum(r.amount), 0);

          return (
            <div
              key={tab.tabName}
              data-ocid={`expenses.tab.${tabIdx + 1}`}
              className={`rounded-lg border ${colors.border} overflow-hidden`}
            >
              {/* Tab header */}
              <div
                className={`px-4 py-2.5 flex items-center justify-between ${colors.header}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center justify-center h-5 px-2 rounded-full text-xs font-bold ${colors.badge}`}
                  >
                    {tabIdx + 1}
                  </span>
                  <span className="text-sm font-bold tracking-wide text-foreground">
                    {tab.tabName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {tab.rows.length > 0 && (
                    <span className="font-mono text-sm font-bold text-foreground/70">
                      {formatINR(tabTotal)}
                    </span>
                  )}
                  <Button
                    data-ocid={`expenses.add_button.${tabIdx + 1}`}
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddRow(tabIdx)}
                    className="h-7 gap-1 text-xs font-semibold"
                  >
                    <Plus className="w-3 h-3" />
                    Add Row
                  </Button>
                </div>
              </div>

              {/* Tab rows */}
              <div className="px-4 py-3 space-y-2 bg-white">
                {tab.rows.length === 0 ? (
                  <div
                    data-ocid={`expenses.empty_state.${tabIdx + 1}`}
                    className="text-xs text-muted-foreground py-2 text-center"
                  >
                    No entries yet — click Add Row
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {tab.rows.map((row, rowIdx) => (
                      <motion.div
                        key={row.id}
                        data-ocid={`expenses.item.${tabIdx + 1}.${rowIdx + 1}`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="grid grid-cols-[1fr_150px_36px] gap-2 items-center"
                      >
                        <Input
                          data-ocid={`expenses.label.input.${tabIdx + 1}.${rowIdx + 1}`}
                          type="text"
                          value={row.label}
                          onChange={(e) =>
                            onChangeRow(tabIdx, row.id, "label", e.target.value)
                          }
                          placeholder="Description"
                          className="text-sm h-8"
                        />
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                            ₹
                          </span>
                          <Input
                            data-ocid={`expenses.amount.input.${tabIdx + 1}.${rowIdx + 1}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.amount}
                            onChange={(e) =>
                              onChangeRow(
                                tabIdx,
                                row.id,
                                "amount",
                                e.target.value,
                              )
                            }
                            placeholder="0.00"
                            className="pl-6 font-mono text-sm h-8"
                          />
                        </div>
                        <Button
                          data-ocid={`expenses.delete_button.${tabIdx + 1}.${rowIdx + 1}`}
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveRow(tabIdx, row.id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Main App ─────────────────────────────────────────────
export default function App() {
  // ─ Date state
  const [date, setDate] = useState(todayDate());

  // ─ Fuel states (4 nozzles each)
  const [hsdNozzles, setHsdNozzles] = useState<NozzleState[]>(emptyNozzles());
  const [msNozzles, setMsNozzles] = useState<NozzleState[]>(emptyNozzles());
  const [hsdPrice, setHsdPrice] = useState("");
  const [msPrice, setMsPrice] = useState("");
  const [hsdTesting, setHsdTesting] = useState("");
  const [msTesting, setMsTesting] = useState("");

  // ─ Engine oil
  const [engineOilRows, setEngineOilRows] = useState<EngineOilRowState[]>([]);

  // ─ Expenses
  const [expensesTabs, setExpensesTabs] = useState<ExpensesTabState[]>(
    emptyExpenseTabs(),
  );

  // ─ Balance cash
  const [prevDayBalance, setPrevDayBalance] = useState("");

  // ─ Tank stock
  const [hsdTankOpen, setHsdTankOpen] = useState("");
  const [hsdTankClose, setHsdTankClose] = useState("");
  const [msTankOpen, setMsTankOpen] = useState("");
  const [msTankClose, setMsTankClose] = useState("");

  // ─ UI
  const [showHistory, setShowHistory] = useState(false);

  // ─── Backend hooks ────────────────────────────────────
  const { data: savedReport, isLoading: isLoadingReport } = useGetReport(date);
  const saveReportMutation = useSaveReport();
  const { data: reportDates, isLoading: isLoadingDates } = useListReportDates();

  // ─── Load saved report when date/data changes ─────────
  useEffect(() => {
    if (savedReport) {
      // HSD
      const hNozzles = emptyNozzles();
      for (let i = 0; i < Math.min(savedReport.hsdNozzles.length, 4); i++) {
        hNozzles[i] = {
          open:
            savedReport.hsdNozzles[i].openReading > 0
              ? savedReport.hsdNozzles[i].openReading.toString()
              : "",
          close:
            savedReport.hsdNozzles[i].closeReading > 0
              ? savedReport.hsdNozzles[i].closeReading.toString()
              : "",
        };
      }
      setHsdNozzles(hNozzles);
      setHsdPrice(
        savedReport.hsdPrice > 0 ? savedReport.hsdPrice.toString() : "",
      );
      setHsdTesting(
        savedReport.hsdTesting > 0 ? savedReport.hsdTesting.toString() : "",
      );

      // MS
      const mNozzles = emptyNozzles();
      for (let i = 0; i < Math.min(savedReport.msNozzles.length, 4); i++) {
        mNozzles[i] = {
          open:
            savedReport.msNozzles[i].openReading > 0
              ? savedReport.msNozzles[i].openReading.toString()
              : "",
          close:
            savedReport.msNozzles[i].closeReading > 0
              ? savedReport.msNozzles[i].closeReading.toString()
              : "",
        };
      }
      setMsNozzles(mNozzles);
      setMsPrice(savedReport.msPrice > 0 ? savedReport.msPrice.toString() : "");
      setMsTesting(
        savedReport.msTesting > 0 ? savedReport.msTesting.toString() : "",
      );

      // Engine oil
      setEngineOilRows(
        savedReport.engineOilRows.map((r) => ({
          id: uid(),
          name: r.name,
          quantity: r.quantity > 0 ? r.quantity.toString() : "",
          price: r.price > 0 ? r.price.toString() : "",
        })),
      );

      // Expenses tabs
      if (savedReport.expensesTabs.length > 0) {
        setExpensesTabs(
          savedReport.expensesTabs.map((tab) => ({
            tabName: tab.tabName,
            rows: tab.rows.map((r) => ({
              id: uid(),
              label: r.expenseLabel,
              amount: r.amount > 0 ? r.amount.toString() : "",
            })),
          })),
        );
      } else {
        setExpensesTabs(emptyExpenseTabs());
      }

      // Balance
      setPrevDayBalance(
        savedReport.previousDayBalanceCash !== 0 &&
          savedReport.previousDayBalanceCash !== null
          ? savedReport.previousDayBalanceCash.toString()
          : "",
      );

      // Tank stock — stored in notes as JSON
      try {
        const tankData = JSON.parse(savedReport.notes || "{}");
        setHsdTankOpen(
          tankData.hsdTankOpen > 0 ? tankData.hsdTankOpen.toString() : "",
        );
        setHsdTankClose(
          tankData.hsdTankClose > 0 ? tankData.hsdTankClose.toString() : "",
        );
        setMsTankOpen(
          tankData.msTankOpen > 0 ? tankData.msTankOpen.toString() : "",
        );
        setMsTankClose(
          tankData.msTankClose > 0 ? tankData.msTankClose.toString() : "",
        );
      } catch {
        setHsdTankOpen("");
        setHsdTankClose("");
        setMsTankOpen("");
        setMsTankClose("");
      }
    } else if (savedReport === null && !isLoadingReport) {
      // No saved data for this date — clear
      setHsdNozzles(emptyNozzles());
      setMsNozzles(emptyNozzles());
      setHsdPrice("");
      setMsPrice("");
      setHsdTesting("");
      setMsTesting("");
      setEngineOilRows([]);
      setExpensesTabs(emptyExpenseTabs());
      setPrevDayBalance("");
      setHsdTankOpen("");
      setHsdTankClose("");
      setMsTankOpen("");
      setMsTankClose("");
    }
  }, [savedReport, isLoadingReport]);

  // ─── Calculations ──────────────────────────────────────
  const hsdVolumes = hsdNozzles.map((n) => toNum(n.close) - toNum(n.open));
  const hsdTotalVolume = hsdVolumes.reduce((s, v) => s + v, 0);
  const hsdTotalSale = hsdTotalVolume - toNum(hsdTesting);
  const hsdGross = hsdTotalSale * toNum(hsdPrice);

  const msVolumes = msNozzles.map((n) => toNum(n.close) - toNum(n.open));
  const msTotalVolume = msVolumes.reduce((s, v) => s + v, 0);
  const msTotalSale = msTotalVolume - toNum(msTesting);
  const msGross = msTotalSale * toNum(msPrice);

  const engineOilTotal = useMemo(
    () =>
      engineOilRows.reduce((s, r) => s + toNum(r.quantity) * toNum(r.price), 0),
    [engineOilRows],
  );

  const totalGrossSale = hsdGross + msGross + engineOilTotal;

  const totalExpenses = useMemo(
    () =>
      expensesTabs.reduce(
        (s, tab) => s + tab.rows.reduce((ts, r) => ts + toNum(r.amount), 0),
        0,
      ),
    [expensesTabs],
  );

  const prevBalance = toNum(prevDayBalance);
  const grossPlusBalance = totalGrossSale + prevBalance;
  const balanceCash = totalExpenses - grossPlusBalance;

  // ─── Handlers: HSD nozzles ────────────────────────────
  const updateHsdNozzle = useCallback(
    (idx: number, field: "open" | "close", val: string) => {
      setHsdNozzles((prev) =>
        prev.map((n, i) => (i === idx ? { ...n, [field]: val } : n)),
      );
    },
    [],
  );

  // ─── Handlers: MS nozzles ─────────────────────────────
  const updateMsNozzle = useCallback(
    (idx: number, field: "open" | "close", val: string) => {
      setMsNozzles((prev) =>
        prev.map((n, i) => (i === idx ? { ...n, [field]: val } : n)),
      );
    },
    [],
  );

  // ─── Handlers: Engine oil ─────────────────────────────
  const addEngineOilRow = useCallback(() => {
    setEngineOilRows((prev) => [
      ...prev,
      { id: uid(), name: "", quantity: "", price: "" },
    ]);
  }, []);

  const removeEngineOilRow = useCallback((id: string) => {
    setEngineOilRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateEngineOilRow = useCallback(
    (id: string, field: keyof EngineOilRowState, val: string) => {
      setEngineOilRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: val } : r)),
      );
    },
    [],
  );

  // ─── Handlers: Expenses ───────────────────────────────
  const addExpenseRow = useCallback((tabIdx: number) => {
    setExpensesTabs((prev) =>
      prev.map((tab, i) =>
        i === tabIdx
          ? {
              ...tab,
              rows: [...tab.rows, { id: uid(), label: "", amount: "" }],
            }
          : tab,
      ),
    );
  }, []);

  const removeExpenseRow = useCallback((tabIdx: number, rowId: string) => {
    setExpensesTabs((prev) =>
      prev.map((tab, i) =>
        i === tabIdx
          ? { ...tab, rows: tab.rows.filter((r) => r.id !== rowId) }
          : tab,
      ),
    );
  }, []);

  const updateExpenseRow = useCallback(
    (tabIdx: number, rowId: string, field: "label" | "amount", val: string) => {
      setExpensesTabs((prev) =>
        prev.map((tab, i) =>
          i === tabIdx
            ? {
                ...tab,
                rows: tab.rows.map((r) =>
                  r.id === rowId ? { ...r, [field]: val } : r,
                ),
              }
            : tab,
        ),
      );
    },
    [],
  );

  // ─── Save handler ────────────────────────────────────
  const handleSave = useCallback(async () => {
    const report: DailyReport = {
      date,
      notes: JSON.stringify({
        hsdTankOpen: toNum(hsdTankOpen),
        hsdTankClose: toNum(hsdTankClose),
        msTankOpen: toNum(msTankOpen),
        msTankClose: toNum(msTankClose),
      }),
      hsdPrice: toNum(hsdPrice),
      hsdTesting: toNum(hsdTesting),
      hsdNozzles: hsdNozzles.map((n) => ({
        openReading: toNum(n.open),
        closeReading: toNum(n.close),
      })),
      msPrice: toNum(msPrice),
      msTesting: toNum(msTesting),
      msNozzles: msNozzles.map((n) => ({
        openReading: toNum(n.open),
        closeReading: toNum(n.close),
      })),
      engineOilRows: engineOilRows.map((r) => ({
        name: r.name,
        quantity: toNum(r.quantity),
        price: toNum(r.price),
      })),
      expensesTabs: expensesTabs.map((tab) => ({
        tabName: tab.tabName,
        rows: tab.rows.map((r) => ({
          expenseLabel: r.label,
          amount: toNum(r.amount),
        })),
      })),
      previousDayBalanceCash: toNum(prevDayBalance),
    };

    try {
      await saveReportMutation.mutateAsync({ date, report });
      toast.success("Report saved successfully!");
    } catch {
      toast.error("Failed to save report. Please try again.");
    }
  }, [
    date,
    hsdPrice,
    hsdTesting,
    hsdNozzles,
    msPrice,
    msTesting,
    msNozzles,
    engineOilRows,
    expensesTabs,
    prevDayBalance,
    hsdTankOpen,
    hsdTankClose,
    msTankOpen,
    msTankClose,
    saveReportMutation,
  ]);

  // ─── History handler ─────────────────────────────────
  const handleLoadFromHistory = useCallback(async (historyDate: string) => {
    setDate(historyDate);
    setShowHistory(false);
  }, []);

  // ─── Word document generation ─────────────────────────
  const handleDownload = useCallback(async () => {
    const makeRow = (label: string, value: string) =>
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: label, bold: true })],
              }),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun(value)] })],
            width: { size: 50, type: WidthType.PERCENTAGE },
          }),
        ],
      });

    const hsdRows: TableRow[] = [
      makeRow("Price per Litre", `₹${hsdPrice || "0"}`),
      ...hsdNozzles.flatMap((n, i) => [
        makeRow(`Nozzle ${i + 1} Opening`, n.open || "0"),
        makeRow(`Nozzle ${i + 1} Closing`, n.close || "0"),
        makeRow(`Nozzle ${i + 1} Volume (L)`, hsdVolumes[i].toFixed(2)),
      ]),
      makeRow("Testing (L)", hsdTesting || "0"),
      makeRow("Total Volume (L)", hsdTotalVolume.toFixed(2)),
      makeRow("Total Sale (L)", hsdTotalSale.toFixed(2)),
      makeRow("Gross Sale", formatINR(hsdGross)),
    ];

    const msRows: TableRow[] = [
      makeRow("Price per Litre", `₹${msPrice || "0"}`),
      ...msNozzles.flatMap((n, i) => [
        makeRow(`Nozzle ${i + 1} Opening`, n.open || "0"),
        makeRow(`Nozzle ${i + 1} Closing`, n.close || "0"),
        makeRow(`Nozzle ${i + 1} Volume (L)`, msVolumes[i].toFixed(2)),
      ]),
      makeRow("Testing (L)", msTesting || "0"),
      makeRow("Total Volume (L)", msTotalVolume.toFixed(2)),
      makeRow("Total Sale (L)", msTotalSale.toFixed(2)),
      makeRow("Gross Sale", formatINR(msGross)),
    ];

    const engineOilTableRows: TableRow[] = [
      new TableRow({
        tableHeader: true,
        children: ["Product", "Qty", "Price", "Total"].map(
          (h) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: h, bold: true })],
                }),
              ],
              width: { size: 25, type: WidthType.PERCENTAGE },
            }),
        ),
      }),
      ...engineOilRows.map(
        (r) =>
          new TableRow({
            children: [
              r.name,
              r.quantity,
              `₹${r.price}`,
              formatINR(toNum(r.quantity) * toNum(r.price)),
            ].map(
              (v) =>
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun(v || "—")] }),
                  ],
                  width: { size: 25, type: WidthType.PERCENTAGE },
                }),
            ),
          }),
      ),
    ];

    const expenseDocBlocks: (Paragraph | Table)[] = expensesTabs.flatMap(
      (tab) => [
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: tab.tabName, bold: true })],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows:
            tab.rows.length > 0
              ? [
                  new TableRow({
                    tableHeader: true,
                    children: ["Description", "Amount"].map(
                      (h) =>
                        new TableCell({
                          children: [
                            new Paragraph({
                              children: [new TextRun({ text: h, bold: true })],
                            }),
                          ],
                          width: { size: 50, type: WidthType.PERCENTAGE },
                        }),
                    ),
                  }),
                  ...tab.rows.map(
                    (r) =>
                      new TableRow({
                        children: [r.label, formatINR(toNum(r.amount))].map(
                          (v) =>
                            new TableCell({
                              children: [
                                new Paragraph({
                                  children: [new TextRun(v || "—")],
                                }),
                              ],
                              width: { size: 50, type: WidthType.PERCENTAGE },
                            }),
                        ),
                      }),
                  ),
                ]
              : [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [new TextRun("No entries")],
                          }),
                        ],
                        width: { size: 100, type: WidthType.PERCENTAGE },
                      }),
                    ],
                  }),
                ],
        }),
        new Paragraph({ children: [new TextRun("")] }),
      ],
    );

    const docChildren: (Paragraph | Table)[] = [
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "BUNK DAILY SALES REPORT",
            bold: true,
            size: 32,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `Date: ${date}`, size: 24 })],
      }),
      new Paragraph({ children: [new TextRun("")] }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({ text: "HSD — High Speed Diesel", bold: true }),
        ],
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: hsdRows,
      }),
      new Paragraph({ children: [new TextRun("")] }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({ text: "MS — Motor Spirit / Petrol", bold: true }),
        ],
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: msRows,
      }),
      new Paragraph({ children: [new TextRun("")] }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: "Engine Oil", bold: true })],
      }),
      ...(engineOilRows.length > 0
        ? [
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: engineOilTableRows,
            }),
          ]
        : [
            new Paragraph({
              children: [new TextRun("No engine oil products.")],
            }),
          ]),
      new Paragraph({ children: [new TextRun("")] }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: "Total Gross Sale", bold: true })],
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          makeRow("HSD Gross Sale", formatINR(hsdGross)),
          makeRow("MS Gross Sale", formatINR(msGross)),
          makeRow("Engine Oil Total", formatINR(engineOilTotal)),
          makeRow("TOTAL GROSS SALE", formatINR(totalGrossSale)),
        ],
      }),
      new Paragraph({ children: [new TextRun("")] }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: "Expenses / Cash", bold: true })],
      }),
      ...expenseDocBlocks,
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [makeRow("TOTAL EXPENSES", formatINR(totalExpenses))],
      }),
      new Paragraph({ children: [new TextRun("")] }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: "Balance Cash", bold: true })],
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          makeRow("Total Expenses", formatINR(totalExpenses)),
          makeRow("Total Gross Sale", formatINR(totalGrossSale)),
          makeRow("Previous Day Balance Cash", formatINR(prevBalance)),
          makeRow("Gross + Balance", formatINR(grossPlusBalance)),
          makeRow(
            "BALANCE CASH (Expenses − Gross+Balance)",
            formatINR(balanceCash),
          ),
        ],
      }),
    ];

    const doc = new Document({
      sections: [{ children: docChildren }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `DSR_Report_${date}.docx`);
    toast.success("Report downloaded as Word document.");
  }, [
    date,
    hsdPrice,
    hsdTesting,
    hsdNozzles,
    hsdVolumes,
    hsdTotalVolume,
    hsdTotalSale,
    hsdGross,
    msPrice,
    msTesting,
    msNozzles,
    msVolumes,
    msTotalVolume,
    msTotalSale,
    msGross,
    engineOilRows,
    engineOilTotal,
    totalGrossSale,
    expensesTabs,
    totalExpenses,
    prevBalance,
    grossPlusBalance,
    balanceCash,
  ]);

  // ─── Render ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-right" />

      {/* ── Top Bar ───────────────────────────────────── */}
      <header className="dsr-topbar no-print sticky top-0 z-50 shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          {/* Title */}
          <div className="flex items-center gap-2.5 mr-auto">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/20">
              <Fuel className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm sm:text-base tracking-tight leading-none">
                BUNK DAILY SALES REPORT
              </h1>
              <p className="text-white/60 text-xs hidden sm:block">
                DSR — Daily Sales Record
              </p>
            </div>
          </div>

          {/* Date picker */}
          <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5 border border-white/20">
            <CalendarDays className="w-4 h-4 text-white/70 shrink-0" />
            <input
              data-ocid="header.date.input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-white text-sm font-mono focus:outline-none w-[130px]"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              data-ocid="header.history.button"
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(true)}
              className="text-white/90 hover:bg-white/20 hover:text-white gap-1.5 hidden sm:flex"
            >
              <History className="w-4 h-4" />
              History
            </Button>
            <Button
              data-ocid="header.save.button"
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={saveReportMutation.isPending}
              className="text-white/90 hover:bg-white/20 hover:text-white gap-1.5"
            >
              {saveReportMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Save</span>
            </Button>
            <Button
              data-ocid="header.download.button"
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="text-white/90 hover:bg-white/20 hover:text-white gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </Button>
            <Button
              data-ocid="header.print.button"
              variant="ghost"
              size="sm"
              onClick={() => window.print()}
              className="text-white/90 hover:bg-white/20 hover:text-white gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6 print-container">
        {/* Loading overlay */}
        {isLoadingReport && (
          <div
            data-ocid="app.loading_state"
            className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-sm"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading report for {date}…
          </div>
        )}

        {/* ── HSD & MS Tanks Section ──────────────────── */}
        <TankStockSection
          hsdTankOpen={hsdTankOpen}
          hsdTankClose={hsdTankClose}
          msTankOpen={msTankOpen}
          msTankClose={msTankClose}
          hsdNozzleSaleLitres={hsdTotalSale}
          msNozzleSaleLitres={msTotalSale}
          onHsdTankOpenChange={setHsdTankOpen}
          onHsdTankCloseChange={setHsdTankClose}
          onMsTankOpenChange={setMsTankOpen}
          onMsTankCloseChange={setMsTankClose}
        />

        {/* ── HSD Section ─────────────────────────────── */}
        <NozzleSection
          fuelType="hsd"
          nozzles={hsdNozzles}
          testing={hsdTesting}
          price={hsdPrice}
          onPriceChange={setHsdPrice}
          onNozzleChange={updateHsdNozzle}
          onTestingChange={setHsdTesting}
        />

        {/* ── MS Section ──────────────────────────────── */}
        <NozzleSection
          fuelType="ms"
          nozzles={msNozzles}
          testing={msTesting}
          price={msPrice}
          onPriceChange={setMsPrice}
          onNozzleChange={updateMsNozzle}
          onTestingChange={setMsTesting}
        />

        {/* ── Engine Oil ──────────────────────────────── */}
        <EngineOilSection
          rows={engineOilRows}
          onAdd={addEngineOilRow}
          onRemove={removeEngineOilRow}
          onChange={updateEngineOilRow}
        />

        {/* ── Total Gross Sale ────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2, ease: "easeOut" }}
          data-ocid="summary.total_gross.card"
          className="rounded-xl border-2 border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 shadow-sm overflow-hidden"
        >
          <div className="px-5 py-3.5 bg-sky-600 flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-white" />
            <h2 className="text-white font-bold text-base tracking-wide">
              TOTAL GROSS SALE
            </h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "HSD Gross", value: hsdGross },
                { label: "MS Gross", value: msGross },
                { label: "Engine Oil", value: engineOilTotal },
                { label: "TOTAL", value: totalGrossSale, highlight: true },
              ].map(({ label, value, highlight }) => (
                <div
                  key={label}
                  className={`rounded-lg p-3 ${highlight ? "bg-sky-600 text-white" : "bg-white border border-sky-100"}`}
                >
                  <div
                    className={`text-xs font-bold uppercase tracking-wider mb-1 ${highlight ? "text-sky-100" : "text-foreground/50"}`}
                  >
                    {label}
                  </div>
                  <div
                    className={`font-mono font-bold text-sm sm:text-base ${highlight ? "text-white" : "text-foreground"}`}
                  >
                    {formatINR(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Expenses ────────────────────────────────── */}
        <ExpensesSection
          tabs={expensesTabs}
          onAddRow={addExpenseRow}
          onRemoveRow={removeExpenseRow}
          onChangeRow={updateExpenseRow}
        />

        {/* ── Total Expenses summary ──────────────────── */}
        <div className="flex justify-end">
          <div className="bg-slate-100 border border-slate-200 rounded-lg px-5 py-3 flex items-center gap-4">
            <span className="text-sm font-bold text-foreground/60 uppercase tracking-wide">
              Total Expenses
            </span>
            <span className="font-mono font-bold text-lg text-slate-700">
              {formatINR(totalExpenses)}
            </span>
          </div>
        </div>

        {/* ── Balance Cash ────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25, ease: "easeOut" }}
          data-ocid="balance.card"
          className="rounded-xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden"
        >
          <div className="px-5 py-3.5 bg-slate-700 flex items-center gap-3">
            <Wallet className="w-5 h-5 text-white" />
            <h2 className="text-white font-bold text-base tracking-wide">
              BALANCE CASH
            </h2>
          </div>

          <div className="p-5 space-y-5">
            {/* Previous day balance input */}
            <div className="flex items-center gap-4">
              <Label className="text-sm font-semibold text-foreground/70 shrink-0">
                Previous Day Balance Cash (₹)
              </Label>
              <div className="relative flex-1 max-w-[220px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono text-muted-foreground">
                  ₹
                </span>
                <Input
                  data-ocid="balance.prev_day.input"
                  type="number"
                  step="0.01"
                  value={prevDayBalance}
                  onChange={(e) => setPrevDayBalance(e.target.value)}
                  placeholder="0.00 (can be negative)"
                  className="pl-7 font-mono"
                />
              </div>
            </div>

            {/* Formula breakdown */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
              {/* Row 1: Total Expenses */}
              <div className="space-y-1 text-center">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Expenses / Cash
                </div>
                <div className="font-mono font-bold text-base text-destructive">
                  {formatINR(totalExpenses)}
                </div>
              </div>

              <Separator />

              {/* Row 2: Gross Sale +/- Balance */}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <Minus className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  (
                </span>
                <div className="space-y-0.5 text-center">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Gross Sale
                  </div>
                  <div className="font-mono font-bold text-base text-foreground">
                    {formatINR(totalGrossSale)}
                  </div>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${prevBalance >= 0 ? "text-emerald-600" : "text-red-500"}`}
                >
                  {prevBalance >= 0 ? (
                    <Plus className="w-4 h-4" />
                  ) : (
                    <Minus className="w-4 h-4" />
                  )}
                  <div className="text-center">
                    <div className="text-xs font-semibold uppercase tracking-wider">
                      Balance Cash
                    </div>
                    <div className="font-mono font-bold text-base">
                      {formatINR(Math.abs(prevBalance))}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  )
                </span>
                <div className="mx-1 space-y-0.5 text-center border-l border-slate-300 pl-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    = {formatINR(grossPlusBalance)}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground font-medium">
                  Total Expenses − (Gross Sale +/− Prev. Balance)
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Balance Cash
                </div>
              </div>
            </div>

            {/* Balance Cash result */}
            <motion.div
              key={balanceCash}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 0.25 }}
              data-ocid="balance.result"
              className={`rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-2 ${
                balanceCash > 0
                  ? "bg-emerald-50 border-emerald-300"
                  : balanceCash < 0
                    ? "bg-red-50 border-red-300"
                    : "bg-slate-50 border-slate-300"
              }`}
            >
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-foreground/50 mb-1">
                  Balance Cash
                </div>
                <div className="text-sm text-foreground/60">
                  Total Expenses ₹{formatINR(totalExpenses)} − (Gross Sale ₹
                  {formatINR(totalGrossSale)} {prevBalance >= 0 ? "+" : "−"}{" "}
                  Balance ₹{formatINR(Math.abs(prevBalance))})
                </div>
              </div>
              <div className="flex flex-col sm:items-end gap-1">
                <div
                  className={`font-mono font-bold text-3xl sm:text-4xl tracking-tight ${
                    balanceCash > 0
                      ? "text-emerald-600"
                      : balanceCash < 0
                        ? "text-red-600"
                        : "text-foreground/50"
                  }`}
                >
                  {balanceCash >= 0 ? "+" : ""}
                  {formatINR(balanceCash)}
                </div>
                <span
                  className={`text-xs font-bold uppercase tracking-widest ${
                    balanceCash > 0
                      ? "text-emerald-600"
                      : balanceCash < 0
                        ? "text-red-600"
                        : "text-muted-foreground"
                  }`}
                >
                  {balanceCash > 0
                    ? "Surplus"
                    : balanceCash < 0
                      ? "Deficit"
                      : "Balanced"}
                </span>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* ── Footer ──────────────────────────────────── */}
        <footer className="text-center text-xs text-muted-foreground py-6 no-print">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Built with ♥ using caffeine.ai
          </a>
        </footer>
      </main>

      {/* ── History Sheet ─────────────────────────────── */}
      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        <SheetContent
          data-ocid="history.sheet"
          className="w-[340px] sm:w-[420px] flex flex-col"
          side="right"
        >
          <SheetHeader className="pb-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2 text-base font-bold">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
                <History className="w-4 h-4 text-primary" />
              </div>
              Report History
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Browse and load past saved reports by date
            </p>
          </SheetHeader>
          <div className="mt-4 flex-1 overflow-hidden">
            {isLoadingDates ? (
              <div
                data-ocid="history.loading_state"
                className="flex items-center gap-2 py-8 text-muted-foreground text-sm justify-center"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading history…
              </div>
            ) : !reportDates || reportDates.length === 0 ? (
              <div
                data-ocid="history.empty_state"
                className="text-center py-12 text-muted-foreground"
              >
                <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">No saved reports yet.</p>
                <p className="text-xs mt-1 opacity-70">
                  Save a report to see it here.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-160px)]">
                <div className="space-y-2 pr-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
                    {reportDates.length} saved report
                    {reportDates.length !== 1 ? "s" : ""}
                  </p>
                  {[...reportDates]
                    .sort((a, b) => b.localeCompare(a))
                    .map((d, idx) => {
                      const dateObj = new Date(`${d}T00:00:00`);
                      const formattedDate = dateObj.toLocaleDateString(
                        "en-IN",
                        {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        },
                      );
                      const isActive = d === date;
                      return (
                        <button
                          key={d}
                          type="button"
                          data-ocid={`history.item.${idx + 1}`}
                          onClick={() => handleLoadFromHistory(d)}
                          className={`group w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-left transition-all duration-150 border ${
                            isActive
                              ? "bg-primary border-primary text-primary-foreground shadow-sm"
                              : "bg-card border-border hover:border-primary/40 hover:bg-accent text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                                isActive
                                  ? "bg-white/20"
                                  : "bg-primary/8 group-hover:bg-primary/15"
                              }`}
                            >
                              <CalendarDays
                                className={`w-4 h-4 ${isActive ? "text-white" : "text-primary"}`}
                              />
                            </div>
                            <div>
                              <div
                                className={`text-sm font-bold leading-tight ${isActive ? "text-white" : "text-foreground"}`}
                              >
                                {formattedDate}
                              </div>
                              <div
                                className={`text-xs font-mono mt-0.5 ${isActive ? "text-white/60" : "text-muted-foreground"}`}
                              >
                                {d}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isActive ? (
                              <span className="text-xs font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">
                                Current
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity bg-primary/10 px-2 py-0.5 rounded-full">
                                View
                              </span>
                            )}
                            <ChevronRight
                              className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${isActive ? "text-white/60" : "text-muted-foreground"}`}
                            />
                          </div>
                        </button>
                      );
                    })}
                </div>
              </ScrollArea>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
