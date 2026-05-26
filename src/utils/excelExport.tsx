import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { BookletBatch, Booklet, NumberBet, Ticket } from '@/types/lottery';
import { getCompanySettings, getUserProfileFromDatabase, databaseEnabled } from "@/lib/database";

const FILIPINO_FIRST_NAMES = [
    "Juan", "Jose", "Pedro", "Manuel", "Antonio", "Francisco", "Mario", "Danilo", "Renato", "Roberto", 
    "Eduardo", "Rolando", "Reynaldo", "Rogelio", "Alfredo", "Alberto", "Rodolfo", "Ferdinand", "Joseph", "Michael", 
    "Christopher", "John", "Christian", "David", "Mark", "James", "Daniel", "Angelo", "Joshua", "Gabriel", 
    "Ethan", "Alexander", "Miguel", "Rafael", "Jayson", "Alden", "Kenneth", "Gerald", "Ryan", "Nelson",
    "Maria", "Ana", "Teresa", "Josefina", "Carmen", "Loida", "Lourdes", "Elizabeth", "Corazon", "Imelda", 
    "Gloria", "Susan", "Evelyn", "Fe", "Erlinda", "Norma", "Yolanda", "Leonora", "Dolores", "Mercy", 
    "Jessica", "Jennifer", "Joy", "Mary", "Grace", "Sarah", "Patricia", "Bianca", "Angel", "Kyla", 
    "Andrea", "Sophia", "Chloe", "Nicole", "Samantha", "Jasmine", "Angela", "Christine", "Camille", "Cherry"
];

const FILIPINO_LAST_NAMES = [
    "Santos", "Reyes", "Cruz", "Bautista", "Ocampo", "dela Cruz", "Garcia", "Mendoza", "Ramos", "Aquino", 
    "Flores", "Gonzales", "Castillo", "Dizon", "Castro", "Hernandez", "Salazar", "Perez", "Valenzuela", "Del Rosario", 
    "Santiago", "Pascual", "Tolentino", "Soriano", "Marcos", "de Guzman", "Villanueva", "Mercado", "Espiritu", "Macaraeg", 
    "Dimaculangan", "Catacutan", "Agoncillo", "Laurel", "Recto", "Quezon", "Roxas", "Osmeña", "Duterte", "Robredo", 
    "Binay", "Poe", "Villar", "Cayetano", "Sotto", "Pacquiao", "Revilla", "Lapid"
];

const DEFAULT_FILIPINO_NAMES: string[] = (() => {
    const namesSet = new Set<string>();
    while (namesSet.size < 550) {
        const first = FILIPINO_FIRST_NAMES[Math.floor(Math.random() * FILIPINO_FIRST_NAMES.length)];
        const last = FILIPINO_LAST_NAMES[Math.floor(Math.random() * FILIPINO_LAST_NAMES.length)];
        namesSet.add(`${first} ${last}`);
    }
    return Array.from(namesSet);
})();

export async function getWinnerNamesList(): Promise<string[]> {
    if (!databaseEnabled()) return [];
    try {
        const userId = localStorage.getItem('user_id');
        if (!userId) return [];
        const profile = await getUserProfileFromDatabase(Number(userId));
        if (!profile?.company?.id) return [];
        const settings = await getCompanySettings(Number(profile.company.id));
        if (settings?.winnerNames) {
            const list = settings.winnerNames.split('\n').map((n: string) => n.trim()).filter(Boolean);
            if (list.length > 0) return list;
        }
    } catch (error) {
        console.error("Failed to load winner names list:", error);
    }
    return [];
}

const COLORS = {
    blue: '4472C4',
    green: '70AD47',
    yellow: 'FFC000',
    purple: '7030A0',
    dark: '595959',
    lightBlue: 'D9E2F3',
    lightYellow: 'FFE699',
    gold: 'D6A000',
    white: 'FFFFFF',
    border: '000000',
    profit: '00B050',
};

const DRAW_EXCEL_COLORS: Record<string, string> = {
    '10:30 AM': 'FFE699',
    '2:00 PM': 'FF9999',
    '3:00 PM': '9BC2E6',
    '5:00 PM': 'A9D08E',
    '7:00 PM': 'FFFFFF',
    '9:00 PM': 'BDD7EE',
};

