<?php
if (!defined('PORTAL_NAME')) define('PORTAL_NAME', 'PKP-PK Weda Bay');

// Masukkan URL dokumen HTTPS pada bagian yang sesuai.
$links = [
 ['id'=>'laporan','number'=>'01','title'=>'Laporan Operasional / Shift','description'=>'Catatan kegiatan dan serah terima setiap shift.','category'=>'OPERASIONAL','url'=>'https://docs.google.com/document/d/1y_Nor8k_FkjkfuJ4JRlkd3GaCiyfrLoU/edit?usp=sharing&ouid=109340509206993682398&rtpof=true&sd=true'],
 ['id'=>'apar','number'=>'02','title'=>'Inspeksi APAR','description'=>'Pemeriksaan dan pemantauan alat pemadam api ringan.','category'=>'PEMERIKSAAN','url'=>'https://docs.google.com/spreadsheets/d/1_3oM3js3ZYFJcmHUlI8Ef1Re2ms7UZ1g/edit?usp=sharing&ouid=109340509206993682398&rtpof=true&sd=true'],
 ['id'=>'checklist','number'=>'03','title'=>'Checklist Kendaraan','description'=>'Pemeriksaan kesiapan kendaraan operasional.','category'=>'KENDARAAN','url'=>'https://docs.google.com/spreadsheets/d/1PWrEoZ0i69UIt4SCh8qUlwGpwQMxsL0bYhAFU-UueJw/edit?usp=sharing'],
 ['id'=>'maintenance','number'=>'04','title'=>'Maintenance Kendaraan','description'=>'Dokumen pemeliharaan untuk setiap unit kendaraan.','category'=>'KENDARAAN','type'=>'maintenance'],
 ['id'=>'foam','number'=>'05','title'=>'Uji Mutu Foam','description'=>'Pencatatan dan hasil pengujian bahan pemadam.','category'=>'PEMERIKSAAN','url'=>''],
 ['id'=>'inventaris','number'=>'06','title'=>'Inventaris PKP-PK','description'=>'Daftar dan pencatatan perlengkapan operasional.','category'=>'ADMINISTRASI','url'=>'https://docs.google.com/spreadsheets/d/1EIlb4XieUK2h2t8ATUqSlC4-So_7E5lxur1ZpAvfnr0/edit?usp=sharing'],
 ['id'=>'pelatihan','number'=>'07','title'=>'Pelatihan dan Kendali Mutu','description'=>'Dokumentasi pelatihan dan pengendalian mutu.','category'=>'PERSONEL','url'=>''],
 ['id'=>'bulanan','number'=>'08','title'=>'Laporan Bulanan PKP-PK','description'=>'Rekapitulasi kegiatan dan laporan bulanan.','category'=>'ADMINISTRASI','url'=>''],
];
$vehicles = [
 ['name'=>'Foam Tender 1','url'=>''], ['name'=>'Foam Tender 2','url'=>''],
 ['name'=>'Commando Car','url'=>''], ['name'=>'Ambulance','url'=>''], ['name'=>'Water Tank','url'=>''],
];
