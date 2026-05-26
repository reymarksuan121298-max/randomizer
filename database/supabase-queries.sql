-- Supabase query reference for database/schema.sql
-- All id columns are auto-incrementing BIGINT identity columns.
-- Do not include id in INSERT statements. Use RETURNING id, then pass that id
-- into child-table foreign keys.

-- USERS / LOGIN

-- Create a user.
INSERT INTO users (email, password_hash, full_name, role)
VALUES (lower(:email), :password_hash, :full_name, :role)
RETURNING id, email, full_name, role, status, created_at;

-- Find a user for login.
SELECT id, email, password_hash, full_name, role, status, failed_login_attempts, locked_until
FROM users
WHERE email = lower(:email)
LIMIT 1;

-- Successful login.
UPDATE users
SET last_login_at = now(),
    failed_login_attempts = 0,
    locked_until = NULL,
    updated_at = now()
WHERE id = :user_id
RETURNING id, email, full_name, role, status, last_login_at;

INSERT INTO login_events (user_id, email, succeeded, ip_address, user_agent)
VALUES (:user_id, lower(:email), true, :ip_address, :user_agent)
RETURNING id;

INSERT INTO user_sessions (user_id, refresh_token_hash, user_agent, ip_address, expires_at)
VALUES (:user_id, :refresh_token_hash, :user_agent, :ip_address, :expires_at)
RETURNING id, user_id, expires_at, created_at;

-- Failed login.
UPDATE users
SET failed_login_attempts = failed_login_attempts + 1,
    locked_until = CASE
        WHEN failed_login_attempts + 1 >= 5 THEN now() + interval '15 minutes'
        ELSE locked_until
    END,
    status = CASE
        WHEN failed_login_attempts + 1 >= 5 THEN 'locked'::user_status
        ELSE status
    END,
    updated_at = now()
WHERE email = lower(:email)
RETURNING id, email, failed_login_attempts, locked_until, status;

INSERT INTO login_events (user_id, email, succeeded, failure_reason, ip_address, user_agent)
VALUES (:user_id, lower(:email), false, :failure_reason, :ip_address, :user_agent)
RETURNING id;

-- Revoke a session.
UPDATE user_sessions
SET revoked_at = now()
WHERE id = :session_id
  AND user_id = :user_id
RETURNING id, revoked_at;

-- COMPANIES

INSERT INTO companies (name, code, address, contact_email, contact_phone, created_by_user_id)
VALUES (:name, upper(:code), :address, :contact_email, :contact_phone, :created_by_user_id)
RETURNING id, name, code, address, contact_email, contact_phone, created_at;

SELECT id, name, code, address, contact_email, contact_phone, created_at, updated_at
FROM companies
ORDER BY name;

UPDATE companies
SET name = :name,
    code = upper(:code),
    address = :address,
    contact_email = :contact_email,
    contact_phone = :contact_phone,
    updated_at = now()
WHERE id = :company_id
RETURNING id, name, code, address, contact_email, contact_phone, updated_at;

-- COMPANY SETTINGS

INSERT INTO company_settings (
    company_id, province, city, status, prize_fund_percentage, 
    agent_commission_percentage, report_frequency, logos, 
    municipalities, report_details, winner_names
)
VALUES (
    :company_id, :province, :city, :status, :prize_fund_percentage, 
    :agent_commission_percentage, :report_frequency, :logos, 
    :municipalities, :report_details, :winner_names
)
ON CONFLICT (company_id) 
DO UPDATE SET 
    province = EXCLUDED.province,
    city = EXCLUDED.city,
    status = EXCLUDED.status,
    prize_fund_percentage = EXCLUDED.prize_fund_percentage,
    agent_commission_percentage = EXCLUDED.agent_commission_percentage,
    report_frequency = EXCLUDED.report_frequency,
    logos = EXCLUDED.logos,
    municipalities = EXCLUDED.municipalities,
    report_details = EXCLUDED.report_details,
    winner_names = EXCLUDED.winner_names,
    updated_at = now()
