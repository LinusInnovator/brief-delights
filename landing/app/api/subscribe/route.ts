import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '../../../lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const { email, segment, referrer, ab_variant_id } = await request.json();

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

        let finalSegmentString = segment;

        if (existingUser) {
            const currentSegments = existingUser.segment ? existingUser.segment.split(',').map((s: string) => s.trim()) : [];

            if (currentSegments.includes(segment)) {
                if (existingUser.status === 'confirmed') {
                    return NextResponse.json({
                        success: true,
                        already_subscribed: true,
                        message: 'Welcome back! You are an active subscriber.',
                    });
                }
                // If pending, proceed to resend verification without altering the segments
                finalSegmentString = existingUser.segment;
            } else {
                // They aren't subscribed to this specific segment yet
                finalSegmentString = [...currentSegments, segment].join(',');

                // If they are already a confirmed subscriber, skip verification and instantly add the segment
                if (existingUser.status === 'confirmed') {
                    await supabase
                        .from('subscribers')
                        .update({ segment: finalSegmentString })
                        .eq('email', email);

                    return NextResponse.json({
                        success: true,
                        already_subscribed: true,
                        message: 'Welcome back! We added this newsletter to your subscription.',
                    });
                }
            }
        }

        // Generate verification token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Create or update subscriber in database
        const subscriberData: Record<string, string> = {
            email,
            segment: finalSegmentString,
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

        // Track A/B conversion (non-blocking)
        if (ab_variant_id) {
            supabase.rpc('increment_ab_conversions', {
                p_variant_id: ab_variant_id,
            }).then(({ error: abError }) => {
                if (abError) console.error('AB conversion tracking error:', abError.message);
            });
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
                    from: process.env.EMAIL_SENDER || 'Brief Delights <hello@send.dreamvalidator.com>',
                    to: [email],
                    subject: 'Confirm your Brief Delights subscription',
                    html: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="utf-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <style>
                                body { margin: 0; padding: 0; background-color: #FAF8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #121212; }
                                .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                                .brand-box { text-align: center; margin-bottom: 24px; }
                                .logo-seal { width: 56px; height: 56px; margin-bottom: 12px; }
                                .masthead { font-family: 'Georgia', serif; font-size: 28px; font-weight: 700; letter-spacing: 2px; color: #121212; margin: 0; }
                                .tagline { font-size: 11px; font-weight: 700; color: #C5A059; letter-spacing: 3px; text-transform: uppercase; margin-top: 6px; }
                                .content { background: #FFFFFF; border: 1px solid rgba(18, 18, 18, 0.1); padding: 36px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
                                .heading { font-family: 'Georgia', serif; font-size: 22px; color: #58111A; margin-top: 0; margin-bottom: 16px; }
                                .body-text { font-size: 15px; line-height: 1.6; color: #333333; margin-bottom: 20px; }
                                .button { display: inline-block; background-color: #58111A; color: #FFFFFF !important; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; border: 1px solid #C5A059; margin: 20px 0; }
                                .footer { color: #888888; font-size: 12px; text-align: center; margin-top: 32px; line-height: 1.5; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="brand-box">
                                    <img src="${baseUrl}/bd_seal_logo.png" alt="Brief Delights Seal" class="logo-seal" />
                                    <h1 class="masthead">BRIEF DELIGHTS</h1>
                                    <div class="tagline">KNOWLEDGE, REFINED</div>
                                </div>
                                
                                <div class="content">
                                    <h2 class="heading">Confirm Your Intelligence Briefing Subscription</h2>
                                    <p class="body-text">You are one step away from receiving curated daily executive insights directly in your inbox.</p>
                                    <p class="body-text">Please click below to verify your email address and activate instant access:</p>
                                    <center>
                                        <a href="${verificationUrl}" class="button">
                                            Confirm Subscription &rarr;
                                        </a>
                                    </center>
                                    <p style="color: #666666; font-size: 13px; margin-top: 24px; word-break: break-all;">
                                        Direct verification link:<br/>
                                        <a href="${verificationUrl}" style="color: #58111A;">${verificationUrl}</a>
                                    </p>
                                </div>
                                
                                <div class="footer">
                                    <p>Brief Delights &bull; Executive Intelligence Engine</p>
                                    <p>This verification link expires in 24 hours.</p>
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
