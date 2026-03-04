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
// Word/RTF export helpers (no external library needed)
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
import {
  CalendarDays,
  ChevronRight,
  Coins,
  Download,
  Fuel,
  History,
  Loader2,
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

interface DenomState {
  count: string;
}

// ─── Denomination config ──────────────────────────────────
const NOTES = [500, 200, 100, 50, 20, 10] as const;
const COINS = [10, 5, 2, 1] as const;

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

// ─── Empty state factories ────────────────────────────────
function emptyNozzles(): NozzleState[] {
  return [
    { open: "", close: "" },
    { open: "", close: "" },
  ];
}

function emptyExpenseTabs(): ExpensesTabState[] {
  return [
    { tabName: "Cash Received", rows: [] },
    { tabName: "Daily Pump Test", rows: [] },
    { tabName: "QR Payments", rows: [] },
    { tabName: "Card Payments", rows: [] },
    { tabName: "Expenses", rows: [] },
  ];
}

function emptyDenoms(): Record<number, DenomState> {
  const d: Record<number, DenomState> = {};
  for (const n of NOTES) d[n] = { count: "" };
  for (const c of COINS) d[c] = { count: "" };
  return d;
}

// ─── NozzleSection ────────────────────────────────────────
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
      {/* Card Header */}
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
            // biome-ignore lint/suspicious/noArrayIndexKey: decorative
            <span key={i} />
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">
        {/* Price per litre */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <Label className="text-xs font-bold uppercase tracking-wider text-foreground/60 shrink-0 sm:w-36">
            Price per Litre (₹)
          </Label>
          <div className="relative flex-1 sm:max-w-[180px]">
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
              className="pl-7 font-mono dsr-fuel-input dsr-touch-input"
              placeholder="0.00"
            />
          </div>
        </div>

        <Separator className="opacity-30" />

        {/* Nozzle table header — hidden on mobile, visible on sm+ */}
        <div className="hidden sm:grid grid-cols-[auto_1fr_1fr_1fr] gap-3 items-center">
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
            <div key={`nozzle-${idx + 1}`} className="space-y-2 sm:space-y-0">
              {/* Mobile layout: stacked card */}
              <div className="sm:hidden">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/30 text-white text-xs font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-semibold text-foreground/60">
                    Nozzle {idx + 1}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground/50">
                      Opening
                    </Label>
                    <Input
                      data-ocid={`${fuelType}.nozzle.${idx + 1}.open.input`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={nozzle.open}
                      onChange={(e) =>
                        onNozzleChange(idx, "open", e.target.value)
                      }
                      className="font-mono dsr-fuel-input dsr-touch-input"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground/50">
                      Closing
                    </Label>
                    <Input
                      data-ocid={`${fuelType}.nozzle.${idx + 1}.close.input`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={nozzle.close}
                      onChange={(e) =>
                        onNozzleChange(idx, "close", e.target.value)
                      }
                      className="font-mono dsr-fuel-input dsr-touch-input"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-semibold text-foreground/50 shrink-0">
                    Volume (L)
                  </Label>
                  <div
                    className={`dsr-calc-field flex-1 rounded-md px-3 py-2 font-mono text-sm font-semibold border ${vol < 0 ? "text-destructive" : ""}`}
                  >
                    {vol.toFixed(2)}
                  </div>
                </div>
              </div>
              {/* Desktop/tablet layout: 4-col grid */}
              <div className="hidden sm:grid grid-cols-[auto_1fr_1fr_1fr] gap-3 items-center">
                <div className="w-20 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/30 text-white text-xs font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-semibold text-foreground/60">
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
                  placeholder="0"
                />
                <Input
                  data-ocid={`${fuelType}.nozzle.${idx + 1}.close.input`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={nozzle.close}
                  onChange={(e) => onNozzleChange(idx, "close", e.target.value)}
                  className="font-mono dsr-fuel-input"
                  placeholder="0"
                />
                <div
                  className={`dsr-calc-field rounded-md px-3 py-2 font-mono text-sm font-semibold border ${vol < 0 ? "text-destructive" : ""}`}
                >
                  {vol.toFixed(2)}
                </div>
              </div>
            </div>
          );
        })}

        <Separator className="opacity-30" />

        {/* Testing row */}
        <div className="flex flex-col sm:grid sm:grid-cols-[auto_1fr_1fr_1fr] gap-2 sm:gap-3 sm:items-center">
          <div className="sm:w-20 text-xs font-bold uppercase tracking-wider text-foreground/60">
            Testing
          </div>
          <div className="grid grid-cols-2 gap-2 sm:contents">
            <Input
              data-ocid={`${fuelType}.testing.input`}
              type="number"
              step="0.01"
              min="0"
              value={testing}
              onChange={(e) => onTestingChange(e.target.value)}
              className="font-mono dsr-fuel-input dsr-touch-input sm:col-span-2"
              placeholder=""
            />
            <div className="dsr-calc-field rounded-md px-3 py-2 font-mono text-sm font-semibold border text-foreground/50">
              {testing !== "" ? `-${testingLitres.toFixed(2)}` : ""}
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 pt-1">
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

// ─── EngineOilSection ─────────────────────────────────────
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

      <div className="p-4 sm:p-5 space-y-3">
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
            {/* Column headers — hidden on mobile */}
            <div className="hidden sm:grid grid-cols-[1fr_100px_100px_120px_36px] gap-3 px-1">
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
                  >
                    {/* Mobile: stacked card layout */}
                    <div className="sm:hidden space-y-2 p-3 rounded-lg border border-amber-200 bg-amber-50/50">
                      <Input
                        data-ocid={`engine-oil.name.input.${idx + 1}`}
                        type="text"
                        value={row.name}
                        onChange={(e) =>
                          onChange(row.id, "name", e.target.value)
                        }
                        placeholder="Product name"
                        className="text-sm dsr-touch-input"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          data-ocid={`engine-oil.qty.input.${idx + 1}`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.quantity}
                          onChange={(e) =>
                            onChange(row.id, "quantity", e.target.value)
                          }
                          placeholder="Qty"
                          className="font-mono text-sm dsr-touch-input"
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
                          placeholder="Price ₹"
                          className="font-mono text-sm dsr-touch-input"
                        />
                      </div>
                      <div className="grid grid-cols-[1fr_36px] gap-2 items-center">
                        <div className="dsr-calc-field rounded-md px-3 py-2 font-mono text-sm font-semibold border text-right">
                          {formatINR(rowTotal)}
                        </div>
                        <Button
                          data-ocid={`engine-oil.delete_button.${idx + 1}`}
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemove(row.id)}
                          className="h-9 w-9 text-destructive hover:bg-destructive/10"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    {/* Desktop/tablet: 5-col grid */}
                    <div className="hidden sm:grid grid-cols-[1fr_100px_100px_120px_36px] gap-3 items-center">
                      <Input
                        data-ocid={`engine-oil.name.input.${idx + 1}`}
                        type="text"
                        value={row.name}
                        onChange={(e) =>
                          onChange(row.id, "name", e.target.value)
                        }
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
                    </div>
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

