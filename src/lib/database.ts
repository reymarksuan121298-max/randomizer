import { gameTypes as defaultGameTypes } from "@/data/gameTypes";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { BookletBatch, GameType, NumberBet } from "@/types/lottery";
import type { Batch } from "@/pages/BatchesPage";

type DbGameType = { id: number; code: string };
type DbBooklet = { id: number; booklet_number: number };
type DbSheet = { id: number; sheet_number: number; booklet_id: number };
type DbTicket = { id: number; serial_number: string };
type DbNumberBet = { id: number; ticket_id: number; slot_number: number; payout_amount: number };

export interface CompanyRecord {
    id: string;
    name: string;
    code: string;
    address: string;
    contact: string;
}

export interface UserProfile {
    id: number;
    authUserId: string | null;
    email: string;
    fullName: string;
    role: string;
    status: string;
    company?: CompanyRecord | null;
}

const BATCH_SELECT = `
    id,
    batch_code,
    name,
    province,
    batch_date,
    status,
    total_booklets,
    total_revenue,
    total_payout,
    generated_at,
    created_at,
    companies(name, code)
`;

const DETAIL_SELECT = `
    id,
    batch_code,
    name,
    province,
    batch_date,
    total_booklets,
    total_revenue,
    total_payout,
    generated_at,
    drawRevenuePercentages:batch_draw_revenue_percentages(percentage, game_types(code, name, draw_time)),
    winningNumbers:winning_numbers(winning_number, game_types(code, name, draw_time)),
    booklets(
        id,
        booklet_number,
        revenue,
        payout,
        total_bets,
        serial_start,
        serial_end,
        booklet_sheets(
            id,
            sheet_number,
            sheet_code,
            total_bets,
            game_types(code, name, draw_time),
            tickets(
                id,
                ticket_label,
                serial_number,
                ticket_total,
                ticket_order,
                game_types(code, name, draw_time),
                number_bets(
                    id,
                    slot_number,
                    combination,
                    bet_amount,
                    is_winner,
                    payout_amount,
                    game_types(code, name, draw_time)
                )
            )
        )
    )
`;

export const databaseEnabled = () => isSupabaseConfigured;

const codeFromName = (name: string) =>
    name
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();

const normalizeCompanyCode = (code: string) => code.trim().toUpperCase().slice(0, 12) || "STL";

const toBatchSummary = (row: any): Batch => ({
    id: row.batch_code,
    name: row.name,
    province: row.province,
    date: row.batch_date,
    booklets: row.total_booklets || 0,
    revenue: `PHP ${Number(row.total_revenue || 0).toLocaleString()}`,
    createdAt: row.created_at || row.generated_at || new Date().toISOString(),
    createdBy: "Database",
    status: row.status === "pending" ? "pending" : row.status === "voided" ? "pending" : "generated",
    total_revenue: Number(row.total_revenue || 0),
    total_payout: Number(row.total_payout || 0),
});

const numberFromDb = (bet: any): NumberBet => ({
    number: bet.combination,
    bet: Number(bet.bet_amount || 0),
    label: `N${bet.slot_number}`,
    gameTypeId: bet.game_types?.code || "",
    gameTypeName: bet.game_types?.name || bet.game_types?.code || "Game",
    gameTypeTime: fromDbTime(bet.game_types?.draw_time),
    ...(Number(bet.payout_amount || 0) > 0
        ? {
            payout: Number(bet.payout_amount),
            payoutAmount: Number(bet.payout_amount),
            isWinner: true,
        }
        : {}),
} as NumberBet);

