-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true);

-- Create policy to allow authenticated users to upload payment proofs
CREATE POLICY "Allow public uploads to payment-proofs" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'payment-proofs');

-- Create policy to allow public read access to payment proofs
CREATE POLICY "Allow public access to payment-proofs" ON storage.objects
FOR SELECT USING (bucket_id = 'payment-proofs');

-- Create policy to allow admin users to delete payment proofs
CREATE POLICY "Allow admin delete payment-proofs" ON storage.objects
FOR DELETE USING (bucket_id = 'payment-proofs');