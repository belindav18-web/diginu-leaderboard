<?php
/**
 * Plugin Name: diginu Leaderboard
 * Description: Shortcode [diginu_leaderboard src="CSV_URL"] renders a leaderboard from a published Google Sheet (CSV).
 * Version: 1.0.4
 * Author: diginu
 */

if (!defined('ABSPATH')) { exit; }

/**
 * Register JS (load in <head> so Elementor preview can’t skip it)
 */
function diginu_leaderboard_assets() {
  wp_register_script(
    'diginu-leaderboard-js',
    plugins_url('leaderboard.js', __FILE__),
    array(),
    '1.0.1',
    false // load in HEAD
  );
}
add_action('wp_enqueue_scripts', 'diginu_leaderboard_assets', 5);

/**
 * Shortcode
 */
function diginu_leaderboard_shortcode($atts) {
  $atts = shortcode_atts(array(
    'src' => 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRgL9D3f8unpiKtGBbmQvtqCLg-ZoxSl5epX76sMRaWPng46PcShZHRVx7zxVoeSI2JGiY_-EyPQK12/pub?gid=0&single=true&output=csv',
    'title' => 'Leaderboard',
    'limit' => '0',
  ), $atts, 'diginu_leaderboard');

  if (empty($atts['src'])) {
  return 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRgL9D3f8unpiKtGBbmQvtqCLg-ZoxSl5epX76sMRaWPng46PcShZHRVx7zxVoeSI2JGiY_-EyPQK12/pub?gid=0&single=true&output=csv';
}


  // Markup + styles
  $html = '<div class="diginu-lb-wrap">
  <style>
    .diginu-lb { width:100%; border-collapse:collapse; margin:1rem 0; font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; color:#215c73; }
    .diginu-lb th, .diginu-lb td { padding:10px 12px; border-bottom:1px solid #eee; text-align:left; }
    .diginu-lb thead th { position:sticky; top:0; background:#fafafa; z-index:1; }
    .diginu-lb .rank { width:60px; text-align:center; font-weight:600; }
    .diginu-lb .badge { display:inline-block; padding:2px 8px; border-radius:999px; background:#f4f4f4; font-size:12px; }
    .diginu-lb tr:nth-child(1) .badge { background:#ffe58f; }
    .diginu-lb tr:nth-child(2) .badge { background:#e6f4ff; }
    .diginu-lb tr:nth-child(3) .badge { background:#ffe7e6; }
    .diginu-lb .muted { color:#215c73; font-size:12px; margin-top:6px; }
    .diginu-lb .hdr { display:flex; align-items:baseline; gap:.75rem; }
    .diginu-lb .hdr h3 { margin:0; font-size:1.25rem; color:#215c73; }
    .diginu-lb .controls { display:flex; gap:.5rem; margin:.5rem 0; }
    .diginu-lb .search { padding:.5rem .75rem; border:1px solid #ddd; border-radius:.5rem; width:250px; }
  </style>
  <div class="hdr">
    <h3>'.esc_html($atts['title']).'</h3>
    <span class="muted" id="diginu-lb-updated"></span>
  </div>
  <div class="controls">
    <input id="diginu-lb-search" class="search" type="search" placeholder="Search name...">
  </div>
  <table class="diginu-lb" id="diginu-lb-table" aria-describedby="diginu-lb-updated">
    <thead>
      <tr>
        <th class="rank">#</th>
        <th>Name</th>
        <th>Surname</th>
        <th>Members</th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>
</div>';

  // Enqueue + pass config
  wp_enqueue_script('diginu-leaderboard-js');
  wp_add_inline_script(
    'diginu-leaderboard-js',
    'console.log("[diginu-leaderboard] inline config attached"); window.diginuLeaderboardConfig = ' . wp_json_encode(array(
      'src' => esc_url_raw($atts['src']),
      'limit' => (int)$atts['limit'],
      'cacheBust' => time(),
    )) . ';',
    'before'
  );

  // Small marker to verify shortcode rendered
  $html .= '<script>console.log("[diginu-leaderboard] shortcode rendered");</script>';

  return $html;
}
add_shortcode('diginu_leaderboard', 'diginu_leaderboard_shortcode');