// ─── ExpensesSection ──────────────────────────────────────
const EXPENSE_TAB_COLORS = [
  {
    border: "border-slate-300",
    header: "bg-slate-100",
    badge: "bg-slate-200 text-slate-700",
  },
  {
    border: "border-sky-200",
    header: "bg-sky-50",
    badge: "bg-sky-100 text-sky-700",
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
  {
    border: "border-emerald-200",
    header: "bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-700",
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
            DEDUCTIONS
          </div>
          <div className="text-white/70 text-xs">
            Cash Received, Daily Pump Test, QR &amp; Card Payments
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
                      >
                        {/* Mobile layout: description full-width, then amount+delete */}
                        <div className="sm:hidden space-y-1.5">
                          <Input
                            data-ocid={`expenses.label.input.${tabIdx + 1}.${rowIdx + 1}`}
                            type="text"
                            value={row.label}
                            onChange={(e) =>
                              onChangeRow(
                                tabIdx,
                                row.id,
                                "label",
                                e.target.value,
                              )
                            }
                            placeholder="Description"
                            className="text-sm dsr-touch-input"
                          />
                          <div className="grid grid-cols-[1fr_36px] gap-2 items-center">
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
                                className="pl-6 font-mono text-sm dsr-touch-input"
                              />
                            </div>
                            <Button
                              data-ocid={`expenses.delete_button.${tabIdx + 1}.${rowIdx + 1}`}
                              variant="ghost"
                              size="icon"
                              onClick={() => onRemoveRow(tabIdx, row.id)}
                              className="h-9 w-9 text-destructive hover:bg-destructive/10 shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        {/* Desktop/tablet: 3-col grid */}
                        <div className="hidden sm:grid grid-cols-[1fr_150px_36px] gap-2 items-center">
                          <Input
                            data-ocid={`expenses.label.input.${tabIdx + 1}.${rowIdx + 1}`}
                            type="text"
                            value={row.label}
                            onChange={(e) =>
                              onChangeRow(
                                tabIdx,
                                row.id,
                                "label",
                                e.target.value,
                              )
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
                        </div>
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

// ─── SummaryPanel ─────────────────────────────────────────
interface SummaryPanelProps {
  hsdGross: number;
  msGross: number;
  engineOilTotal: number;
  totalGrossSale: number;
  expensesTabs: ExpensesTabState[];
  totalDeductions: number;
  netCashSales: number;
}

function SummaryPanel({
  hsdGross,
  msGross,
  engineOilTotal,
  totalGrossSale,
  expensesTabs,
  totalDeductions,
  netCashSales,
}: SummaryPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2, ease: "easeOut" }}
      data-ocid="summary.card"
      className="rounded-xl overflow-hidden border-2 border-sky-200 bg-white shadow-sm"
    >
      <div className="px-5 py-3.5 bg-sky-600 flex items-center gap-3">
        <TrendingUp className="w-5 h-5 text-white" />
        <div className="flex-1">
          <div className="text-white font-bold text-base tracking-wide">
            SUMMARY
          </div>
          <div className="text-white/70 text-xs">
            Total Gross Sale − Total Deductions = Net Cash Sales
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Gross sales breakdown */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-foreground/50 mb-1">
            Gross Sales
          </p>
          <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-blue-50 border border-blue-100">
            <span className="text-sm text-foreground/70">HSD Gross Sale</span>
            <span className="font-mono font-semibold text-sm text-blue-700">
              {formatINR(hsdGross)}
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-emerald-50 border border-emerald-100">
            <span className="text-sm text-foreground/70">MS Gross Sale</span>
            <span className="font-mono font-semibold text-sm text-emerald-700">
              {formatINR(msGross)}
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-amber-50 border border-amber-100">
            <span className="text-sm text-foreground/70">Engine Oil Total</span>
            <span className="font-mono font-semibold text-sm text-amber-700">
              {formatINR(engineOilTotal)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-sky-600 border border-sky-700">
            <span className="text-sm font-bold text-white uppercase tracking-wide">
              Total Gross Sale
            </span>
            <span className="font-mono font-bold text-base text-white">
              {formatINR(totalGrossSale)}
            </span>
          </div>
        </div>

        <Separator />

        {/* Deductions breakdown */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-foreground/50 mb-1">
            Deductions
          </p>
          {expensesTabs.map((tab) => {
            const tabTotal = tab.rows.reduce((s, r) => s + toNum(r.amount), 0);
            return (
              <div
                key={tab.tabName}
                className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-50 border border-slate-100"
              >
                <span className="text-sm text-foreground/70">
                  {tab.tabName}
                </span>
                <span className="font-mono font-semibold text-sm text-slate-700">
                  {formatINR(tabTotal)}
                </span>
              </div>
            );
          })}
          <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-700 border border-slate-800">
            <span className="text-sm font-bold text-white uppercase tracking-wide">
              Total Deductions
            </span>
            <span className="font-mono font-bold text-base text-white">
              {formatINR(totalDeductions)}
            </span>
          </div>
        </div>

        <Separator />

        {/* Net Cash Sales */}
        <motion.div
          key={netCashSales}
          animate={{ scale: [1, 1.015, 1] }}
          transition={{ duration: 0.25 }}
          data-ocid="summary.net_cash.card"
          className={`rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-2 ${
            netCashSales >= 0
              ? "bg-emerald-50 border-emerald-300"
              : "bg-red-50 border-red-300"
          }`}
        >
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-foreground/50 mb-1">
              Net Cash Sales
            </div>
            <div className="text-sm text-foreground/60">
              Total Gross Sale − Total Deductions
            </div>
          </div>
          <div className="flex flex-col sm:items-end gap-1">
            <div
              className={`font-mono font-bold text-3xl sm:text-4xl tracking-tight ${
                netCashSales >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {formatINR(netCashSales)}
            </div>
            <span
              className={`text-xs font-bold uppercase tracking-widest ${
                netCashSales >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {netCashSales >= 0 ? "Surplus" : "Deficit"}
            </span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── CashDenominationCalculator ───────────────────────────
interface CashDenomCalcProps {
  denoms: Record<number, DenomState>;
  onDenomChange: (denomination: number, count: string) => void;
  netCashSales: number;
}

function CashDenominationCalculator({
  denoms,
  onDenomChange,
  netCashSales,
}: CashDenomCalcProps) {
  const notesTotal = NOTES.reduce(
    (s, n) => s + n * toNum(denoms[n]?.count ?? ""),
    0,
  );
  const coinsTotal = COINS.reduce(
    (s, c) => s + c * toNum(denoms[c]?.count ?? ""),
    0,
  );
  const totalCash = notesTotal + coinsTotal;
  const diff = totalCash - netCashSales;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.25, ease: "easeOut" }}
      data-ocid="cash-calc.card"
      className="rounded-xl overflow-hidden border-2 border-slate-200 bg-white shadow-sm"
    >
      <div className="px-5 py-3.5 bg-slate-700 flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/20">
          <Coins className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="text-white font-bold text-base tracking-wide">
            CASH DENOMINATION CALCULATOR
          </div>
          <div className="text-white/70 text-xs">
            Count notes &amp; coins to verify cash
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Notes section */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-foreground/50">
            Notes
          </p>
          <div className="grid grid-cols-[auto_1fr_auto] gap-3 items-center text-xs font-bold uppercase tracking-wider text-foreground/40 px-1">
            <span className="w-14 sm:w-16">Value</span>
            <span>Count</span>
            <span className="w-20 sm:w-28 text-right">Amount</span>
          </div>
          {NOTES.map((note) => {
            const count = toNum(denoms[note]?.count ?? "");
            const subtotal = note * count;
            return (
              <div
                key={note}
                className="grid grid-cols-[auto_1fr_auto] gap-3 items-center"
              >
                <div className="w-14 sm:w-16 text-sm font-bold font-mono text-foreground/80 bg-slate-100 rounded-md px-2 py-1.5 text-center border border-slate-200">
                  ₹{note}
                </div>
                <Input
                  data-ocid={`cash-calc.note-${note}.input`}
                  type="number"
                  min="0"
                  step="1"
                  value={denoms[note]?.count ?? ""}
                  onChange={(e) => onDenomChange(note, e.target.value)}
                  placeholder="0"
                  className="font-mono text-sm dsr-touch-input"
                />
                <div className="w-20 sm:w-28 font-mono text-xs sm:text-sm font-semibold text-right text-foreground/70 bg-slate-50 rounded-md px-2 py-2 border border-slate-200">
                  {formatINR(subtotal)}
                </div>
              </div>
            );
          })}
          <div className="flex justify-end">
            <div className="text-xs text-muted-foreground font-semibold">
              Notes subtotal:{" "}
              <span className="font-mono text-foreground">
                {formatINR(notesTotal)}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Coins section */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-foreground/50">
            Coins
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {COINS.map((coin) => {
              const count = toNum(denoms[coin]?.count ?? "");
              const subtotal = coin * count;
              return (
                <div key={coin} className="space-y-1.5">
                  <div className="text-xs font-bold text-foreground/60 text-center">
                    ₹{coin} ×
                  </div>
                  <Input
                    data-ocid={`cash-calc.coin-${coin}.input`}
                    type="number"
                    min="0"
                    step="1"
                    value={denoms[coin]?.count ?? ""}
                    onChange={(e) => onDenomChange(coin, e.target.value)}
                    placeholder="0"
                    className="font-mono text-sm text-center"
                  />
                  <div className="text-xs font-mono text-center text-foreground/60">
                    = {formatINR(subtotal)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end">
            <div className="text-xs text-muted-foreground font-semibold">
              Coins subtotal:{" "}
              <span className="font-mono text-foreground">
                {formatINR(coinsTotal)}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Total Cash */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wide text-foreground/60">
              Total Cash
            </span>
            <span className="font-mono font-bold text-xl text-foreground">
              {formatINR(totalCash)}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground/60">Net Cash Sales</span>
            <span className="font-mono font-semibold text-foreground/70">
              {formatINR(netCashSales)}
            </span>
          </div>
          <Separator />
          <motion.div
            key={diff}
            animate={{ scale: [1, 1.01, 1] }}
            transition={{ duration: 0.2 }}
            data-ocid="cash-calc.result"
            className={`rounded-lg px-4 py-3 flex items-center justify-between border-2 ${
              Math.abs(diff) < 0.01
                ? "bg-slate-100 border-slate-300"
                : diff > 0
                  ? "bg-emerald-50 border-emerald-300"
                  : "bg-red-50 border-red-300"
            }`}
          >
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-foreground/50">
                Total Cash − Net Cash Sales
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {Math.abs(diff) < 0.01
                  ? "Exactly balanced"
                  : diff > 0
                    ? "Cash excess (surplus)"
                    : "Cash shortfall (deficit)"}
              </div>
            </div>
            <div
              className={`font-mono font-bold text-2xl ${
                Math.abs(diff) < 0.01
                  ? "text-foreground/50"
                  : diff > 0
                    ? "text-emerald-600"
                    : "text-red-600"
              }`}
            >
              {diff >= 0 ? "+" : ""}
              {formatINR(diff)}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main App ─────────────────────────────────────────────
export default function App() {
  // ─ Date state
  const [date, setDate] = useState(todayDate());

  // ─ HSD state (2 nozzles)
  const [hsdNozzles, setHsdNozzles] = useState<NozzleState[]>(emptyNozzles());
  const [hsdPrice, setHsdPrice] = useState("");
  const [hsdTesting, setHsdTesting] = useState("");

  // ─ MS state (2 nozzles)
  const [msNozzles, setMsNozzles] = useState<NozzleState[]>(emptyNozzles());
  const [msPrice, setMsPrice] = useState("");
  const [msTesting, setMsTesting] = useState("");

  // ─ Engine oil
  const [engineOilRows, setEngineOilRows] = useState<EngineOilRowState[]>([]);

  // ─ Expenses/deductions (4 fixed tabs)
  const [expensesTabs, setExpensesTabs] = useState<ExpensesTabState[]>(
    emptyExpenseTabs(),
  );

  // ─ Cash denominations
  const [denoms, setDenoms] = useState<Record<number, DenomState>>(
    emptyDenoms(),
  );

  // ─ UI
  const [showHistory, setShowHistory] = useState(false);
  // Track whether the current date was selected from History (load data) or typed/default (stay blank)
  const [loadDataForDate, setLoadDataForDate] = useState<string | null>(null);

  // ─── Backend hooks ────────────────────────────────────
  const { data: savedReport, isLoading: isLoadingReport } = useGetReport(date);
  const saveReportMutation = useSaveReport();
  const { data: reportDates, isLoading: isLoadingDates } = useListReportDates();

  // ─── Load saved report when date/data changes ─────────
  useEffect(() => {
    // Only populate fields when explicitly loading from history
    if (savedReport && loadDataForDate === date) {
      // HSD
      const hNozzles = emptyNozzles();
      for (let i = 0; i < Math.min(savedReport.hsdNozzles.length, 2); i++) {
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
      for (let i = 0; i < Math.min(savedReport.msNozzles.length, 2); i++) {
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

      // Expenses tabs (4 fixed)
      const FIXED_TABS = [
        "Cash Received",
        "Daily Pump Test",
        "QR Payments",
        "Card Payments",
        "Expenses",
      ];
      if (savedReport.deductionsTabs && savedReport.deductionsTabs.length > 0) {
        const mapped: ExpensesTabState[] = FIXED_TABS.map((fixedName) => {
          const saved = savedReport.deductionsTabs.find(
            (t) => t.tabName === fixedName,
          );
          return {
            tabName: fixedName,
            rows: saved
              ? saved.rows.map((r) => ({
                  id: uid(),
                  label: r.expenseLabel,
                  amount: r.amount > 0 ? r.amount.toString() : "",
                }))
              : [],
          };
        });
        setExpensesTabs(mapped);
      } else {
        setExpensesTabs(emptyExpenseTabs());
      }

      // Denomination calculator — stored in notes as JSON
      try {
        const extra = JSON.parse(savedReport.notes || "{}");
        if (extra.denoms) {
          const loaded = emptyDenoms();
          for (const key of Object.keys(extra.denoms)) {
            const k = Number(key);
            if (loaded[k] !== undefined) {
              loaded[k] = { count: extra.denoms[key] };
            }
          }
          setDenoms(loaded);
        } else {
          setDenoms(emptyDenoms());
        }
      } catch {
        setDenoms(emptyDenoms());
      }
    } else if (!isLoadingReport) {
      // Either no saved data, or date was not selected from history — always show blank fields
      setHsdNozzles(emptyNozzles());
      setMsNozzles(emptyNozzles());
      setHsdPrice("");
      setMsPrice("");
      setHsdTesting("");
      setMsTesting("");
      setEngineOilRows([]);
      setExpensesTabs(emptyExpenseTabs());
      setDenoms(emptyDenoms());
    }
  }, [savedReport, isLoadingReport, loadDataForDate, date]);

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

  const totalDeductions = useMemo(
    () =>
      expensesTabs.reduce(
        (s, tab) => s + tab.rows.reduce((ts, r) => ts + toNum(r.amount), 0),
        0,
      ),
    [expensesTabs],
  );

  const netCashSales = totalGrossSale - totalDeductions;

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

  // ─── Handlers: Denominations ──────────────────────────
  const updateDenom = useCallback((denomination: number, count: string) => {
    setDenoms((prev) => ({
      ...prev,
      [denomination]: { count },
    }));
  }, []);

  // ─── Save handler ────────────────────────────────────
  const handleSave = useCallback(async () => {
    // Serialize denom counts for storage in notes field
    const denomData: Record<number, string> = {};
    for (const k of [...NOTES, ...COINS]) {
      denomData[k] = denoms[k]?.count ?? "";
    }

    const report: DailyReport = {
      date,
      notes: JSON.stringify({ denoms: denomData }),
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
      deductionsTabs: expensesTabs.map((tab) => ({
        tabName: tab.tabName,
        rows: tab.rows.map((r) => ({
          expenseLabel: r.label,
          amount: toNum(r.amount),
        })),
      })),
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
    denoms,
    saveReportMutation,
  ]);

  // ─── History handler ─────────────────────────────────
  const handleLoadFromHistory = useCallback((historyDate: string) => {
    setLoadDataForDate(historyDate);
    setDate(historyDate);
    setShowHistory(false);
  }, []);

  // ─── Word document generation (RTF format, no lib needed) ──
  const handleDownload = useCallback(() => {
    // RTF helpers
    const h1 = (text: string) => `{\\pard\\qc\\b\\fs36 ${text}\\par}\n`;
    const h2 = (text: string) => `{\\pard\\b\\fs28 ${text}\\par}\n`;
    const h3 = (text: string) => `{\\pard\\b\\fs24 ${text}\\par}\n`;
    const para = (text: string) => `{\\pard ${text}\\par}\n`;
    const tableRow = (label: string, value: string) =>
      `{\\trowd\\trgaph108\\trleft-108\\cellx4700\\cellx9200\\pard\\intbl\\b ${label}\\cell\\pard\\intbl ${value}\\cell\\row}\n`;
    const tableHeader4 = (cols: string[]) =>
      `{\\trowd\\trgaph108\\trleft-108\\cellx2300\\cellx4600\\cellx6900\\cellx9200\\pard\\intbl\\b ${cols[0]}\\cell\\pard\\intbl\\b ${cols[1]}\\cell\\pard\\intbl\\b ${cols[2]}\\cell\\pard\\intbl\\b ${cols[3]}\\cell\\row}\n`;
    const tableRow4 = (cols: string[]) =>
      `{\\trowd\\trgaph108\\trleft-108\\cellx2300\\cellx4600\\cellx6900\\cellx9200\\pard\\intbl ${cols[0]}\\cell\\pard\\intbl ${cols[1]}\\cell\\pard\\intbl ${cols[2]}\\cell\\pard\\intbl ${cols[3]}\\cell\\row}\n`;

    const totalCashDoc = [...NOTES, ...COINS].reduce(
      (s, k) => s + k * toNum(denoms[k]?.count ?? ""),
      0,
    );
    const diffDoc = totalCashDoc - netCashSales;

    let rtf = "{\\rtf1\\ansi\\deff0\n";
    rtf += "{\\fonttbl{\\f0\\fswiss Arial;}}\n";
    rtf += "{\\colortbl;\\red0\\green0\\blue0;}\n";
    rtf += "\\f0\\fs22\n";

    rtf += h1("PUMP DAILY SALES REPORT");
    rtf += para(`Date: ${date}`);
    rtf += para("");

    rtf += h2("HSD — High Speed Diesel");
    rtf += tableRow("Price per Litre", `Rs.${hsdPrice || "0"}`);
    for (let i = 0; i < hsdNozzles.length; i++) {
      rtf += tableRow(`Nozzle ${i + 1} Opening`, hsdNozzles[i].open || "0");
      rtf += tableRow(`Nozzle ${i + 1} Closing`, hsdNozzles[i].close || "0");
      rtf += tableRow(`Nozzle ${i + 1} Volume (L)`, hsdVolumes[i].toFixed(2));
    }
    rtf += tableRow("Testing (L)", hsdTesting || "0");
    rtf += tableRow("Total Volume (L)", hsdTotalVolume.toFixed(2));
    rtf += tableRow("Total Sale (L)", hsdTotalSale.toFixed(2));
    rtf += tableRow("Gross Sale", formatINR(hsdGross));
    rtf += para("");

    rtf += h2("MS — Motor Spirit / Petrol");
    rtf += tableRow("Price per Litre", `Rs.${msPrice || "0"}`);
    for (let i = 0; i < msNozzles.length; i++) {
      rtf += tableRow(`Nozzle ${i + 1} Opening`, msNozzles[i].open || "0");
      rtf += tableRow(`Nozzle ${i + 1} Closing`, msNozzles[i].close || "0");
      rtf += tableRow(`Nozzle ${i + 1} Volume (L)`, msVolumes[i].toFixed(2));
    }
    rtf += tableRow("Testing (L)", msTesting || "0");
    rtf += tableRow("Total Volume (L)", msTotalVolume.toFixed(2));
    rtf += tableRow("Total Sale (L)", msTotalSale.toFixed(2));
    rtf += tableRow("Gross Sale", formatINR(msGross));
    rtf += para("");

    rtf += h2("Engine Oil");
    if (engineOilRows.length > 0) {
      rtf += tableHeader4(["Product", "Qty", "Price", "Total"]);
      for (const r of engineOilRows) {
        rtf += tableRow4([
          r.name || "—",
          r.quantity || "0",
          `Rs.${r.price || "0"}`,
          formatINR(toNum(r.quantity) * toNum(r.price)),
        ]);
      }
      rtf += tableRow("Engine Oil Total", formatINR(engineOilTotal));
    } else {
      rtf += para("No engine oil products.");
    }
    rtf += para("");

    rtf += h2("Total Gross Sale");
    rtf += tableRow("HSD Gross Sale", formatINR(hsdGross));
    rtf += tableRow("MS Gross Sale", formatINR(msGross));
    rtf += tableRow("Engine Oil Total", formatINR(engineOilTotal));
    rtf += tableRow("TOTAL GROSS SALE", formatINR(totalGrossSale));
    rtf += para("");

    rtf += h2("Deductions");
    for (const tab of expensesTabs) {
      const tabTotal = tab.rows.reduce((s, r) => s + toNum(r.amount), 0);
      rtf += h3(tab.tabName);
      if (tab.rows.length > 0) {
        for (const r of tab.rows) {
          rtf += tableRow(r.label || "—", formatINR(toNum(r.amount)));
        }
        rtf += tableRow("Tab Total", formatINR(tabTotal));
      } else {
        rtf += para("No entries.");
      }
    }
    rtf += tableRow("TOTAL DEDUCTIONS", formatINR(totalDeductions));
    rtf += para("");

    rtf += h2("Net Cash Sales");
    rtf += tableRow("Total Gross Sale", formatINR(totalGrossSale));
    rtf += tableRow("Total Deductions", formatINR(totalDeductions));
    rtf += tableRow("NET CASH SALES", formatINR(netCashSales));
    rtf += para("");

    rtf += h2("Cash Denomination Calculator");
    rtf += h3("Notes");
    for (const n of NOTES) {
      rtf += tableRow(
        `Rs.${n} x ${denoms[n]?.count || "0"}`,
        formatINR(n * toNum(denoms[n]?.count ?? "")),
      );
    }
    rtf += h3("Coins");
    for (const c of COINS) {
      rtf += tableRow(
        `Rs.${c} x ${denoms[c]?.count || "0"}`,
        formatINR(c * toNum(denoms[c]?.count ?? "")),
      );
    }
    rtf += tableRow("Total Cash", formatINR(totalCashDoc));
    rtf += tableRow("Net Cash Sales", formatINR(netCashSales));
    rtf += tableRow(
      "Difference (Total Cash - Net Cash Sales)",
      `${diffDoc >= 0 ? "+" : ""}${formatINR(diffDoc)}`,
    );

    rtf += "}";

    const blob = new Blob([rtf], { type: "application/rtf" });
    downloadBlob(blob, `BPCL_Report_${date}.doc`);
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
    totalDeductions,
    netCashSales,
    denoms,
  ]);

  // ─── Render ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-right" />

      {/* ── Top Bar ───────────────────────────────────── */}
      <header className="dsr-topbar no-print sticky top-0 z-50 shadow-md">
        <div className="max-w-[900px] mx-auto px-4 py-2 sm:py-3">
          {/* Mobile: 2-row layout. Tablet/Desktop: single row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            {/* Row 1 (mobile): Title + Date picker */}
            <div className="flex items-center gap-2.5">
              {/* Title */}
              <div className="flex items-center gap-2.5 mr-auto sm:mr-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/20 shrink-0">
                  <Fuel className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-white font-bold text-sm sm:text-base tracking-tight leading-none">
                    PUMP DAILY SALES REPORT
                  </h1>
                  <p className="text-white/60 text-xs hidden sm:block">
                    Petrol Bunk Daily Sales Record
                  </p>
                </div>
              </div>

              {/* Date picker — inline in row 1 on mobile, stays at end on sm+ */}
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-2.5 sm:px-3 py-1.5 border border-white/20 ml-auto sm:ml-0">
                <CalendarDays className="w-4 h-4 text-white/70 shrink-0" />
                <input
                  data-ocid="header.date.input"
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setLoadDataForDate(null);
                    setDate(e.target.value);
                  }}
                  className="bg-transparent text-white text-sm font-mono focus:outline-none w-[120px] sm:w-[130px]"
                />
              </div>
            </div>

            {/* Row 2 (mobile): Action buttons full-width. On sm+: pushed to right in single row */}
            <div className="flex items-center gap-1.5 sm:gap-2 sm:ml-auto">
              <Button
                data-ocid="header.history.button"
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(true)}
                className="text-white/90 hover:bg-white/20 hover:text-white gap-1.5 flex flex-1 sm:flex-none justify-center"
              >
                <History className="w-4 h-4" />
                <span>History</span>
              </Button>
              <Button
                data-ocid="header.save.button"
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={saveReportMutation.isPending}
                className="text-white/90 hover:bg-white/20 hover:text-white gap-1.5 flex flex-1 sm:flex-none justify-center"
              >
                {saveReportMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save</span>
              </Button>
              <Button
                data-ocid="header.download.button"
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="text-white/90 hover:bg-white/20 hover:text-white gap-1.5 flex flex-1 sm:flex-none justify-center"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </Button>
              <Button
                data-ocid="header.print.button"
                variant="ghost"
                size="sm"
                onClick={() => window.print()}
                className="text-white/90 hover:bg-white/20 hover:text-white gap-1.5 flex flex-1 sm:flex-none justify-center"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────── */}
      <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 print-container">
        {/* Loading state */}
        {isLoadingReport && (
          <div
            data-ocid="app.loading_state"
            className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-sm"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading report for {date}…
          </div>
        )}

        {/* ── HSD Card (first/top) ─────────────────────── */}
        <NozzleSection
          fuelType="hsd"
          nozzles={hsdNozzles}
          testing={hsdTesting}
          price={hsdPrice}
          onPriceChange={setHsdPrice}
          onNozzleChange={updateHsdNozzle}
          onTestingChange={setHsdTesting}
        />

        {/* ── MS Card (below HSD) ──────────────────────── */}
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

        {/* ── Deductions ──────────────────────────────── */}
        <ExpensesSection
          tabs={expensesTabs}
          onAddRow={addExpenseRow}
          onRemoveRow={removeExpenseRow}
          onChangeRow={updateExpenseRow}
        />

        {/* ── Summary ─────────────────────────────────── */}
        <SummaryPanel
          hsdGross={hsdGross}
          msGross={msGross}
          engineOilTotal={engineOilTotal}
          totalGrossSale={totalGrossSale}
          expensesTabs={expensesTabs}
          totalDeductions={totalDeductions}
          netCashSales={netCashSales}
        />

        {/* ── Cash Denomination Calculator ─────────────── */}
        <CashDenominationCalculator
          denoms={denoms}
          onDenomChange={updateDenom}
          netCashSales={netCashSales}
        />

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
                                  : "bg-primary/10 group-hover:bg-primary/15"
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
