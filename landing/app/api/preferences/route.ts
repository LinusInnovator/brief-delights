import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token && !email) {
      return NextResponse.json(
        { success: false, error: 'Token or email is required' },
        { status: 400 }
      );
    }

    let query = supabase.from('subscribers').select('*');
    if (token) {
      query = query.eq('verification_token', token);
    } else if (email) {
      query = query.eq('email', email.trim().toLowerCase());
    }

    const { data: subscriber, error } = await query.single();

    if (error || !subscriber) {
      return NextResponse.json(
        { success: false, error: 'Subscriber not found' },
        { status: 404 }
      );
    }

    // Default stream preferences derived from current segment string if missing
    const userSegments = subscriber.segment ? subscriber.segment.split(',').map((s: string) => s.trim()) : [];
    const streamPreferences = subscriber.preferences?.stream_preferences || {
      leaders: userSegments.includes('leaders') ? 'daily' : 'off',
      builders: userSegments.includes('builders') ? 'daily' : 'off',
      innovators: userSegments.includes('innovators') ? 'daily' : 'off',
    };

    return NextResponse.json({
      success: true,
      subscriber: {
        email: subscriber.email,
        status: subscriber.status,
        verification_token: subscriber.verification_token,
        stream_preferences: streamPreferences,
        pause_until: subscriber.preferences?.pause_until || null,
        created_at: subscriber.created_at || subscriber.subscribed_date,
      }
    });
  } catch (err: any) {
    console.error('Error fetching subscriber preferences:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token, stream_preferences, pause_days, status_update } = body;

    if (!token && !email) {
      return NextResponse.json(
        { success: false, error: 'Token or email is required' },
        { status: 400 }
      );
    }

    let query = supabase.from('subscribers').select('*');
    if (token) {
      query = query.eq('verification_token', token);
    } else if (email) {
      query = query.eq('email', email.trim().toLowerCase());
    }

    const { data: existingUser, error: findError } = await query.single();

    if (findError || !existingUser) {
      return NextResponse.json(
        { success: false, error: 'Subscriber not found' },
        { status: 404 }
      );
    }

    const updatedPreferences = {
      ...(existingUser.preferences || {}),
      stream_preferences: stream_preferences || existingUser.preferences?.stream_preferences || {},
      pause_until: pause_days
        ? new Date(Date.now() + pause_days * 24 * 60 * 60 * 1000).toISOString()
        : existingUser.preferences?.pause_until || null,
    };

    // Calculate active segments from stream_preferences where frequency !== 'off'
    const activeSegments = Object.entries(updatedPreferences.stream_preferences)
      .filter(([_, freq]) => freq !== 'off')
      .map(([seg, _]) => seg);

    const updateData: Record<string, any> = {
      preferences: updatedPreferences,
      segment: activeSegments.join(','),
    };

    if (status_update) {
      updateData.status = status_update;
    }

    const { error: updateError } = await supabase
      .from('subscribers')
      .update(updateData)
      .eq('email', existingUser.email);

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      stream_preferences: updatedPreferences.stream_preferences,
      active_segments: activeSegments,
    });
  } catch (err: any) {
    console.error('Error updating subscriber preferences:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
