'use strict';

module.exports = function(app) {
	// Root routing
	var core = require('../../app/controllers/core.server.controller');

	app.route('/').get(core.index);
	app.route('/app/').get(core.appIndex);

	app.route('/core/upload/images').post(core.uploadImage);
	app.route('/core/search/results').post(core.searchResults);
	app.route('/core/my').post(core.appMy);
};