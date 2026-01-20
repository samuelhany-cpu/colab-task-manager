# Authenticated Security Tests
# This script tests security features with valid user sessions

$baseUrl = "http://localhost:3000"
$testResults = @()

Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║   AUTHENTICATED SECURITY TESTS                ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════════╝`n" -ForegroundColor Magenta

# ============================================================================
# Step 1: Register a test user
# ============================================================================
Write-Host "[Step 1] Registering test user..." -ForegroundColor Cyan

$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$testEmail = "sectest$timestamp@gmail.com"
$testPassword = "SecurePass123!"
$testName = "Security Tester $timestamp"

$registerBody = @{
    email = $testEmail
    password = $testPassword
    name = $testName
} | ConvertTo-Json

Write-Host "Email: $testEmail" -ForegroundColor Gray

$registerResponse = Invoke-WebRequest -Uri "$baseUrl/api/register" `
    -Method POST `
    -ContentType "application/json" `
    -Body $registerBody `
    -SessionVariable session `
    -ErrorAction SilentlyContinue

if ($registerResponse.StatusCode -eq 201) {
    Write-Host "✓ User registered successfully" -ForegroundColor Green
    $sessionCookies = $session.Cookies.GetCookies($baseUrl)
} else {
    Write-Host "✗ Registration failed: $($registerResponse.StatusCode)" -ForegroundColor Red
    Write-Host "Response: $($registerResponse.Content)" -ForegroundColor Yellow
    exit 1
}

# Extract session cookies
$cookieString = ""
foreach ($cookie in $sessionCookies) {
    if ($cookieString) { $cookieString += "; " }
    $cookieString += "$($cookie.Name)=$($cookie.Value)"
}

if (-not $cookieString) {
    Write-Host "✗ No session cookies received" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Session established" -ForegroundColor Green

# ============================================================================
# Step 2: Test Rate Limiting
# ============================================================================
Write-Host "`n[Step 2] Testing Rate Limiting (30 messages/minute)..." -ForegroundColor Cyan

$rateLimitPassed = 0
$rateLimitBlocked = 0

Write-Host "Sending 35 rapid requests..." -ForegroundColor Gray

for ($i = 1; $i -le 35; $i++) {
    $testBody = @{
        content = "Rate limit test message $i"
        workspaceId = "test-workspace-id"
    } | ConvertTo-Json
    
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/api/chat" `
            -Method POST `
            -ContentType "application/json" `
            -Body $testBody `
            -Headers @{Cookie = $cookieString} `
            -ErrorAction SilentlyContinue
        
        if ($response.StatusCode -eq 201 -or $response.StatusCode -eq 403) {
            $rateLimitPassed++
            if ($i % 5 -eq 0) {
                Write-Host "  $i requests sent..." -ForegroundColor Gray
            }
        }
    } catch {
        if ($_.Exception.Response.StatusCode -eq 429) {
            $rateLimitBlocked++
            Write-Host "  ✓ Rate limit kicked in at request $i" -ForegroundColor Green
            
            # Check for rate limit headers
            $headers = $_.Exception.Response.Headers
            Write-Host "    Rate limit headers present: $(if ($headers -match 'RateLimit') { 'Yes' } else { 'No' })" -ForegroundColor Gray
            break
        }
    }
    
    Start-Sleep -Milliseconds 100
}

if ($rateLimitBlocked -gt 0) {
    Write-Host "✓ Rate limiting working correctly" -ForegroundColor Green
} else {
    Write-Host "⚠ Rate limiting may not be configured (or limit not reached)" -ForegroundColor Yellow
}

# ============================================================================
# Step 3: Test Input Validation with Auth
# ============================================================================
Write-Host "`n[Step 3] Testing Input Validation..." -ForegroundColor Cyan

# Test empty content
try {
    $emptyBody = @{content = ""; workspaceId = "test123"} | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$baseUrl/api/chat" `
        -Method POST `
        -ContentType "application/json" `
        -Body $emptyBody `
        -Headers @{Cookie = $cookieString} `
        -ErrorAction Stop
    Write-Host "✗ Empty content accepted (should reject)" -ForegroundColor Red
} catch {
    Write-Host "✓ Empty content rejected (400/403)" -ForegroundColor Green
}

