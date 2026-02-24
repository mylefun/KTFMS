/**
 * A simple CSV parser that handles quotes and basic edge cases.
 * Returns an array of objects where keys are the CSV headers.
 */
export function parseCSV(csvText: string): Record<string, string>[] {
    const result: Record<string, string>[] = [];
    if (!csvText || !csvText.trim()) return result;

    // 1. Split by newlines, handling different OS endings
    const lines = csvText.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return result;

    // 2. Parse headers
    const headers = parseCSVSplit(lines[0]).map(h => h.trim());

    // 3. Parse data rows
    for (let i = 1; i < lines.length; i++) {
        const rowRaw = parseCSVSplit(lines[i]);
        const rowObj: Record<string, string> = {};

        // Default to empty string if missing column data
        for (let j = 0; j < headers.length; j++) {
            rowObj[headers[j]] = rowRaw[j]?.trim() ?? "";
        }
        result.push(rowObj);
    }

    return result;
}

/**
 * Splits a CSV string by comma, respecting double quotes.
 */
function parseCSVSplit(text: string): string[] {
    const result: string[] = [];
    let currentStr = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (char === '"') {
            // Handle escaped quote "" inside a quoted string
            if (insideQuotes && text[i + 1] === '"') {
                currentStr += '"';
                i++; // skip next quote
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            result.push(currentStr);
            currentStr = "";
        } else {
            currentStr += char;
        }
    }
    result.push(currentStr);
    return result;
}
