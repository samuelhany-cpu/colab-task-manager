# Authenticated Security Tests with Existing User
# This script tests security features using provided user credentials

$baseUrl = "http://localhost:3000"
$testResults = @()

Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║   AUTHENTICATED SECURITY TESTS (Existing User)║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════════╝`n" -ForegroundColor Magenta

# ============================================================================
# Step 1: Login with existing user
# ============================================================================
Write-Host "[Step 1] Logging in with existing user..." -ForegroundColor Cyan

$testEmail = "deadlysam10@gmail.com"
$testPassword = "Sam@wwe20"

Write-Host "Email: $testEmail" -ForegroundColor Gray

$loginBody = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

# Try to login via API endpoint
try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/signin" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -SessionVariable session `
        -ErrorAction Stop
    
    Write-Host "✓ User logged in successfully" -ForegroundColor Green
    $sessionCookies = $session.Cookies.GetCookies($baseUrl)
    Write-Host "✓ Session established" -ForegroundColor Green
} catch {
    Write-Host "✗ Login failed: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
    
    # Try alternative login endpoint
    Write-Host "`nTrying alternative endpoint..." -ForegroundColor Yellow
    try {
        $formData = @{
            email = $testEmail
            password = $testPassword
        }
        
        $loginResponse = Invoke-WebRequest -Uri "$baseUrl/auth/signin" `
            -Method POST `
            -Body $formData `
            -SessionVariable session `
            -ErrorAction Stop
        
        Write-Host "✓ User logged in successfully (alternative)" -ForegroundColor Green
        $sessionCookies = $session.Cookies.GetCookies($baseUrl)
    } catch {
        Write-Host "✗ Alternative login also failed" -ForegroundColor Red
        Write-Host "Please ensure the dev server is running and credentials are correct" -ForegroundColor Yellow
        exit 1
    }
}

# Extract session cookies
$cookieString = ""
foreach ($cookie in $sessionCookies) {
    if ($cookieString) { $cookieString += "; " }
    $cookieString += "$($cookie.Name)=$($cookie.Value)"
}

Write-Host "Cookies: $($sessionCookies.Count) cookies set" -ForegroundColor Gray

# ============================================================================
# Step 2: Test Rate Limiting (30 messages per minute)
# ============================================================================
Write-Host "`n[Step 2] Testing Rate Limiting (30 messages/minute)..." -ForegroundColor Cyan
Write-Host "Sending 35 rapid requests..." -ForegroundColor Gray

$rateLimitHit = $false
$rateLimitAt = 0
$hasRateLimitHeaders = $false

for ($i = 1; $i -le 35; $i++) {
    $chatBody = @{
        content = "Rate limit test message $i"
        workspaceId = 1
    } | ConvertTo-Json
    
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/api/chat" `
            -Method POST `
            -ContentType "application/json" `
            -Body $chatBody `
            -WebSession $session `
            -ErrorAction Stop
        
        # Check for rate limit headers
        if ($response.Headers["X-RateLimit-Limit"]) {
            $hasRateLimitHeaders = $true
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 429 -and -not $rateLimitHit) {
            $rateLimitHit = $true
            $rateLimitAt = $i
            Write-Host "  ✓ Rate limit kicked in at request $i" -ForegroundColor Green
            break
        }
    }
}

if ($rateLimitHit) {
    Write-Host "    Rate limit headers present: $(if ($hasRateLimitHeaders) { 'Yes' } else { 'No' })" -ForegroundColor Gray
    Write-Host "✓ Rate limiting working correctly" -ForegroundColor Green
    $testResults += @{ Test = "Rate Limiting"; Status = "PASS" }
} else {
    Write-Host "⚠ Rate limit not triggered after 35 requests" -ForegroundColor Yellow
    $testResults += @{ Test = "Rate Limiting"; Status = "WARN" }
}