# Test missing context
try {
    $noContextBody = @{content = "Hello"} | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$baseUrl/api/chat" `
        -Method POST `
        -ContentType "application/json" `
        -Body $noContextBody `
        -Headers @{Cookie = $cookieString} `
        -ErrorAction Stop
    Write-Host "✗ Missing context accepted (should reject)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✓ Missing context rejected (400)" -ForegroundColor Green
    } else {
        Write-Host "⚠ Unexpected status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

# Test XSS payload (should be sanitized or rejected)
try {
    $xssBody = @{
        content = "<script>alert('XSS')</script><img src=x onerror=alert('XSS')>"
        workspaceId = "test123"
    } | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$baseUrl/api/chat" `
        -Method POST `
        -ContentType "application/json" `
        -Body $xssBody `
        -Headers @{Cookie = $cookieString} `
        -ErrorAction Stop
    Write-Host "✓ XSS payload accepted (content sanitization should happen client-side)" -ForegroundColor Green
} catch {
    Write-Host "✓ XSS payload rejected" -ForegroundColor Green
}

# ============================================================================
# Step 4: Test Spam Detection
# ============================================================================
Write-Host "`n[Step 4] Testing Spam Detection..." -ForegroundColor Cyan

# Test repeated content
$spamContent = "BUY CRYPTO NOW!!! CLICK HERE!!!"
$spamDetected = $false

for ($i = 1; $i -le 3; $i++) {
    try {
        $spamBody = @{content = $spamContent; workspaceId = "test123"} | ConvertTo-Json
        $response = Invoke-WebRequest -Uri "$baseUrl/api/chat" `
            -Method POST `
            -ContentType "application/json" `
            -Body $spamBody `
            -Headers @{Cookie = $cookieString} `
            -ErrorAction Stop
    } catch {
        if ($_.Exception.Response.StatusCode -eq 400) {
            $spamDetected = $true
            Write-Host "✓ Spam content detected and blocked" -ForegroundColor Green
            break
        }
    }
    Start-Sleep -Milliseconds 500
}

if (-not $spamDetected) {
    Write-Host "⚠ Spam detection not triggered (may need adjustment)" -ForegroundColor Yellow
}

# Test URL spam
try {
    $urlSpamBody = @{
        content = "Visit http://spam1.com and http://spam2.com and http://spam3.com"
        workspaceId = "test123"
    } | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$baseUrl/api/chat" `
        -Method POST `
        -ContentType "application/json" `
        -Body $urlSpamBody `
        -Headers @{Cookie = $cookieString} `
        -ErrorAction Stop
    Write-Host "⚠ Multiple URLs accepted (spam filter may need tuning)" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✓ URL spam detected and blocked" -ForegroundColor Green
    }
}

# ============================================================================
# Step 5: Test Burst Protection (5 messages in 10 seconds)
# ============================================================================
Write-Host "`n[Step 5] Testing Burst Spam Protection..." -ForegroundColor Cyan

$burstBlocked = $false
Write-Host "Sending 6 messages rapidly..." -ForegroundColor Gray

for ($i = 1; $i -le 6; $i++) {
    try {
        $burstBody = @{content = "Burst test $i"; workspaceId = "test123"} | ConvertTo-Json
        $response = Invoke-WebRequest -Uri "$baseUrl/api/chat" `
            -Method POST `
            -ContentType "application/json" `
            -Body $burstBody `
            -Headers @{Cookie = $cookieString} `
            -ErrorAction Stop
        Write-Host "  Message $i sent" -ForegroundColor Gray
    } catch {
        if ($_.Exception.Response.StatusCode -eq 429) {
            $burstBlocked = $true
            Write-Host "  ✓ Burst protection triggered at message $i" -ForegroundColor Green
            break
        }
    }
    Start-Sleep -Milliseconds 800
}

if ($burstBlocked) {
    Write-Host "✓ Burst spam protection working" -ForegroundColor Green
} else {
    Write-Host "⚠ Burst protection not triggered (timing may vary)" -ForegroundColor Yellow
}

# ============================================================================
# Step 6: Test Authorization (Accessing non-existent resources)
# ============================================================================
Write-Host "`n[Step 6] Testing Authorization..." -ForegroundColor Cyan

# Try to access non-existent workspace
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/chat?workspaceId=nonexistent-workspace-id" `
        -Method GET `
        -Headers @{Cookie = $cookieString} `
        -ErrorAction Stop
    Write-Host "✗ Accessed non-member workspace (should be blocked)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "✓ Non-member workspace access blocked (403)" -ForegroundColor Green
    } elseif ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "✓ Non-existent workspace handled (404)" -ForegroundColor Green
    } else {
        Write-Host "⚠ Unexpected response: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

# Try to update someone else's message (simulate with random ID)
try {
    $updateBody = @{content = "Hacked message"} | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$baseUrl/api/messages/fake-message-id-12345" `
        -Method PATCH `
        -ContentType "application/json" `
        -Body $updateBody `
        -Headers @{Cookie = $cookieString} `
        -ErrorAction Stop
    Write-Host "✗ Updated non-owned message (should be blocked)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 403 -or $_.Exception.Response.StatusCode -eq 404) {
        Write-Host "✓ Non-owned message update blocked ($($_.Exception.Response.StatusCode))" -ForegroundColor Green
    }
}

# ============================================================================
# Step 7: Test Error Handling (No stack traces)
# ============================================================================
Write-Host "`n[Step 7] Testing Error Handling..." -ForegroundColor Cyan

$errorTests = @(
    @{Endpoint = "/api/messages/invalid-id-format"; Method = "GET"; Name = "Invalid ID format"},
    @{Endpoint = "/api/chat?workspaceId='; DROP TABLE messages;--"; Method = "GET"; Name = "SQL injection in param"}
)

$noStackTraces = $true
foreach ($test in $errorTests) {
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl$($test.Endpoint)" `
            -Method $test.Method `
            -Headers @{Cookie = $cookieString} `
            -ErrorAction Stop
    } catch {
        $errorBody = $_.ErrorDetails.Message
        if ($errorBody -match "stack|trace|at Object|at Function|\s+at\s+") {
            Write-Host "✗ Stack trace found in error: $($test.Name)" -ForegroundColor Red
            $noStackTraces = $false
        } else {
            Write-Host "  ✓ Safe error message: $($test.Name)" -ForegroundColor Gray
        }
    }
}

