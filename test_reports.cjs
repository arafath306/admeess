const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://lznxtbnqwaryqkyxfwgy.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bnh0Ym5xd2FyeXFreXhmd2d5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTM1OTUyMiwiZXhwIjoyMDk2OTM1NTIyfQ.ADRZCFCW8sNiAOUmivcaCzVmGBLklqmjVq1I6hJc_qc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testReports() {
  console.log("Testing exact working query...");

  const { data: dB, error: eB } = await supabase.from('reports').select(`
    id, reason, status, action_taken, created_at, thread_id, comment_id, user_id,
    user:profiles!user_id(username, full_name, avatar_url),
    thread:threads!thread_id(
      id, content, created_at, image_urls, video_url,
      user:profiles!user_id(username, full_name, avatar_url)
    )
  `).limit(5)
  
  if (eB) {
    console.error("Error:", eB.message)
  } else {
    console.log("SUCCESS! Fetched", dB.length, "reports.")
    console.log("Sample report with thread:", JSON.stringify(dB.find(r => r.thread_id !== null), null, 2))
  }
}

testReports()