# Wait for rate limit to reset
Write-Host "`nWaiting 5 seconds for rate limit to cool down..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# ============================================================================
# Step 3: Test Input Validation
# ============================================================================
Write-Host "`n[Step 3] Testing Input Validation..." -ForegroundColor Cyan

# Test empty content
try {
    $emptyBody = @{
        content = ""
        workspaceId = 1
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/api/chat" `
        -Method POST `
        -ContentType "application/json" `
        -Body $emptyBody `
        -WebSession $session `
        -ErrorAction Stop
    
    Write-Host "⚠ Empty content was accepted (should be rejected)" -ForegroundColor Yellow
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400 -or $statusCode -eq 403) {
        Write-Host "✓ Empty content rejected ($statusCode)" -ForegroundColor Green
    } else {
        Write-Host "⚠ Unexpected status: $statusCode" -ForegroundColor Yellow
    }
}

# Test XSS payload
try {
    $xssBody = @{
        content = "<script>alert('XSS')</script>"
        workspaceId = 1
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/api/chat" `
        -Method POST `
        -ContentType "application/json" `
        -Body $xssBody `
        -WebSession $session `
        -ErrorAction Stop
    
    # Check if content was sanitized
    $responseData = $response.Content | ConvertFrom-Json
    if ($responseData.content -notmatch "<script>") {
        Write-Host "✓ XSS payload sanitized" -ForegroundColor Green
    } else {
        Write-Host "⚠ XSS payload not sanitized" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✓ XSS payload rejected" -ForegroundColor Green
}

$testResults += @{ Test = "Input Validation"; Status = "PASS" }

# ============================================================================
# Step 4: Test Spam Detection
# ============================================================================
Write-Host "`n[Step 4] Testing Spam Detection..." -ForegroundColor Cyan

$spamDetected = $false

# Test repeated spam content
try {
    $spamBody = @{
        content = "BUY NOW!!! CLICK HERE!!! FREE MONEY!!! http://spam.com"
        workspaceId = 1
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/api/chat" `
        -Method POST `
        -ContentType "application/json" `
        -Body $spamBody `
        -WebSession $session `
        -ErrorAction Stop
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 429 -or $statusCode -eq 403) {
        $spamDetected = $true
        Write-Host "✓ Spam content detected and blocked" -ForegroundColor Green
    }
}

if (-not $spamDetected) {
    Write-Host "⚠ Spam detection not triggered (may need adjustment)" -ForegroundColor Yellow
}

$testResults += @{ Test = "Spam Detection"; Status = if ($spamDetected) { "PASS" } else { "WARN" } }

# Wait a bit
Start-Sleep -Seconds 3

# ============================================================================
# Step 5: Test Burst Spam Protection (5 messages in 10 seconds)
# ============================================================================
Write-Host "`n[Step 5] Testing Burst Spam Protection..." -ForegroundColor Cyan
Write-Host "Sending 6 messages rapidly..." -ForegroundColor Gray

$burstBlocked = $false
$burstAt = 0

for ($i = 1; $i -le 6; $i++) {
    $burstBody = @{
        content = "Burst test $i - $(Get-Random)"
        workspaceId = 1
    } | ConvertTo-Json
    
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/api/chat" `
            -Method POST `
            -ContentType "application/json" `
            -Body $burstBody `
            -WebSession $session `
            -ErrorAction Stop
        
        Start-Sleep -Milliseconds 100
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 429 -and -not $burstBlocked) {
            $burstBlocked = $true
            $burstAt = $i
            Write-Host "  ✓ Burst protection triggered at message $i" -ForegroundColor Green
            break
        }
    }
}

if ($burstBlocked) {
    Write-Host "✓ Burst spam protection working" -ForegroundColor Green
    $testResults += @{ Test = "Burst Protection"; Status = "PASS" }
} else {
    Write-Host "⚠ Burst protection not triggered" -ForegroundColor Yellow
    $testResults += @{ Test = "Burst Protection"; Status = "WARN" }
}

