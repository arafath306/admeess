const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://lznxtbnqwaryqkyxfwgy.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bnh0Ym5xd2FyeXFreXhmd2d5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTM1OTUyMiwiZXhwIjoyMDk2OTM1NTIyfQ.ADRZCFCW8sNiAOUmivcaCzVmGBLklqmjVq1I6hJc_qc'

const supabase = createClient(supabaseUrl, supabaseKey)

const testStatuses = [
  'Pending', 'Open', 'New', 
  'Under Review', 'under review', 'Reviewed',
  'Planned', 'planned', 
  'In Progress', 'in progress',
  'Implemented', 'implemented', 
  'Rejected', 'rejected', 'Closed'
]

async function testAll() {
  console.log("Testing statuses for beta_features...");
  for (const status of testStatuses) {
    const { error } = await supabase
      .from('beta_features')
      .update({ status })
      .not('id', 'is', null)
      .limit(1)
      .select()
      
    if (!error) {
      console.log(`✅ '${status}' is ALLOWED`);
    } else if (error.code !== '23514') {
      console.log(`❓ '${status}' failed with other error:`, error.message);
    }
  }
}

testAll()
