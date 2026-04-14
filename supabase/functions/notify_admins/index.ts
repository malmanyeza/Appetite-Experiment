import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import webpush from "npm:web-push"

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload = await req.json()
    console.log('Admin Notification payload received:', payload)

    const notification = payload.record || payload

    // 1. Find all Admin users
    const { data: adminRoles, error: adminError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')

    if (adminError || !adminRoles?.length) {
      console.log('No admin users found to notify');
      return new Response(JSON.stringify({ message: 'No admins found' }), { status: 200 })
    }

    const adminIds = adminRoles.map(r => r.user_id)

    // 2. Fetch Push Tokens (Expo and Web)
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, expo_push_token')
      .in('id', adminIds)
      .not('expo_push_token', 'is', null)

    const { data: webSubs, error: webSubsError } = await supabase
      .from('web_push_subscriptions')
      .select('id, user_id, subscription')
      .in('user_id', adminIds)

    if (!profiles?.length && !webSubs?.length) {
      console.log('No admins with push tokens found');
      return new Response(JSON.stringify({ message: 'No admin device tokens found' }), { status: 200 })
    }

    // 3. Send Expo Notifications
    if (profiles?.length) {
      const messages = profiles.map(p => ({
        to: p.expo_push_token,
        sound: 'default',
        title: notification.title || 'Admin Alert',
        body: notification.message || 'New admin event requires attention.',
        data: { ...notification.payload, type: notification.type || 'ADMIN_ALERT' },
      }))

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      })
    }

    // 4. Send Web Push Notifications
    if (webSubs?.length) {
      const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY') || 'BLD_WNWSzhZvd9hqgkGQ2qTi1CjvOnhnxnNhz2B7Db6Jhk0HNTs3o2O6I1Ld5j5hOfT93HjjU10ErD0gjRAPcrc';
      const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY') || 'oS39sJFRlmeG_jhnnz5evNIfAjlnSl79mNyuP3tPxe4';
      
      webpush.setVapidDetails('mailto:malmanyeza@gmail.com', vapidPublic, vapidPrivate);

      const typeMap = {
        'driver_signup': 'NEW_DRIVER',
        'payout_request': 'NEW_PAYOUT',
        'order_alert': 'NEW_ORDER'
      };
      
      const mappedType = typeMap[notification.type] || 'ADMIN_ALERT';

      const webPushPromises = webSubs.map(s => {
        const sub = s.subscription as any;
        return webpush.sendNotification(sub, JSON.stringify({
          title: notification.title || 'Admin Alert',
          body: notification.message || 'New admin event requires attention.',
          data: { ...notification.payload, type: mappedType }
        })).catch(err => console.error('Web Push failed:', err));
      });

      await Promise.all(webPushPromises);
    }

    return new Response(JSON.stringify({ success: true }), { 
      headers: { 'Content-Type': 'application/json' } 
    })

  } catch (error) {
    console.error('Error in notify_admins:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
