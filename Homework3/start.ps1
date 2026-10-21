$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "未找到 docker。请先安装并打开 Docker Desktop。"
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker 没有在运行。请先打开 Docker Desktop，等它就绪后再执行。"
}

if (-not (Test-Path -LiteralPath ".env")) {
    Copy-Item -LiteralPath ".env.example" -Destination ".env"
    Write-Host "已根据 .env.example 生成 .env。"
    Write-Host "请先填写 SESSION_SECRET、DB_PASSWORD、MYSQL_ROOT_PASSWORD、SEED_PASSWORD，然后再运行本脚本。"
    exit 1
}

docker compose up --build -d --wait
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

$port = "8080"
foreach ($line in Get-Content -LiteralPath ".env") {
    if ($line -match '^\s*WEB_PORT\s*=\s*(\d+)\s*$') {
        $port = $Matches[1]
    }
}

Write-Host "已启动。"
Write-Host "登录     http://localhost:$port/login"
Write-Host "解题助手 http://localhost:$port/ask"
Write-Host "接口文档 http://localhost:$port/swagger/"
