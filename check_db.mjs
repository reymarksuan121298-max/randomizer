import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://qxrqdmmmysdkpqwwogxo.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4cnFkbW1teXNka3Bxd3dvZ3hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NDg0MTAsImV4cCI6MjA5NTIyNDQxMH0.HDBP3CZfZIqlg9g85GGNnDr0La1YlCNYkHkRZlr7rPU');

async function run() {
  const { data: companies, error } = await supabase.from('companies').select('*');
  console.log('Companies:', companies);
  console.log('Error:', error);
}
run();
