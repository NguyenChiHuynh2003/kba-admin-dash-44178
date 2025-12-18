import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && email.length > 0 && email.length <= 255 && emailRegex.test(email);
}

function isValidPassword(password: string): boolean {
  return typeof password === 'string' && password.length >= 6 && password.length <= 128;
}

function isValidName(name: string): boolean {
  return typeof name === 'string' && name.trim().length > 0 && name.length <= 100;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user has admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      throw new Error("Unauthorized: Admin access required");
    }

    const { email, password, fullName, role } = await req.json();

    // Valid roles matching app_role enum
    const VALID_ROLES = ['admin', 'user', 'accountant', 'hr_admin', 'project_manager'];

    // Validate inputs
    if (!isValidEmail(email)) {
      throw new Error("Invalid email format");
    }
    if (!isValidPassword(password)) {
      throw new Error("Password must be between 6 and 128 characters");
    }
    if (!isValidName(fullName)) {
      throw new Error("Full name is required and must be less than 100 characters");
    }
    if (role && !VALID_ROLES.includes(role)) {
      throw new Error("Invalid role specified");
    }

    // Create user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createError) throw createError;

    // Update user role if specified (not default 'user')
    if (role && role !== 'user' && newUser.user) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .update({ role })
        .eq("user_id", newUser.user.id);
      
      if (roleError) {
        console.error("Error updating role:", roleError);
      }
    }

    return new Response(
      JSON.stringify({ user: newUser }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
