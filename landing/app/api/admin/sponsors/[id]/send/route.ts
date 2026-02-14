import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/admin/sponsors/[id]/send
 * Send outreach email to sponsor
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Next.js 16: params is now async
        const { id } = await params;
        const body = await request.json();
        const { subjectLine, emailBody, senderEmail } = body;

        // Get sponsor lead
        const { data: lead, error: leadError } = await supabase
            .from('sponsor_leads')
            .select('*')
            .eq('id', id)
            .single();

        if (leadError || !lead) {
            return NextResponse.json(
                { error: 'Sponsor not found' },
                { status: 404 }
            );
        }

        // Send email via Resend
        const emailResult = await resend.emails.send({
            from: senderEmail || 'linus@delights.pro',
            to: lead.contact_email || `hello@${lead.domain}`,
            subject: subjectLine || lead.email_draft?.subject_line_a,
            html: emailBody || lead.email_draft?.body,
            tags: [
                { name: 'type', value: 'sponsor_outreach' },
                { name: 'sponsor_id', value: id },
                { name: 'segment', value: lead.matched_segment }
            ]
        });

        if (emailResult.error) {
            return NextResponse.json(
                { error: 'Failed to send email', details: emailResult.error },
                { status: 500 }
            );
        }

        // Log to sponsor_outreach table
        const { error: outreachError } = await supabase
            .from('sponsor_outreach')
            .insert({
                sponsor_lead_id: id,
                email_type: 'initial_outreach',
                subject_line: subjectLine || lead.email_draft?.subject_line_a,
                email_body: emailBody || lead.email_draft?.body,
                sent_at: new Date().toISOString(),
                resend_email_id: emailResult.data?.id,
                status: 'sent'
            });

        if (outreachError) {
            console.error('Failed to log outreach:', outreachError);
        }

        // Update sponsor lead status
        await supabase
            .from('sponsor_leads')
            .update({
                status: 'outreach_sent',
                last_updated: new Date().toISOString()
            })
            .eq('id', id);

        return NextResponse.json({
            success: true,
            emailId: emailResult.data?.id
        });
    } catch (error) {
        console.error('Error sending email:', error);
        return NextResponse.json(
            { error: 'Failed to send email' },
            { status: 500 }
        );
    }
}
