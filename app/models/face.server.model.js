'use strict';

/**
 * Module dependencies.
 */

var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

/**
 * Face Schema
 */

var FaceSchema = new Schema({
	facebookId: {
		type: String,
		trim: true,
		default: ''
	},
	userId: {
		type: Schema.Types.ObjectId, 
		ref: 'User'
	},
	pgm_path: {
		type: String,
		trim: true,
		default: ''
	},
	image_path: {
		type: String,
		trim: true,
		default: ''
	}
});

mongoose.model('Face', FaceSchema);
