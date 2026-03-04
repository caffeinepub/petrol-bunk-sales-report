import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DailyReport } from "../backend.d";
import { useActor } from "./useActor";

export function useGetReport(date: string) {
  const { actor, isFetching } = useActor();
  return useQuery<DailyReport | null>({
    queryKey: ["report", date],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getReport(date);
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
      report,
    }: {
      date: string;
      report: DailyReport;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.saveReport(date, report);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["report", variables.date] });
      queryClient.invalidateQueries({ queryKey: ["reportDates"] });
    },
  });
}
