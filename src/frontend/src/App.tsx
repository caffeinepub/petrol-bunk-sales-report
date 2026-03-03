import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Download,
  Fuel,
  History,
  IndianRupee,
  Loader2,
  Plus,
  Printer,
  Save,
  TrendingUp,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useGetReport,
  useListReportDates,
  useSaveReport,
} from "./hooks/useQueries";
import type { Deduction } from "./hooks/useQueries";

// ─── Types ────────────────────────────────────────────────
interface FuelState {
  pricePerLitre: string;
  openingReading: string;
  closingReading: string;
}

interface EngineOilRow {
  id: string;
  productName: string;
  quantity: string;
  price: string;
}

interface FixedDeductions {
  cashReceived: { description: string; amount: string };
  dailyPumpTest: { description: string; amount: string };
  qrPayments: { description: string; amount: string };
  cardPayments: { description: string; amount: string };
}

interface ExtraDeductionRow {
  id: string;
  label: string;
  description: string;
  amount: string;
}

type ExtraDeductions = Record<keyof FixedDeductions, ExtraDeductionRow[]>;

const EMPTY_EXTRA_DEDUCTIONS: ExtraDeductions = {
  cashReceived: [],
  dailyPumpTest: [],
  qrPayments: [],
  cardPayments: [],
};

// ─── Constants ────────────────────────────────────────────
const SAMPLE_MS: FuelState = {
  pricePerLitre: "94.50",
  openingReading: "12450.00",
  closingReading: "12892.50",
};

const SAMPLE_HSD: FuelState = {
  pricePerLitre: "87.20",
  openingReading: "8320.00",
  closingReading: "8756.00",
};

const SAMPLE_DEDUCTIONS: FixedDeductions = {
  cashReceived: { description: "", amount: "" },
  dailyPumpTest: { description: "Nozzle test", amount: "1800" },
  qrPayments: { description: "UPI collection", amount: "4500" },
  cardPayments: { description: "Card swipe", amount: "2300" },
};

const DEDUCTION_LABELS: Record<keyof FixedDeductions, string> = {
  cashReceived: "Cash Received",
  dailyPumpTest: "Daily Pump Test",
  qrPayments: "QR Payments",
  cardPayments: "Card Payments",
};

