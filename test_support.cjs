const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://lznxtbnqwaryqkyxfwgy.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bnh0Ym5xd2FyeXFreXhmd2d5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTM1OTUyMiwiZXhwIjoyMDk2OTM1NTIyfQ.ADRZCFCW8sNiAOUmivcaCzVmGBLklqmjVq1I6hJc_qc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSupport() {
  console.log("Testing support_tickets table...");

  const { data: dRaw, error: eRaw } = await supabase.from('support_tickets').select('*').limit(3)
  console.log("Raw tickets:", eRaw ? eRaw.message : dRaw)

  const { data: dJoin, error: eJoin } = await supabase.from('support_tickets').select(`
    *,
    user:profiles!user_id(username, full_name, avatar_url)
  `).limit(3)
  console.log("Join query:", eJoin ? eJoin.message : dJoin)
}

testSupport()
