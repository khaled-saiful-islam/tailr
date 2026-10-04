import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap, type Schemas } from "@/lib/api/client";

export type Momentum = Schemas["MomentumOut"];
export type Pulse = Schemas["PulseOut"];

export const momentumKey = ["momentum"] as const;

export function useMomentum() {
  return useQuery({
    queryKey: momentumKey,
    queryFn: () => unwrap(api.GET("/api/v1/momentum", {})),
  });
}

export function usePulse() {
  return useQuery({
    queryKey: [...momentumKey, "pulse"],
    queryFn: () => unwrap(api.GET("/api/v1/momentum/pulse", {})),
    staleTime: 10 * 60 * 1000,
  });
}

export function useSetGoal() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (weekly_applications: number) =>
      unwrap(
        api.PUT("/api/v1/momentum/goal", { body: { weekly_applications } }),
      ),
    onSuccess: (saved) => client.setQueryData(momentumKey, saved),
  });
}