RETURNING *;

SELECT * FROM company_settings WHERE company_id = :company_id LIMIT 1;

-- GAME TYPES

INSERT INTO game_types (
    company_id,
    code,
    name,
    digits,
    multiplier,
    draw_time,
    is_national,
    format,
    number_range_min,
    number_range_max,
    ekis_multiplier,
    rumble_multiplier
)
VALUES (
    :company_id,
    :code,
    :name,
    :digits,
    :multiplier,
    :draw_time,
    :is_national,
    :format,
    :number_range_min,
    :number_range_max,
    :ekis_multiplier,
    :rumble_multiplier
)
RETURNING id, company_id, code, name, digits, multiplier, draw_time, is_national, format;

SELECT id, company_id, code, name, digits, multiplier, draw_time, is_national, format, is_active
FROM game_types
WHERE company_id = :company_id
ORDER BY draw_time NULLS LAST, name;

-- BATCHES

INSERT INTO batches (
    batch_code,
    company_id,
    name,
    province,
    batch_date,
    status,
    total_booklets,
    total_revenue,
    total_payout,
    generated_at,
    created_by_user_id
)
VALUES (
    :batch_code,
    :company_id,
    :name,
    :province,
    :batch_date,
    :status,
    :total_booklets,
    :total_revenue,
    :total_payout,
    :generated_at,
    :created_by_user_id
)
RETURNING id, batch_code, name, province, batch_date, status, total_booklets, total_revenue, total_payout;

SELECT b.*,
       c.name AS company_name,
       u.full_name AS created_by_name
FROM batches b
LEFT JOIN companies c ON c.id = b.company_id
LEFT JOIN users u ON u.id = b.created_by_user_id
WHERE b.id = :batch_id;

SELECT b.*,
       c.name AS company_name,
       u.full_name AS created_by_name
FROM batches b
LEFT JOIN companies c ON c.id = b.company_id
LEFT JOIN users u ON u.id = b.created_by_user_id
WHERE b.batch_code = :batch_code
LIMIT 1;

SELECT id, batch_code, name, province, batch_date, status, total_booklets, total_revenue, total_payout, created_at
FROM batches
WHERE company_id = :company_id
ORDER BY batch_date DESC, created_at DESC;

UPDATE batches
SET status = :status,
    total_booklets = :total_booklets,
    total_revenue = :total_revenue,
    total_payout = :total_payout,
    generated_at = COALESCE(:generated_at, generated_at),
    updated_at = now()
WHERE id = :batch_id
RETURNING id, batch_code, status, total_booklets, total_revenue, total_payout, updated_at;

-- DRAW DISTRIBUTION AND WINNING NUMBERS

INSERT INTO batch_draw_revenue_percentages (batch_id, game_type_id, percentage)
VALUES (:batch_id, :game_type_id, :percentage)
ON CONFLICT (batch_id, game_type_id)
DO UPDATE SET percentage = EXCLUDED.percentage
RETURNING id, batch_id, game_type_id, percentage;

INSERT INTO winning_numbers (batch_id, game_type_id, winning_number)
VALUES (:batch_id, :game_type_id, :winning_number)
ON CONFLICT (batch_id, game_type_id)
DO UPDATE SET winning_number = EXCLUDED.winning_number
RETURNING id, batch_id, game_type_id, winning_number;

SELECT wn.id, wn.winning_number, gt.name, gt.draw_time, gt.is_national, gt.multiplier
FROM winning_numbers wn
JOIN game_types gt ON gt.id = wn.game_type_id
WHERE wn.batch_id = :batch_id
ORDER BY gt.draw_time NULLS LAST, gt.name;

-- BOOKLETS / SHEETS / TICKETS / BETS

INSERT INTO booklets (batch_id, booklet_number, revenue, payout, total_bets, serial_start, serial_end)
VALUES (:batch_id, :booklet_number, :revenue, :payout, :total_bets, :serial_start, :serial_end)
RETURNING id, batch_id, booklet_number;

