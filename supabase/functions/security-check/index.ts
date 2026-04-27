import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Bot detection patterns
const BOT_USER_AGENTS = [
  'bot', 'crawl', 'spider', 'scrape', 'curl', 'wget', 'python-requests',
  'httpx', 'axios', 'node-fetch', 'go-http-client', 'java/', 'ruby',
  'phantom', 'headless', 'selenium', 'puppeteer', 'playwright'
];

const SUSPICIOUS_PATTERNS = [
  'sqlmap', 'nikto', 'nmap', 'masscan', 'dirbuster', 'gobuster',
  'burp', 'owasp', 'acunetix', 'nessus', 'openvas'
];

// High-risk countries (optional, configurable)
const DEFAULT_BLOCKED_COUNTRIES: string[] = [];

interface SecurityCheckRequest {
  user_id?: string;
  action_type: 'login' | 'api_call' | 'password_reset' | 'signup';
  device_fingerprint?: string;
}

interface IPInfo {
  ip: string;
  country_code: string;
  country_name: string;
  city: string;
  region: string;
  is_vpn: boolean;
  is_proxy: boolean;
  is_tor: boolean;
  is_datacenter: boolean;
  threat_score: number;
}

async function getIPInfo(ip: string): Promise<IPInfo | null> {
  try {
    // Use ipapi.co for geolocation (free tier: 1000 requests/day)
    const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`);
    if (!geoResponse.ok) {
      console.log(`Geo lookup failed for ${ip}: ${geoResponse.status}`);
      return null;
    }
    
    const geoData = await geoResponse.json();
    
    // Basic threat detection based on IP characteristics
    const isDatacenter = geoData.org?.toLowerCase().includes('hosting') ||
                         geoData.org?.toLowerCase().includes('cloud') ||
                         geoData.org?.toLowerCase().includes('amazon') ||
                         geoData.org?.toLowerCase().includes('google') ||
                         geoData.org?.toLowerCase().includes('microsoft') ||
                         geoData.org?.toLowerCase().includes('digitalocean');
    
    return {
      ip,
      country_code: geoData.country_code || 'XX',
      country_name: geoData.country_name || 'Unknown',
      city: geoData.city || 'Unknown',
      region: geoData.region || 'Unknown',
      is_vpn: false, // Would need paid service for accurate VPN detection
      is_proxy: geoData.proxy === true,
      is_tor: geoData.country_code === 'T1', // Tor exit nodes often show as T1
      is_datacenter: isDatacenter,
      threat_score: isDatacenter ? 30 : 0
    };
  } catch (error) {
    console.error('Error getting IP info:', error);
    return null;
  }
}

function detectBot(userAgent: string): { isBot: boolean; botType: string | null; confidence: number } {
  if (!userAgent) {
    return { isBot: true, botType: 'no-user-agent', confidence: 90 };
  }
  
  const lowerUA = userAgent.toLowerCase();
  
  // Check for known bot patterns
  for (const pattern of BOT_USER_AGENTS) {
    if (lowerUA.includes(pattern)) {
      return { isBot: true, botType: pattern, confidence: 85 };
    }
  }
  
  // Check for suspicious/attack patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (lowerUA.includes(pattern)) {
      return { isBot: true, botType: `attack-tool:${pattern}`, confidence: 95 };
    }
  }
  
  // Check for missing common browser characteristics
  const hasCommonBrowser = lowerUA.includes('mozilla') || 
                           lowerUA.includes('chrome') || 
                           lowerUA.includes('safari') ||
                           lowerUA.includes('firefox') ||
                           lowerUA.includes('edge');
  
  if (!hasCommonBrowser) {
    return { isBot: true, botType: 'unusual-agent', confidence: 60 };
  }
  
  // Very short user agent is suspicious
  if (userAgent.length < 20) {
    return { isBot: true, botType: 'short-agent', confidence: 50 };
  }
  
  return { isBot: false, botType: null, confidence: 0 };
}

function calculateRiskScore(
  ipInfo: IPInfo | null,
  botDetection: { isBot: boolean; confidence: number },
  failedAttempts: number
): number {
  let score = 0;
  
  // IP-based risks
  if (ipInfo) {
    if (ipInfo.is_tor) score += 40;
    if (ipInfo.is_proxy) score += 20;
    if (ipInfo.is_vpn) score += 15;
    if (ipInfo.is_datacenter) score += 25;
    score += ipInfo.threat_score;
  } else {
    // Unknown IP is suspicious
    score += 20;
  }
  
  // Bot detection risks
  if (botDetection.isBot) {
    score += Math.round(botDetection.confidence * 0.5);
  }
  
  // Failed attempts
  score += Math.min(failedAttempts * 10, 30);
  
  return Math.min(score, 100);
}

function parseUserAgent(userAgent: string): { browser: string; os: string; device: string } {
  if (!userAgent) {
    return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };
  }
  
  const lowerUA = userAgent.toLowerCase();
  
  // Detect browser
  let browser = 'Unknown';
  if (lowerUA.includes('edg/')) browser = 'Edge';
  else if (lowerUA.includes('chrome')) browser = 'Chrome';
  else if (lowerUA.includes('firefox')) browser = 'Firefox';
  else if (lowerUA.includes('safari') && !lowerUA.includes('chrome')) browser = 'Safari';
  else if (lowerUA.includes('opera') || lowerUA.includes('opr/')) browser = 'Opera';
  
  // Detect OS
  let os = 'Unknown';
  if (lowerUA.includes('windows')) os = 'Windows';
  else if (lowerUA.includes('mac os')) os = 'macOS';
  else if (lowerUA.includes('linux')) os = 'Linux';
  else if (lowerUA.includes('android')) os = 'Android';
  else if (lowerUA.includes('iphone') || lowerUA.includes('ipad')) os = 'iOS';
  
  // Detect device type
  let device = 'Desktop';
  if (lowerUA.includes('mobile') || lowerUA.includes('android') || lowerUA.includes('iphone')) {
    device = 'Mobile';
  } else if (lowerUA.includes('tablet') || lowerUA.includes('ipad')) {
    device = 'Tablet';
  }
  
  return { browser, os, device };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get client IP from headers
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     req.headers.get('x-real-ip') ||
                     req.headers.get('cf-connecting-ip') ||
                     'unknown';
    
    const userAgent = req.headers.get('user-agent') || '';
    
    const body: SecurityCheckRequest = await req.json();
    const { user_id, action_type, device_fingerprint } = body;
    
    console.log(`Security check for ${action_type} from IP: ${clientIP}`);
    
    // Get security policies
    const { data: policyData } = await supabase
      .from('security_settings')
      .select('setting_value')
      .eq('setting_key', 'ip_policy')
      .single();
    
    const ipPolicy = policyData?.setting_value || {};
    const blockedCountries = ipPolicy.blocked_countries || DEFAULT_BLOCKED_COUNTRIES;
    const riskThreshold = ipPolicy.risk_score_threshold || 70;
    const maxAttempts = ipPolicy.max_login_attempts || 5;
    const lockoutMinutes = ipPolicy.lockout_minutes || 30;
    
    // Check rate limiting
    const { data: rateLimitData } = await supabase.rpc('check_rate_limit', {
      _identifier: clientIP,
      _identifier_type: 'ip',
      _action_type: action_type,
      _max_attempts: maxAttempts,
      _window_minutes: 15,
      _block_minutes: lockoutMinutes
    });
    
    if (rateLimitData && !rateLimitData.allowed) {
      console.log(`Rate limited: ${clientIP} for ${action_type}`);
      
      // Log security event
      await supabase.rpc('log_security_event', {
        _user_id: user_id || null,
        _event_type: 'rate_limited',
        _ip_address: clientIP,
        _user_agent: userAgent,
        _risk_score: 80,
        _action_taken: 'blocked',
        _details: { action_type, attempts: rateLimitData.attempts }
      });
      
      return new Response(
        JSON.stringify({
          allowed: false,
          reason: 'rate_limited',
          message: 'Demasiados intentos. Por favor espera unos minutos.',
          block_remaining_seconds: rateLimitData.block_remaining_seconds
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get IP info
    const ipInfo = clientIP !== 'unknown' ? await getIPInfo(clientIP) : null;
    
    // Check geo-blocking
    if (ipPolicy.enable_geo_blocking && ipInfo && blockedCountries.includes(ipInfo.country_code)) {
      console.log(`Geo-blocked: ${clientIP} from ${ipInfo.country_code}`);
      
      await supabase.rpc('log_security_event', {
        _user_id: user_id || null,
        _event_type: 'geo_blocked',
        _ip_address: clientIP,
        _country_code: ipInfo.country_code,
        _country_name: ipInfo.country_name,
        _city: ipInfo.city,
        _risk_score: 100,
        _action_taken: 'blocked',
        _details: { reason: 'blocked_country' }
      });
      
      return new Response(
        JSON.stringify({
          allowed: false,
          reason: 'geo_blocked',
          message: 'Acceso no permitido desde esta ubicación.'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check Tor
    if (!ipPolicy.allow_tor && ipInfo?.is_tor) {
      console.log(`Tor blocked: ${clientIP}`);
      
      await supabase.rpc('log_security_event', {
        _user_id: user_id || null,
        _event_type: 'tor_blocked',
        _ip_address: clientIP,
        _is_tor: true,
        _risk_score: 90,
        _action_taken: 'blocked'
      });
      
      return new Response(
        JSON.stringify({
          allowed: false,
          reason: 'tor_blocked',
          message: 'Acceso a través de Tor no está permitido.'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Bot detection
    const botDetection = detectBot(userAgent);
    
    if (botDetection.isBot && botDetection.confidence >= 80) {
      console.log(`Bot detected: ${clientIP}, type: ${botDetection.botType}`);
      
      await supabase.rpc('log_security_event', {
        _user_id: user_id || null,
        _event_type: 'bot_detected',
        _ip_address: clientIP,
        _is_bot: true,
        _user_agent: userAgent,
        _risk_score: botDetection.confidence,
        _action_taken: 'blocked',
        _details: { bot_type: botDetection.botType, confidence: botDetection.confidence }
      });
      
      return new Response(
        JSON.stringify({
          allowed: false,
          reason: 'bot_detected',
          message: 'Actividad automatizada detectada.'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Calculate overall risk score
    const failedAttempts = rateLimitData?.attempts || 0;
    const riskScore = calculateRiskScore(ipInfo, botDetection, failedAttempts);
    
    // Parse device info
    const deviceInfo = parseUserAgent(userAgent);
    
    // If risk score is high but not blocked, require additional verification
    let requiresCaptcha = false;
    let actionTaken = 'allowed';
    
    if (riskScore >= riskThreshold) {
      if (ipPolicy.block_suspicious_ips) {
        console.log(`High risk blocked: ${clientIP}, score: ${riskScore}`);
        
        await supabase.rpc('log_security_event', {
          _user_id: user_id || null,
          _event_type: 'suspicious_login',
          _ip_address: clientIP,
          _country_code: ipInfo?.country_code,
          _country_name: ipInfo?.country_name,
          _city: ipInfo?.city,
          _is_vpn: ipInfo?.is_vpn || false,
          _is_bot: botDetection.isBot,
          _risk_score: riskScore,
          _user_agent: userAgent,
          _action_taken: 'blocked',
          _details: { device_fingerprint }
        });
        
        return new Response(
          JSON.stringify({
            allowed: false,
            reason: 'high_risk',
            message: 'Actividad sospechosa detectada. Por favor contacta soporte.',
            risk_score: riskScore
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        requiresCaptcha = true;
        actionTaken = 'captcha_required';
      }
    } else if (failedAttempts >= (ipPolicy.require_captcha_after_failures || 3)) {
      requiresCaptcha = true;
      actionTaken = 'captcha_required';
    }
    
    // Register/update known device
    if (user_id && device_fingerprint) {
      await supabase
        .from('known_devices')
        .upsert({
          user_id,
          device_fingerprint,
          device_name: deviceInfo.device,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          last_ip: clientIP,
          last_country: ipInfo?.country_name || 'Unknown',
          last_used_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,device_fingerprint'
        });
    }
    
    // Log the security check
    await supabase.rpc('log_security_event', {
      _user_id: user_id || null,
      _event_type: action_type === 'login' ? 'login_attempt' : action_type,
      _ip_address: clientIP,
      _country_code: ipInfo?.country_code,
      _country_name: ipInfo?.country_name,
      _city: ipInfo?.city,
      _is_vpn: ipInfo?.is_vpn || false,
      _is_bot: botDetection.isBot,
      _risk_score: riskScore,
      _user_agent: userAgent,
      _action_taken: actionTaken,
      _details: { device_fingerprint, device_info: deviceInfo }
    });
    
    console.log(`Security check passed for ${clientIP}, risk: ${riskScore}`);
    
    return new Response(
      JSON.stringify({
        allowed: true,
        requires_captcha: requiresCaptcha,
        risk_score: riskScore,
        ip_info: ipInfo ? {
          country: ipInfo.country_name,
          city: ipInfo.city,
          is_vpn: ipInfo.is_vpn,
          is_datacenter: ipInfo.is_datacenter
        } : null,
        device_info: deviceInfo,
        is_bot: botDetection.isBot,
        remaining_attempts: rateLimitData?.remaining_attempts || maxAttempts
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Security check error:', error);

    // SECURITY: Fail-closed - deny access on error to prevent bypass attacks
    // Generate unique error ID for support/debugging without exposing internals
    const errorId = crypto.randomUUID().slice(0, 8);
    console.error(`Security check failed with errorId: ${errorId}`, error);

    return new Response(
      JSON.stringify({
        allowed: false, // Fail-closed for security
        error: 'Security check temporarily unavailable',
        error_id: errorId, // For support reference
        retry_after: 30 // Suggest retry after 30 seconds
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
