$baseUrl = "https://productbasket.onrender.com/api"

function Assert-Condition($cond, $msg) {
    if (-not $cond) {
        Write-Error "ASSERTION FAILED: $msg"
        exit 1
    } else {
        Write-Host "PASS: $msg" -ForegroundColor Green
    }
}

try {
    Write-Host "=== 1. Register User A ==="
    $emailA = "usera_$([guid]::NewGuid().ToString().Substring(0,8))@example.com"
    $regA = @{ displayName = "User A Original"; email = $emailA; password = "Password123!" } | ConvertTo-Json
    $authA = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $regA -ContentType "application/json"
    $hA = @{ Authorization = "Bearer $($authA.token)" }
    Assert-Condition ($authA.user.id -ne $null) "User A created with GUID $($authA.user.id)"

    Write-Host "`n=== 2. User A Creates Family ==="
    $famBody = @{ name = "Sync Verification Family" } | ConvertTo-Json
    $fam = Invoke-RestMethod -Uri "$baseUrl/family/create" -Method Post -Body $famBody -ContentType "application/json" -Headers $hA
    Assert-Condition ($fam.familyId -ne $null -and $fam.inviteCode.Length -ge 3) "Family created with ID $($fam.familyId) and Code $($fam.inviteCode)"

    Write-Host "`n=== 3. Register User B ==="
    $emailB = "userb_$([guid]::NewGuid().ToString().Substring(0,8))@example.com"
    $regB = @{ displayName = "User B Original"; email = $emailB; password = "Password123!" } | ConvertTo-Json
    $authB = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $regB -ContentType "application/json"
    $hB = @{ Authorization = "Bearer $($authB.token)" }
    Assert-Condition ($authB.user.id -ne $null) "User B created with GUID $($authB.user.id)"

    Write-Host "`n=== 4. User B Joins Family with Code ==="
    $joinBody = @{ inviteCode = $fam.inviteCode } | ConvertTo-Json
    $joined = Invoke-RestMethod -Uri "$baseUrl/family/join" -Method Post -Body $joinBody -ContentType "application/json" -Headers $hB
    Assert-Condition ($joined.familyId.ToString().ToLower() -eq $fam.familyId.ToString().ToLower()) "User B joined family"

    Write-Host "`n=== 5. Verify Family Members Count is 2 ==="
    $members = Invoke-RestMethod -Uri "$baseUrl/family/$($fam.familyId)/members" -Headers $hA
    Assert-Condition ($members.Count -eq 2) "Family has 2 members"

    Write-Host "`n=== 6. User B Updates Profile Name (Bug 7) ==="
    $profileBody = @{ displayName = "User B Renamed" } | ConvertTo-Json
    $updatedProfile = Invoke-RestMethod -Uri "$baseUrl/auth/profile" -Method Put -Body $profileBody -ContentType "application/json" -Headers $hB
    Assert-Condition ($updatedProfile.displayName -eq "User B Renamed") "PUT /api/auth/profile returned new name"

    $meB = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Headers $hB
    Assert-Condition ($meB.displayName -eq "User B Renamed") "GET /api/auth/me persists updated name on reload"

    Write-Host "`n=== 7. User A adds 8 apples and marks Bought (Bug 13 and 14) ==="
    $add8 = [ordered]@{
        title = "Apples"
        unit = "1 kg"
        count = 8
        emoji = "apple"
        familyId = $fam.familyId
    } | ConvertTo-Json
    $itemA = Invoke-RestMethod -Uri "$baseUrl/cart/items" -Method Post -Body $add8 -ContentType "application/json; charset=utf-8" -Headers $hA
    Assert-Condition ($itemA.count -eq 8) "User A added 8 apples"

    $assignA = Invoke-RestMethod -Uri "$baseUrl/cart/$($itemA.id)/assign" -Method Post -Headers $hA
    $boughtA = Invoke-RestMethod -Uri "$baseUrl/cart/$($itemA.id)/toggle-purchased" -Method Post -Headers $hA
    Assert-Condition ($boughtA.item.isBought -eq $true) "User A marked 8 apples as bought"

    Write-Host "`n=== 8. User B adds 1 apple -> must create separate unbought item (Bug 14) ==="
    $add1 = [ordered]@{
        title = "Apples"
        unit = "1 kg"
        count = 1
        emoji = "apple"
        familyId = $fam.familyId
    } | ConvertTo-Json
    $itemB = Invoke-RestMethod -Uri "$baseUrl/cart/items" -Method Post -Body $add1 -ContentType "application/json; charset=utf-8" -Headers $hB
    Assert-Condition ($itemB.id -ne $itemA.id) "Separate cart item created with distinct ID $($itemB.id) vs $($itemA.id)"
    Assert-Condition ($itemB.count -eq 1 -and $itemB.isBought -eq $false) "New item count is 1 and unbought"

    $cartAll = Invoke-RestMethod -Uri "$baseUrl/cart?familyId=$($fam.familyId)" -Headers $hA
    Assert-Condition ($cartAll.Count -eq 2) "Cart contains both bought (8) and unbought (1) entries separately"

    Write-Host "`n=== 9. User A Creates Event (Bug 3) ==="
    $evBody = @{
        title = "Birthday Party"
        eventDate = "31 December"
        icon = "party"
        familyId = $fam.familyId
        hasCart = $true
    } | ConvertTo-Json
    $evt = Invoke-RestMethod -Uri "$baseUrl/events" -Method Post -Body $evBody -ContentType "application/json" -Headers $hA
    Assert-Condition ($evt.id -ne $null -and $evt.hasCart -eq $true) "Event created with hasCart: true"

    Write-Host "`n=== 10. User B Fetches Events (Bug 3) ==="
    $eventsB = Invoke-RestMethod -Uri "$baseUrl/events?familyId=$($fam.familyId)" -Headers $hB
    Assert-Condition ($eventsB.Count -ge 1 -and $eventsB[0].hasCart -eq $true) "User B sees the active event with hasCart: true"

    Write-Host "`n=== 11. User B Leaves Family (Bug 5) ==="
    $leaveRes = Invoke-RestMethod -Uri "$baseUrl/family/$($fam.familyId)/leave" -Method Post -Headers $hB
    Assert-Condition ($leaveRes.success -eq $true) "User B successfully left family"

    $membersAfter = Invoke-RestMethod -Uri "$baseUrl/family/$($fam.familyId)/members" -Headers $hA
    Assert-Condition ($membersAfter.Count -eq 1) "Family members count decreased to 1"
    Assert-Condition ($membersAfter[0].email -eq $emailA) "Only User A remains in family"

    Write-Host "`n>>> ALL 11 MULTI-CLIENT INTEGRATION CHECKS PASSED SUCCESSFULLY! <<<" -ForegroundColor Cyan
} catch {
    Write-Error "FAILED: $_"
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
        Write-Host "Response Body: $body" -ForegroundColor Red
    }
    exit 1
}
