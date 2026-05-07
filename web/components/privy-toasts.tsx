"use client";

import type { ReactNode } from "react";
import { useLogin, useLogout } from "@privy-io/react-auth";
import { toast } from "sonner";

export function PrivyToasts({ children }: { children: ReactNode }) {
  useLogin({
    onComplete: ({ isNewUser, wasAlreadyAuthenticated }) => {
      if (wasAlreadyAuthenticated) return;
      toast.success(isNewUser ? "Welcome to raffl!" : "Connected");
    },
    onError: (error) => {
      toast.error(`Login failed: ${error}`);
    },
  });

  useLogout({
    onSuccess: () => {
      toast("Disconnected");
    },
  });

  return <>{children}</>;
}
