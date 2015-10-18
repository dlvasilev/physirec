'use strict';

/**
 * Module dependencies.
 */
var passport = require('passport'),
	url = require('url'),
	FacebookStrategy = require('passport-facebook').Strategy,
	config = require('../config'),
	users = require('../../app/controllers/users.server.controller');

module.exports = function() {
	// Use facebook strategy
	passport.use(new FacebookStrategy({
			clientID: config.facebook.clientID,
			clientSecret: config.facebook.clientSecret,
			callbackURL: config.facebook.callbackURL,
			profileFields: ['id', 'first_name', 'last_name', 'email', 'gender', 'link', 'picture.type(large)'],
			passReqToCallback: true
		},
		function(req, accessToken, refreshToken, profile, done) {

			// Set the provider data and include tokens
			var providerData = profile._json;
			providerData.accessToken = accessToken;
			providerData.refreshToken = refreshToken;

			// Create the user OAuth profile
			var providerUserProfile = {
				firstName: profile.name.givenName,
				lastName: profile.name.familyName,
				displayName: profile.name.givenName + ' ' + profile.name.familyName,
				email: profile.emails[0].value,
				username: profile.username,
				gender: profile.gender,
				profileUrl: profile.profileUrl,
				photos: profile.photos,
				facebookId: profile.id,
				picture: providerData.picture.data.url,
				provider: 'facebook',
				providerIdentifierField: 'id',
				providerData: providerData
			};

			// Save the user OAuth profile
			users.saveOAuthUserProfile(req, providerUserProfile, done);
		}
	));
};