type BetRow = {
    bookletNumber: number;
    sheetNumber: number;
    ticket: Ticket;
    game: string;
    time: string;
    type: string;
    multiplier: number;
    bets: Array<NumberBet | undefined>;
    total: number;
    payout: number;
    isWinner: boolean;
    winnerName?: string;
};

type WinnerRow = {
    bookletNumber: number;
    game: string;
    time: string;
    serialNumber: string;
    letter: string;
    combination: string;
    bet: number;
    amount: number;
    winnerName?: string;
};

type GameStat = {
    game: string;
    time: string;
    type: string;
    multiplier: number;
    bets: number;
    amount: number;
    winners: number;
    payout: number;
};

type ReportData = {
    rows: BetRow[];
    winners: WinnerRow[];
    stats: GameStat[];
    winningNumbers: Array<{ game: string; time: string; type: string; number: string }>;
};

export async function exportToExcel(batch: BookletBatch, booklets: Booklet[] = batch.booklets) {
    const winnerNames = await getWinnerNamesList();
    const workbook = buildFullReportWorkbook({ ...batch, booklets }, winnerNames);
    const buffer = await workbook.xlsx.writeBuffer();
    const data = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });
    saveAs(data, `${safeFileName(batch.name || batch.id || 'STL_Batch')}_Report.xlsx`);
}

export function buildFullReportWorkbook(batch: BookletBatch, winnerNames: string[] = []) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'STL Randomizer System';
    workbook.created = new Date();
    workbook.modified = new Date();

    const report = buildReportData(batch, winnerNames);
    addSummarySheet(workbook, batch, report);
    addAllTicketsSheet(workbook, report);

    batch.booklets.forEach((booklet) => {
        addBookletSheet(workbook, batch, booklet, report);
        addAlphaSheet(workbook, batch, booklet, report);
    });

    return workbook;
}

export function buildAlphaListWorkbook(batch: BookletBatch, winnerNames: string[] = []) {
    const workbook = new ExcelJS.Workbook();
    const report = buildReportData(batch, winnerNames);

    batch.booklets.forEach((booklet) => addAlphaSheet(workbook, batch, booklet, report));

    return workbook;
}

export function buildCsvRows(batch: BookletBatch) {
    const report = buildReportData(batch);

    return report.rows.flatMap((row) =>
        row.bets
            .filter((bet): bet is NumberBet => Boolean(bet))
            .map((bet, index) => ({
                booklet: row.bookletNumber,
                sheet: row.sheetNumber,
                ticket: row.ticket.label,
                serial: row.ticket.serialNumber || '',
                game: row.game,
                time: row.time,
                slot: index + 1,
                combination: bet.number,
                bet: bet.bet,
                payout: getBetPayout(bet, row.multiplier),
            }))
    );
}

