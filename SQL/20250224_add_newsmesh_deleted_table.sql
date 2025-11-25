-- Soft-delete table for Newsmesh records suppressed from the admin view
CREATE TABLE IF NOT EXISTS public.newsmesh_deleted (
  id TEXT PRIMARY KEY,
  stream TEXT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.newsmesh_deleted IS 'Tracks Newsmesh ids that are soft-deleted from the admin UI.';
COMMENT ON COLUMN public.newsmesh_deleted.id IS 'Newsmesh record id (matches newsmesh_union_view.id).';
