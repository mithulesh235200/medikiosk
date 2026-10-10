// Minimal Vercel serverless types (avoids requiring @vercel/node locally).
export interface VercelRequest {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any;
  headers: Record<string, string | string[] | undefined>;
}

export interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  end: (body?: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