function addSummarySheet(workbook: ExcelJS.Workbook, batch: BookletBatch, report: ReportData) {
    const sheet = workbook.addWorksheet('Summary', {
        views: [{ state: 'frozen', ySplit: 27 }],
    });

    sheet.columns = [
        { width: 20 },
        { width: 20 },
        { width: 15 },
        { width: 12 },
        { width: 10 },
        { width: 15 },
        { width: 12 },
        { width: 10 },
        { width: 15 },
        { width: 15 },
    ];

    mergeTitle(sheet, 'A1:F1', 'STL RANDOMIZER SYSTEM', 22, COLORS.gold);
    mergeTitle(sheet, 'A2:F2', batch.name || batch.province || 'STL Batch', 16, '000000');

    section(sheet, 'A4:B4', 'BATCH INFORMATION', COLORS.blue);
    rows(sheet, 5, [
        ['Batch Name:', batch.id || batch.name || ''],
        ['Province:', batch.province || batch.name || ''],
        ['Batch Date:', formatDate(batch.date)],
        ['Created By:', (batch as any).createdBy || 'Not recorded'],
        ['Total Booklets:', batch.booklets.length],
    ]);

    section(sheet, 'A11:B11', 'FINANCIAL SUMMARY', COLORS.green);
    sheet.getCell('A12').value = 'Total Revenue:';
    sheet.getCell('B12').value = { formula: `SUM('All Tickets'!M3:M${report.rows.length + 2})`, result: batch.grandTotalBets };
    sheet.getCell('A13').value = 'Total Payout:';
    sheet.getCell('B13').value = { formula: `SUM('All Tickets'!O3:O${report.rows.length + 2})`, result: report.winners.reduce((s, w) => s + w.amount, 0) || batch.totalPayout || 0 };
    sheet.getCell('A14').value = 'Net Profit:';
    sheet.getCell('B14').value = { formula: 'B12-B13', result: batch.grandTotalBets - (batch.totalPayout || 0) };
    sheet.getCell('A15').value = 'Profit Margin:';
    sheet.getCell('B15').value = { formula: 'IF(B12=0,0,B14/B12)', result: batch.grandTotalBets ? (batch.grandTotalBets - (batch.totalPayout || 0)) / batch.grandTotalBets : 0 };
    styleLabelValueBlock(sheet, 12, 15);
    sheet.getCell('B12').numFmt = currencyFmt;
    sheet.getCell('B13').numFmt = currencyFmt;
    sheet.getCell('B14').numFmt = currencyFmt;
    sheet.getCell('B14').font = { bold: true, color: { argb: COLORS.profit } };
    sheet.getCell('B15').numFmt = '0.00%';

    section(sheet, 'A17:D17', 'WINNING NUMBERS', COLORS.yellow);
    header(sheet.getRow(18), ['Game Type', 'Time', 'Type', 'Number']);
    report.winningNumbers.forEach((winner, index) => {
        const row = sheet.getRow(19 + index);
        row.values = [winner.game, winner.time, winner.type, winner.number];
        row.getCell(4).font = { bold: true, size: 14, color: { argb: COLORS.gold } };
        row.getCell(4).alignment = { horizontal: 'center' };
        borderRow(row, 4);
    });

    section(sheet, 'A26:J26', 'STATISTICS BY GAME TYPE', COLORS.purple);
    header(sheet.getRow(27), ['Game Type', 'Time', 'Type', 'Multiplier', 'Bets', 'Amount', 'Avg Bet', 'Winners', 'Payout', 'Profit/Loss']);
    report.stats.forEach((stat, index) => {
        const rowNumber = 28 + index;
        const row = sheet.getRow(rowNumber);
        row.values = [
            stat.game,
            stat.time,
            stat.type,
            `${stat.multiplier}x`,
            stat.bets,
            stat.amount,
            { formula: `IF(E${rowNumber}=0,0,F${rowNumber}/E${rowNumber})`, result: stat.bets ? Math.round(stat.amount / stat.bets) : 0 },
            stat.winners,
            stat.payout,
            { formula: `F${rowNumber}-I${rowNumber}`, result: stat.amount - stat.payout },
        ];
        row.getCell(6).numFmt = numberFmt;
        row.getCell(9).numFmt = numberFmt;
        row.getCell(10).numFmt = numberFmt;
        row.getCell(10).font = { bold: true, color: { argb: COLORS.profit } };
        borderRow(row, 10);
    });

    const totalRowNumber = 28 + report.stats.length;
    const totalRow = sheet.getRow(totalRowNumber);
    totalRow.values = [
        'GRAND TOTALS',
        '',
        '',
        '',
        { formula: `SUM(E28:E${totalRowNumber - 1})`, result: report.stats.reduce((s, r) => s + r.bets, 0) },
        { formula: `SUM(F28:F${totalRowNumber - 1})`, result: batch.grandTotalBets },
        '',
        { formula: `SUM(H28:H${totalRowNumber - 1})`, result: report.stats.reduce((s, r) => s + r.winners, 0) },
        { formula: `SUM(I28:I${totalRowNumber - 1})`, result: batch.totalPayout || 0 },
        { formula: `SUM(J28:J${totalRowNumber - 1})`, result: batch.grandTotalBets - (batch.totalPayout || 0) },
    ];
    totalRow.font = { bold: true };
    totalRow.fill = solid(COLORS.lightBlue);
    totalRow.eachCell((cell) => {
        cell.border = thinBorder();
        if (typeof cell.value === 'number' || typeof cell.value === 'object') {
            cell.numFmt = numberFmt;
        }
    });
}

