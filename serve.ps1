param([int]$Port = 8817)
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "http://localhost:$Port"

$MimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "text/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".webp" = "image/webp"
    ".gif"  = "image/gif"
    ".ico"  = "image/x-icon"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".ttf"  = "font/ttf"
    ".txt"  = "text/plain; charset=utf-8"
    ".xml"  = "application/xml; charset=utf-8"
}

$HTTP = New-Object System.Net.HttpListener
$HTTP.Prefixes.Add("http://localhost:$Port/")
$HTTP.Start()
while($HTTP.IsListening) {
    $ctx = $HTTP.GetContext()
    $path = $ctx.Request.Url.LocalPath
    $path = if($path -eq "/") { "/index.html" } else { $path }
    $file = Join-Path $Root $path.TrimStart("/")
    if(Test-Path $file -Type Leaf) {
        $ext = [IO.Path]::GetExtension($file).ToLower()
        $ctx.Response.ContentType = if($MimeTypes.ContainsKey($ext)) { $MimeTypes[$ext] } else { "application/octet-stream" }
        $ctx.Response.StatusCode = 200
        $bytes = [IO.File]::ReadAllBytes($file)
        $ctx.Response.ContentLength64 = $bytes.Length
        $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $ctx.Response.StatusCode = 404
    }
    $ctx.Response.Close()
}
