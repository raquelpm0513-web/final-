<?php
/**
 * Plugin Name: FIMECORP - Portal Interactivo y Catálogo
 * Plugin URI: https://fimecorp.com
 * Description: Integra la aplicación completa de FIMECORP (Catálogo de Equipos, Partners, Calculadoras y Cotizador) en WordPress mediante el shortcode [fimecorp_app] o plantilla dedicada.
 * Version: 3.0.0
 * Author: FIMECORP Soluciones Biomédicas
 * Author URI: https://fimecorp.com
 * License: GPL2
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

class FimecorpPortalPlugin {
    
    public function __construct() {
        add_shortcode('fimecorp_app', array($this, 'render_app'));
        add_shortcode('fimecorp_catalogo', array($this, 'render_app'));
        add_action('wp_enqueue_scripts', array($this, 'register_assets'));
        add_action('template_redirect', array($this, 'handle_fullscreen_page'));
    }

    public function register_assets() {
        // Find compiled CSS and JS files dynamically inside assets/
        $plugin_dir = plugin_dir_path(__FILE__);
        $plugin_url = plugin_dir_url(__FILE__);
        
        // Register Google Font Montserrat
        wp_register_style('fimecorp-google-fonts', 'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600;1,700&display=swap', array(), null);

        // Scan assets folder
        $assets_dir = $plugin_dir . 'assets/';
        if (is_dir($assets_dir)) {
            $files = scandir($assets_dir);
            foreach ($files as $file) {
                if (pathinfo($file, PATHINFO_EXTENSION) === 'css') {
                    wp_register_style('fimecorp-style-' . sanitize_key($file), $plugin_url . 'assets/' . $file, array('fimecorp-google-fonts'), filemtime($assets_dir . $file));
                }
                if (pathinfo($file, PATHINFO_EXTENSION) === 'js') {
                    wp_register_script('fimecorp-script-' . sanitize_key($file), $plugin_url . 'assets/' . $file, array(), filemtime($assets_dir . $file), true);
                }
            }
        }
    }

    public function render_app($atts = array()) {
        $atts = shortcode_atts(array(
            'min_height' => '850px',
            'full_bleed' => 'true',
        ), $atts, 'fimecorp_app');

        // Enqueue styles and scripts
        wp_enqueue_style('fimecorp-google-fonts');

        $plugin_dir = plugin_dir_path(__FILE__);
        $assets_dir = $plugin_dir . 'assets/';
        if (is_dir($assets_dir)) {
            $files = scandir($assets_dir);
            foreach ($files as $file) {
                if (pathinfo($file, PATHINFO_EXTENSION) === 'css') {
                    wp_enqueue_style('fimecorp-style-' . sanitize_key($file));
                }
                if (pathinfo($file, PATHINFO_EXTENSION) === 'js') {
                    // Set type=module filter for Vite bundled scripts
                    add_filter('script_loader_tag', function($tag, $handle, $src) use ($file) {
                        if ($handle === 'fimecorp-script-' . sanitize_key($file)) {
                            return '<script type="module" crossorigin src="' . esc_url($src) . '"></script>';
                        }
                        return $tag;
                    }, 10, 3);
                    wp_enqueue_script('fimecorp-script-' . sanitize_key($file));
                }
            }
        }

        $plugin_dir = plugin_dir_path(__FILE__);
        $plugin_url = plugin_dir_url(__FILE__);

        // Cabecera/menú externo, fijo de verdad a la ventana del navegador
        // (vive fuera del iframe para que nunca "desaparezca" al hacer scroll).
        $header_html = '';
        $header_file = $plugin_dir . 'outer-header-source.html';
        if (file_exists($header_file)) {
            $header_html = str_replace('{{PLUGIN_URL}}', esc_url($plugin_url), file_get_contents($header_file));
        }

        ob_start();
        ?>
        <?php echo $header_html; ?>
        <div id="fimecorp-wordpress-wrapper" style="width: 100%; position: relative; z-index: 10;">
            <?php
                // Reenvía ?page=xxx (si viene de un enlace "Volver al portal"
                // desde producto.html) al iframe, para que la app abra
                // directamente en la pestaña correcta en vez de siempre en Inicio.
                $iframe_src = $plugin_url . 'index.html';
                if (!empty($_GET['page'])) {
                    $iframe_src .= '?page=' . rawurlencode(sanitize_text_field(wp_unslash($_GET['page'])));
                }
            ?>
            <!--
                El iframe tiene aquí una altura FIJA con su propia barra de
                scroll (en vez de crecer según el contenido). Es la manera
                fiable de que la app se comporte tal y como fue diseñada
                (usa "position: fixed" y unidades "vh" pensadas para una
                ventana de navegador real): con una altura fija, el iframe
                SÍ tiene una "ventana" real, y todo eso funciona solo, sin
                necesidad de parches. El trade-off: se ve como un recuadro
                con scroll propio, en vez de fluir con el resto de la página.
            -->
            <iframe
                id="fimecorp-portal-iframe"
                src="<?php echo esc_url($iframe_src); ?>"
                title="Fimecorp"
                style="width:100%; height: 85vh; min-height: 650px; max-height: 1150px; border: 0; display: block;"
            ></iframe>
        </div>
        <?php
        return ob_get_clean();
    }

    // Optional direct full screen view when visiting /?fimecorp_portal=1
    public function handle_fullscreen_page() {
        if (isset($_GET['fimecorp_portal']) && $_GET['fimecorp_portal'] === '1') {
            include plugin_dir_path(__FILE__) . 'index.html';
            exit;
        }
    }
}

new FimecorpPortalPlugin();
