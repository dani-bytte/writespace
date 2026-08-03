/**
 * Type augmentation for @radix-ui/react-slot to support React 19 popover attribute
 * This is a temporary workaround until Radix UI is updated to support React 19's new attributes
 */

declare module "@radix-ui/react-slot" {
  import type * as React from "react"

  export interface SlotProps extends React.HTMLAttributes<HTMLElement> {
    // Override popover to accept React 19's new "hint" value
    popover?: "" | "auto" | "manual" | "hint"
  }

  export const Slot: React.ForwardRefExoticComponent<SlotProps & React.RefAttributes<HTMLElement>>

  export const Slottable: React.FC<{ children?: React.ReactNode }>
}
