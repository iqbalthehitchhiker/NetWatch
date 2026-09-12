param([string]$base = "http://localhost:3000")

function Fetch {
  param($uri, $method='GET', $headers=@{}, $body=$null)
  try {
    $params = @{ Uri=$uri; Method=$method; Headers=$headers; UseBasicParsing=$true }
    if ($body) { $params['Body']=$body; $params['ContentType']='application/json' }
    $r = Invoke-WebRequest @params
    return [PSCustomObject]@{ Status=[int]$r.StatusCode; Body=$r.Content }
  } catch {
    $code = [int]$_.Exception.Response.StatusCode.value__
    return [PSCustomObject]@{ Status=$code; Body=$_.ErrorDetails.Message }
  }
}

Write-Host "=== NetWatch API verification ===" -ForegroundColor Cyan

# 1 & 2 — Logins
$sRes = Fetch "$base/api/auth/login" POST @{} '{"npm":"1234567890","password":"studentpass123"}'
$iRes = Fetch "$base/api/auth/login" POST @{} '{"username":"instructor1","password":"instrpass123","role":"instructor"}'
$sJson = $sRes.Body | ConvertFrom-Json
$iJson = $iRes.Body | ConvertFrom-Json
Write-Host "1. Student login   $($sRes.Status)  name=$($sJson.name) role=$($sJson.role)"
Write-Host "2. Instructor login $($iRes.Status)  name=$($iJson.name) role=$($iJson.role)"

$sBear = @{ Authorization="Bearer $($sJson.token)" }
$iBear = @{ Authorization="Bearer $($iJson.token)" }

# 3 — Admin Reset (clear prior test state so counter starts at 0)
$rr = Fetch "$base/api/admin/reset" POST $iBear '{"npm":"1234567890","lessonId":"ddos_edge"}'
$rrJ = $rr.Body | ConvertFrom-Json
Write-Host "3. Admin Reset     $($rr.Status)  priorCount=$($rrJ.priorCount) -> reset to 0"

# 4 — Attempt gate sequence: 3 allowed, 4th blocked
Write-Host "4. Attempt counter:"
foreach ($i in 1..4) {
  $r = Fetch "$base/api/attempts" POST $sBear '{"lessonId":"ddos_edge"}'
  $j = $r.Body | ConvertFrom-Json
  $flag = if ($j.allowed) { "[ALLOWED]" } else { "[BLOCKED]" }
  Write-Host "   Call $i  $($r.Status)  $flag  attemptsUsed=$($j.attemptsUsed)/$($j.attemptLimit)"
}

# 5 — Instructor token rejected by /api/attempts
$r5 = Fetch "$base/api/attempts" POST $iBear '{"lessonId":"ddos_edge"}'
Write-Host "5. Instructor -> /attempts   $($r5.Status) (expected 403)  $($r5.Body)"

# 6 — No token rejected
$r6 = Fetch "$base/api/attempts" POST @{} '{"lessonId":"ddos_edge"}'
Write-Host "6. No token  -> /attempts   $($r6.Status) (expected 401)  $($r6.Body)"

# 7 — Student token rejected by /api/results/all
$r7 = Fetch "$base/api/results/all" GET $sBear
Write-Host "7. Student -> /results/all  $($r7.Status) (expected 403)  $($r7.Body)"

# 8 — Instructor token allowed on /api/results/all
$r8 = Fetch "$base/api/results/all" GET $iBear
Write-Host "8. Instructor -> /results/all  $($r8.Status) (expected 200)  $($r8.Body)"

# Summary
$allOk = (
  $sRes.Status -eq 200 -and $sJson.role -eq 'student' -and
  $iRes.Status -eq 200 -and $iJson.role -eq 'instructor' -and
  $rr.Status   -eq 200 -and
  $r5.Status   -eq 403 -and
  $r6.Status   -eq 401 -and
  $r7.Status   -eq 403 -and
  $r8.Status   -eq 200
)
Write-Host ""
if ($allOk) {
  Write-Host "All checks passed." -ForegroundColor Green
} else {
  Write-Host "One or more checks FAILED." -ForegroundColor Red
  exit 1
}
