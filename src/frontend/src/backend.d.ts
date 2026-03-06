import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface DeductionRow {
    expenseLabel: string;
    amount: number;
}
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
    deviceId: string;
    savedAt: string;
    hsdTesting: number;
    hsdNozzles: Array<Nozzle>;
    stationName: string;
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
export interface ReportEntry {
    id: string;
    report: DailyReport;
}
export interface backendInterface {
    deleteReport(recordId: string): Promise<void>;
    getReport(recordId: string): Promise<DailyReport | null>;
    listReportDates(): Promise<Array<string>>;
    listReportsByDevice(deviceId: string): Promise<Array<ReportEntry>>;
    saveReport(recordId: string, report: DailyReport): Promise<void>;
}
