<?php
declare(strict_types=1);
$root = __DIR__;
$render = static function (bool $dashboard) use ($root): string {
    $_GET['view'] = $dashboard ? 'dashboard' : '';
    ob_start();
    include $root . DIRECTORY_SEPARATOR . 'index.php';
    $html = ob_get_clean();
    if (!is_string($html) || !preg_match('~<body[^>]*>(.*?)</body>~s', $html, $match)) {
        throw new RuntimeException('Gagal merender template portal.');
    }
    return preg_replace('~<script src="assets/app.js"></script>~', '', $match[1]);
};
$login = $render(false);
$dashboard = $render(true);
$html = '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><title>Masuk — PKP-PK Weda Bay</title><link rel="stylesheet" href="assets/style.css"></head><body class="login-body"><div id="login-screen">' . $login . '</div><div id="portal-app" hidden>' . $dashboard . '</div><script src="assets/app.js"></script></body></html>';
if (!is_dir($root . '/public/assets')) mkdir($root . '/public/assets', 0775, true);
file_put_contents($root . '/public/index.html', $html);
copy($root . '/assets/style.css', $root . '/public/assets/style.css');
copy($root . '/assets/app.js', $root . '/public/assets/app.js');
copy($root . '/assets/wirarff-logo.png', $root . '/public/assets/wirarff-logo.png');
echo "Portal statis dibuat di public/.\n";
