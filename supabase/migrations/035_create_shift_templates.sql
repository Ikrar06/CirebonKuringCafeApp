-- Create shift_templates table
CREATE TABLE IF NOT EXISTS public.shift_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    shift_start TIME NOT NULL,
    shift_end TIME NOT NULL,
    break_duration INTEGER DEFAULT 30,
    color VARCHAR(7) DEFAULT '#3B82F6',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.shift_templates ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read shift templates
CREATE POLICY "Allow authenticated users to read shift templates"
    ON public.shift_templates
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert shift templates
CREATE POLICY "Allow authenticated users to insert shift templates"
    ON public.shift_templates
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update shift templates
CREATE POLICY "Allow authenticated users to update shift templates"
    ON public.shift_templates
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to delete shift templates
CREATE POLICY "Allow authenticated users to delete shift templates"
    ON public.shift_templates
    FOR DELETE
    TO authenticated
    USING (true);

-- Add index for faster queries
CREATE INDEX idx_shift_templates_created_at ON public.shift_templates(created_at DESC);

-- Add comment
COMMENT ON TABLE public.shift_templates IS 'Reusable shift templates for scheduling';
