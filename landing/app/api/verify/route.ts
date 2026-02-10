import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const token = searchParams.get('token');

        if (!token) {
            return new NextResponse(
                generateErrorPage('Invalid verification link'),
                { status: 400, headers: { 'Content-Type': 'text/html' } }
            );
        }

        // Find subscriber with this token
        const { data: subscriber, error } = await supabase
            .from('subscribers')
            .select('*')
            .eq('verification_token', token)
            .single();

        if (error || !subscriber) {
            return new NextResponse(
                generateErrorPage('Invalid or expired verification link'),
                { status: 404, headers: { 'Content-Type': 'text/html' } }
            );
        }

        // Check if token is expired
        if (new Date(subscriber.token_expires_at) < new Date()) {
            return new NextResponse(
                generateErrorPage('Verification link has expired. Please sign up again.'),
                { status: 400, headers: { 'Content-Type': 'text/html' } }
            );
        }

        // Update subscriber status to confirmed
        const { error: updateError } = await supabase
            .from('subscribers')
            .update({
                status: 'confirmed',
                confirmed_at: new Date().toISOString(),
                verification_token: null, // Clear the token
                token_expires_at: null,
            })
            .eq('verification_token', token);

        if (updateError) {
            console.error('Update error:', updateError);
            return new NextResponse(
                generateErrorPage('Failed to confirm subscription'),
                { status: 500, headers: { 'Content-Type': 'text/html' } }
            );
        }

        // Return success page
        return new NextResponse(
            generateSuccessPage(subscriber.email, subscriber.segment),
            { status: 200, headers: { 'Content-Type': 'text/html' } }
        );

    } catch (error) {
        console.error('Verification error:', error);
        return new NextResponse(
            generateErrorPage('An error occurred during verification'),
            { status: 500, headers: { 'Content-Type': 'text/html' } }
        );
    }
}

function generateSuccessPage(email: string, segment: string): string {
    const segmentEmoji = {
        builders: '🛠️',
        leaders: '💼',
        innovators: '🚀'
    }[segment] || '📧';

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Confirmed - Brief Delights</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0;
                    padding: 20px;
                }
                .container {
                    background: white;
                    max-width: 600px;
                    padding: 60px 40px;
                    border-radius: 16px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    text-align: center;
                }
                .success-icon {
                    font-size: 80px;
                    margin-bottom: 24px;
                }
                h1 {
                    font-size: 32px;
                    margin-bottom: 16px;
                    color: #1a1a1a;
                }
                .email {
                    color: #666;
                    font-size: 18px;
                    margin-bottom: 32px;
                }
                .segment-badge {
                    display: inline-block;
                    background: #f0f0f0;
                    padding: 12px 24px;
                    border-radius: 24px;
                    font-weight: 600;
                    margin-bottom: 32px;
                }
                .next-steps {
                    background: #f8f9fa;
                    padding: 24px;
                    border-radius: 8px;
                    margin: 32px 0;
                    text-align: left;
                }
                .next-steps h3 {
                    margin-top: 0;
                    font-size: 18px;
                }
                .next-steps li {
                    margin: 12px 0;
                    color: #666;
                }
                .button {
                    display: inline-block;
                    background: #000;
                    color: white;
                    padding: 16px 32px;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: 600;
                    margin-top: 24px;
                }
                .button:hover {
                    background: #333;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="success-icon">✅</div>
                <h1>You're All Set!</h1>
                <p class="email">${email}</p>
                <div class="segment-badge">
                    ${segmentEmoji} ${segment.charAt(0).toUpperCase() + segment.slice(1)} Brief
                </div>
                
                <div class="next-steps">
                    <h3>What happens next?</h3>
                    <ul>
                        <li>📅 You'll receive your first Brief tomorrow morning</li>
                        <li>📊 Daily curated news every weekday</li>
                        <li>🔮 Sunday strategic insights every week</li>
                        <li>🎯 Personalized for ${segment}</li>
                    </ul>
                </div>

                <p style="color: #666;">
                    Your first issue will arrive in your inbox tomorrow. Can't wait?
                </p>
                
                <a href="/" class="button">
                    Browse the Archive
                </a>

                <p style="color: #999; font-size: 14px; margin-top: 40px;">
                    brief delights | A DreamValidator brand
                </p>
            </div>
        </body>
        </html>
    `;
}

function generateErrorPage(message: string): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verification Error - Brief Delights</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    background: #f5f5f5;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0;
                    padding: 20px;
                }
                .container {
                    background: white;
                    max-width: 600px;
                    padding: 60px 40px;
                    border-radius: 16px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    text-align: center;
                }
                .error-icon {
                    font-size: 64px;
                    margin-bottom: 24px;
                }
                h1 {
                    font-size: 28px;
                    margin-bottom: 16px;
                    color: #1a1a1a;
                }
                p {
                    color: #666;
                    font-size: 16px;
                    margin-bottom: 32px;
                }
                .button {
                    display: inline-block;
                    background: #000;
                    color: white;
                    padding: 16px 32px;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: 600;
                    margin-top: 16px;
                }
                .button:hover {
                    background: #333;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="error-icon">⚠️</div>
                <h1>Verification Failed</h1>
                <p>${message}</p>
                <a href="/" class="button">
                    Return to Homepage
                </a>
            </div>
        </body>
        </html>
    `;
}
