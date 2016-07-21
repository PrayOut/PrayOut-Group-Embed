/**
 * @summary	Accesses native device features on behalf of PrayOut.com running in an iFrame on your website.
 * 
 * @since 	1.0.0
 * @requires	jquery.js
 * @license	Private
 * 
 * PrayOut Group Embed is covered under ... {license block language here}
 * 
 * This license may be found at http://www.mobiletappestry.com/licenses.
 */

if ( typeof jq == "undefined" )
	var jq = jQuery;

var LoginRadius_SocialLogin = LoginRadius_SocialLogin || {};

(function() {
	var AVAudioSessionAdapter,
		audioSession,
		pg_audio_file,
		recording = false,
		playing = false,
		playTimer = null;

	var audio_dir_base,
		audio_dir,
		file_name,
		full_file_name,
		full_file_transfer_name;

	var iFrameSource,
		childUrl,
		deviceReady = false;

	document.addEventListener("deviceready", function(){deviceReady = true;}, false);

	var controls = {

		init: function( data ) {
			if ( ! deviceReady ) {
				setTimeout( function() {
					controls.init( data );
				}, 500);
			} else {
				AVAudioSessionAdapter = gr.eworx.AVAudioSessionAdapter;
				file_name = data.file_name;
				if ( appursite.is_app == 'ios' ) {
					audio_dir_base = cordova.file.documentsDirectory + 'NoCloud/';
					audio_dir = audio_dir_base + 'AudioFiles/';

					// Create the AudioFiles subdirectory if necessary
					window.resolveLocalFileSystemURL(audio_dir, onSuccess, needToCreateAudioDir);

					full_file_name = 'documents://NoCloud/AudioFiles/' + file_name;
					full_file_transfer_name = audio_dir + file_name;
					audioSession = new AVAudioSessionAdapter();

				} else {
					full_file_name = file_name;	
				}

				function needToCreateAudioDir() {
					window.resolveLocalFileSystemURL(audio_dir_base, createAudioDir, onError);
				}
	
				function createAudioDir(audioDirBaseEntry) {
					audioDirBaseEntry.getDirectory("AudioFiles", {create: true, exclusive: false}, onSuccess, onError);
				}
	
				log_audioSession_category_and_options('document ready');
				set_audioSession_category_and_options();
			}
		},


		login: function( data ) {
			if ( appursite.is_app == 'android' ) {
				sessionStorage.reloadParent = true;
				location.href = data.loginURL;			
			} else {
				iab = window.open(data.loginURL, "lrpopupchildwindow", "menubar=1,resizable=1,width=450,height=450,scrollbars=1");
				iab.addEventListener('loadstop', function(event){
					if ( event.url == data.child_compare_url ) {
						iab.close();
						iFrameSource.postMessage( 'reload_page', childUrl );
					}
				});			
			}		
		},
		

		startRecord: function() {
	
			// If we just started recording (not continuing recording), create the file
			if ( ! pg_audio_file ) {

				// Create file to which to write		
				pg_audio_file = new Media( full_file_name, onSuccess, onError, mediaStatus);

			} else {

				pg_audio_file.stop();
				if ( appursite.is_app == 'android' ) {				
					pg_audio_file = new Media( full_file_name, onSuccess, onError, mediaStatus);
				}

			}
	
			// Record Audio
			pg_audio_file.startRecord();
			log_audioSession_category_and_options('startRecord()');
			recording = true;
	
		},


		stopRecord: function() {
			pg_audio_file.stopRecord();
			recording = false;
			if ( appursite.is_app == 'android' ) {				
				pg_audio_file = new Media( full_file_name, onSuccess, onError, mediaStatus);
			}
			set_audioSession_category_and_options();
			log_audioSession_category_and_options('stopRecord()');
		},


		startPlayback: function() {
	
			// Begin the playback
			pg_audio_file.play();
			playing = true;
	
			// Show where it is in the playback
			if ( playTimer == null ) {
				// Run once a second
				playTimer = setInterval( function() {
					// Get the position
					pg_audio_file.getCurrentPosition(
						// Success Callback
						function( position ) {
							if ( position > -1) {
								var data = {};
								data.position = position;
								data.where = 'record_position';
								tellChild( 'reportAudioPositionParent', data);
							}				
						},
						// Error Callback
						onError
					);
				}, 1000);
			}

			log_audioSession_category_and_options('playAudio()');
		},


		pausePlayback: function() {
			pg_audio_file.pause();
			playing = false;
			log_audioSession_category_and_options('pause()');
		},


		upload: function( data ) {
			try_upload( data );
		},

		// Handles Social Sharing in the App environment for sharing via device contacts
		pg_share_via_device: function( data ) {
			var url = data.url;
			var share_string = 'God is Great! I\'m sharing this with you from PrayOut:\r' + url;
			navigator.share( share_string );
		},
		
		external_prayout_link: function( data ) {
			var title = 'Open in PrayOut?';
			var message = 'This link will open in the PrayOut App or PrayOut.com in the browser.  From there, you may use all the features of PrayOut.';
			navigator.notification.confirm(message, function(response) {
				if (response == 1 ) {
					controls.external_link( data );
				}
			}, title);
		},

		external_link: function( data ) {
			var parser = document.createElement('a');
			parser.href = data.href;
			if ( parser.hostname == location.hostname ) {
				appursite.internal_page_click( parser );
			} else {
				appursite.external_page_click( parser );
			}
		}

	};
	
	
	function onSuccess(blah) {
	//	console.log('******** ONSUCCESS FUNCTION RAN *************');
	//	console.log(blah);
	}

	function onError(error) {
		console.log('******** ONERROR FUNCTION RAN **********');
		console.log('code: ' + error.code + '\n' + 'message: ' + error.message + '\n');
		console.log(error);
	}

	function mediaStatus( status ) {
		if ( status == 2 && recording && appursite.is_app == 'android' ) {
			var mediaPath = new gr.eworx.MediaDefaultStoragePath();
			mediaPath.getDefaultStoragePath(function(directoryPath) {
				full_file_name = directoryPath + '/' + file_name;
				full_file_transfer_name = full_file_name;
			});		
		}
		if ( status == 4 && playing ) {
			// This fires when the playback finishes on its own
			clearInterval(playTimer);
			playTimer = null;
			log_audioSession_category_and_options('play complete');
			playing = false;
		}
		var data = {};
		data.status = status;
		tellChild( 'mediaStatus', data );
	}


	function log_audioSession_category_and_options( event ) {
		// Remove the xxx to turn this logging on
		if ( appursite.is_app == 'iosxxx' ) {
			console.log('Upon the ' + event + ' event *********************');
			audioSession.getCategory(
				function(category) {
					// log the category
					console.log('category: ' + category);
					// log the Category options
					var audioSession = new AVAudioSessionAdapter();
					audioSession.getCategoryOptions(
						function(options) {
							console.log('category options: ' + options);
						}
					);
				}
			);
		}
	}

	function set_audioSession_category_and_options() {
		if ( appursite.is_app == 'ios' ) {
			// Set audio session category to allow playback of other sound files
			audioSession.setCategoryWithOptions(
				AVAudioSessionAdapter.Categories.PLAY_AND_RECORD,
				(
					AVAudioSessionAdapter.CategoryOptions.MIX_WITH_OTHERS,
					AVAudioSessionAdapter.CategoryOptions.DUCK_OTHERS,
					AVAudioSessionAdapter.CategoryOptions.DEFAULT_TO_SPEAKER
				),
				function() {
					log_audioSession_category_and_options('setaudio');
				},
				onError
			);		
		}
	}
	/* Note -- DEFAULT_TO_SPEAKER above seems to be trumping the other two options...when I do a get on
	the options that are set, it returns 8 instead of 11.  If I remove d-t-s, I get a correct 3.  Weird.
	It is technically OK for now, but it should work I think.  I also tried every combination and found
	that only m-w-o and d-o create a 3.  allow_bluetooth is a 4 by itself or with either or both of the
	first two.  d-t-s trumps all of them with an 8.  d-o produces a 3 by itself btw, meaning it forces
	m-w-o to be on?*/


	function try_upload( data ) {
		var fileURI = full_file_transfer_name;
		var s3URI = data.s3URI;
		var attempt_counter = 0;
		var ft = new FileTransfer();
		var ft_options = new FileUploadOptions();
		jq.extend(ft_options,data.options);

		set_audioSession_category_and_options();

		// Do this to show the file upload progressing
		ft.onprogress = function(progressEvent) {
			if (progressEvent.lengthComputable) {
				var data = {};
				data.progressEvent = progressEvent;
				tellChild( 's3Uploader.upload.uploadProgress', data );
			}
		};

		// Start the audio file upload to Amazon S3
		ft.upload( fileURI, s3URI,
			function(e){
				pg_audio_file.release();
				pg_audio_file = null;
				tellChild( 's3Uploader.upload.fileUploadSuccess', e );
			},
			function(e){
				if ( ++attempt_counter >= 2 ) {
					tellChild( 's3Uploader.upload.fileUploadFail', e );
				} else {
					try_upload();
				}
			}, ft_options
		);
	}


	// Talk to the child window
	function tellChild( function_to_run, data ) {
//		console.log('tellChild ' + function_to_run);
		data = typeof data !== 'undefined' ? data : {};
		data.function_to_run = function_to_run;
		iFrameSource.postMessage( data, childUrl );
	}


	// Listen for the child window
	window.addEventListener('message', fromChild, false);
	function fromChild(e) {
		var parser = document.createElement('a');
		parser.href = e.origin;
		if ( parser.hostname === 'www.prayout.com' ) {
			iFrameSource = e.source;
			childUrl = e.origin;
			if ( typeof e.data.function_to_run != 'undefined' ) {
				var context = controls;
				var namespaces = e.data.function_to_run.split(".");
				var func = namespaces.pop();
				for (i = 0; i < namespaces.length; i++) {
					context = context[namespaces[i]];
				}
				return context[func](e.data);
			}
		}
	}

})();
