export const formStyles = {
  container: "space-y-4",
  field: "space-y-2",
  input: "bg-background/50",
  button: {
    primary: "w-full bg-primary hover:bg-primary/90",
    outline: "w-full bg-background/50 hover:bg-accent/20",
    link: "variant-link",
  },
  error: "p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 rounded-lg",
  success: "p-4 text-sm text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400 rounded-lg",
  separator: "relative",
  separatorLine: "absolute inset-0 flex items-center",
  separatorText: "relative flex justify-center text-xs uppercase",
  separatorBg: "bg-card px-2 text-muted-foreground",
} as const