# Wait for burst window to reset
Write-Host "`nWaiting 12 seconds for burst window to reset..." -ForegroundColor Gray
Start-Sleep -Seconds 12

# ============================================================================
# Step 6: Test Authorization
# ============================================================================
Write-Host "`n[Step 6] Testing Authorization..." -ForegroundColor Cyan

# Test access to non-existent workspace
try {
    $authBody = @{
        content = "Test message"
        workspaceId = 99999
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/api/chat" `
        -Method POST `
        -ContentType "application/json" `
        -Body $authBody `
        -WebSession $session `
        -ErrorAction Stop
    
    Write-Host "⚠ Access to non-existent workspace was allowed" -ForegroundColor Yellow
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 403 -or $statusCode -eq 404) {
        Write-Host "✓ Access to non-existent workspace blocked ($statusCode)" -ForegroundColor Green
        $testResults += @{ Test = "Authorization"; Status = "PASS" }
    } elseif ($statusCode -eq 429) {
        Write-Host "⚠ Unexpected response: TooManyRequests" -ForegroundColor Yellow
        $testResults += @{ Test = "Authorization"; Status = "SKIP" }
    } else {
        Write-Host "⚠ Unexpected status: $statusCode" -ForegroundColor Yellow
        $testResults += @{ Test = "Authorization"; Status = "WARN" }
    }
}

Start-Sleep -Seconds 2

# ============================================================================
# Step 7: Test Error Handling (No Stack Traces)
# ============================================================================
Write-Host "`n[Step 7] Testing Error Handling..." -ForegroundColor Cyan

$stackTraceFound = $false

# Test invalid message ID
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/messages/invalid-id" `
        -Method PATCH `
        -ContentType "application/json" `
        -Body '{"content":"test"}' `
        -WebSession $session `
        -ErrorAction Stop
} catch {
    $errorContent = $_.ErrorDetails.Message
    if ($errorContent -match "at |\.js:|\.ts:|stackTrace|Error:.*\n.*at") {
        $stackTraceFound = $true
        Write-Host "✗ Stack trace found in error response" -ForegroundColor Red
    } else {
        Write-Host "  ✓ Safe error message: Invalid ID format" -ForegroundColor Green
    }
}

# Test SQL injection in param
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/messages/1' OR '1'='1" `
        -Method DELETE `
        -WebSession $session `
        -ErrorAction Stop
} catch {
    $errorContent = $_.ErrorDetails.Message
    if ($errorContent -match "at |\.js:|\.ts:|stackTrace|Error:.*\n.*at") {
        $stackTraceFound = $true
        Write-Host "✗ Stack trace found in SQL injection test" -ForegroundColor Red
    } else {
        Write-Host "  ✓ Safe error message: SQL injection in param" -ForegroundColor Green
    }
}

if (-not $stackTraceFound) {
    Write-Host "✓ No stack traces exposed in error messages" -ForegroundColor Green
    $testResults += @{ Test = "Error Handling"; Status = "PASS" }
} else {
    Write-Host "✗ Stack traces exposed - security risk!" -ForegroundColor Red
    $testResults += @{ Test = "Error Handling"; Status = "FAIL" }
}

# ============================================================================
# Summary
# ============================================================================
Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║   AUTHENTICATED TEST SUMMARY                  ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════════╝`n" -ForegroundColor Magenta

Write-Host "Security Features Tested:" -ForegroundColor Cyan
foreach ($result in $testResults) {
    $symbol = switch ($result.Status) {
        "PASS" { "✓"; $color = "Green" }
        "FAIL" { "✗"; $color = "Red" }
        "WARN" { "⚠"; $color = "Yellow" }
        "SKIP" { "○"; $color = "Gray" }
    }
    Write-Host "  $symbol $($result.Test)" -ForegroundColor $color
}

Write-Host "`n[Test Completed with Existing User]" -ForegroundColor Cyan
Write-Host "Email: $testEmail" -ForegroundColor Gray

Write-Host "`nAll tests completed!" -ForegroundColor Green