// ─── Utilities ────────────────────────────────────────────
function formatINR(value: number): string {
  return value.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function toNum(val: string): number {
  const n = Number.parseFloat(val);
  return Number.isNaN(n) ? 0 : n;
}

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Fuel Card Component ──────────────────────────────────
interface FuelCardProps {
  type: "ms" | "hsd";
  state: FuelState;
  onChange: (field: keyof FuelState, value: string) => void;
}

function FuelCard({ type, state, onChange }: FuelCardProps) {
  const isMS = type === "ms";
  const label = isMS ? "MS" : "HSD";
  const sublabel = isMS ? "Motor Spirit / Petrol" : "High Speed Diesel";
  const cardClass = isMS ? "fuel-card-ms" : "fuel-card-hsd";

  const volume = toNum(state.closingReading) - toNum(state.openingReading);
  const grossSales = volume * toNum(state.pricePerLitre);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`rounded-xl overflow-hidden shadow-sm ${cardClass}`}
    >
      {/* Card Header */}
      <div className="fuel-header relative px-5 py-4 flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20">
          <Fuel className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-white font-bold text-lg tracking-wide">
            {label}
          </div>
          <div className="text-white/70 text-xs">{sublabel}</div>
        </div>
        {/* Decorative dots */}
        <div className="fuel-dots">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 space-y-4">
        {/* Price per litre */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
            Price per Litre (₹)
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono text-foreground/50">
              ₹
            </span>
            <Input
              data-ocid={`${type}.price_input`}
              type="number"
              step="0.01"
              min="0"
              value={state.pricePerLitre}
              onChange={(e) => onChange("pricePerLitre", e.target.value)}
              className="pl-7 font-mono fuel-input bg-white/60 border-white/40 focus:bg-white"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Readings row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
              Opening Reading
            </Label>
            <Input
              data-ocid={`${type}.opening_input`}
              type="number"
              step="0.01"
              min="0"
              value={state.openingReading}
              onChange={(e) => onChange("openingReading", e.target.value)}
              className="font-mono fuel-input bg-white/60 border-white/40 focus:bg-white"
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
              Closing Reading
            </Label>
            <Input
              data-ocid={`${type}.closing_input`}
              type="number"
              step="0.01"
              min="0"
              value={state.closingReading}
              onChange={(e) => onChange("closingReading", e.target.value)}
              className="font-mono fuel-input bg-white/60 border-white/40 focus:bg-white"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Calculated Fields */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
              Volume (Litres)
            </Label>
            <div className="calc-field rounded-md px-3 py-2 font-mono text-sm font-semibold border">
              {volume >= 0 ? (
                volume.toFixed(2)
              ) : (
                <span className="text-destructive">{volume.toFixed(2)}</span>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/60">
              Gross Sales
            </Label>
            <div className="calc-field rounded-md px-3 py-2 font-mono text-sm font-semibold border">
              {formatINR(grossSales > 0 ? grossSales : 0)}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Denomination Calculator Component ────────────────────
interface RupeeCalculatorProps {
  netCashSales: number;
}

function RupeeCalculator({ netCashSales }: RupeeCalculatorProps) {
  const [qty500, setQty500] = useState("");
  const [qty200, setQty200] = useState("");
  const [qty100, setQty100] = useState("");
  const [qty50, setQty50] = useState("");
  const [qty20, setQty20] = useState("");
  const [qty10, setQty10] = useState("");
  const [qtyCoin10, setQtyCoin10] = useState("");
  const [qtyCoin5, setQtyCoin5] = useState("");
  const [qtyCoin2, setQtyCoin2] = useState("");
  const [qtyCoin1, setQtyCoin1] = useState("");

  const amt500 = 500 * toNum(qty500);
  const amt200 = 200 * toNum(qty200);
  const amt100 = 100 * toNum(qty100);
  const amt50 = 50 * toNum(qty50);
  const amt20 = 20 * toNum(qty20);
  const amt10 = 10 * toNum(qty10);
  const amtCoin10 = 10 * toNum(qtyCoin10);
  const amtCoin5 = 5 * toNum(qtyCoin5);
  const amtCoin2 = 2 * toNum(qtyCoin2);
  const amtCoin1 = 1 * toNum(qtyCoin1);

  const totalCash = useMemo(
    () =>
      amt500 +
      amt200 +
      amt100 +
      amt50 +
      amt20 +
      amt10 +
      amtCoin10 +
      amtCoin5 +
      amtCoin2 +
      amtCoin1,
    [
      amt500,
      amt200,
      amt100,
      amt50,
      amt20,
      amt10,
      amtCoin10,
      amtCoin5,
      amtCoin2,
      amtCoin1,
    ],
  );

  const difference = totalCash - netCashSales;

  const noteRows = [
    {
      denom: 500,
      qty: qty500,
      setQty: setQty500,
      amt: amt500,
      ocid: "calculator.note_500_input",
    },
    {
      denom: 200,
      qty: qty200,
      setQty: setQty200,
      amt: amt200,
      ocid: "calculator.note_200_input",
    },
    {
      denom: 100,
      qty: qty100,
      setQty: setQty100,
      amt: amt100,
      ocid: "calculator.note_100_input",
    },
    {
      denom: 50,
      qty: qty50,
      setQty: setQty50,
      amt: amt50,
      ocid: "calculator.note_50_input",
    },
    {
      denom: 20,
      qty: qty20,
      setQty: setQty20,
      amt: amt20,
      ocid: "calculator.note_20_input",
    },
    {
      denom: 10,
      qty: qty10,
      setQty: setQty10,
      amt: amt10,
      ocid: "calculator.note_10_input",
    },
  ];

  const coinRows = [
    {
      denom: 10,
      qty: qtyCoin10,
      setQty: setQtyCoin10,
      amt: amtCoin10,
      ocid: "calculator.coin_10_input",
    },
    {
      denom: 5,
      qty: qtyCoin5,
      setQty: setQtyCoin5,
      amt: amtCoin5,
      ocid: "calculator.coin_5_input",
    },
    {
      denom: 2,
      qty: qtyCoin2,
      setQty: setQtyCoin2,
      amt: amtCoin2,
      ocid: "calculator.coin_2_input",
    },
    {
      denom: 1,
      qty: qtyCoin1,
      setQty: setQtyCoin1,
      amt: amtCoin1,
      ocid: "calculator.coin_1_input",
    },
  ];

  return (
    <motion.section
      data-ocid="calculator.section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35, ease: "easeOut" }}
      className="bg-card border rounded-xl overflow-hidden shadow-sm"
    >
      {/* Section Header */}
      <div className="bg-foreground/5 border-b px-5 py-3.5 flex items-center gap-2">
        <IndianRupee className="w-4 h-4 text-foreground/60" />
        <h2 className="font-bold text-foreground tracking-tight">
          Cash Denomination Calculator
        </h2>
        <span className="ml-auto text-xs text-muted-foreground font-medium">
          Indian Rupees
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Notes Section */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Notes
          </p>
          <div className="space-y-2">
            {/* Desktop header */}
            <div className="hidden sm:grid sm:grid-cols-[100px_1fr_140px] gap-3 px-1 pb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Denomination
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Quantity
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                Amount (₹)
              </span>
            </div>

            {noteRows.map(({ denom, qty, setQty, amt, ocid }) => (
              <div
                key={denom}
                className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[100px_1fr_140px] gap-3 items-center"
              >
                {/* Denomination badge */}
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center min-w-[70px] h-8 rounded-md bg-primary/10 border border-primary/20 font-mono font-bold text-sm text-primary px-2">
                    ₹{denom}
                  </span>
                  <span className="text-muted-foreground text-sm font-medium hidden sm:inline">
                    ×
                  </span>
                </div>

                {/* Quantity input */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono sm:hidden">
                    ×
                  </span>
                  <Input
                    data-ocid={ocid}
                    type="number"
                    min="0"
                    step="1"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    placeholder="0"
                    className="font-mono bg-background text-sm sm:pl-3 pl-7"
                  />
                </div>

                {/* Calculated amount */}
                <div className="text-right font-mono font-semibold text-sm text-foreground min-w-[100px]">
                  <span className="text-muted-foreground mr-1">=</span>
                  {formatINR(amt)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coins Section — compact 4-column row */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Coins
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {coinRows.map(({ denom, qty, setQty, amt, ocid }) => (
              <div key={denom} className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <span className="inline-flex items-center justify-center min-w-[36px] h-6 rounded bg-secondary border border-border font-mono font-bold text-xs text-foreground px-1.5">
                    ₹{denom}
                  </span>
                  <span className="text-muted-foreground">×</span>
                </Label>
                <Input
                  data-ocid={ocid}
                  type="number"
                  min="0"
                  step="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="0"
                  className="font-mono bg-background text-sm h-8"
                />
                <div className="font-mono text-xs font-semibold text-foreground/70">
                  = {formatINR(amt)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total Cash */}
        <div
          data-ocid="calculator.total_cash"
          className="flex items-center justify-between bg-primary/8 rounded-xl px-5 py-4 border border-primary/20"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-foreground/60 mb-0.5">
              Total Cash
            </p>
            <p className="text-xs text-foreground/50">
              Sum of all denominations
            </p>
          </div>
          <div className="font-mono font-bold text-2xl sm:text-3xl text-primary tracking-tight">
            {formatINR(totalCash)}
          </div>
        </div>

        {/* Difference Row */}
        <motion.div
          data-ocid="calculator.difference"
          key={difference}
          animate={{ scale: [1, 1.005, 1] }}
          transition={{ duration: 0.25 }}
          className={[
            "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl px-5 py-4 border",
            difference > 0
              ? "bg-emerald-50 border-emerald-200"
              : difference < 0
                ? "bg-red-50 border-red-200"
                : "bg-muted/50 border-border",
          ].join(" ")}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-foreground/60 mb-0.5">
              Cash vs Net Sales
            </p>
            <p className="text-xs text-foreground/50">
              Total Cash − Net Cash Sales
            </p>
          </div>
          <div className="flex flex-col sm:items-end gap-0.5">
            <div
              className={[
                "font-mono font-bold text-2xl sm:text-3xl tracking-tight",
                difference > 0
                  ? "text-emerald-600"
                  : difference < 0
                    ? "text-red-600"
                    : "text-foreground/60",
              ].join(" ")}
            >
              {difference > 0
                ? `+${formatINR(difference)}`
                : difference < 0
                  ? formatINR(difference)
                  : formatINR(0)}
            </div>
            <span
              className={[
                "text-xs font-semibold uppercase tracking-wide",
                difference > 0
                  ? "text-emerald-600"
                  : difference < 0
                    ? "text-red-600"
                    : "text-muted-foreground",
              ].join(" ")}
            >
              {difference > 0
                ? "Surplus"
                : difference < 0
                  ? "Deficit"
                  : "Balanced"}
            </span>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}

// ─── Main App ─────────────────────────────────────────────
export default function App() {
  const [date, setDate] = useState(todayDate());
  const [ms, setMS] = useState<FuelState>(SAMPLE_MS);
  const [hsd, setHSD] = useState<FuelState>(SAMPLE_HSD);
  const [deductions, setDeductions] =
    useState<FixedDeductions>(SAMPLE_DEDUCTIONS);
  const [extraDeductions, setExtraDeductions] = useState<ExtraDeductions>(
    EMPTY_EXTRA_DEDUCTIONS,
  );
  const [engineOilRows, setEngineOilRows] = useState<EngineOilRow[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Backend hooks
  const { data: savedReport, isLoading: isLoadingReport } = useGetReport(date);
  const saveReportMutation = useSaveReport();
  const { data: reportDates } = useListReportDates();

  // Load saved report when date changes or data arrives
  useEffect(() => {
    if (savedReport) {
      setMS({
        pricePerLitre: savedReport.ms.pricePerLitre.toString(),
        openingReading: savedReport.ms.openingReading.toString(),
        closingReading: savedReport.ms.closingReading.toString(),
      });
      setHSD({
        pricePerLitre: savedReport.hsd.pricePerLitre.toString(),
        openingReading: savedReport.hsd.openingReading.toString(),
        closingReading: savedReport.hsd.closingReading.toString(),
      });
      if (savedReport.deductions && savedReport.deductions.length > 0) {
        const newDeds: FixedDeductions = { ...SAMPLE_DEDUCTIONS };
        for (const d of savedReport.deductions) {
          if (d.type === "Cash Received") {
            newDeds.cashReceived = {
              description: d.description,
              amount: d.amount.toString(),
            };
          } else if (d.type === "Daily Pump Test") {
            newDeds.dailyPumpTest = {
              description: d.description,
              amount: d.amount.toString(),
            };
          } else if (d.type === "QR Payments") {
            newDeds.qrPayments = {
              description: d.description,
              amount: d.amount.toString(),
            };
          } else if (d.type === "Card Payments") {
            newDeds.cardPayments = {
              description: d.description,
              amount: d.amount.toString(),
            };
          }
        }
        setDeductions(newDeds);
      }
    }
  }, [savedReport]);

  // ─── Calculations ───────────────────────────────────────
  const msVolume = toNum(ms.closingReading) - toNum(ms.openingReading);
  const msGross = Math.max(0, msVolume * toNum(ms.pricePerLitre));

  const hsdVolume = toNum(hsd.closingReading) - toNum(hsd.openingReading);
  const hsdGross = Math.max(0, hsdVolume * toNum(hsd.pricePerLitre));

  const engineOilTotal = useMemo(
    () =>
      engineOilRows.reduce(
        (sum, r) => sum + toNum(r.quantity) * toNum(r.price),
        0,
      ),
    [engineOilRows],
  );

  const totalGross = msGross + hsdGross + engineOilTotal;
  const extraDeductionsTotal = useMemo(() => {
    return (
      Object.keys(extraDeductions) as Array<keyof FixedDeductions>
    ).reduce(
      (sum, key) =>
        sum + extraDeductions[key].reduce((s, row) => s + toNum(row.amount), 0),
      0,
    );
  }, [extraDeductions]);

  const totalDeductions =
    toNum(deductions.cashReceived.amount) +
    toNum(deductions.dailyPumpTest.amount) +
    toNum(deductions.qrPayments.amount) +
    toNum(deductions.cardPayments.amount) +
    extraDeductionsTotal;
  const netCashSales = totalGross - totalDeductions;

  // ─── Handlers ───────────────────────────────────────────
  const updateMS = useCallback((field: keyof FuelState, value: string) => {
    setMS((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateHSD = useCallback((field: keyof FuelState, value: string) => {
    setHSD((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateDeduction = useCallback(
    (
      key: keyof FixedDeductions,
      field: "description" | "amount",
      value: string,
    ) => {
      setDeductions((prev) => ({
        ...prev,
        [key]: { ...prev[key], [field]: value },
      }));
    },
    [],
  );

  const addExtraRow = useCallback((key: keyof FixedDeductions) => {
    setExtraDeductions((prev) => ({
      ...prev,
      [key]: [
        ...prev[key],
        { id: `${key}-${Date.now()}`, label: "", description: "", amount: "" },
      ],
    }));
  }, []);

  const removeExtraRow = useCallback(
    (key: keyof FixedDeductions, id: string) => {
      setExtraDeductions((prev) => ({
        ...prev,
        [key]: prev[key].filter((r) => r.id !== id),
      }));
    },
    [],
  );

  const updateExtraRow = useCallback(
    (
      key: keyof FixedDeductions,
      id: string,
      field: keyof ExtraDeductionRow,
      value: string,
    ) => {
      setExtraDeductions((prev) => ({
        ...prev,
        [key]: prev[key].map((r) =>
          r.id === id ? { ...r, [field]: value } : r,
        ),
      }));
    },
    [],
  );

  // ─── Engine Oil Handlers ─────────────────────────────────
  const addEngineOilRow = useCallback(() => {
    setEngineOilRows((prev) => [
      ...prev,
      { id: Date.now().toString(), productName: "", quantity: "", price: "" },
    ]);
  }, []);

  const removeEngineOilRow = useCallback((id: string) => {
    setEngineOilRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateEngineOilRow = useCallback(
    (id: string, field: keyof EngineOilRow, value: string) => {
      setEngineOilRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
      );
    },
    [],
  );

  // ─── Word Document Generation ────────────────────────────
  const generateWordDoc = useCallback(() => {
    const dedRows = (
      Object.keys(deductions) as Array<keyof FixedDeductions>
    ).flatMap((key) => {
      const label = DEDUCTION_LABELS[key];
      const amt = toNum(deductions[key].amount);
      const fixedRow = new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: label, bold: true })],
              }),
            ],
            width: { size: 60, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun(deductions[key].description || "—")],
              }),
            ],
            width: { size: 20, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun(formatINR(amt))],
              }),
            ],
            width: { size: 20, type: WidthType.PERCENTAGE },
          }),
        ],
      });
      const extraRows = extraDeductions[key].map(
        (row) =>
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: row.label || "Extra",
                        italics: true,
                      }),
                    ],
                  }),
                ],
                width: { size: 60, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun(row.description || "—")],
                  }),
                ],
                width: { size: 20, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun(formatINR(toNum(row.amount)))],
                  }),
                ],
                width: { size: 20, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
      );
      return [fixedRow, ...extraRows];
    });

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: "Pump Daily Sales Report",
                  bold: true,
                  size: 32,
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: `Date: ${date}`,
                  size: 24,
                }),
              ],
            }),
            new Paragraph({ children: [new TextRun("")] }),

            // HSD Section
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [
                new TextRun({
                  text: "HSD (High Speed Diesel)",
                  bold: true,
                  size: 26,
                }),
              ],
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Price per Litre",
                              bold: true,
                            }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun(`₹${hsd.pricePerLitre}`)],
                        }),
                      ],
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Opening Reading",
                              bold: true,
                            }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun(hsd.openingReading)],
                        }),
                      ],
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Closing Reading",
                              bold: true,
                            }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun(hsd.closingReading)],
                        }),
                      ],
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Volume (Litres)",
                              bold: true,
                            }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun(`${hsdVolume.toFixed(2)} L`)],
                        }),
                      ],
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "Gross Sales", bold: true }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun(formatINR(hsdGross))],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            new Paragraph({ children: [new TextRun("")] }),

            // MS Section
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [
                new TextRun({
                  text: "MS (Motor Spirit / Petrol)",
                  bold: true,
                  size: 26,
                }),
              ],
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Price per Litre",
                              bold: true,
                            }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun(`₹${ms.pricePerLitre}`)],
                        }),
                      ],
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Opening Reading",
                              bold: true,
                            }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun(ms.openingReading)],
                        }),
                      ],
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Closing Reading",
                              bold: true,
                            }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun(ms.closingReading)],
                        }),
                      ],
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Volume (Litres)",
                              bold: true,
                            }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun(`${msVolume.toFixed(2)} L`)],
                        }),
                      ],
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "Gross Sales", bold: true }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun(formatINR(msGross))],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            new Paragraph({ children: [new TextRun("")] }),

            // Engine Oil Section
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [
                new TextRun({
                  text: "Engine Oil Sales",
                  bold: true,
                  size: 26,
                }),
              ],
            }),
            ...(engineOilRows.length > 0
              ? [
                  new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                      new TableRow({
                        tableHeader: true,
                        children: [
                          new TableCell({
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({ text: "Product", bold: true }),
                                ],
                              }),
                            ],
                            width: { size: 40, type: WidthType.PERCENTAGE },
                          }),
                          new TableCell({
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({ text: "Qty", bold: true }),
                                ],
                              }),
                            ],
                            width: { size: 20, type: WidthType.PERCENTAGE },
                          }),
                          new TableCell({
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({ text: "Price", bold: true }),
                                ],
                              }),
                            ],
                            width: { size: 20, type: WidthType.PERCENTAGE },
                          }),
                          new TableCell({
                            children: [
                              new Paragraph({
                                alignment: AlignmentType.RIGHT,
                                children: [
                                  new TextRun({ text: "Total", bold: true }),
                                ],
                              }),
                            ],
                            width: { size: 20, type: WidthType.PERCENTAGE },
                          }),
                        ],
                      }),
                      ...engineOilRows.map(
                        (r) =>
                          new TableRow({
                            children: [
                              new TableCell({
                                children: [
                                  new Paragraph({
                                    children: [
                                      new TextRun(r.productName || "—"),
                                    ],
                                  }),
                                ],
                                width: { size: 40, type: WidthType.PERCENTAGE },
                              }),
                              new TableCell({
                                children: [
                                  new Paragraph({
                                    children: [new TextRun(r.quantity || "0")],
                                  }),
                                ],
                                width: { size: 20, type: WidthType.PERCENTAGE },
                              }),
                              new TableCell({
                                children: [
                                  new Paragraph({
                                    children: [
                                      new TextRun(`₹${r.price || "0"}`),
                                    ],
                                  }),
                                ],
                                width: { size: 20, type: WidthType.PERCENTAGE },
                              }),
                              new TableCell({
                                children: [
                                  new Paragraph({
                                    alignment: AlignmentType.RIGHT,
                                    children: [
                                      new TextRun(
                                        formatINR(
                                          toNum(r.quantity) * toNum(r.price),
                                        ),
                                      ),
                                    ],
                                  }),
                                ],
                                width: { size: 20, type: WidthType.PERCENTAGE },
                              }),
                            ],
                          }),
                      ),
                      new TableRow({
                        children: [
                          new TableCell({
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({
                                    text: "Engine Oil Total",
                                    bold: true,
                                  }),
                                ],
                              }),
                            ],
                            width: { size: 80, type: WidthType.PERCENTAGE },
                          }),
                          new TableCell({
                            children: [
                              new Paragraph({
                                alignment: AlignmentType.RIGHT,
                                children: [
                                  new TextRun({
                                    text: formatINR(engineOilTotal),
                                    bold: true,
                                  }),
                                ],
                              }),
                            ],
                            width: { size: 20, type: WidthType.PERCENTAGE },
                          }),
                        ],
                      }),
                    ],
                  }),
                ]
              : [
                  new Paragraph({
                    children: [new TextRun("No engine oil sales recorded.")],
                  }),
                ]),
            new Paragraph({ children: [new TextRun("")] }),

            // Deductions Section
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [
                new TextRun({ text: "Deductions", bold: true, size: 26 }),
              ],
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  tableHeader: true,
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: "Type", bold: true })],
                        }),
                      ],
                      width: { size: 60, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: "Notes", bold: true }),
                          ],
                        }),
                      ],
                      width: { size: 20, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.RIGHT,
                          children: [
                            new TextRun({ text: "Amount", bold: true }),
                          ],
                        }),
                      ],
                      width: { size: 20, type: WidthType.PERCENTAGE },
                    }),
                  ],
                }),
                ...dedRows,
              ],
            }),
            new Paragraph({ children: [new TextRun("")] }),

            // Summary Section
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [
                new TextRun({ text: "Summary", bold: true, size: 26 }),
              ],
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Total Gross Sales",
                              bold: true,
                            }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.RIGHT,
                          children: [new TextRun(formatINR(totalGross))],
                        }),
                      ],
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Total Deductions",
                              bold: true,
                            }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.RIGHT,
                          children: [
                            new TextRun(`- ${formatINR(totalDeductions)}`),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Net Cash Sales",
                              bold: true,
                              size: 28,
                            }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.RIGHT,
                          children: [
                            new TextRun({
                              text: formatINR(netCashSales),
                              bold: true,
                              size: 28,
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        },
      ],
    });

    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, `BPCL_Report_${date}.docx`);
    });
  }, [
    date,
    ms,
    hsd,
    deductions,
    extraDeductions,
    engineOilRows,
    engineOilTotal,
    msVolume,
    msGross,
    hsdVolume,
    hsdGross,
    totalGross,
    totalDeductions,
    netCashSales,
  ]);

  const handleSave = async () => {
    const deductionObjs: Deduction[] = (
      Object.keys(deductions) as Array<keyof FixedDeductions>
    ).flatMap((key) => {
      const fixed: Deduction = {
        type: DEDUCTION_LABELS[key],
        description: deductions[key].description,
        amount: toNum(deductions[key].amount),
      };
      const extras: Deduction[] = extraDeductions[key].map((row) => ({
        type: row.label || `${DEDUCTION_LABELS[key]} (Extra)`,
        description: row.description,
        amount: toNum(row.amount),
      }));
      return [fixed, ...extras];
    });

    try {
      await saveReportMutation.mutateAsync({
        date,
        ms: {
          pricePerLitre: toNum(ms.pricePerLitre),
          openingReading: toNum(ms.openingReading),
          closingReading: toNum(ms.closingReading),
        },
        hsd: {
          pricePerLitre: toNum(hsd.pricePerLitre),
          openingReading: toNum(hsd.openingReading),
          closingReading: toNum(hsd.closingReading),
        },
        deductions: deductionObjs,
      });
      toast.success("Report saved successfully!");
      generateWordDoc();
    } catch {
      toast.error("Failed to save report. Please try again.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Format date for display
  const displayDate = new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Sorted dates newest first
  const sortedDates = reportDates
    ? [...reportDates].sort((a, b) => b.localeCompare(a))
    : [];

  // Fixed deduction rows config
  const deductionRows: Array<{
    key: keyof FixedDeductions;
    label: string;
    descOcid: string;
    amtOcid: string;
  }> = [
    {
      key: "cashReceived",
      label: "CASH RECEIVED",
      descOcid: "deductions.cash_received.description_input",
      amtOcid: "deductions.cash_received.amount_input",
    },
    {
      key: "dailyPumpTest",
      label: "DAILY PUMP TEST",
      descOcid: "deductions.daily_pump_test.description_input",
      amtOcid: "deductions.daily_pump_test.amount_input",
    },
    {
      key: "qrPayments",
      label: "QR PAYMENTS",
      descOcid: "deductions.qr_payments.description_input",
      amtOcid: "deductions.qr_payments.amount_input",
    },
    {
      key: "cardPayments",
      label: "CARD PAYMENTS",
      descOcid: "deductions.card_payments.description_input",
      amtOcid: "deductions.card_payments.amount_input",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />

      {/* ── Header ── */}
      <header className="bg-primary text-primary-foreground shadow-md print-header">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* BPCL Logo + Title */}
            <div className="flex items-center gap-3">
              <img
                data-ocid="header.logo"
                src="/assets/generated/bpcl-logo-transparent.dim_200x80.png"
                alt="BPCL Logo"
                className="h-12 w-auto object-contain bg-white rounded-md px-2 py-1"
              />
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">
                  Pump Daily Sales Report
                </h1>
                <p className="text-primary-foreground/70 text-xs">
                  Daily fuel sales &amp; collection tracker
                </p>
              </div>
            </div>

            {/* Date + History + Actions */}
            <div className="flex items-center gap-2 no-print flex-wrap">
              <div className="relative">
                <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50 z-10" />
                <Input
                  data-ocid="report.date_input"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-8 bg-white text-foreground border-white/30 w-auto text-sm cursor-pointer"
                />
              </div>
              <Button
                data-ocid="history.open_modal_button"
                onClick={() => setShowHistory((p) => !p)}
                size="sm"
                variant="secondary"
                className="gap-1.5 bg-white/15 text-primary-foreground hover:bg-white/25 border-0"
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">History</span>
              </Button>
              <Button
                data-ocid="report.save_button"
                onClick={handleSave}
                disabled={saveReportMutation.isPending}
                size="sm"
                variant="secondary"
                className="gap-1.5 bg-white/15 text-primary-foreground hover:bg-white/25 border-0"
              >
                {saveReportMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Save</span>
              </Button>
              <Button
                data-ocid="report.download_button"
                onClick={generateWordDoc}
                size="sm"
                variant="secondary"
                className="gap-1.5 bg-white/15 text-primary-foreground hover:bg-white/25 border-0"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
              </Button>
              <Button
                data-ocid="report.print_button"
                onClick={handlePrint}
                size="sm"
                variant="secondary"
                className="gap-1.5 bg-white/15 text-primary-foreground hover:bg-white/25 border-0"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Report History Panel ── */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            data-ocid="history.panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-card border-b shadow-sm overflow-hidden no-print"
          >
            <div className="max-w-5xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-foreground tracking-tight flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  Report History
                </h2>
                <Button
                  data-ocid="history.close_button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowHistory(false)}
                  className="h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {sortedDates.length === 0 ? (
                <div
                  data-ocid="history.empty_state"
                  className="text-center py-6 text-muted-foreground text-sm"
                >
                  No saved reports yet. Save a report to see it here.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {sortedDates.map((d, index) => (
                    <button
                      key={d}
                      type="button"
                      data-ocid={`history.item.${index + 1}`}
                      onClick={() => {
                        setDate(d);
                        setShowHistory(false);
                      }}
                      className={[
                        "rounded-lg border px-3 py-2 text-sm font-medium transition-colors text-left cursor-pointer",
                        d === date
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted border-border text-foreground",
                      ].join(" ")}
                    >
                      {new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Print-only date header */}
      <div className="hidden print:block text-center py-4 border-b">
        <p className="text-sm text-gray-600">Report Date: {displayDate}</p>
      </div>

      {/* ── Main Content ── */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6 print-container">
        {/* Loading indicator */}
        <AnimatePresence>
          {isLoadingReport && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading report for {displayDate}...
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Date display ── */}
        <div className="flex items-center gap-2 no-print">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-2">
            {displayDate}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* ── Fuel Cards: HSD first, then MS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 print-full-width">
          <FuelCard type="hsd" state={hsd} onChange={updateHSD} />
          <FuelCard type="ms" state={ms} onChange={updateMS} />
        </div>

        {/* ── Engine Oil Section ── */}
        <motion.section
          data-ocid="engine_oil.section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          className="bg-card border rounded-xl overflow-hidden shadow-sm"
        >
          {/* Section Header */}
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-3.5 flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-amber-500/20">
              <span className="text-amber-700 text-xs font-bold">🛢</span>
            </div>
            <h2 className="font-bold text-amber-900 tracking-tight flex-1">
              ENGINE OIL
            </h2>
            <Button
              data-ocid="engine_oil.add_button"
              type="button"
              size="icon"
              variant="ghost"
              onClick={addEngineOilRow}
              className="w-8 h-8 shrink-0 text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-lg border border-amber-300"
              title="Add engine oil row"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-4">
            {engineOilRows.length === 0 ? (
              <div
                data-ocid="engine_oil.empty_state"
                className="text-center py-6 text-muted-foreground text-sm"
              >
                Click <Plus className="inline w-3.5 h-3.5 mx-0.5" /> to add
                engine oil sales
              </div>
            ) : (
              <div className="space-y-2">
                {/* Column header — desktop */}
                <div className="hidden md:grid grid-cols-[1fr_130px_130px_130px_36px] gap-2 px-1 pb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Product Name
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Quantity
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Price (₹)
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Total
                  </span>
                  <span />
                </div>

                <AnimatePresence>
                  {engineOilRows.map((row, idx) => {
                    const rowTotal = toNum(row.quantity) * toNum(row.price);
                    return (
                      <motion.div
                        key={row.id}
                        data-ocid={`engine_oil.item.${idx + 1}`}
                        initial={{ opacity: 0, height: 0, y: -6 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -6 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_130px_130px_130px_36px] gap-2 items-center bg-amber-50/50 md:bg-transparent rounded-lg md:rounded-none p-3 md:p-0 border border-amber-100 md:border-0">
                          {/* Product Name */}
                          <Input
                            data-ocid={`engine_oil.product_name_input.${idx + 1}`}
                            value={row.productName}
                            onChange={(e) =>
                              updateEngineOilRow(
                                row.id,
                                "productName",
                                e.target.value,
                              )
                            }
                            placeholder="Product name (e.g. 10W-30)"
                            className="bg-background text-sm"
                          />

                          {/* Quantity */}
                          <Input
                            data-ocid={`engine_oil.quantity_input.${idx + 1}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.quantity}
                            onChange={(e) =>
                              updateEngineOilRow(
                                row.id,
                                "quantity",
                                e.target.value,
                              )
                            }
                            placeholder="0"
                            className="font-mono bg-background text-sm"
                          />

                          {/* Price */}
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono text-foreground/50">
                              ₹
                            </span>
                            <Input
                              data-ocid={`engine_oil.price_input.${idx + 1}`}
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.price}
                              onChange={(e) =>
                                updateEngineOilRow(
                                  row.id,
                                  "price",
                                  e.target.value,
                                )
                              }
                              placeholder="0.00"
                              className="pl-7 font-mono bg-background text-sm"
                            />
                          </div>

                          {/* Auto-calculated Total */}
                          <div className="flex items-center justify-between md:block">
                            <span className="text-xs text-muted-foreground md:hidden">
                              Total:
                            </span>
                            <div className="calc-field rounded-md px-3 py-2 font-mono text-sm font-semibold border text-right">
                              {formatINR(rowTotal)}
                            </div>
                          </div>

                          {/* Remove button */}
                          <Button
                            data-ocid={`engine_oil.delete_button.${idx + 1}`}
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => removeEngineOilRow(row.id)}
                            className="w-8 h-8 shrink-0 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded mx-auto md:mx-0"
                            title="Remove this row"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Engine Oil Total row */}
                <div className="flex items-center justify-between bg-amber-50 rounded-lg px-4 py-3 border border-amber-200 mt-1">
                  <span className="font-semibold text-amber-900 text-sm">
                    Engine Oil Total
                  </span>
                  <span className="font-mono font-bold text-amber-900">
                    {formatINR(engineOilTotal)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.section>

        {/* ── Deductions Section ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
          className="bg-card border rounded-xl overflow-hidden shadow-sm"
        >
          <div className="bg-foreground/5 border-b px-5 py-3.5">
            <h2 className="font-bold text-foreground tracking-tight">
              Deductions
            </h2>
          </div>

          <div className="p-4">
            <div className="space-y-3">
              {/* Table header — desktop */}
              <div className="hidden md:grid grid-cols-[180px_1fr_160px] gap-3 px-1 pb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Type
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description / Notes
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Amount (₹)
                </span>
              </div>

              {deductionRows.map((row) => (
                <div key={row.key} className="space-y-2">
                  {/* Fixed row */}
                  <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_160px] gap-2 items-center bg-muted/20 md:bg-transparent rounded-lg md:rounded-none p-3 md:p-0">
                    {/* Fixed label + add button */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold uppercase tracking-wide text-foreground flex-1">
                        {row.label}
                      </span>
                      <Button
                        data-ocid={`deductions.${row.key}.add_button`}
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => addExtraRow(row.key)}
                        className="w-6 h-6 shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded"
                        title={`Add sub-row under ${row.label}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Description input */}
                    <Input
                      data-ocid={row.descOcid}
                      value={deductions[row.key].description}
                      onChange={(e) =>
                        updateDeduction(row.key, "description", e.target.value)
                      }
                      placeholder="Reference / note"
                      className="bg-background text-sm"
                    />

                    {/* Amount input */}
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono text-foreground/50">
                        ₹
                      </span>
                      <Input
                        data-ocid={row.amtOcid}
                        type="number"
                        step="0.01"
                        min="0"
                        value={deductions[row.key].amount}
                        onChange={(e) =>
                          updateDeduction(row.key, "amount", e.target.value)
                        }
                        placeholder="0.00"
                        className="pl-7 font-mono bg-background text-sm"
                      />
                    </div>
                  </div>

                  {/* Extra rows — full main rows, same layout as fixed rows */}
                  <AnimatePresence>
                    {extraDeductions[row.key].map((extraRow, idx) => (
                      <motion.div
                        key={extraRow.id}
                        data-ocid={`deductions.${row.key}.extra.item.${idx + 1}`}
                        initial={{ opacity: 0, height: 0, y: -6 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -6 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_160px] gap-2 items-center bg-muted/20 md:bg-transparent rounded-lg md:rounded-none p-3 md:p-0">
                          {/* Editable label input */}
                          <div className="flex items-center gap-1.5">
                            <Input
                              data-ocid={`deductions.${row.key}.extra.label_input.${idx + 1}`}
                              value={extraRow.label}
                              onChange={(e) =>
                                updateExtraRow(
                                  row.key,
                                  extraRow.id,
                                  "label",
                                  e.target.value,
                                )
                              }
                              placeholder="Row name"
                              className="bg-background text-sm h-9 flex-1 font-medium"
                            />
                          </div>

                          {/* Description input */}
                          <Input
                            data-ocid={`deductions.${row.key}.extra.description_input.${idx + 1}`}
                            value={extraRow.description}
                            onChange={(e) =>
                              updateExtraRow(
                                row.key,
                                extraRow.id,
                                "description",
                                e.target.value,
                              )
                            }
                            placeholder="Reference / note"
                            className="bg-background text-sm"
                          />

                          {/* Amount input + remove button */}
                          <div className="flex items-center gap-1.5">
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono text-foreground/50">
                                ₹
                              </span>
                              <Input
                                data-ocid={`deductions.${row.key}.extra.amount_input.${idx + 1}`}
                                type="number"
                                step="0.01"
                                min="0"
                                value={extraRow.amount}
                                onChange={(e) =>
                                  updateExtraRow(
                                    row.key,
                                    extraRow.id,
                                    "amount",
                                    e.target.value,
                                  )
                                }
                                placeholder="0.00"
                                className="pl-7 font-mono bg-background text-sm"
                              />
                            </div>
                            <Button
                              data-ocid={`deductions.${row.key}.extra.delete_button.${idx + 1}`}
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                removeExtraRow(row.key, extraRow.id)
                              }
                              className="w-8 h-8 shrink-0 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded"
                              title="Remove this row"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── Summary Section ── */}
        <motion.section
          data-ocid="summary.section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25, ease: "easeOut" }}
          className="bg-card border rounded-xl overflow-hidden shadow-sm"
        >
          <div className="bg-foreground/5 border-b px-5 py-3.5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-foreground/60" />
            <h2 className="font-bold text-foreground tracking-tight">
              Daily Summary
            </h2>
          </div>

          <div className="p-5 space-y-4">
            {/* Fuel Sales Breakdown — HSD first, MS second, then Engine Oil */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* HSD Sales */}
              <div className="bg-background rounded-lg border p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground/70 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[oklch(0.38_0.18_255)]" />
                    HSD Sales
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {hsdVolume >= 0 ? hsdVolume.toFixed(2) : 0} L
                  </span>
                </div>
                <div className="font-mono font-bold text-xl text-foreground">
                  {formatINR(hsdGross)}
                </div>
              </div>

              {/* MS Sales */}
              <div className="bg-background rounded-lg border p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground/70 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[oklch(0.55_0.15_175)]" />
                    MS Sales
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {msVolume >= 0 ? msVolume.toFixed(2) : 0} L
                  </span>
                </div>
                <div className="font-mono font-bold text-xl text-foreground">
                  {formatINR(msGross)}
                </div>
              </div>

              {/* Engine Oil Sales — shown only when relevant */}
              {(engineOilTotal > 0 || engineOilRows.length > 0) && (
                <div className="bg-amber-50 rounded-lg border border-amber-200 p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      Engine Oil Sales
                    </span>
                    <span className="text-xs text-amber-600">
                      {engineOilRows.length}{" "}
                      {engineOilRows.length === 1 ? "product" : "products"}
                    </span>
                  </div>
                  <div className="font-mono font-bold text-xl text-amber-900">
                    {formatINR(engineOilTotal)}
                  </div>
                </div>
              )}
            </div>

            {/* Total Gross */}
            <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3 border">
              <span className="font-semibold text-foreground/80">
                Total Gross Sales
              </span>
              <span className="font-mono font-bold text-lg text-foreground">
                {formatINR(totalGross)}
              </span>
            </div>

            {/* Deductions Breakdown */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Deductions
              </p>
              {deductionRows.map((row) => (
                <div key={row.key} className="space-y-1">
                  {/* Fixed row */}
                  <div className="flex items-center justify-between py-2 px-4 rounded-lg bg-muted/20 border border-border/50">
                    <span className="text-sm text-foreground/70">
                      <span className="font-medium text-foreground">
                        {row.label}
                      </span>
                      {deductions[row.key].description && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          — {deductions[row.key].description}
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-sm font-semibold text-destructive">
                      − {formatINR(toNum(deductions[row.key].amount))}
                    </span>
                  </div>

                  {/* Extra rows in summary — same level as fixed rows */}
                  {extraDeductions[row.key].map((extraRow) => (
                    <div
                      key={extraRow.id}
                      className="flex items-center justify-between py-2 px-4 rounded-lg bg-muted/20 border border-border/50"
                    >
                      <span className="text-sm text-foreground/70">
                        <span className="font-medium text-foreground">
                          {extraRow.label || "Extra"}
                        </span>
                        {extraRow.description && (
                          <span className="text-muted-foreground ml-2 text-xs">
                            — {extraRow.description}
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-sm font-semibold text-destructive">
                        − {formatINR(toNum(extraRow.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              ))}

              {/* Total Deductions */}
              <div className="flex items-center justify-between bg-destructive/8 rounded-lg px-4 py-3 border border-destructive/20">
                <span className="font-semibold text-foreground/80">
                  Total Deductions
                </span>
                <span className="font-mono font-bold text-lg text-destructive">
                  − {formatINR(totalDeductions)}
                </span>
              </div>
            </div>

            {/* Net Cash Sales — Hero row */}
            <motion.div
              key={netCashSales}
              animate={{ scale: [1, 1.01, 1] }}
              transition={{ duration: 0.3 }}
              className="net-sales-card rounded-xl p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-foreground/60 mb-0.5">
                    Net Cash Sales
                  </p>
                  <p className="text-xs text-foreground/50">
                    Gross Sales − Total Deductions
                  </p>
                </div>
                <div className="net-sales-value font-mono font-bold text-3xl sm:text-4xl tracking-tight">
                  {formatINR(netCashSales)}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* ── Rupee Denomination Calculator ── */}
        <RupeeCalculator netCashSales={netCashSales} />
      </main>

      {/* ── Footer ── */}
      <footer className="mt-8 py-5 border-t no-print">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
              window.location.hostname,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Built with ♥ using caffeine.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
