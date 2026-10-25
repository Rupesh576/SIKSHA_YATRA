/** MVP worker outline. Run this from a trusted background process, never in the browser. */
import { google } from "googleapis";
export async function syncUserRow(row: { user_id: string; name: string; email: string; auth_provider: string; created_at: string; last_login_at: string }) {
  const auth = new google.auth.GoogleAuth({ credentials: { client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n") }, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID; if (!spreadsheetId) throw new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID");
  // Production implementation should claim an outbox job, find user_id, then update or append atomically.
  await sheets.spreadsheets.values.append({ spreadsheetId, range: "Users!A:G", valueInputOption: "USER_ENTERED", requestBody: { values: [[row.user_id, row.name, row.email, row.auth_provider, row.created_at, row.last_login_at, "synced"]] } });
}
