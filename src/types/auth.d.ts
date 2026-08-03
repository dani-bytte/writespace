import "better-auth"
import "better-auth/react"

declare module "better-auth" {
  interface User {
    role: string
  }

  interface Session {
    user: User
  }
}

declare module "better-auth/react" {
  interface User {
    role: string
  }

  interface Session {
    user: User
  }
}
