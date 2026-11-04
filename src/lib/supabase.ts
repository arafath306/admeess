import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lznxtbnqwaryqkyxfwgy.supabase.co'
// Using Service Role key for admin panel to bypass RLS
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bnh0Ym5xd2FyeXFreXhmd2d5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTM1OTUyMiwiZXhwIjoyMDk2OTM1NTIyfQ.ADRZCFCW8sNiAOUmivcaCzVmGBLklqmjVq1I6hJc_qc'

export const supabase = createClient(supabaseUrl, supabaseKey)