function addAllTicketsSheet(workbook: ExcelJS.Workbook, report: ReportData) {
    const sheet = workbook.addWorksheet('All Tickets', {
        views: [{ state: 'frozen', ySplit: 2 }],
    });
    sheet.columns = [
        { width: 10 },
        { width: 8 },
        { width: 8 },
        { width: 18 },
        { width: 12 },
        { width: 12 },
        { width: 10 },
        { width: 8 },
        { width: 10 },
        { width: 8 },
        { width: 10 },
        { width: 8 },
        { width: 10 },
        { width: 8 },
        { width: 12 },
        { width: 15 },
    ];

    section(sheet, 'A1:P1', 'ALL TICKETS DATA', COLORS.blue);
    header(sheet.getRow(2), ['Booklet', 'Sheet', 'Ticket', 'Serial', 'Game', 'Time', 'Comb 1', 'Bet 1', 'Comb 2', 'Bet 2', 'Comb 3', 'Bet 3', 'Total', 'Mult', 'Win', 'IsWinner']);

    report.rows.forEach((entry, index) => {
        const row = sheet.getRow(index + 3);
        const [a, b, c] = entry.bets;
        row.values = [
            entry.bookletNumber,
            entry.sheetNumber,
            entry.ticket.label,
            entry.ticket.serialNumber || '',
            entry.game,
            entry.time,
            a?.number || '',
            a?.bet || '',
            b?.number || '',
            b?.bet || '',
            c?.number || '',
            c?.bet || '',
            { formula: `SUM(H${index + 3},J${index + 3},L${index + 3})`, result: entry.total },
            entry.multiplier,
            entry.payout,
            entry.isWinner ? 'YES' : '',
        ];
        [8, 10, 12, 13, 15].forEach((col) => (row.getCell(col).numFmt = numberFmt));
        row.eachCell((cell) => {
            cell.border = thinBorder('D9D9D9');
        });
        if (entry.isWinner) {
            row.fill = solid(COLORS.lightYellow);
        }
    });


}

function addBookletSheet(workbook: ExcelJS.Workbook, batch: BookletBatch, booklet: Booklet, report: ReportData) {
    const sheet = workbook.addWorksheet(`Booklet ${booklet.bookletNumber}`, {
        views: [{ state: 'frozen', ySplit: 12 }],
    });

    sheet.columns = [
        { width: 15 },
        { width: 12 },
        { width: 18 },
        { width: 8 },
        { width: 10 },
        { width: 10 },
        { width: 10 },
        { width: 10 },
        { width: 10 },
        { width: 10 },
        { width: 25 },
    ];

    mergeTitle(sheet, 'A1:J1', batch.name || batch.province || 'STL Batch', 11, '000000');
    mergeTitle(sheet, 'A2:J2', batch.province || '', 10, '000000');
    mergeTitle(sheet, 'A3:J3', formatLongDate(batch.date), 10, '000000');
    section(sheet, 'A4:J4', 'WINNING NUMBERS', COLORS.yellow);

    const winners = report.winningNumbers.slice(0, 6);
    sheet.getRow(5).values = winners.map((w) => w.time);
    sheet.getRow(6).values = winners.map((w) => w.game);
    sheet.getRow(7).values = winners.map((w) => w.number);
    [5, 6, 7].forEach((rowNumber) => {
        sheet.getRow(rowNumber).font = { bold: true, color: { argb: '000000' } };
        sheet.getRow(rowNumber).alignment = { horizontal: 'center' };
        sheet.getRow(rowNumber).eachCell((cell) => {
            cell.border = thinBorder();
        });
    });

    winners.forEach((w, idx) => {
        const col = idx + 1; // A is 1
        const bgColor = DRAW_EXCEL_COLORS[w.time] || 'FFFFFF';
        sheet.getRow(7).getCell(col).fill = solid(bgColor);
    });

    sheet.getRow(9).values = [`BOOKLET ${booklet.bookletNumber}`, 'SERIAL NUMBER', '', 'COMB.', 'BET.', 'COMB.', 'BET.', 'COMB.', 'BET.', 'TOTAL GROSS'];
    sheet.getRow(10).values = ['', '', '', '', '', '', '', '', '', { formula: `SUM(F13:F262,H13:H262,J13:J262)`, result: booklet.revenue }];
    sheet.getCell('J10').numFmt = currencyFmt;
    sheet.getCell('J10').font = { bold: true, color: { argb: COLORS.profit } };
    sheet.getRow(9).font = { bold: true };
    sheet.getRow(9).fill = solid(COLORS.lightBlue);

    header(sheet.getRow(12), ['GAME TYPE', 'TIME', 'SERIAL NUMBER', 'LETTER', 'COMB.', 'BET.', 'COMB.', 'BET.', 'COMB.', 'BET.'], COLORS.blue);

    const bookletRows = report.rows.filter((row) => row.bookletNumber === booklet.bookletNumber);
    bookletRows.forEach((entry, index) => {
        const rowNumber = 13 + index;
        const row = sheet.getRow(rowNumber);
        const [a, b, c] = entry.bets;
        
        const rowValues: any[] = [
            entry.game,
            entry.time,
            entry.ticket.serialNumber || '',
            entry.ticket.label,
            a?.number || '',
            a?.bet || '',
            b?.number || '',
            b?.bet || '',
            c?.number || '',
            c?.bet || '',
        ];

        if (entry.isWinner && entry.winnerName) {
            rowValues.push(entry.winnerName);
        }

        row.values = rowValues;
        
        [6, 8, 10].forEach((col) => (row.getCell(col).numFmt = numberFmt));
        
        row.eachCell((cell) => {
            cell.border = thinBorder();
        });

        // Apply light green management color to BET columns
        [6, 8, 10].forEach((col) => {
            row.getCell(col).fill = solid('E2EFDA');
        });

        const hasWinner = entry.payout > 0;
        if (hasWinner) {
            row.eachCell((cell) => {
                cell.fill = solid(COLORS.lightYellow);
            });
        }

        const checkWinner = (bet: NumberBet | undefined, colOffset: number) => {
            if (bet && getBetPayout(bet, entry.multiplier, (batch as any).winningNumbers || {}) > 0) {
                const cell = row.getCell(colOffset);
                cell.fill = solid(COLORS.yellow);
                cell.font = { bold: true, color: { argb: COLORS.white } };
            }
        };

        checkWinner(a, 5);
        checkWinner(b, 7);
        checkWinner(c, 9);
    });


}