INSERT INTO booklet_sheets (booklet_id, sheet_number, sheet_code, total_bets, game_type_id)
VALUES (:booklet_id, :sheet_number, :sheet_code, :total_bets, :game_type_id)
RETURNING id, booklet_id, sheet_number, sheet_code;

INSERT INTO tickets (sheet_id, ticket_label, serial_number, game_type_id, ticket_total, ticket_order)
VALUES (:sheet_id, :ticket_label, :serial_number, :game_type_id, :ticket_total, :ticket_order)
RETURNING id, sheet_id, ticket_label, serial_number;

INSERT INTO number_bets (
    ticket_id,
    game_type_id,
    slot_number,
    combination,
    bet_amount,
    is_winner,
    payout_amount
)
VALUES (
    :ticket_id,
    :game_type_id,
    :slot_number,
    :combination,
    :bet_amount,
    :is_winner,
    :payout_amount
)
RETURNING id, ticket_id, game_type_id, slot_number;

-- All Tickets workbook tab.
SELECT bk.booklet_number AS booklet,
       bs.sheet_number AS sheet,
       t.ticket_label AS ticket,
       t.serial_number AS serial,
       gt.name AS game,
       gt.draw_time AS time,
       MAX(CASE WHEN nb.slot_number = 1 THEN nb.combination END) AS comb_1,
       MAX(CASE WHEN nb.slot_number = 1 THEN nb.bet_amount END) AS bet_1,
       MAX(CASE WHEN nb.slot_number = 2 THEN nb.combination END) AS comb_2,
       MAX(CASE WHEN nb.slot_number = 2 THEN nb.bet_amount END) AS bet_2,
       MAX(CASE WHEN nb.slot_number = 3 THEN nb.combination END) AS comb_3,
       MAX(CASE WHEN nb.slot_number = 3 THEN nb.bet_amount END) AS bet_3,
       t.ticket_total AS total,
       gt.multiplier AS mult,
       SUM(nb.payout_amount) AS win,
       BOOL_OR(nb.is_winner) AS is_winner
FROM tickets t
JOIN booklet_sheets bs ON bs.id = t.sheet_id
JOIN booklets bk ON bk.id = bs.booklet_id
LEFT JOIN game_types gt ON gt.id = t.game_type_id
LEFT JOIN number_bets nb ON nb.ticket_id = t.id
WHERE bk.batch_id = :batch_id
GROUP BY bk.booklet_number, bs.sheet_number, t.ticket_label, t.serial_number, gt.name, gt.draw_time, t.ticket_total, gt.multiplier
ORDER BY bk.booklet_number, bs.sheet_number, t.ticket_order;

-- PRIZE PAYOUTS / ALPHA LIST

INSERT INTO prize_payouts (batch_id, booklet_id, number_bet_id, winner_name, amount)
VALUES (:batch_id, :booklet_id, :number_bet_id, :winner_name, :amount)
RETURNING id, batch_id, booklet_id, number_bet_id, amount;

SELECT gt.name AS game_name,
       gt.draw_time,
       t.serial_number,
       t.ticket_label AS letter,
       nb.combination,
       nb.bet_amount AS bet,
       pp.winner_name,
       pp.amount
FROM prize_payouts pp
JOIN number_bets nb ON nb.id = pp.number_bet_id
JOIN tickets t ON t.id = nb.ticket_id
JOIN game_types gt ON gt.id = nb.game_type_id
JOIN booklets bk ON bk.id = pp.booklet_id
WHERE pp.batch_id = :batch_id
  AND bk.booklet_number = :booklet_number
ORDER BY gt.draw_time NULLS LAST, t.serial_number;

-- EXPORT FILES

INSERT INTO export_files (batch_id, export_type, file_name, file_path, generated_by_user_id)
VALUES (:batch_id, :export_type, :file_name, :file_path, :generated_by_user_id)
RETURNING id, batch_id, export_type, file_name, generated_at;

SELECT id, export_type, file_name, file_path, generated_at
FROM export_files
WHERE batch_id = :batch_id
ORDER BY generated_at DESC;

