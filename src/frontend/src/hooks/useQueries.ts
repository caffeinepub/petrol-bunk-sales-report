import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DailyReport, Deduction, FuelData } from "../backend.d";
import { useActor } from "./useActor";

export function useGetReport(date: string) {
  const { actor, isFetching } = useActor();
  return useQuery<DailyReport | null>({
    queryKey: ["report", date],
    queryFn: async () => {
      if (!actor) return null;
      try {
        const report = await actor.getReport(date);
        return report;
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!date,
    retry: false,
  });
}

export function useListReportDates() {
  const { actor, isFetching } = useActor();
  return useQuery<string[]>({
    queryKey: ["reportDates"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listReportDates();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveReport() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      date,
      ms,
      hsd,
      deductions,
    }: {
      date: string;
      ms: FuelData;
      hsd: FuelData;
      deductions: Deduction[];
    }) => {
      if (!actor) throw new Error("Actor not available");
      const deductionTuples: [string, string, number][] = deductions.map(
        (d) => [d.type, d.description, d.amount],
      );
      await actor.saveReport(date, ms, hsd, deductionTuples);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["report", variables.date] });
      queryClient.invalidateQueries({ queryKey: ["reportDates"] });
    },
  });
}

export type { DailyReport, FuelData, Deduction };