function addAlphaSheet(workbook: ExcelJS.Workbook, batch: BookletBatch, booklet: Booklet, report: ReportData) {
    const sheet = workbook.addWorksheet(`Alpha List Booklet ${booklet.bookletNumber}`, {
        views: [{ state: 'frozen', ySplit: 7 }],
    });
    sheet.columns = [
        { width: 18 },
        { width: 12 },
        { width: 15 },
        { width: 8 },
        { width: 14 },
        { width: 12 },
        { width: 30 },
        { width: 15 },
    ];

    mergeTitle(sheet, 'A1:H1', 'ALPHA LIST - PRIZE PAYOUT UTILIZATION REPORT', 16, '000000');
    mergeTitle(sheet, 'A2:H2', (batch.name || '').toUpperCase(), 13, '000000');
    mergeTitle(sheet, 'A3:H3', (batch.province || '').toUpperCase(), 11, '000000');
    mergeTitle(sheet, 'A4:H4', formatLongDate(batch.date), 11, '000000');
    section(sheet, 'A5:H5', `BOOKLET ${booklet.bookletNumber}`, COLORS.blue);

    header(sheet.getRow(7), ['Game Name/Code', 'Draw Time', 'Serial Number', 'Letter', 'Combination', 'Bet', 'Name of Winner', 'Amount'], 'D9D9D9', '000000');

    const winners = report.winners.filter((winner) => winner.bookletNumber === booklet.bookletNumber);
    winners.forEach((winner, index) => {
        const rowNumber = 8 + index;
        const row = sheet.getRow(rowNumber);
        row.values = [winner.game, winner.time, winner.serialNumber, winner.letter, winner.combination, winner.bet, (winner as any).winnerName || '', winner.amount];
        row.getCell(6).numFmt = currencyFmt;
        row.getCell(8).numFmt = currencyFmt;
        row.eachCell((cell) => {
            cell.border = thinBorder();
        });
    });

    const totalRowNumber = 8 + winners.length;
    const totalRow = sheet.getRow(totalRowNumber);
    totalRow.values = ['', '', '', '', '', '', 'TOTAL', { formula: `SUM(H8:H${totalRowNumber - 1})`, result: winners.reduce((sum, winner) => sum + winner.amount, 0) }];
    totalRow.font = { bold: true };
    totalRow.fill = solid(COLORS.lightYellow);
    totalRow.getCell(8).numFmt = currencyFmt;
    totalRow.eachCell((cell) => {
        cell.border = thinBorder();
    });
}

