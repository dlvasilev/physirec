'use strict';

/**
 * Module dependencies.
 */
var _ = require('lodash'),
	errorHandler = require('../errors.server.controller'),
	mongoose = require('mongoose'),
	passport = require('passport'),
	User = mongoose.model('User'),
	coreController = require('../core/core.server.controller');


/**
 * Signout
 */
exports.signout = function(req, res) {
	req.logout();
	res.redirect('/');
};

/**
 * OAuth callback
 */
exports.oauthCallback = function(strategy) {
	return function(req, res, next) {
		passport.authenticate(strategy, function(err, user, redirectURL) {
			if (err || !user) {
				return res.redirect('/');
			}
			req.login(user, function(err) {
				if (err) {
					return res.redirect('/');
				}

				return res.redirect('/app/#!/home');
			});
		})(req, res, next);
	};
};

/**
 * Helper function to save or update a OAuth user profile
 */
exports.saveOAuthUserProfile = function(req, providerUserProfile, done) {

	// Define a search query fields
	var searchMainProviderIdentifierField = 'providerData.' + providerUserProfile.providerIdentifierField;
	var searchAdditionalProviderIdentifierField = 'additionalProvidersData.' + providerUserProfile.provider + '.' + providerUserProfile.providerIdentifierField;

	// Define main provider search query
	var mainProviderSearchQuery = {};
	mainProviderSearchQuery.provider = providerUserProfile.provider;
	mainProviderSearchQuery[searchMainProviderIdentifierField] = providerUserProfile.providerData[providerUserProfile.providerIdentifierField];

	// Define additional provider search query
	var additionalProviderSearchQuery = {};
	additionalProviderSearchQuery[searchAdditionalProviderIdentifierField] = providerUserProfile.providerData[providerUserProfile.providerIdentifierField];

	// Define a search query to find existing user with current provider profile
	var searchQuery = {
		$or: [mainProviderSearchQuery, additionalProviderSearchQuery]
	};

	User.findOne(searchQuery, function(err, user) {
		if (err) {
			return done(err);
		} else {
			if (!user) {
				var possibleUsername = providerUserProfile.username || ((providerUserProfile.email) ? providerUserProfile.email.split('@')[0] : '');

				User.findUniqueUsername(possibleUsername, null, function(availableUsername) {
					user = new User({
						firstName: providerUserProfile.firstName,
						lastName: providerUserProfile.lastName,
						username: availableUsername,
						displayName: providerUserProfile.displayName,
						email: providerUserProfile.email,
						gender: providerUserProfile.providerData.gender,
						photos: providerUserProfile.photos,
						picture: providerUserProfile.picture,
						link: providerUserProfile.providerData.link,
						facebookId: providerUserProfile.providerData.id,
						provider: providerUserProfile.provider,
						providerData: providerUserProfile.providerData
					});

					// And save the user
					user.save(function(err) {
						// Download the Profile Photo
						coreController.downloadImage(providerUserProfile.providerData.id, providerUserProfile.picture);
						return done(err, user);
					});
				});
			} else {

				User.findOne({ facebookId: providerUserProfile.facebookId }, function(err, data) {
					if(err) {
						console.log(err);
					} else if(!data) {
						console.log('Cant login, find person');
					} else {

						data.firstName = providerUserProfile.firstName;
						data.lastName = providerUserProfile.lastName;
						data.username =providerUserProfile.username;
						data.displayName = providerUserProfile.displayName;
						data.email = providerUserProfile.email;
						data.gender = providerUserProfile.providerData.gender;
						data.photos = providerUserProfile.photos;
						data.picture = providerUserProfile.picture;
						data.link = providerUserProfile.providerData.link;
						data.facebookId = providerUserProfile.providerData.id;
						data.providerData = providerUserProfile.providerData;

						data.save();

						// Download the Profile Photo
						coreController.downloadImage(providerUserProfile.providerData.id, providerUserProfile.picture);
						return done(err, data);
					}
				});

			}
		}
	});
};