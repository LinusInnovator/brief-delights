import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '../../../lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const { email, segment, referrer } = await request.json();

        // Validate email
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email address' },
                { status: 400 }
            );
        }

        // Validate segment
        if (!['builders', 'leaders', 'innovators'].includes(segment)) {
            return NextResponse.json(
                { error: 'Invalid segment' },
                { status: 400 }
            );
        }

        // Check if email already exists
        const { data: existingUser } = await supabase
            .from('subscribers')
            .select('*')
            .eq('email', email)
            .single();

        if (existingUser) {
            if (existingUser.status === 'confirmed') {
                return NextResponse.json(
                    { error: 'This email is already subscribed!' },
                    { status: 400 }
                );
            }
            // If pending, we can resend verification
        }

        // Generate verification token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Create or update subscriber in database
        const subscriberData: Record<string, string> = {
            email,
            segment,
            status: 'pending',
            verification_token: token,
            token_expires_at: expiresAt.toISOString(),
        };

        // Track referral source if present
        if (referrer && typeof referrer === 'string' && referrer.length > 0) {
            subscriberData.referred_by = referrer;
        }

        const { error: dbError } = await supabase
            .from('subscribers')
            .upsert(subscriberData, {
                onConflict: 'email'
            });

        if (dbError) {
            console.error('Database error:', dbError);
            return NextResponse.json(
                { error: 'Failed to create subscription' },
                { status: 500 }
            );
        }

        // Send verification email using Resend
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
        const verificationUrl = `${baseUrl}/api/verify?token=${token}`;

        try {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: process.env.EMAIL_SENDER || 'Brief Delights <hello@brief.delights.pro>',
                    to: [email],
                    subject: 'Confirm your Brief Delights subscription',
                    html: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <style>
                                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
                                .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                                .logo { font-size: 48px; font-weight: 700; text-align: center; margin-bottom: 8px; }
                                .tagline { font-size: 16px; color: #666; text-align: center; letter-spacing: 2px; margin-bottom: 32px; }
                                .content { background: #f8f9fa; padding: 32px; border-radius: 8px; }
                                .button { display: inline-block; background: #000; color: #fff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 24px 0; }
                                .footer { color: #999; font-size: 14px; text-align: center; margin-top: 32px; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="logo">Brief</div>
                                <div class="tagline">delights</div>
                                
                                <div class="content">
                                    <h2>Welcome to Brief Delights! 🎉</h2>
                                    <p>You're one step away from getting curated tech intelligence delivered daily.</p>
                                    <p>Click the button below to confirm your subscription:</p>
                                    <center>
                                        <a href="${verificationUrl}" class="button">
                                            Confirm Email Address
                                        </a>
                                    </center>
                                    <p style="color: #666; font-size: 14px; margin-top: 24px;">
                                        Or copy and paste this link: <br/>
                                        <a href="${verificationUrl}">${verificationUrl}</a>
                                    </p>
                                </div>
                                
                                <div class="footer">
                                    <p>You're receiving this because someone (hopefully you!) signed up for Brief Delights.</p>
                                    <p>This link will expire in 24 hours.</p>
                                </div>
                            </div>
                        </body>
                        </html>
                    `,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                console.error('Resend error:', error);
                throw new Error('Failed to send email');
            }

            return NextResponse.json({
                success: true,
                message: 'Check your email to confirm your subscription! 📧',
            });

        } catch (emailError) {
            console.error('Email sending error:', emailError);
            return NextResponse.json(
                { error: 'Failed to send verification email. Please try again.' },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Subscribe error:', error);
        return NextResponse.json(
            { error: 'An error occurred. Please try again.' },
            { status: 500 }
        );
    }
}
