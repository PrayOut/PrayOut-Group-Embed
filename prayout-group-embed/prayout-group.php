<?php
/**
 * This file prepares the site for the embedded PrayOut group by generating header scripts
 * 
 * @package PrayOut_Group_Embed
 * @since 1.0.0
 * 
 * @wordpress-plugin
 * Plugin Name: PrayOut Group Embed
 * Plugin URI:  http://www.mobiletappestry.com/modules/prayout-group-embed
 * Description: Show and Operate a PrayOut Group through an iFrame embedded on another website
 * Version:     1.0.0
 * Author:      PrayOut Technology Group, LLC
 * Author URI:  http://www.prayout.com
 * License:     Private
 * License URI: http://www.mobiletappestry.com/licenses
 * 
 * PrayOut Group Embed is covered under ... {license block language here}
 * 
 * You should have received a copy of the ??? License along with PrayOut Group Embed.
 * If not, see http://www.mobiletappestry.com/licenses.
 */

// Exit if accessed directly
if ( !defined( 'ABSPATH' ) ) exit;

define( 'POGROUP_IS_INSTALLED', 1 );
define( 'POGROUP_VERSION', '1.0' );
define( 'POGROUP_PLUGIN_DIR', dirname( __FILE__ ) );



/**
 * Adds appropriate data for the app to load this module.
 * 
 * Add appropriate data to scripts that will be added to the header information.  When running
 * in an tAPP client, this data will be used to load the additional JavaScript resources required
 * by this module.  It also handles the early postMessaging between the parent domain and the 
 * www.prayout.com domain.
 *
 * @since 1.0.0
 * 
 * @see appursite_get_ios_app_store_id(), appursite_get_app_name(), appursite_get_android_app_store_id()
 * {@see 'wp_head'}
 */
function pogroup_add_js() {
	
	// You may have to adjust this number to best fit your site.  When the iframe reloads itself (after logons, etc), 
	// it will cause its parent page to scroll to the top of the iframe for aesthetics...but you have to account for 
	// headers.  You might have to find the best balance between a mobile client and a full client for responsive themes.
	$scroll_header_offset = 86;
	
	// This should contain the relative URL to the prayout-group.js file in your environment.
	$tapp_script_file = '/wp-content/plugins/prayout-group-embed/includes/js/prayout-group.js';
	
	if ( function_exists('appursite_get_ios_app_store_id') ) {
		$ios_app_store_id = appursite_get_ios_app_store_id();
		$ios_app_name = appursite_get_app_name();
		if ( $ios_app_name ) {
			$ios_app_name = $ios_app_name .'/';
		}
		$android_app_store_id = appursite_get_android_app_store_id();
	} else {
		$ios_app_store_id  = '';
		$android_app_store_id  = '';
	}

	if ( $ios_app_store_id ) {
		$ios_store_link = 'https://geo.itunes.apple.com/us/app/' . $ios_app_name . 'id' . $ios_app_store_id . '?mt=8';
	} else {
		// Link to PrayOut App if this site doesn't have an app
		$ios_store_link = 'https://geo.itunes.apple.com/us/app/prayout/id915621248?mt=8';
	}
	
	if ( $android_app_store_id ) {
		$android_store_link = 'https://play.google.com/store/apps/details?id=' . $android_app_store_id;
	} else {
		$android_store_link = '';
	}
	
	if ( function_exists('is_appursite') ) {
		
		$poGroup['js_file'] = $tapp_script_file;
		
		?>
		<script>
			var appursite = appursite || {};
			appursite.modules = appursite.modules || {};
			appursite.modules.poGroup = <?php echo json_encode($poGroup); ?>;
		</script>
		<?php
		
	}

	?>
	<style>
		.po_modal {
			display:    none;
			position:   fixed;
			z-index:    1000;
			top:        0;
			left:       0;
			height:     100%;
			width:      100%;
			background: rgba( 255, 255, 255, .8 ) 
						url('/wp-content/plugins/prayout-group-embed/includes/images/ajax-loader.gif') 
						50% 50% 
						no-repeat;
		}
		body.po_loading {
			overflow: hidden;   
		}
		body.po_loading .po_modal {
			display: block;
		}
		@media screen and (max-width: 720px) {
			iframe#prayout_group {
				width: 100% !important;
			}
		}
	</style>
	<script>
		window.addEventListener('message', questionFromChild, false);
		function questionFromChild( e ) {
			var parser = document.createElement('a');
			parser.href = e.origin;
			if ( parser.hostname === 'www.prayout.com' ) {
				if ( e.data == 'Are you an App?' ) {
					if ( appursite.is_app ) {
						var data = {};
						data.message = 'I am an App';
						data.is_app = appursite.is_app;
						e.source.postMessage( data, e.origin );
					} else {
						var data = {};
						data.message = 'I am NOT an App';
						data.ios_store_link = '<?php echo $ios_store_link ?>';
						data.android_store_link = '<?php echo $android_store_link ?>';
						e.source.postMessage( data, e.origin );
					}
				} else if ( e.data == 'scroll' ) {
					if ( typeof prayout_group_load == 'undefined' ) {
						window.prayout_group_load = true;
					} else {
						jQuery('html, body').animate({
							scrollTop: jQuery("iframe#prayout_group").offset().top - <?php echo $scroll_header_offset ?>
						}, 1000);
					}
				} else if ( e.data == 'start spinner' ) {
					jQuery('body').addClass('po_loading');
				} else if ( e.data == 'stop spinner' ) {
					jQuery('body').removeClass('po_loading');
				} else if ( typeof e.data.iframe_height != 'undefined' ) {
					var frame = document.getElementById('prayout_group');
					frame.height = e.data.iframe_height + "px";
				}
			}
		}
		jq(document).ready( function() {
			if ( sessionStorage.reloadParent ) {
				sessionStorage.reloadParent = '';
				jQuery('body').addClass('po_loading');
			}
		});
	</script>
	<div class="po_modal"></div>
	<?php
	
}
add_action( 'wp_head', 'pogroup_add_js', 20);

