ALTER TABLE payments
ADD COLUMN transaction_no TEXT,
ADD COLUMN bank_code TEXT,
ADD COLUMN vnp_response_code TEXT,
ADD COLUMN paid_at TIMESTAMPTZ;