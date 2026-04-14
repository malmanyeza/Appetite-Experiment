import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { userId, title, body, data } = await req.json()
    console.log(`Generic User Notification request: To: ${userId}, Title: ${title}`);

    if (!userId || !title || !body) {
       return new Response(JSON.stringify({ error: 'userId, title, and body are required' }), { status: 400 })
    }

    // 1. Fetch user profile to get token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('id', userId)
      .single()

    if (profileError || !profile?.expo_push_token) {
      console.log('User has no push token, skipping push notification');
      return new Response(JSON.stringify({ message: 'No push token found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Prepare Expo notification
    const message = {
      to: profile.expo_push_token,
      sound: 'appetite_alert.wav',
      title: title,
      body: body,
      data: data || {},
    }

    // 3. Send to Expo
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    const result = await response.json()
    console.log(`Expo notification result (User Notification):`, result)

    // 4. Send Web Push
    const { data: webSubs } = await supabase
      .from('web_push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)

    if (webSubs?.length) {
      const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY') || 'BLD_WNWSzhZvd9hqgkGQ2qTi1CjvOnhnxnNhz2B7Db6Jhk0HNTs3o2O6I1Ld5j5hOfT93HjjU10ErD0gjRAPcrc';
      const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY') || 'oS39sJFRlmeG_jhnnz5evNIfAjlnSl79mNyuP3tPxe4';
      
      const webpush = await import("npm:web-push").then(m => m.default);
      webpush.setVapidDetails('mailto:malmanyeza@gmail.com', vapidPublic, vapidPrivate);

      const promises = webSubs.map(s => {
        const sub = s.subscription as any;
        return webpush.sendNotification(sub, JSON.stringify({
          title,
          body,
          data: data || {},
          tag: 'user-alert',
          renotify: true
        })).catch(() => {});
      });
      await Promise.all(promises);
    }

    return new Response(JSON.stringify({ success: true, result, webPushCount: webSubs?.length || 0 }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error) {
    console.error('Error in notify_user:', error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
