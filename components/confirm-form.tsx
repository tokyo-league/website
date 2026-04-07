"use client";

import type { FormHTMLAttributes, ReactNode } from "react";

type ConfirmFormProps = Omit<FormHTMLAttributes<HTMLFormElement>, "children"> & {
  message: string;
  children: ReactNode;
};

export function ConfirmForm({ message, onSubmit, children, ...props }: ConfirmFormProps) {
  return (
    <form
      {...props}
      onSubmit={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
          return;
        }

        onSubmit?.(event);
      }}
    >
      {children}
    </form>
  );
}
