'use strict';

var http = require('http'),
	fs = require('fs'),
	fse = require('fs-extra'),
    formidable = require('formidable'),
	path = require('path'),
	async = require('async'),
	crypto = require('crypto'),
	mongoose = require('mongoose'),
	User = mongoose.model('User'),
	faceController = require('./face.server.controller'),
	cv = require('opencv'),
	gm = require('gm').subClass({ imageMagick: true });

var Search = mongoose.model('Search'),
	User = mongoose.model('User');

var join = path.join,
    dir = path.join(__dirname + '../../../../public/');

/**
 * Module methods.
 */
exports.index = function(req, res) {
	res.render('site/views/index', {
		user: req.user || null,
		request: req
	});
};

exports.appIndex = function(req, res) {
	if(req.user) {
		res.render('app/views/index', {
			user: req.user,
			request: req,
			app: true
		});
	} else {
		res.redirect('/');
	}
};

exports.appMy = function(req, res) {
	if(req.user) {
		async.auto({
			searches: function(callback) {
				Search.find({ userId: req.body.user }).sort('-created').exec(function(err, data) {
					if(err) return callback(err);
					if(data) return callback(null, data);
					else return callback();
				});
			},
			searchUsersData: ['searches', function(callback, results){
				if(results.searches) {
					var searchesData = results.searches;
					async.each(searchesData, function(search, cb) {
						User.find({ '_id': { $in: search.users } }, function(err, data) {
							if(err) cb(err);
							if(data) {
								search.users = data;
								cb();
							}
						});
					}, function(err) {
						if(err) callback(err);
						callback(null, searchesData);
					});
				} else {
					return callback();
				}
			}]
		}, function(err, results) {
			if(err) {
				return console.log(err);
			} else if(results.searchUsersData) {
				res.jsonp(results.searchUsersData);
			} else {
				res.jsonp({});
			}
		});
	} else {
		res.redirect('/');
	}
};

/**
 * Hashing Filename using date
 */

function hashFilename() {
	var date = new Date();
	var isoDate = date.toISOString();
	var shasum = crypto.createHash('sha1');
	return shasum.update(isoDate).digest('hex');
}

/**
 * Croping the Faces from the photo
 */

function cropFace(file, face, x, y, width, height, callback) {
	gm(file.file)
		.setFormat('jpg')
		.crop(width, height, x, y)
		.resize(100,100)
		.normalize()
		.type('Grayscale')
		.write(file.cFile + '_' + face + '.jpg', function(err){
			if(err) {
				console.log(err);
				return callback(err);
			}
			return callback(null, file.cFile + '_' + face + '.jpg');
        });
}

exports.uploadImage = function(req, res){

	var form = new formidable.IncomingForm();
    var detectionFiles = [];
    var flag = false;
    var imageLink = 'http://localhost:3000/upload/';
    var userId = '';

    form.uploadDir = path.join(__dirname + '../../../../public/upload');
	form.keepExtensions = true;
	form.on('error', function(err) {
	        throw err;
	    })
		.on('field', function(field, value) {

			if(field === 'user') userId = value;
        })
	    .on('file', function(data) {
	    	flag = true;
	    })
	    .on('fileBegin', function(name, file){
	    	if(file.name !== '') {
		        var tArr = file.name.split('.');
		        var rName = hashFilename();
		        var ext = tArr[tArr.length - 1];

	            file.path = form.uploadDir + '/' + rName + '.' + ext;
	            detectionFiles.push({
	            	file: form.uploadDir + '/' + rName + '.' + ext,
	            	dFile: form.uploadDir + '/' + rName + '_detected.' + ext,
	            	lFile: imageLink + rName + '_detected.' + ext,
	            	sFile: imageLink + rName + '.' + ext,
	            	cFile: form.uploadDir + '/' + rName,
	            	extFile: ext,
	            	searchId: ''
	            });
	        }
	    })
	    .on('end', function() {
	    	// face detection
	    	if(detectionFiles.length > 0) {
		    	cv.readImage(detectionFiles[0].file, function(err, im){
					im.detectObject(cv.FACE_CASCADE, {}, function(err, faces){

						async.waterfall([
							function(done) {
								console.log('SERVER LOG: Creating Search Document');
								var newSearch = new Search({
									userId: userId,
									file: detectionFiles[0].file,
									image: detectionFiles[0].sFile,
									faces: faces
								});

								newSearch.save(function(err, data) {
									if(err) {
										console.log(err);
										return done(err, null);
									} else {
										detectionFiles[0].searchId = data._id;
										return done(null, detectionFiles[0]);
									}
								});
							}, function(file, done) {
								console.log('SERVER LOG: Marking Faces over uploaded Picture');
								if(faces.length > 0) {
									for (var i = 0, max = faces.length; i < max; i += 1){
										var x = faces[i];
										im.ellipse(x.x + x.width/2, x.y + x.height/2, x.width/2, x.height/2);

										if(i === max - 1) {
											im.save(file.dFile);
											return done(null, file);
										}
									}
								} else {
									return done();
								}
							}
						], function(err, result) {
							if(err) {
								console.log('SERVER LOG: Error in uploading Picture Method');
								return console.log(err);
							} 
							if(result) {
								console.log('SERVER LOG: Respond with the Marked Picture');
								return res.jsonp(result);
							} else {
								console.log('SERVER LOG: We haven\'t found any Faces inside the Picture!');
								return res.jsonp({});
							}
						});
					});
			    });
		    } else {
		    	res.jsonp(detectionFiles);
		    }
	    });
	form.parse(req); 
};

