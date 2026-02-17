import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabase() {
    return createClient(SUPABASE_URL, SUPABASE_KEY);
}

export const handler: Handler = async (event) => {
    const token = event.queryStringParameters?.token;

    if (!token) {
        return {
            statusCode: 400,
            body: 'Missing verification token',
        };
    }

    try {
        const supabase = getSupabase();

        // Look up pending verification by token
        const { data: verification, error: lookupError } = await supabase
            .from('pending_verifications')
            .select('*')
            .eq('token', token)
            .maybeSingle();

        if (lookupError || !verification) {
            return {
                statusCode: 404,
                body: 'Invalid or expired verification token',
            };
        }

        // Check if token is expired (24 hours)
        const createdAt = new Date(verification.created_at);
        const now = new Date();
        const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

        if (hoursSinceCreation > 24) {
            // Delete expired token
            await supabase
                .from('pending_verifications')
                .delete()
                .eq('id', verification.id);

            return {
                statusCode: 400,
                body: 'Verification token expired. Please sign up again.',
            };
        }

        // Check if already a subscriber
        const { data: existingSub } = await supabase
            .from('subscribers')
            .select('id, status')
            .eq('email', verification.email)
            .maybeSingle();

        if (existingSub) {
            // Update status to confirmed if not already
            if (existingSub.status !== 'confirmed') {
                await supabase
                    .from('subscribers')
                    .update({
                        status: 'confirmed',
                        segment: verification.segment,
                    })
                    .eq('id', existingSub.id);
            }
        } else {
            // Insert new confirmed subscriber
            const { error: insertError } = await supabase
                .from('subscribers')
                .insert({
                    email: verification.email,
                    segment: verification.segment,
                    status: 'confirmed',
                    confirmed_at: new Date().toISOString(),
                });

            if (insertError) {
                console.error('Failed to insert subscriber:', insertError);
                return {
                    statusCode: 500,
                    body: 'Failed to confirm subscription. Please try again.',
                };
            }
        }

        // Delete the used verification token
        await supabase
            .from('pending_verifications')
            .delete()
            .eq('id', verification.id);

        // Send welcome email
        await sendWelcomeEmail(verification.email, verification.segment);

        // Redirect to success page
        return {
            statusCode: 302,
            headers: {
                Location: '/?verified=true',
            },
            body: '',
        };

    } catch (error) {
        console.error('Verification error:', error);
        return {
            statusCode: 500,
            body: 'Internal server error',
        };
    }
};

async function sendWelcomeEmail(email: string, segment: string) {
    if (!RESEND_API_KEY) {
        console.error('RESEND_API_KEY not set');
        return;
    }

    const segmentEmoji = {
        builders: '🛠️',
        leaders: '💼',
        innovators: '🚀',
    }[segment];

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: 'Brief Delights <hello@send.dreamvalidator.com>',
            to: email,
            subject: `${segmentEmoji} Welcome to Brief Delights!`,
            html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="font-size: 48px; margin: 0;">Brief</h1>
          <p style="font-size: 18px; color: #666; letter-spacing: 0.2em;">delights</p>
          
          <h2 style="font-size: 24px; margin-top: 32px;">Welcome! ${segmentEmoji}</h2>
          
          <p style="font-size: 16px; line-height: 1.6;">
            You're officially subscribed to <strong>Brief Delights</strong> for ${segment}.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6;">
            Starting tomorrow, you'll receive:
          </p>
          
          <ul style="font-size: 16px; line-height: 1.8;">
            <li><strong>Daily Brief</strong>: 14 hand-picked stories (6 full, 4 quick, 2 trending)</li>
            <li><strong>AI-Curated</strong>: 1,340+ articles scanned, best 14 selected</li>
            <li><strong>Strategic Context</strong>: "Why this matters" insights</li>
            <li><strong>Sunday Synthesis</strong>: Weekly trend analysis</li>
          </ul>
          
          <p style="font-size: 16px; line-height: 1.6;">
            Expect your first brief around <strong>6 AM UTC</strong> tomorrow.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e8e8e8; margin: 32px 0;" />
          
          <p style="font-size: 14px; color: #999; line-height: 1.6;">
            Questions? Reply to this email or reach us at hello@dreamvalidator.com
          </p>
          
          <p style="font-size: 12px; color: #999; text-align: center; margin-top: 32px;">
            <strong>brief delights</strong> | A DreamValidator brand<br>
            © 2026 All rights reserved
          </p>
        </div>
      `,
        }),
    });

    if (!response.ok) {
        throw new Error(`Resend API error: ${response.statusText}`);
    }
}
