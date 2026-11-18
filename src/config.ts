export const appConfig: AppConfig = {
  environment: (process.env.NEXT_PUBLIC_APP_ENVIRONMENT || "local") as Environment,
  httpClient: {
    requestTimeout: 15000,
  },
  queries: {
    client: {
      staleTime: Infinity,
      retries: 1,
    },
    server: {
      staleTime: Infinity,
      retries: 1,
      retryDelay: 250,
    },
  },
  site: {
    // On Vercel the production domain is known without any setup.
    url: (
      process.env.NEXT_PUBLIC_SITE_URL
      || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
      || "http://localhost:3150"
    ).replace(/\/+$/, ""),
  },
};

type Environment = "local" | "preview" | "production";

export type AppConfig = {
  environment: Environment,
  httpClient: {
    requestTimeout?: number
  },
  queries: {
    client: {
      staleTime: number,
      retries: number,
      retryDelay?: number
    },
    server: {
      staleTime: number,
      retries: number,
      retryDelay?: number
    }
  },
  site: {
    url: string
  }
};
