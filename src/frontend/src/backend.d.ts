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
    ms: FuelData;
    hsd: FuelData;
    deductions: Array<Deduction>;
}
export interface FuelData {
    pricePerLitre: number;
    closingReading: number;
    openingReading: number;
}
export interface Deduction {
    type: string;
    description: string;
    amount: number;
}
export interface backendInterface {
    getReport(date: string): Promise<DailyReport>;
    listReportDates(): Promise<Array<string>>;
    saveReport(date: string, ms: FuelData, hsd: FuelData, deductions: Array<[string, string, number]>): Promise<void>;
}
