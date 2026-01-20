import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  approval_level: "subcounty" | "ministry";
  student_name: string;
  center_name: string;
  student_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { approval_level, student_name, center_name, student_id }: NotificationRequest = await req.json();

    // Get users who need to be notified
    const { data: users, error: usersError } = await supabase
      .rpc("get_approval_notification_users", { approval_level });

    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    if (!users || users.length === 0) {
      console.log("No users to notify");
      return new Response(
        JSON.stringify({ message: "No users to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send emails to all relevant users using Resend API directly
    const emailPromises = users.map(async (user: { email: string; full_name: string }) => {
      const subject = approval_level === "subcounty"
        ? "New Student Registration Awaiting Your Approval"
        : "Student Registration Awaiting Final Approval";

      const levelText = approval_level === "subcounty"
        ? "sub-county level"
        : "ministry level (final)";

      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "ECDE Mandera <onboarding@resend.dev>",
            to: [user.email],
            subject: subject,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                  .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
                  .footer { background: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b; border-radius: 0 0 8px 8px; }
                  .info-box { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #1e40af; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>ECDE Mandera</h1>
                    <p>Student Approval Notification</p>
                  </div>
                  <div class="content">
                    <p>Dear ${user.full_name},</p>
                    <p>A new student registration requires your approval at the <strong>${levelText}</strong>.</p>
                    
                    <div class="info-box">
                      <p><strong>Student Name:</strong> ${student_name}</p>
                      <p><strong>Center:</strong> ${center_name}</p>
                    </div>
                    
                    <p>Please log in to the ECDE Management System to review and approve this registration.</p>
                    
                    <p>Thank you for your attention to this matter.</p>
                    
                    <p>Best regards,<br>ECDE Mandera Management System</p>
                  </div>
                  <div class="footer">
                    <p>This is an automated notification from the ECDE Management System.</p>
                    <p>County Government of Mandera</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          }),
        });
        
        const result = await emailResponse.json();
        console.log(`Email sent to ${user.email}:`, result);
        return { email: user.email, success: emailResponse.ok, result };
      } catch (emailError) {
        console.error(`Failed to send email to ${user.email}:`, emailError);
        return { email: user.email, success: false, error: emailError };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r.success).length;

    console.log(`Sent ${successCount}/${results.length} emails successfully`);

    return new Response(
      JSON.stringify({ 
        message: `Notifications sent to ${successCount} users`,
        results 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-approval-notification:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
