import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

/**
 * Send sponsor outreach email
 * Called when admin clicks "Approve & Send" button
 */

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
        );

        const { id: sponsorId } = await params;

        // Get sponsor lead
        const { data: sponsor, error: fetchError } = await supabase
            .from('sponsor_leads')
            .select('*')
            .eq('id', sponsorId)
            .single();

        if (fetchError || !sponsor) {
            return NextResponse.json(
                { error: 'Sponsor not found' },
                { status: 404 }
            );
        }

        // Generate outreach email (simplified - can enhance later)
        const emailSubject = sponsor.competitor_mentioned
            ? `${sponsor.competitor_mentioned} was in our newsletter. Show readers why ${sponsor.company_name} is better?`
            : `Sponsor opportunity: ${sponsor.matched_topic} audience`;

        const emailBody = generateEmailBody(sponsor);

        // Get recipient email (for now, use a placeholder or test email)
        // TODO: In production, look up contact email from company database
        const recipientEmail = process.env.SPONSOR_TEST_EMAIL || 'sponsors@brief.delights.pro';

        // Send via Resend
        if (process.env.RESEND_API_KEY) {
            const resend = new Resend(process.env.RESEND_API_KEY);

            const { data: emailData, error: emailError } = await resend.emails.send({
                from: 'sponsors@brief.delights.pro',
                to: recipientEmail,
                subject: emailSubject,
                html: emailBody,
            });

            if (emailError) {
                console.error('Resend error:', emailError);
                return NextResponse.json(
                    { error: 'Failed to send email' },
                    { status: 500 }
                );
            }

            // Save to outreach table
            await supabase.from('sponsor_outreach').insert({
                sponsor_lead_id: sponsorId,
                sent_at: new Date().toISOString(),
                email_subject: emailSubject,
                email_body: emailBody,
                recipient_email: recipientEmail,
                status: 'sent',
            });

            // Update sponsor lead status
            await supabase
                .from('sponsor_leads')
                .update({
                    status: 'outreach_sent',
                    outreach_sent_at: new Date().toISOString(),
                })
                .eq('id', sponsorId);

            return NextResponse.json({
                success: true,
                message: 'Email sent successfully',
                emailId: emailData?.id,
            });
        } else {
            // No Resend API key - simulate send for demo
            console.log('📧 DEMO MODE - Would send email:', {
                to: recipientEmail,
                subject: emailSubject,
                sponsor: sponsor.company_name,
            });

            // Update status anyway for demo
            await supabase
                .from('sponsor_leads')
                .update({
                    status: 'outreach_sent',
                    outreach_sent_at: new Date().toISOString(),
                })
                .eq('id', sponsorId);

            return NextResponse.json({
                success: true,
                message: 'Email queued (demo mode - no RESEND_API_KEY)',
                demo: true,
            });
        }

    } catch (error: any) {
        console.error('Send email error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

function generateEmailBody(sponsor: any): string {
    const price = (sponsor.offer_price_cents / 100).toLocaleString();
    const clicks = sponsor.article_clicks || 0;

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; }
    .content { padding: 30px 0; }
    .stats { background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .stat-item { margin: 10px 0; }
    .cta { background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📰 Brief Delights</h1>
      <p>Daily AI intelligence for ${sponsor.matched_segment}</p>
    </div>
    
    <div class="content">
      <h2>Hi ${sponsor.company_name} team,</h2>
      
      ${sponsor.competitor_mentioned ? `
        <p>Last week, we featured an article about <strong>${sponsor.competitor_mentioned}</strong> in our newsletter.</p>
        <p>Guess what? <strong>${clicks}+ ${sponsor.matched_segment}</strong> clicked through to read it.</p>
        <p><strong>This is your opportunity.</strong></p>
      ` : `
        <p>Our ${sponsor.matched_segment} audience is highly engaged with ${sponsor.matched_topic} content.</p>
      `}
      
      <div class="stats">
        <h3>What You Get:</h3>
        <div class="stat-item">✍️ <strong>Featured article</strong> about ${sponsor.company_name} (we write it)</div>
        <div class="stat-item">🎯 <strong>Targeted distribution</strong> to ${sponsor.matched_segment} only</div>
        <div class="stat-item">📱 <strong>Social amplification</strong> (Twitter + LinkedIn)</div>
        <div class="stat-item">📊 <strong>Performance report</strong> with clicks & engagement</div>
        <div class="stat-item">📄 <strong>Content rights</strong> - repurpose anywhere</div>
        <div class="stat-item">✅ <strong>Click guarantee</strong> - if <10 clicks, we rerun free</div>
      </div>
      
      <p><strong>Investment:</strong> $${price}</p>
      
      <a href="mailto:sponsors@brief.delights.pro?subject=Re: ${sponsor.company_name} Sponsorship" class="cta">
        Let's Talk
      </a>
      
      <p style="margin-top: 30px;">Best regards,<br>Linus<br>Brief Delights</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
