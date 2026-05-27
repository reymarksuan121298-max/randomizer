-- Enable RLS and add read policies for all winner name tables
ALTER TABLE lanaosur_winners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON lanaosur_winners;
CREATE POLICY "Enable read access for all users" ON lanaosur_winners FOR SELECT USING (true);

ALTER TABLE lanaonorte_winners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON lanaonorte_winners;
CREATE POLICY "Enable read access for all users" ON lanaonorte_winners FOR SELECT USING (true);

ALTER TABLE maguindanao_winners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON maguindanao_winners;
CREATE POLICY "Enable read access for all users" ON maguindanao_winners FOR SELECT USING (true);

ALTER TABLE cotabato_winners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON cotabato_winners;
CREATE POLICY "Enable read access for all users" ON cotabato_winners FOR SELECT USING (true);