const toBatchDetail = (row: any): BookletBatch => {
    const winningNumbers: Record<string, string> = {};
    row.winningNumbers?.forEach((winner: any) => {
        const code = winner.game_types?.code;
        if (code) winningNumbers[code] = winner.winning_number;
    });

    const drawRevenuePercentages: Record<string, number> = {};
    row.drawRevenuePercentages?.forEach((entry: any) => {
        const code = entry.game_types?.code;
        if (code) drawRevenuePercentages[code] = Number(entry.percentage || 0);
    });

    return {
        id: row.batch_code,
        name: row.name,
        province: row.province,
        date: row.batch_date,
        totalBooklets: row.total_booklets,
        totalDailyRevenue: Number(row.total_revenue || 0),
        grandTotalBets: Number(row.total_revenue || 0),
        totalPayout: Number(row.total_payout || 0),
        generatedAt: row.generated_at || row.created_at,
        drawRevenuePercentages,
        booklets: (row.booklets || [])
            .sort((a: any, b: any) => a.booklet_number - b.booklet_number)
            .map((booklet: any) => ({
                id: `Booklet ${booklet.booklet_number}`,
                bookletNumber: booklet.booklet_number,
                revenue: Number(booklet.revenue || 0),
                payout: Number(booklet.payout || 0),
                totalBets: Number(booklet.total_bets || 0),
                serialStart: booklet.serial_start,
                serialEnd: booklet.serial_end,
                sheets: (booklet.booklet_sheets || [])
                    .sort((a: any, b: any) => a.sheet_number - b.sheet_number)
                    .map((sheet: any) => ({
                        id: sheet.sheet_code || String(sheet.sheet_number),
                        totalBets: Number(sheet.total_bets || 0),
                        gameTypeId: sheet.game_types?.code,
                        tickets: (sheet.tickets || [])
                            .sort((a: any, b: any) => a.ticket_order - b.ticket_order)
                            .map((ticket: any) => ({
                                label: ticket.ticket_label,
                                serialNumber: ticket.serial_number,
                                gameTypeId: ticket.game_types?.code,
                                numberBets: (ticket.number_bets || [])
                                    .sort((a: any, b: any) => a.slot_number - b.slot_number)
                                    .map(numberFromDb),
                            })),
                    })),
            })),
        winningNumbers,
    } as BookletBatch;
};

export const listBatchesFromDatabase = async (): Promise<Batch[]> => {
    if (!databaseEnabled()) return [];

    const { data, error } = await supabase
        .from("batches")
        .select(BATCH_SELECT)
        .order("batch_date", { ascending: false })
        .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(toBatchSummary);
};

export const getBatchDetailFromDatabase = async (batchCode: string): Promise<BookletBatch | null> => {
    if (!databaseEnabled()) return null;

    const { data, error } = await supabase
        .from("batches")
        .select(DETAIL_SELECT)
        .eq("batch_code", batchCode)
        .maybeSingle();

    if (error) throw error;
    return data ? toBatchDetail(data) : null;
};

export const updateBatchInDatabase = async (
    batchCode: string,
    updates: { name: string; province: string; date: string; totalPayout: number }
) => {
    if (!databaseEnabled()) return;

    const { error } = await supabase
        .from("batches")
        .update({
            name: updates.name,
            province: updates.province,
            batch_date: updates.date,
            total_payout: updates.totalPayout,
            updated_at: new Date().toISOString(),
        })
        .eq("batch_code", batchCode);

    if (error) throw error;
};

export const deleteBatchFromDatabase = async (batchCode: string) => {
    if (!databaseEnabled()) return;

    const { error } = await supabase.from("batches").delete().eq("batch_code", batchCode);
    if (error) throw error;
};

export const listCompaniesFromDatabase = async (): Promise<CompanyRecord[]> => {
    if (!databaseEnabled()) return [];

    const { data, error } = await supabase
        .from("companies")
        .select("id, name, code, address, contact_email")
        .order("name", { ascending: true });

    if (error) throw error;
    return (data || []).map((company: any) => ({
        id: String(company.id),
        name: company.name,
        code: company.code,
        address: company.address || "",
        contact: company.contact_email || "",
    }));
};

export const getUserProfileFromDatabase = async (authUserId: string, email?: string): Promise<UserProfile | null> => {
    if (!databaseEnabled()) return null;

    let query = supabase
        .from("users")
        .select("id, auth_user_id, email, full_name, role, status, companies(id, name, code, address, contact_email)")
        .limit(1);

    query = authUserId ? query.eq("auth_user_id", authUserId) : query.eq("email", email || "");

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const company = Array.isArray(data.companies) ? data.companies[0] : data.companies;

    return {
        id: data.id,
        authUserId: data.auth_user_id,
        email: data.email,
        fullName: data.full_name,
        role: data.role,
        status: data.status,
        company: company
            ? {
                id: String(company.id),
                name: company.name,
                code: company.code,
                address: company.address || "",
                contact: company.contact_email || "",
            }
            : null,
    };
};

