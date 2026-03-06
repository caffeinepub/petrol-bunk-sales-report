import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DailyReport, Option, ReportEntry } from "../backend.d";
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

export function useGetReport(recordId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<DailyReport | null>({
    queryKey: ["report", recordId],
    queryFn: async () => {
      if (!actor) return null;
      try {
        const result = await actor.getReport(recordId);
        return unwrapOption<DailyReport>(
          result as unknown as Option<DailyReport>,
        );
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!recordId,
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

export function useListReportsByDevice(deviceId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<ReportEntry[]>({
    queryKey: ["reportsByDevice", deviceId],
    queryFn: async () => {
      if (!actor || !deviceId) return [];
      try {
        return await actor.listReportsByDevice(deviceId);
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching && !!deviceId,
  });
}

export function useDeleteReport() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recordId: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.deleteReport(recordId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reportsByDevice"] });
      queryClient.invalidateQueries({ queryKey: ["reportDates"] });
    },
  });
}

export function useSaveReport() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recordId,
      report,
    }: {
      recordId: string;
      report: DailyReport;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.saveReport(recordId, report);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["report", variables.recordId],
      });
      queryClient.invalidateQueries({ queryKey: ["reportsByDevice"] });
      queryClient.invalidateQueries({ queryKey: ["reportDates"] });
    },
  });
}
