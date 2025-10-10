# codex-deploy.ps1
# ================================================
# 🔧 자동 배포 스크립트: Codex CLI 스타일
# GitHub → Netlify 자동 배포 자동화
# ================================================

Write-Host "🚀 Codex Auto Deploy 시작..."

# 1️⃣ 변경사항 스테이징
git add .
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ git add 실패. 프로젝트 경로를 확인하세요."
    exit 1
}

# 2️⃣ 커밋 메시지 자동 생성 (날짜 기반)
$commitMsg = "자동 배포 - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
git commit -m $commitMsg
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ 커밋할 변경사항이 없습니다."
}

# 3️⃣ GitHub 푸시
Write-Host "📡 GitHub로 푸시 중..."
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ GitHub 푸시 실패! 계정 인증이나 원격 저장소를 확인하세요."
    exit 1
}

# 4️⃣ Netlify 배포 트리거 (선택)
# Netlify API Key & Site ID가 있다면 즉시 배포 트리거도 가능
# 아래 두 줄 주석 해제하고 값 입력하면 자동 빌드 트리거됨

# $NETLIFY_SITE_ID = "여기에_사이트_ID"
# $NETLIFY_AUTH_TOKEN = "여기에_API_KEY"
# Invoke-RestMethod -Uri "https://api.netlify.com/api/v1/sites/$NETLIFY_SITE_ID/builds" -Headers @{Authorization = "Bearer $NETLIFY_AUTH_TOKEN"} -Method POST

Write-Host "✅ GitHub 푸시 완료! Netlify가 자동으로 빌드할 거예요."

# 5️⃣ 종료 메시지
Write-Host "🎉 Codex CLI 자동 배포 완료!"
