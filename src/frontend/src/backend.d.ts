import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface DailyReport {
    msPrice: number;
    msTesting: number;
    msNozzles: Array<Nozzle>;
    hsdPrice: number;
    date: string;
    notes: string;
    previousDayBalanceCash: number;
    hsdTesting: number;
    expensesTabs: Array<ExpensesTab>;
    hsdNozzles: Array<Nozzle>;
    engineOilRows: Array<EngineOilRow>;
}
export interface EngineOilRow {
    name: string;
    quantity: number;
    price: number;
}
export interface Nozzle {
    closeReading: number;
    openReading: number;
}
export interface ExpenseRow {
    expenseLabel: string;
    amount: number;
}
export interface ExpensesTab {
    tabName: string;
    rows: Array<ExpenseRow>;
}
export interface backendInterface {
    deleteReport(date: string): Promise<void>;
    getReport(date: string): Promise<DailyReport | null>;
    listReportDates(): Promise<Array<string>>;
    saveReport(date: string, report: DailyReport): Promise<void>;
}