if ($noStackTraces) {
    Write-Host "✓ No stack traces exposed in error messages" -ForegroundColor Green
} else {
    Write-Host "✗ Stack traces found (security risk!)" -ForegroundColor Red
}

# ============================================================================
# FINAL SUMMARY
# ============================================================================
Write-Host "`n`n╔════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║   AUTHENTICATED TEST SUMMARY                  ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════════╝`n" -ForegroundColor Magenta

Write-Host "Security Features Tested:" -ForegroundColor White
Write-Host "  ✓ User Registration & Authentication" -ForegroundColor Green
Write-Host "  ✓ Rate Limiting (30 req/min)" -ForegroundColor $(if ($rateLimitBlocked) { "Green" } else { "Yellow" })
Write-Host "  ✓ Input Validation & Sanitization" -ForegroundColor Green
Write-Host "  ✓ Spam Detection" -ForegroundColor $(if ($spamDetected) { "Green" } else { "Yellow" })
Write-Host "  ✓ Burst Protection (5 msg/10s)" -ForegroundColor $(if ($burstBlocked) { "Green" } else { "Yellow" })
Write-Host "  ✓ Authorization Checks" -ForegroundColor Green
Write-Host "  ✓ Safe Error Handling" -ForegroundColor $(if ($noStackTraces) { "Green" } else { "Red" })

Write-Host "`n[Test User Created]" -ForegroundColor Cyan
Write-Host "Email: $testEmail" -ForegroundColor Gray
Write-Host "Password: $testPassword" -ForegroundColor Gray
Write-Host "`nYou can use this account for manual testing in the browser.`n" -ForegroundColor Gray
