import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

interface SubscribeRequest {
    email: string;
    segment: 'builders' | 'leaders' | 'innovators';
    referrer?: string;  // referral code from ?ref= URL param
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabase() {
    return createClient(SUPABASE_URL, SUPABASE_KEY);
}

export const handler: Handler = async (event) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        const { email, segment, referrer }: SubscribeRequest = JSON.parse(event.body || '{}');;

        // Validate input
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid email address' }),
            };
        }

        if (!['builders', 'leaders', 'innovators'].includes(segment)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid segment' }),
            };
        }

        const supabase = getSupabase();

        // Check if already a confirmed subscriber
        const { data: existingSub } = await supabase
            .from('subscribers')
            .select('id, status')
            .eq('email', email)
            .maybeSingle();

        if (existingSub?.status === 'confirmed') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    message: 'You\'re already subscribed! Check your inbox for your next brief. 📧'
                }),
            };
        }

        // Generate verification token
        const token = crypto.randomBytes(32).toString('hex');

        // Check if already pending
        const { data: existingPending } = await supabase
            .from('pending_verifications')
            .select('token')
            .eq('email', email)
            .maybeSingle();

        if (existingPending) {
            // Resend verification with existing token
            await sendVerificationEmail(email, existingPending.token, segment);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    message: 'Verification email resent! Check your inbox. 📧'
                }),
            };
        }

        // Insert pending verification into Supabase
        const { error: insertError } = await supabase
            .from('pending_verifications')
            .insert({
                email,
                segment,
                token,
                ...(referrer ? { referrer } : {}),
            });

        if (insertError) {
            console.error('Failed to insert pending verification:', insertError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to process subscription' }),
            };
        }

        // Send verification email
        await sendVerificationEmail(email, token, segment);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'Check your email to confirm your subscription! 📧'
            }),
        };

    } catch (error) {
        console.error('Subscribe error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};

async function sendVerificationEmail(email: string, token: string, segment: string) {
    if (!RESEND_API_KEY) {
        console.error('RESEND_API_KEY not set');
        return;
    }

    const verifyUrl = `${process.env.URL}/api/verify?token=${token}`;

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
            subject: `${segmentEmoji} Verify your Brief Delights subscription`,
            html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="font-size: 48px; margin: 0;">Brief</h1>
          <p style="font-size: 18px; color: #666; letter-spacing: 0.2em;">delights</p>
          
          <p style="font-size: 16px; line-height: 1.6;">
            Thanks for subscribing to <strong>Brief Delights</strong>! 
          </p>
          
          <p style="font-size: 16px; line-height: 1.6;">
            You'll receive daily AI-powered tech insights curated for <strong>${segment}</strong> ${segmentEmoji}.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${verifyUrl}" style="background: #000; color: #fff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Confirm Subscription
            </a>
          </div>
          
          <p style="font-size: 14px; color: #999; line-height: 1.6;">
            If you didn't subscribe, you can safely ignore this email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e8e8e8; margin: 32px 0;" />
          
          <p style="font-size: 12px; color: #999; text-align: center;">
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
