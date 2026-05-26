import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://qxrqdmmmysdkpqwwogxo.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4cnFkbW1teXNka3Bxd3dvZ3hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NDg0MTAsImV4cCI6MjA5NTIyNDQxMH0.HDBP3CZfZIqlg9g85GGNnDr0La1YlCNYkHkRZlr7rPU');

async function run() {
  const usersToInsert = [
    {
      company_id: 11,
      email: 'cotabato.manager@imperial.com',
      password_hash: '$2a$06$8Kg7Zxw1T0FWERTzSLjs4umvnundDiUDxwch121z2BZu5bfNy4M6m', // bcrypt hash for 'password'
      full_name: 'Imperial Manager',
      role: 'manager',
      status: 'active'
    },
    {
      company_id: 20,
      email: 'maguindanao.manager@5aroyal.com',
      password_hash: '$2a$06$8Kg7Zxw1T0FWERTzSLjs4umvnundDiUDxwch121z2BZu5bfNy4M6m', // bcrypt hash for 'password'
      full_name: 'Maguindanao Manager',
      role: 'manager',
      status: 'active'
    },
    {
      company_id: 11,
      email: 'lanaosur.manager@glowingfortune.com',
      password_hash: '$2a$06$8Kg7Zxw1T0FWERTzSLjs4umvnundDiUDxwch121z2BZu5bfNy4M6m', // bcrypt hash for 'password'
      full_name: 'Lanaosur Manager',
      role: 'manager',
      status: 'active'
    }
  ];

  for (const user of usersToInsert) {
    const { data, error } = await supabase.from('users').insert(user);
    console.log(`Inserted user ${user.email}:`, data);
    if (error) console.error(`Error inserting ${user.email}:`, error);
  }
}

run();