function stripTime(gameName: string) {
    return gameName.replace(/ \d{1,2}:\d{2} [AP]M/i, '').trim();
}

function buildReportData(batch: BookletBatch, winnerNames: string[] = []): ReportData {
    const rows: BetRow[] = [];
    const winners: WinnerRow[] = [];
    const statsMap = new Map<string, GameStat>();
    const winningNumberMap = new Map<string, { game: string; time: string; type: string; number: string }>();
    const configuredWinners = ((batch as any).winningNumbers || {}) as Record<string, string>;

    const shuffledNames = winnerNames && winnerNames.length > 0 
        ? [...winnerNames].sort(() => Math.random() - 0.5) 
        : [...DEFAULT_FILIPINO_NAMES].sort(() => Math.random() - 0.5);
    let nameIndex = 0;
    const getRandomWinnerName = () => {
        const name = shuffledNames[nameIndex % shuffledNames.length];
        nameIndex++;
        return name;
    };

    batch.booklets.forEach((booklet) => {
        booklet.sheets.forEach((sheet, sheetIndex) => {
            sheet.tickets.forEach((ticket) => {
                const bets = ticket.numberBets.slice(0, 3);
                const firstBet = bets[0];
                const rawGame = firstBet?.gameTypeName || 'Game';
                const game = stripTime(rawGame);
                const time = firstBet?.gameTypeTime || '';
                const type = isLocalGame(game) ? 'Local' : 'National';
                const multiplier = getMultiplier(firstBet);
                const total = bets.reduce((sum, bet) => sum + (bet?.bet || 0), 0);
                const payout = bets.reduce((sum, bet) => sum + getBetPayout(bet, multiplier, configuredWinners), 0);
                const isWinner = payout > 0;
                const sheetNumber = sheetIndex + 1;
                const ticketWinnerName = isWinner ? getRandomWinnerName() : undefined;

                rows.push({
                    bookletNumber: booklet.bookletNumber,
                    sheetNumber,
                    ticket,
                    game,
                    time,
                    type,
                    multiplier,
                    bets,
                    total,
                    payout,
                    isWinner,
                    winnerName: ticketWinnerName,
                });

                bets.forEach((bet) => {
                    if (!bet) return;
                    const key = `${bet.gameTypeName}|${bet.gameTypeTime || ''}`;
                    if (!statsMap.has(key)) {
                        statsMap.set(key, {
                            game: stripTime(bet.gameTypeName),
                            time: bet.gameTypeTime || '',
                            type: isLocalGame(bet.gameTypeName) ? 'Local' : 'National',
                            multiplier: getMultiplier(bet),
                            bets: 0,
                            amount: 0,
                            winners: 0,
                            payout: 0,
                        });
                    }

                    const stat = statsMap.get(key)!;
                    const betPayout = getBetPayout(bet, stat.multiplier, configuredWinners);
                    stat.bets += 1;
                    stat.amount += bet.bet;
                    if (betPayout > 0) {
                        stat.winners += 1;
                        stat.payout += betPayout;
                        winners.push({
                            bookletNumber: booklet.bookletNumber,
                            game: stripTime(bet.gameTypeName),
                            time: bet.gameTypeTime || '',
                            serialNumber: ticket.serialNumber || '',
                            letter: ticket.label,
                            combination: bet.number,
                            bet: bet.bet,
                            amount: betPayout,
                            winnerName: ticketWinnerName,
                        });
                        winningNumberMap.set(key, {
                            game: stripTime(bet.gameTypeName),
                            time: bet.gameTypeTime || '',
                            type: isLocalGame(bet.gameTypeName) ? 'Local' : 'National',
                            number: bet.number,
                        });
                    }
                });
            });
        });
    });

    Object.entries(configuredWinners).forEach(([gameTypeId, number]) => {
        const sample = rows.flatMap((row) => row.bets).find((bet) => bet?.gameTypeId === gameTypeId);
        if (!sample) return;
        const key = `${sample.gameTypeName}|${sample.gameTypeTime || ''}`;
        winningNumberMap.set(key, {
            game: stripTime(sample.gameTypeName),
            time: sample.gameTypeTime || '',
            type: isLocalGame(sample.gameTypeName) ? 'Local' : 'National',
            number,
        });
    });

    return {
        rows,
        winners,
        stats: Array.from(statsMap.values()).sort((a, b) => {
            const timeCompare = drawOrder(a.time) - drawOrder(b.time);
            return timeCompare || a.game.localeCompare(b.game);
        }),
        winningNumbers: Array.from(winningNumberMap.values()).sort((a, b) => drawOrder(a.time) - drawOrder(b.time)),
    };
}

