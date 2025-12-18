import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BACKUP_EMAIL = "zhunter1501@gmail.com";

// Tables to backup
const TABLES_TO_BACKUP = [
  "employees",
  "projects",
  "tasks",
  "asset_master_data",
  "contracts",
  "contract_guarantees",
  "inventory_items",
  "accounting_transactions",
  "user_roles",
  "profiles",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.warn("Backup attempt without authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized: No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.warn("Backup attempt with invalid token");
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin role check
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      console.warn(`Backup attempt by non-admin user: ${user.id}`);
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting database backup by admin user: ${user.id}`);
    
    const backupData: Record<string, unknown[]> = {};
    const errors: string[] = [];

    // Fetch data from each table
    for (const table of TABLES_TO_BACKUP) {
      try {
        const { data, error } = await supabase.from(table).select("*");
        if (error) {
          errors.push(`Error fetching ${table}: ${error.message}`);
          console.error(`Error fetching ${table}:`, error.message);
        } else {
          backupData[table] = data || [];
          console.log(`Backed up ${table}: ${data?.length || 0} records`);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        errors.push(`Exception fetching ${table}: ${errorMessage}`);
        console.error(`Exception fetching ${table}:`, err);
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `backup-${timestamp}.json`;
    const backupContent = JSON.stringify(backupData, null, 2);

    // Save to storage
    const { error: uploadError } = await supabase.storage
      .from("database-backups")
      .upload(fileName, backupContent, {
        contentType: "application/json",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading to storage:", uploadError.message);
      errors.push(`Storage upload error: ${uploadError.message}`);
    } else {
      console.log(`Backup saved to storage: ${fileName}`);
    }

    // Generate summary
    const summary = TABLES_TO_BACKUP.map(
      (table) => `${table}: ${backupData[table]?.length || 0} records`
    ).join("\n");

    // Send email notification
    try {
      const emailResponse = await resend.emails.send({
        from: "KBA2018 Backup <onboarding@resend.dev>",
        to: [BACKUP_EMAIL],
        subject: `Database Backup - ${new Date().toLocaleDateString("vi-VN")}`,
        html: `
          <h1>Database Backup Completed</h1>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString("vi-VN")}</p>
          <h2>Backup Summary:</h2>
          <pre>${summary}</pre>
          ${errors.length > 0 ? `<h3>Errors:</h3><pre>${errors.join("\n")}</pre>` : ""}
          <p>Backup file: <strong>${fileName}</strong></p>
          <p>File saved to storage bucket: database-backups</p>
        `,
      });
      console.log("Email sent successfully:", emailResponse);
    } catch (emailError: unknown) {
      const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
      console.error("Error sending email:", emailError);
      errors.push(`Email error: ${errorMessage}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        fileName,
        summary: backupData,
        recordCounts: Object.fromEntries(
          Object.entries(backupData).map(([k, v]) => [k, v.length])
        ),
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Backup failed:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