export const saveGeneratedBatchToDatabase = async (summary: Batch, batchData: BookletBatch, options: {
    companyName: string;
    companyCode: string;
    gameTypes?: GameType[];
}) => {
    if (!databaseEnabled()) return;

    const companyCode = normalizeCompanyCode(options.companyCode);
    const companyName = options.companyName.trim();
    const sourceGameTypes = options.gameTypes || defaultGameTypes;

    const { data: company, error: companyError } = await supabase
        .from("companies")
        .upsert(
            {
                name: companyName,
                code: companyCode,
                address: batchData.province || summary.province,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "code" }
        )
        .select("id")
        .single();

    if (companyError) throw companyError;

    const gameRows = sourceGameTypes.map((gameType) => ({
        company_id: company.id,
        code: gameType.id || codeFromName(gameType.name),
        name: gameType.name,
        digits: gameType.digits,
        multiplier: gameType.multiplier,
        draw_time: gameType.time ? toDbTime(gameType.time) : null,
        is_national: gameType.isNational,
        format: gameType.gameFormat || "standard",
        number_range_min: gameType.numberRangeMin ?? null,
        number_range_max: gameType.numberRangeMax ?? null,
        ekis_multiplier: gameType.ekisMultiplier ?? null,
        rumble_multiplier: gameType.rumbleMultiplier ?? null,
        is_active: true,
        updated_at: new Date().toISOString(),
    }));

    const { data: dbGameTypes, error: gameError } = await supabase
        .from("game_types")
        .upsert(gameRows, { onConflict: "company_id,code" })
        .select("id, code");

    if (gameError) throw gameError;

    const gameTypeIds = new Map<string, number>((dbGameTypes || []).map((gameType: DbGameType) => [gameType.code, gameType.id]));
    const fallbackGameTypeId = dbGameTypes?.[0]?.id;

    const { data: batch, error: batchError } = await supabase
        .from("batches")
        .upsert(
            {
                batch_code: summary.id,
                company_id: company.id,
                name: summary.name,
                province: summary.province,
                batch_date: summary.date,
                status: summary.status === "pending" ? "pending" : "generated",
                total_booklets: summary.booklets,
                total_revenue: summary.total_revenue ?? batchData.grandTotalBets ?? 0,
                total_payout: summary.total_payout ?? batchData.totalPayout ?? 0,
                generated_at: batchData.generatedAt || summary.createdAt,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "batch_code" }
        )
        .select("id")
        .single();

    if (batchError) throw batchError;

    await replaceBatchChildren(batch.id);
    await saveWinningNumbers(batch.id, batchData, gameTypeIds, fallbackGameTypeId);
    await saveDrawPercentages(batch.id, batchData, gameTypeIds, fallbackGameTypeId);
    await saveBookletTree(batch.id, batchData, gameTypeIds, fallbackGameTypeId);
};

const replaceBatchChildren = async (batchId: number) => {
    const { error } = await supabase.from("booklets").delete().eq("batch_id", batchId);
    if (error) throw error;

    await supabase.from("winning_numbers").delete().eq("batch_id", batchId);
    await supabase.from("batch_draw_revenue_percentages").delete().eq("batch_id", batchId);
};

const saveWinningNumbers = async (
    batchId: number,
    batchData: BookletBatch,
    gameTypeIds: Map<string, number>,
    fallbackGameTypeId?: number
) => {
    const winningNumbers = (batchData as any).winningNumbers || {};
    const rows = Object.entries(winningNumbers)
        .map(([gameTypeCode, winningNumber]) => ({
            batch_id: batchId,
            game_type_id: gameTypeIds.get(gameTypeCode) || fallbackGameTypeId,
            winning_number: String(winningNumber),
        }))
        .filter((row) => row.game_type_id && row.winning_number);

    if (!rows.length) return;
    const { error } = await supabase.from("winning_numbers").insert(rows);
    if (error) throw error;
};

