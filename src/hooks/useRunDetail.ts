import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { logger } from "@/utils/logger";

export const runKey = (id?: string) => ["run", id] as const;

async function fetchRunDetail(id: string) {
  console.log("[재사용 ] start", id, Date.now());

  const { data, error } = await supabase
    .from("runs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  console.log("[재사용 ] done", id, Date.now(), data);

  if (error) throw error;
  return data;
}

export function useRunDetail(runId?: string) {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: runKey(runId),
    enabled: !!runId,
    queryFn: () => fetchRunDetail(runId!),
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (!runId) return;

    const channel = supabase
      .channel(`runs:${runId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "runs",
          filter: `id=eq.${runId}`,
        },
        () => {
          logger.log("\n\n[재사용 ] invalidateQueries", runId, "\n\n");
          qc.refetchQueries({
            queryKey: runKey(runId),
            exact: true,
            type: "active",
          });
          // qc.invalidateQueries({ queryKey: runKey(runId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [runId, qc]);

  return q;
}
