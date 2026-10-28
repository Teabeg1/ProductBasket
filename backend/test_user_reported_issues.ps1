$baseUrl = "https://productbasket.onrender.com/api"
$timeoutSec = 15

function Assert-Condition($cond, $msg) {
    if (-not $cond) {
        Write-Error "ASSERTION FAILED: $msg"
        exit 1
    } else {
        Write-Host "PASS: $msg" -ForegroundColor Green
    }
}

Write-Host "=========================================================="
Write-Host "TEST SUITE: Verify Custom Products & Multi-Family Events"
Write-Host "=========================================================="

try {
    # --- 1. Register User (with warm-up retry) ---
    Write-Host "`n--- Step 1: Register User ---"
    $email = "testuser_$([guid]::NewGuid().ToString().Substring(0,8))@example.com"
    $regBody = @{ displayName = "Tester"; email = $email; password = "Password123!" } | ConvertTo-Json
    $auth = $null
    for ($i = 0; $i -lt 3; $i++) {
        try {
            $auth = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $regBody -ContentType "application/json" -TimeoutSec 25
            break
        } catch {
            Write-Host "Warming up remote server ($($i+1)/3)..."
            Start-Sleep -Seconds 2
        }
    }
    $headers = @{ Authorization = "Bearer $($auth.token)" }
    Assert-Condition ($auth.token -ne $null) "User registered with valid JWT token"

    # --- 2. Create Family 1 and Family 2 ---
    Write-Host "`n--- Step 2: Create Family 1 & Family 2 ---"
    $fam1 = Invoke-RestMethod -Uri "$baseUrl/family/create" -Method Post -Body (@{ name = "Alpha Family" } | ConvertTo-Json) -ContentType "application/json" -Headers $headers -TimeoutSec $timeoutSec
    $fam2 = Invoke-RestMethod -Uri "$baseUrl/family/create" -Method Post -Body (@{ name = "Beta Family" } | ConvertTo-Json) -ContentType "application/json" -Headers $headers -TimeoutSec $timeoutSec
    
    $fId1 = $fam1.familyId.ToString().ToLower()
    $fId2 = $fam2.familyId.ToString().ToLower()
    Assert-Condition ($fId1 -ne $null -and $fId2 -ne $null) "Both families created ($fId1, $fId2)"

    # --- 3. Issue 1: Custom Product Creation ---
    Write-Host "`n--- Step 3: Create Custom Product in Alpha Family ---"
    $cpBody = @{
        title = "Artisan Sourdough Bread"
        unit = "500 g"
        category = "Custom"
        emoji = "🍞"
        familyId = $fId1
    } | ConvertTo-Json

    $cp = Invoke-RestMethod -Uri "$baseUrl/products/custom" -Method Post -Body ([System.Text.Encoding]::UTF8.GetBytes($cpBody)) -ContentType "application/json; charset=utf-8" -Headers $headers -TimeoutSec $timeoutSec
    Assert-Condition ($cp.id -ne $null) "Custom product created on server with ID $($cp.id)"
    Assert-Condition ($cp.title -eq "Artisan Sourdough Bread") "Custom product title matches"

    # Query catalog for Alpha Family
    $catalogAlpha = Invoke-RestMethod -Uri "$baseUrl/products?familyId=$fId1" -Headers $headers -TimeoutSec $timeoutSec
    $customsAlpha = @($catalogAlpha | Where-Object { $_.title -eq "Artisan Sourdough Bread" })
    Assert-Condition ($customsAlpha.Count -eq 1) "Custom product exists EXACTLY ONCE (count = 1) in Alpha Family catalog"

    # Query catalog for Beta Family (must NOT see Alpha's custom product)
    $catalogBeta = Invoke-RestMethod -Uri "$baseUrl/products?familyId=$fId2" -Headers $headers -TimeoutSec $timeoutSec
    $customsBeta = @($catalogBeta | Where-Object { $_.title -eq "Artisan Sourdough Bread" })
    Assert-Condition ($customsBeta.Count -eq 0) "Beta Family does NOT see Alpha Family's custom product"

    # --- 4. Issue 2: Events Across Multiple Families ---
    Write-Host "`n--- Step 4: Create Events in Both Families ---"
    $ev1Body = @{
        title = "Alpha Family Gathering"
        eventDate = "15 November"
        icon = "🎉"
        familyId = $fId1
        hasCart = $true
    } | ConvertTo-Json
    $ev1 = Invoke-RestMethod -Uri "$baseUrl/events" -Method Post -Body $ev1Body -ContentType "application/json" -Headers $headers -TimeoutSec $timeoutSec
    Assert-Condition ($ev1.id -ne $null) "Event 1 created in Alpha Family"

    $ev2Body = @{
        title = "Beta Family Barbecue"
        eventDate = "20 November"
        icon = "🍖"
        familyId = $fId2
        hasCart = $true
    } | ConvertTo-Json
    $ev2 = Invoke-RestMethod -Uri "$baseUrl/events" -Method Post -Body $ev2Body -ContentType "application/json" -Headers $headers -TimeoutSec $timeoutSec
    Assert-Condition ($ev2.id -ne $null) "Event 2 created in Beta Family"

    # Step 4a: GET /api/events (no parameter) -> MUST return events from BOTH families
    Write-Host "`n--- Step 5: Fetch All Events (Multi-Family Aggregation) ---"
    $allEvents = Invoke-RestMethod -Uri "$baseUrl/events" -Headers $headers -TimeoutSec $timeoutSec
    $hasEv1 = @($allEvents | Where-Object { $_.title -eq "Alpha Family Gathering" }).Count -ge 1
    $hasEv2 = @($allEvents | Where-Object { $_.title -eq "Beta Family Barbecue" }).Count -ge 1
    Assert-Condition ($hasEv1 -and $hasEv2) "GET /api/events returns events from BOTH Alpha Family and Beta Family simultaneously"

    # Step 4b: GET /api/events?familyId=Alpha -> returns ONLY Alpha events
    Write-Host "`n--- Step 6: Filter Events by Family ---"
    $alphaEvents = Invoke-RestMethod -Uri "$baseUrl/events?familyId=$fId1" -Headers $headers -TimeoutSec $timeoutSec
    $alphaHasEv1 = @($alphaEvents | Where-Object { $_.title -eq "Alpha Family Gathering" }).Count -ge 1
    $alphaHasEv2 = @($alphaEvents | Where-Object { $_.title -eq "Beta Family Barbecue" }).Count -ge 1
    Assert-Condition ($alphaHasEv1 -and -not $alphaHasEv2) "Filter for Alpha Family returns Event 1 and NOT Event 2"

    $betaEvents = Invoke-RestMethod -Uri "$baseUrl/events?familyId=$fId2" -Headers $headers -TimeoutSec $timeoutSec
    $betaHasEv1 = @($betaEvents | Where-Object { $_.title -eq "Alpha Family Gathering" }).Count -ge 1
    $betaHasEv2 = @($betaEvents | Where-Object { $_.title -eq "Beta Family Barbecue" }).Count -ge 1
    Assert-Condition ($betaHasEv2 -and -not $betaHasEv1) "Filter for Beta Family returns Event 2 and NOT Event 1"

    Write-Host "`n>>> ALL INTEGRATION TESTS PASSED WITH EXPLICIT 10S TIMEOUT! <<<" -ForegroundColor Green
}
catch {
    Write-Error "Test encountered error: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response body: $($reader.ReadToEnd())" -ForegroundColor Red
    }
    exit 1
}
