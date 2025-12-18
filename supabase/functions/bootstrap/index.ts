import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiting (resets on function restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }
  
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  
  record.count++;
  return false;
}

// Input validation functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && email.length <= 255 && emailRegex.test(email);
}

function isValidPassword(password: string): boolean {
  return typeof password === 'string' && password.length >= 6 && password.length <= 128;
}

function isValidFullName(name: string): boolean {
  return typeof name === 'string' && name.length > 0 && name.length <= 100;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Get client IP for rate limiting
  const clientIP = req.headers.get("x-forwarded-for") || 
                   req.headers.get("x-real-ip") || 
                   "unknown";

  // Check rate limit
  if (isRateLimited(clientIP)) {
    console.warn(`Rate limit exceeded for IP: ${clientIP}`);
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      }
    );
  }

  // Optional: Check for bootstrap token if configured
  const bootstrapToken = Deno.env.get("BOOTSTRAP_TOKEN");
  if (bootstrapToken) {
    const providedToken = req.headers.get("x-bootstrap-token");
    if (providedToken !== bootstrapToken) {
      console.warn(`Invalid bootstrap token attempt from IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if any admin exists
    const { data: existingAdmins, error: checkError } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("role", "admin")
      .limit(1);

    if (checkError) {
      console.error("Error checking existing admins:", checkError);
    }

    if (existingAdmins && existingAdmins.length > 0) {
      console.warn(`Bootstrap admin attempted when admin already exists. IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: "Admin already exists. Use the normal user creation flow." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Parse and validate input
    let body;
    try {
      body = await req.json();
    } catch {
      throw new Error("Invalid JSON body");
    }

    const { email, password, fullName } = body;

    // Validate all inputs
    if (!email || !isValidEmail(email)) {
      throw new Error("Invalid email format or email too long (max 255 characters)");
    }

    if (!password || !isValidPassword(password)) {
      throw new Error("Password must be between 6 and 128 characters");
    }

    if (fullName && !isValidFullName(fullName)) {
      throw new Error("Full name must be between 1 and 100 characters");
    }

    console.log(`Creating first admin user: ${email}, IP: ${clientIP}`);

    // Create user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName?.trim() || "Admin",
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      throw createError;
    }

    console.log("User created:", newUser.user?.id);

    if (newUser.user) {
      // Create profile for the new user
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: newUser.user.id,
          full_name: fullName?.trim() || "Admin",
        });

      if (profileError) {
        console.error("Error creating profile:", profileError);
      } else {
        console.log("Profile created for user:", newUser.user.id);
      }

      // Create admin role
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: newUser.user.id,
          role: "admin",
        });

      if (roleError) {
        console.error("Error creating role:", roleError);
      } else {
        console.log("Admin role assigned to user:", newUser.user.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Admin user created successfully",
        user: { id: newUser.user?.id, email: newUser.user?.email }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An error occurred" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