const saveDrawPercentages = async (
    batchId: number,
    batchData: BookletBatch,
    gameTypeIds: Map<string, number>,
    fallbackGameTypeId?: number
) => {
    const percentages = batchData.drawRevenuePercentages || {};
    const rows = Object.entries(percentages)
        .map(([gameTypeCode, percentage]) => ({
            batch_id: batchId,
            game_type_id: gameTypeIds.get(gameTypeCode) || fallbackGameTypeId,
            percentage,
        }))
        .filter((row) => row.game_type_id);

    if (!rows.length) return;
    const { error } = await supabase.from("batch_draw_revenue_percentages").insert(rows);
    if (error) throw error;
};

const saveBookletTree = async (
    batchId: number,
    batchData: BookletBatch,
    gameTypeIds: Map<string, number>,
    fallbackGameTypeId?: number
) => {
    const bookletRows = batchData.booklets.map((booklet) => ({
        batch_id: batchId,
        booklet_number: booklet.bookletNumber,
        revenue: booklet.revenue || 0,
        payout: booklet.payout || 0,
        total_bets: booklet.totalBets || booklet.revenue || 0,
        serial_start: (booklet as any).serialStart || firstSerial(booklet),
        serial_end: (booklet as any).serialEnd || lastSerial(booklet),
    }));

    const { data: dbBooklets, error: bookletError } = await supabase.from("booklets").insert(bookletRows).select("id, booklet_number");
    if (bookletError) throw bookletError;

    const bookletIds = new Map<number, number>((dbBooklets || []).map((booklet: DbBooklet) => [booklet.booklet_number, booklet.id]));
    const sheetRows = batchData.booklets.flatMap((booklet) =>
        booklet.sheets.map((sheet, index) => ({
            booklet_id: bookletIds.get(booklet.bookletNumber)!,
            sheet_number: index + 1,
            sheet_code: sheet.id,
            total_bets: sheet.totalBets || sheet.tickets.reduce((sum, ticket) => sum + ticket.numberBets.reduce((ticketSum, bet) => ticketSum + bet.bet, 0), 0),
            game_type_id: gameTypeIds.get(sheet.gameTypeId || "") || fallbackGameTypeId || null,
            source_booklet_number: booklet.bookletNumber,
            source_sheet_id: sheet.id,
        }))
    );

    const { data: dbSheets, error: sheetError } = await supabase
        .from("booklet_sheets")
        .insert(sheetRows.map(({ source_booklet_number, source_sheet_id, ...row }) => row))
        .select("id, sheet_number, booklet_id");
    if (sheetError) throw sheetError;

    const sheetsByBooklet = new Map<number, DbSheet[]>();
    (dbSheets || []).forEach((sheet: DbSheet) => {
        const list = sheetsByBooklet.get(sheet.booklet_id) || [];
        list.push(sheet);
        sheetsByBooklet.set(sheet.booklet_id, list);
    });

    const ticketRows: any[] = [];
    batchData.booklets.forEach((booklet) => {
        const dbBookletId = bookletIds.get(booklet.bookletNumber);
        const dbSheetsForBooklet = dbBookletId ? sheetsByBooklet.get(dbBookletId) || [] : [];
        booklet.sheets.forEach((sheet, sheetIndex) => {
            const dbSheet = dbSheetsForBooklet.find((item) => item.sheet_number === sheetIndex + 1);
            if (!dbSheet) return;
            sheet.tickets.forEach((ticket, ticketIndex) => {
                ticketRows.push({
                    sheet_id: dbSheet.id,
                    ticket_label: ticket.label,
                    serial_number: ticket.serialNumber || `${batchId}-${booklet.bookletNumber}-${sheetIndex + 1}-${ticketIndex + 1}`,
                    game_type_id: gameTypeIds.get(ticket.gameTypeId || "") || fallbackGameTypeId || null,
                    ticket_total: ticket.numberBets.reduce((sum, bet) => sum + bet.bet, 0),
                    ticket_order: ticketIndex + 1,
                    source_key: `${booklet.bookletNumber}:${sheetIndex}:${ticketIndex}`,
                });
            });
        });
    });

    const dbTickets = await insertInChunks<DbTicket>(
        "tickets",
        ticketRows.map(({ source_key, ...row }) => row),
        "id, serial_number"
    );

    const ticketIds = new Map<string, number>((dbTickets || []).map((ticket: DbTicket) => [ticket.serial_number, ticket.id]));
    const betRows: any[] = [];

    batchData.booklets.forEach((booklet) => {
        booklet.sheets.forEach((sheet) => {
            sheet.tickets.forEach((ticket) => {
                const dbTicketId = ticketIds.get(ticket.serialNumber || "");
                if (!dbTicketId) return;
                ticket.numberBets.slice(0, 3).forEach((bet, betIndex) => {
                    const payout = Number((bet as any).payout || (bet as any).payoutAmount || (bet as any).win || 0);
                    betRows.push({
                        ticket_id: dbTicketId,
                        game_type_id: gameTypeIds.get(bet.gameTypeId) || fallbackGameTypeId,
                        slot_number: betIndex + 1,
                        combination: bet.number,
                        bet_amount: bet.bet,
                        is_winner: payout > 0 || Boolean((bet as any).isWinner),
                        payout_amount: payout,
                    });
                });
            });
        });
    });

    const dbBets = await insertInChunks<DbNumberBet>("number_bets", betRows, "id, ticket_id, slot_number, payout_amount");

    const ticketToBooklet = new Map<number, number>();
    ticketRows.forEach((ticketRow) => {
        const dbTicketId = ticketIds.get(ticketRow.serial_number);
        if (!dbTicketId) return;
        const sheet = dbSheets?.find((item: DbSheet) => item.id === ticketRow.sheet_id);
        const booklet = dbBooklets?.find((item: DbBooklet) => item.id === sheet?.booklet_id);
        if (booklet) ticketToBooklet.set(dbTicketId, booklet.id);
    });

    const payoutRows = dbBets
        .filter((bet: DbNumberBet) => Number(bet.payout_amount || 0) > 0)
        .map((bet: DbNumberBet) => ({
            batch_id: batchId,
            booklet_id: ticketToBooklet.get(bet.ticket_id),
            number_bet_id: bet.id,
            winner_name: null,
            amount: bet.payout_amount,
        }))
        .filter((row: any) => row.booklet_id);

    if (!payoutRows.length) return;
    await insertInChunks("prize_payouts", payoutRows);
};

