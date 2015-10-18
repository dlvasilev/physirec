'use strict';

module.exports = {
	app: {
		title: 'Physirec',
		description: 'Physirec',
		keywords: 'Physirec'
	},
	port: 3000,
	templateEngine: 'swig',
	sessionSecret: '^$)@!*&&*$@(!&#*(!&@#()',
	sessionCollection: 'sessions',
	assets: {
		lib: {
			css: [
				'public/lib/bootstrap/dist/css/bootstrap.min.css',
				'public/lib/bootstrap-material-design/dist/css/ripples.min.css',
				'public/lib/bootstrap-material-design/dist/css/material-wfont.min.css',
				'public/modules/site/styles/core.css'
			],
			js: [
				'public/lib/jquery/dist/jquery.min.js',
				'public/lib/bootstrap-material-design/dist/js/ripples.min.js',
				'public/lib/bootstrap-material-design/dist/js/material.min.js'
			]
		}
	}
};