exports.searchResults = function(req, res) {

	async.auto({
		searchData: function(callback) {
			Search.findById(req.body.searchId).exec(function(err, data) {
				if(err) {
					console.log(err);
					return callback();
				}
				return callback(null, data);
			});
		},
		searchUsers: ['searchData', function(callback, results){
			var i = 0;
			var users = [];
			if(results.searchData) {
				async.eachSeries(results.searchData.faces, function(face, cback) {
					cropFace(results.searchData, i, face.x - 15, face.y - 15, face.width + 30, face.height + 30, function(err, image) {
						if(err) return cback(err);
						faceController.recognizeFace(image, 'jpg', function(err, usersResult) {
							if(err) return cback(err);
							if(usersResult) {
								async.each(usersResult, function(user, cb) {
									users.push(user);
									cb();
								}, function(err) {
									cback();
								});
							} else {
								return cback();
							}
						});
					});
					i++;
				}, function(err){
					if(err) return callback(err);
					return callback(null, users);
				});
			} else {
				return callback(null);
			}
		}],
		usersData: ['searchUsers', function(callback, results) {
			if(results.searchUsers) {
				User.find({ '_id': { $in: results.searchUsers } }, function(err, data) {
					if(err) callback(err);
					if(data) callback(null, data);
				});
			} else {
				callback();
			}
		}],
		saveFoundUsers: ['usersData', function(callback, results) {
			if(results.searchUsers) {
				Search.findById(req.body.searchId, function(err, data){
					data.users = results.searchUsers;
					data.save();
					callback();
				});
			} else {
				callback();
			}
		}]
	}, function(err, results) {
		if(err) {
			console.log('SERVER LOG: Error in SearchResults Method');
			return console.log(err);
		}
		console.log('SERVER LOG: Respond with the Found Users');
		res.jsonp(results.usersData);
	});
};

exports.downloadImage = function(facebookId, url) {
	console.log('SERVER LOG: Save profile photo from Facebook\'s server');
	async.waterfall([
		function(callback) {
			dir = path.join(__dirname + '../../../../public/users/' + facebookId + '/');

			if(fs.existsSync(dir)) {
				callback(null);
			} else {
				fs.mkdir(dir, function(err){
					if(err) {
						console.log(err);
						callback(err);
					} else {
						callback(null);
					}
				});
			}
		},
		function(callback) {

			var imageUrl = url;
			var image = imageUrl.split('/');
			var host = image[2];

			callback(null, host, image);
		},
		function(hostResult, imageResult, callback) {

			var imagePath = '';

			for(var i = 3, max = imageResult.length; i < max; i += 1) {
				imagePath += '/' + imageResult[i];

				if(i === max - 1) {
					var json = {
						host: hostResult,
						port: 80,
						path: imagePath,
						image: imageResult[i].split('?')
					};
					callback(null, json);
				}
			}
		}
	], function (err, result) {
		http.get({ 
			host: result.host,
			port: result.port,
			path: result.path
		}, function(res){

			var imagedata = '';
			res.setEncoding('binary');

			res.on('data', function(chunk){
				imagedata += chunk;
			});

			res.on('end', function(){
				fs.writeFile(dir + result.image[0], imagedata, 'binary', function(err){
					if (err) console.log(err);

					// Get the Face and Add to training Data;
					var img = result.image[0];
					var rExt = img.split('.');

					var imgData = {
						file: dir + img,
						cFile: dir + rExt[0]
					};

					cv.readImage(imgData.file, function(err, im){
						im.detectObject(cv.FACE_CASCADE, {}, function(err, faces){
							for (var i = 0, max = faces.length; i < max; i += 1){
								var x = faces[i];
								im.ellipse(x.x + x.width/2, x.y + x.height/2, x.width/2, x.height/2);
								/*jshint loopfunc: true */
								cropFace(imgData, i, x.x - 15, x.y - 15, x.width + 30, x.height + 30, function(err, image) {
									faceController.addFace(facebookId, image);
								});
							}
						});
				    });
				});
			});

		});
	});
};