const firstSerial = (booklet: any) => {
    for (const sheet of booklet.sheets || []) {
        for (const ticket of sheet.tickets || []) {
            if (ticket.serialNumber) return ticket.serialNumber;
        }
    }
    return null;
};

const lastSerial = (booklet: any) => {
    const serials: string[] = [];
    for (const sheet of booklet.sheets || []) {
        for (const ticket of sheet.tickets || []) {
            if (ticket.serialNumber) serials.push(ticket.serialNumber);
        }
    }
    return serials.at(-1) || null;
};

const toDbTime = (value: string) => {
    const date = new Date(`2000-01-01 ${value}`);
    if (Number.isNaN(date.getTime())) return null;
    return date.toTimeString().slice(0, 8);
};

const fromDbTime = (value?: string | null) => {
    if (!value) return undefined;
    const [hourRaw, minute = "00"] = value.split(":");
    let hour = Number(hourRaw);
    if (!Number.isFinite(hour)) return undefined;
    const period = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${period}`;
};

const insertInChunks = async <T = any>(table: string, rows: any[], select?: string, chunkSize = 500): Promise<T[]> => {
    const inserted: T[] = [];
    for (let index = 0; index < rows.length; index += chunkSize) {
        const chunk = rows.slice(index, index + chunkSize);
        let query = supabase.from(table).insert(chunk);
        if (select) query = query.select(select) as any;

        const { data, error } = await query;
        if (error) throw error;
        if (Array.isArray(data)) inserted.push(...(data as T[]));
    }
    return inserted;
};
