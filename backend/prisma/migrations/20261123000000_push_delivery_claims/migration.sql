ALTER TABLE public.push_deliveries
  ADD COLUMN claim_token varchar(64),
  ADD COLUMN claim_expires_at timestamptz;

CREATE INDEX push_deliveries_claim_expiry_idx
  ON public.push_deliveries(status, claim_expires_at);