function getBetPayout(bet: NumberBet | undefined, multiplier: number, configuredWinners: Record<string, string> = {}) {
    if (!bet) return 0;
    const directPayout = Number((bet as any).payout || (bet as any).payoutAmount || (bet as any).win || 0);
    if (directPayout > 0) return directPayout;
    if ((bet as any).isWinner === true) return bet.bet * multiplier;
    const winningNumber = configuredWinners[bet.gameTypeId];
    if (winningNumber && bet.number === winningNumber) return bet.bet * multiplier;
    return 0;
}

function getMultiplier(bet?: NumberBet) {
    if (!bet) return 500;
    const explicit = Number((bet as any).multiplier || 0);
    if (explicit > 0) return explicit;
    if (bet.gameTypeName.toLowerCase().includes('2d')) return 70;
    return 500;
}

function isLocalGame(gameName: string) {
    return gameName.toLowerCase().includes('local') || gameName.toLowerCase().includes('swer');
}

function drawOrder(time: string) {
    const order = ['10:30 AM', '2:00 PM', '3:00 PM', '5:00 PM', '7:00 PM', '9:00 PM'];
    const idx = order.indexOf(time);
    return idx === -1 ? 999 : idx;
}

function rows(sheet: ExcelJS.Worksheet, startRow: number, values: ExcelJS.CellValue[][]) {
    values.forEach((value, index) => {
        const row = sheet.getRow(startRow + index);
        row.values = value;
        row.getCell(1).font = { bold: true };
        row.getCell(1).fill = solid('E7E6E6');
        borderRow(row, 2, 'D9D9D9');
    });
}

function section(sheet: ExcelJS.Worksheet, range: string, title: string, color: string) {
    sheet.mergeCells(range);
    const cell = sheet.getCell(range.split(':')[0]);
    cell.value = title;
    cell.font = { bold: true, size: 14, color: { argb: COLORS.white } };
    cell.fill = solid(color);
    cell.alignment = { vertical: 'middle' };
}

function mergeTitle(sheet: ExcelJS.Worksheet, range: string, title: string, size: number, color: string) {
    sheet.mergeCells(range);
    const cell = sheet.getCell(range.split(':')[0]);
    cell.value = title;
    cell.font = { bold: true, size, color: { argb: color } };
    cell.alignment = { horizontal: 'center' };
}

function header(row: ExcelJS.Row, values: ExcelJS.CellValue[], fill = COLORS.dark, font = COLORS.white) {
    row.values = values;
    row.font = { bold: true, color: { argb: font } };
    row.fill = solid(fill);
    row.alignment = { horizontal: 'center' };
    borderRow(row, values.length);
}

function styleLabelValueBlock(sheet: ExcelJS.Worksheet, start: number, end: number) {
    for (let rowNumber = start; rowNumber <= end; rowNumber++) {
        const row = sheet.getRow(rowNumber);
        row.getCell(1).font = { bold: true };
        row.getCell(2).alignment = { horizontal: 'left' };
    }
}

function borderRow(row: ExcelJS.Row, cols: number, color = COLORS.border) {
    for (let col = 1; col <= cols; col++) {
        row.getCell(col).border = thinBorder(color);
    }
}

function solid(argb: string): ExcelJS.Fill {
    return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function thinBorder(color = COLORS.border): Partial<ExcelJS.Borders> {
    return {
        top: { style: 'thin', color: { argb: color } },
        left: { style: 'thin', color: { argb: color } },
        bottom: { style: 'thin', color: { argb: color } },
        right: { style: 'thin', color: { argb: color } },
    };
}

function formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-US');
}

function formatLongDate(date: string) {
    return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function safeFileName(name: string) {
    return name.replace(/[<>:"/\\|?*]/g, '-');
}

const currencyFmt = '₱#,##0.00';
const numberFmt = '#,##0';
