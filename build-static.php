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
$master = (static function () use ($root): string {
    ob_start();
    include $root . DIRECTORY_SEPARATOR . 'master.php';
    return (string) ob_get_clean();
})();
$html = '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><title>Masuk — Yogi Prasetya E.W.</title><link rel="stylesheet" href="assets/style.css"></head><body class="login-body"><div id="login-screen">' . $login . '</div><div id="portal-app" hidden>' . $dashboard . '</div><script src="assets/app.js"></script></body></html>';
if (!is_dir($root . '/public/assets')) mkdir($root . '/public/assets', 0775, true);
file_put_contents($root . '/public/index.html', $html);
file_put_contents($root . '/public/master-menu.html', $master);
copy($root . '/calculator.html', $root . '/public/kalkulator.html');
$members = (static function () use ($root): string {
    ob_start();
    include $root . DIRECTORY_SEPARATOR . 'members.php';
    return (string) ob_get_clean();
})();
file_put_contents($root . '/public/master-users.html', $members);
copy($root . '/assets/style.css', $root . '/public/assets/style.css');
copy($root . '/assets/app.js', $root . '/public/assets/app.js');
copy($root . '/assets/master.js', $root . '/public/assets/master.js');
copy($root . '/assets/members.js', $root . '/public/assets/members.js');
copy($root . '/assets/wirarff-logo.png', $root . '/public/assets/wirarff-logo.png');
echo "Portal statis dibuat di public/.\n";
