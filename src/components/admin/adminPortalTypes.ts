export type AdminGameRow = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  category_id?: string | null;
  genre?: string | null;
  status?: string | null;
  build_status?: string | null;
  cover_url?: string | null;
  thumbnail_url?: string | null;
  screenshot_urls?: string[] | null;
  iframe_url?: string | null;
  preview_url?: string | null;
  aspect_ratio?: string | null;
  tags?: string[] | null;
  desktop_controls?: unknown[] | null;
  mobile_controls?: unknown[] | null;
  build_metadata?: Record<string, unknown> | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export type AdminUploadOperation = {
  id: string;
  game_id: string;
  slug: string;
  state: string;
  build_type: string;
  compression_mode: string;
  file_count: number;
  total_bytes: number;
  verified_file_count: number;
  public_entry_url?: string | null;
  created_at: string;
  updated_at: string;
  last_error_message?: string | null;
};

export type AdminCategory = { id: string; name: string };
