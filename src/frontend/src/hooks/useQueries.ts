import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DailyReport, Option } from "../backend.d";
import { useActor } from "./useActor";

function unwrapOption<T>(opt: Option<T> | T | null | undefined): T | null {
  if (opt === null || opt === undefined) return null;
  // ICP SDK wraps Motoko ?T as { __kind__: "Some", value: T } | { __kind__: "None" }
  if (
    typeof opt === "object" &&
    opt !== null &&
    "__kind__" in (opt as object)
  ) {
    const o = opt as { __kind__: string; value?: T };
    if (o.__kind__ === "Some" && o.value !== undefined) return o.value;
    if (o.__kind__ === "None") return null;
  }
  // Already unwrapped (direct value)
  return opt as T;
}

export function useGetReport(date: string) {
  const { actor, isFetching } = useActor();
  return useQuery<DailyReport | null>({
    queryKey: ["report", date],
    queryFn: async () => {
      if (!actor) return null;
      try {
        const result = await actor.getReport(date);
        return unwrapOption<DailyReport>(
          result as unknown as Option<DailyReport>,
        );
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

export function useDeleteReport() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (date: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.deleteReport(date);
    },
    onSuccess: (_, date) => {
      queryClient.invalidateQueries({ queryKey: ["report", date] });
      queryClient.invalidateQueries({ queryKey: ["reportDates"] });
    },
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
