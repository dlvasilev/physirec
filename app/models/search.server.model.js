'use strict';

/**
 * Module dependencies.
 */

var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

/**
 * Search Schema
 */

var SearchSchema = new Schema({
	userId: {
		type: Schema.Types.ObjectId, 
		ref: 'User'
	},
	file: {
		type: String,
		trim: true,
		default: ''
	},
	image: {
		type: String,
		trim: true,
		default: ''
	},
	faces: {
		type: Array,
		default: []
	},
	users: {
		type: Array,
		default: []
	},
	created: {
		type: Date,
		default: Date.now
	}
});

mongoose.model('Search', SearchSchema);
