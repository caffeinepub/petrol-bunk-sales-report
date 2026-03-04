import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface DeductionsTab {
    tabName: string;
    rows: Array<DeductionRow>;
}
export interface DailyReport {
    msPrice: number;
    msTesting: number;
    msNozzles: Array<Nozzle>;
    hsdPrice: number;
    date: string;
    notes: string;
    hsdTesting: number;
    hsdNozzles: Array<Nozzle>;
    engineOilRows: Array<EngineOilRow>;
    deductionsTabs: Array<DeductionsTab>;
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
export interface DeductionRow {
    expenseLabel: string;
    amount: number;
}
export interface backendInterface {
    deleteReport(date: string): Promise<void>;
    getReport(date: string): Promise<DailyReport | null>;
    listReportDates(): Promise<Array<string>>;
    saveReport(date: string, report: DailyReport): Promise<void>;
}
