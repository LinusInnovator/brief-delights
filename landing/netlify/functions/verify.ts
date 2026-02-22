import { Handler } from '@netlify/functions';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface PendingVerification {
    email: string;
    segment: string;
    token: string;
    createdAt: string;
}

interface Subscriber {
    email: string;
    segment: string;
    status: string;
    subscribed_at: string;
}

const PENDING_FILE = join(process.cwd(), '.tmp', 'pending_verifications.json');
const SUBSCRIBERS_FILE = join(process.cwd(), 'subscribers.json');
const RESEND_API_KEY = process.env.RESEND_API_KEY;

export const handler: Handler = async (event) => {
    const token = event.queryStringParameters?.token;

    if (!token) {
        return {
            statusCode: 400,
            body: 'Missing verification token',
        };
    }

    try {
        // Load pending verifications
        if (!existsSync(PENDING_FILE)) {
            return {
                statusCode: 404,
                body: 'Verification not found',
            };
        }

        const pending: PendingVerification[] = JSON.parse(
            readFileSync(PENDING_FILE, 'utf-8')
        );

        // Find verification
        const verification = pending.find(p => p.token === token);
        if (!verification) {
            return {
                statusCode: 404,
                body: 'Invalid or expired verification token',
            };
        }

        // Check if token is expired (24 hours)
        const createdAt = new Date(verification.createdAt);
        const now = new Date();
        const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

        if (hoursSinceCreation > 24) {
            return {
                statusCode: 400,
                body: 'Verification token expired. Please sign up again.',
            };
        }

        // Load subscribers
        let subscribers: { subscribers: Subscriber[] } = { subscribers: [] };
        if (existsSync(SUBSCRIBERS_FILE)) {
            subscribers = JSON.parse(readFileSync(SUBSCRIBERS_FILE, 'utf-8'));
        }

        // Check if already subscribed
        const alreadySubscribed = subscribers.subscribers.find(
            s => s.email === verification.email
        );

        if (!alreadySubscribed) {
            // Add to subscribers
            subscribers.subscribers.push({
                email: verification.email,
                segment: verification.segment,
                status: 'active',
                subscribed_at: new Date().toISOString(),
            });

            // Save subscribers file
            writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2));

            // Send welcome email
            await sendWelcomeEmail(verification.email, verification.segment);
        }

        // Remove from pending
        const updatedPending = pending.filter(p => p.token !== token);
        writeFileSync(PENDING_FILE, JSON.stringify(updatedPending, null, 2));

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
            from: 'Brief Delights <hello@delights.pro>',
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
