import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { ApiError } from "@/lib/api/client";
import { ThemeProvider } from "./theme";
import { useTheme } from "./theme-context";

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        // Don't retry what will fail again (auth, validation, not found).
        retry: (count, error) =>
          !(
            error instanceof ApiError &&
            error.status >= 400 &&
            error.status < 500
          ) && count < 2,
      },
    },
    mutationCache: new MutationCache(),
  });
}

function ThemedToaster() {
  const { resolved } = useTheme();
  return (
    <Toaster
      theme={resolved}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "!rounded-[12px] !border-line !bg-surface !text-ink !font-sans !shadow-sheet",
          description: "!text-ink-2",
        },
      }}
    />
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <MotionConfig reducedMotion="user">
          {children}
          <ThemedToaster />
        </MotionConfig>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
