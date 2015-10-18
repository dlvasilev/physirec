'use strict';

/**
 * Module dependencies.
 */

var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

/**
 * TrainingData Schema
 */

var TrainingDataSchema = new Schema({
	eigenFace_path: {
		type: String,
		trim: true,
		default: ''
	},
	fisherFace_path: {
		type: String,
		trim: true,
		default: ''
	},
	lbphFace_path: {
		type: String,
		trim: true,
		default: ''
	},
	userId: {
		type: Schema.Types.ObjectId, 
		ref: 'User'
	},
	facebookId: {
		type: String,
		trim: true,
		default: ''
	}
});

mongoose.model('TrainingData', TrainingDataSchema);
