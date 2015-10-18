'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	async = require('async'),
	path = require('path'),
    mime = require('mime'),
    fs = require('fs'),
    fse = require('fs-extra'),
    formidable = require('formidable'),
    mv = require('mv'),
    lwip = require('lwip'),
    cv = require('opencv'),
	gm = require('gm').subClass({ imageMagick: true }),
	crypto = require('crypto');

/**
 * Custum variables
 */

//Initialize variables
var lbphFaceRecognizer = cv.FaceRecognizer.createLBPHFaceRecognizer(1,10,100,100,100),
    tmpPath = './.tmp/';


var Face = mongoose.model('Face'),
    User = mongoose.model('User'),
    TrainingData = mongoose.model('TrainingData');

/**
 * Module functions, The Exported Methods are in hte end of the File!
 */

//Hashing Filename using date
function hashFilename() {
    var date = new Date();
    var isoDate = date.toISOString();
    var shasum = crypto.createHash('sha1');
    return shasum.update(isoDate).digest('hex');
}

//Convert image to pgm
function convertToPGM(imagePath, imageFormat, callback) {
    console.log('SERVER LOG: Inside convertToPGM');
    var err = null;

    gm(imagePath + '.' + imageFormat)
    .setFormat('pgm')
    .write(imagePath + '.pgm', function(err){
        return callback(err);
    });
}

//Training Implementation
function trainHelper(faces, callback) {   
    console.log('SERVER LOG: Inside trainHelper()');

    var trainingData = [];
    console.log('SERVER LOG: Looping through Faces and Loading to Vector');
    for(var i = 0, max = faces.length; i < max; i += 1){
        if(!fs.existsSync(faces[i].pgm_path)) {
            //TODO REMOVE THIS FACE
            console.log('Weird: ' + faces[i].image_path);
        } else {
            trainingData.push([parseInt(faces[i].userId), faces[i].image_path]);
        }
    }

    console.log('SERVER LOG: Creating Directory if not exist');
    var faceDataDirectory = './public/faces/' + faces[0].facebookId + '/';
    if(!fs.existsSync(faceDataDirectory)) {
        fs.mkdir(faceDataDirectory);
    }

    var date = new Date(),
        n = date.toISOString(),
        shasum = '';

    console.log('SERVER LOG: Creating lbphface training data.');
    shasum = crypto.createHash('sha1'); 
    var hash_fname_lb = shasum.update(n+'_l').digest('hex') + '.xml';
    lbphFaceRecognizer.trainSync(trainingData);
    lbphFaceRecognizer.saveSync(faceDataDirectory + hash_fname_lb);
    //console.log(hash_fname_lb);
    
    //console.log('SERVER LOG: Creating Eigenface training data.');
    shasum = crypto.createHash('sha1');
    var hash_fname_ei = shasum.update(n+'_e').digest('hex') + '.xml';
    //eigenFaceRecognizer.trainSync(trainingData);
    //eigenFaceRecognizer.saveSync(faceDataDirectory + hash_fname_ei);


    //console.log('SERVER LOG: Creating Fisherface training data.');
    shasum = crypto.createHash('sha1');
    var hash_fname_fi = shasum.update(n+'_f').digest('hex') + '.xml';
    //fisherFaceRecognizer.trainSync(trainingData);
    //fisherFaceRecognizer.saveSync(faceDataDirectory + hash_fname_fi);
    
    console.log('SERVER LOG: Training Data created.');
    TrainingData.findOne({ facebookId: faces[0].facebookId}, function(err, data) {
        if(err) console.log(err);
        if(!data || data.length === 0) {
            var temp = new TrainingData({
                eigenFace_path: faceDataDirectory + hash_fname_ei,
                fisherFace_path: faceDataDirectory + hash_fname_fi,
                lbphFace_path: faceDataDirectory + hash_fname_lb,
                userId: faces[0].userId,
                facebookId: faces[0].facebookId
            });

            temp.save(function(err){
                if(err) {
                    console.log('SERVER LOG: Error saving Training Data.');
                    return callback(err);
                } else {
                    console.log('SERVER LOG: Training Data saved.');
                    return callback();
                }
            });
        } else {
            data.eigenFace_path = faceDataDirectory + hash_fname_ei;
            data.fisherFace_path = faceDataDirectory + hash_fname_fi;
            data.lbphFace_path = faceDataDirectory + hash_fname_lb;

            data.save();
        }
    });
}

// Traing Function
function train(facebookId, callback) {
    console.log('SERVER LOG: Inside train()');

    //Find by Face Object by facebookId
    console.log('SERVER LOG: Getting the Face Object from the DB');
    Face.find({ facebookId: facebookId }, function(err, faces){
        console.log('SERVER LOG: Processeed to trainHelper()');
        trainHelper(faces, function(err){
            if(err){
                console.log('SERVER ERROR: Error in trainHelper()');
                return callback(err);
            } else {
                console.log('SERVER LOG: Success in trainHelper()');
                return callback();
            }
        });
    });
}

// Add Face to DB
function addHelper(userId, facebookId, image, imageFormat, callback) {
    console.log('SERVER LOG: Inside addHelper()');

    //Make sure person's folder exist with name.
    var userImageFolderPath = './public/faces/' + facebookId;
    
    console.log('SERVER LOG: Checking User\'s Path');

    //If not create a folder & add config
    if(!fs.existsSync(userImageFolderPath)) {
        fs.mkdir(userImageFolderPath);
    }

    console.log('SERVER LOG: Hashing unique filename');
    //Hashing to a unique filename using time
    var hashedFileName = hashFilename(),
        imageFileNameWithoutExt = hashedFileName,
        imageFileLocation = userImageFolderPath + '/' + imageFileNameWithoutExt;
    
    console.log('SERVER LOG: Writing File to ' + imageFileLocation);

    //Write the image file to the face's folder and decode the image using base64                          
    fs.writeFile(imageFileLocation + '.' + imageFormat, fs.readFileSync(image), 'base64', function(err){
        if(err){
            console.log('SERVER LOG: Error in writing file!');
            return callback(err); 
        } else {

            console.log('SERVER LOG: Convert PGM');
            //Convert the image to pgm
            convertToPGM(imageFileLocation, imageFormat, function(err){
                if(err) {
                    console.log('SERVER LOG: Error found in convertToPGM');
                    return callback(err);
                } else {
                    console.log('SERVER LOG: Creating Face');

                    var face = new Face({
                        facebookId: facebookId,
                        userId: userId,
                        pgm_path: imageFileLocation + '.pgm',
                        image_path: imageFileLocation + '.' + imageFormat,
                    });

                    face.save(function(err){
                        if(err) {
                            console.log('SERVER LOG: Error in Saving the Face');
                            return callback(err);
                        } else {
                            console.log('SERVER LOG: Processeed to train()');
                            train(facebookId, function(err){
                                if(err) {
                                    console.log('SERVER LOG: Error in Training');
                                    return callback(err);
                                } else {
                                    console.log('SERVER LOG: Success in Training');
                                    return callback(null);
                                }
                            });
                        }
                    });
                }
            });
        }
    });
}

//Predict
function predict(pgm_image, callback) {
    console.log('SERVER LOG: Inside predict()');

    console.log('SERVER LOG: Getting the TrainingDatas from the DB!');
    TrainingData.find({}, function(err, data){
        if(err) {
            console.log('SERVER ERROR: Error while Trying to get the TrainingDatas');
            callback(err); 
        } else if(data){
            // Init users Array
            var users = [];

            console.log('SERVER LOG: Looping over our TrainingData to find similar Face.');
            async.eachSeries(data, function(trainingData, done) {

                // Load The PGM image
                cv.readImage(pgm_image, function(err, image){
                    if(err) {
                        console.log('SERVER ERROR: Error while Trying to read the PGM image of the searched Face');
                        done(err);
                    } else {
                        // Load The User's Training Data file 
                        console.log('SERVER LOG: Loading User\'s TrainingData Cascade.');
                        lbphFaceRecognizer.loadSync(trainingData.lbphFace_path);

                        // If the face is similar to the search's one
                        console.log(lbphFaceRecognizer.predictSync(image));
                        if(lbphFaceRecognizer.predictSync(image).id > -1){
                            users.push(trainingData.userId);          
                        }
                        done();
                    }
                });
            }, function(err){
                if(err) {
                    callback(err);
                } else {
                    callback(null, users);
                }
            });

        } else {
            console.log('SERVER LOG: There is no TrainingData!');
            // Callback nothing.
            callback();
        }
    });
}

// Recognize Helper
function recognizeHelper(image, imageFormat, callback) {
    console.log('SERVER LOG: Inside recognizeHelper()');

    console.log('SERVER LOG: Converting the base64 Face to PGM');
    convertToPGM(image, imageFormat, function(err){
        if(err) {
            console.log('SERVER LOG: Error in Converting the base64 Face to PGM');
            // Callback the accured error
            return callback(err);
        } else {
            console.log('SERVER LOG: Processeed to predict()');
            predict(image + '.' + imageFormat, function(err, user){
                if(err) {
                    // Callback the accured error in predict
                    return callback(err);
                } else {
                    // Callback suggested users
                    return callback(null, user);
                }           
            });
        }
    });
}

// Recognize Starter
function recognizeImplementation(image, imageFormat, callback){
    console.log('SERVER LOG: Inside recognizeImplementation()');

    // Check tmp path exist and if not Create it
    if(!fs.existsSync(tmpPath)){
        fs.mkdirSync(tmpPath);
    }
            
    console.log('SERVER LOG: Hashing unique filename');
    var imageFileLocation = tmpPath + hashFilename();

    console.log('SERVER LOG: Saving Decoded `base64` Image of the Face');
    // Saving the base64 face.                          
    fs.writeFile(imageFileLocation + '.' + imageFormat, fs.readFileSync(image), 'base64', function(err){
        if(err) {
            console.log('SERVER ERROR: Error while trying to save base64 image of the Face!');
            // Callback the accured error
            callback(err);
        } else {
            console.log('SERVER LOG: Processeed to recognizeHelper()');
            recognizeHelper(imageFileLocation, imageFormat, function(err, users){
                if(err){
                    // Callback the accured Error in the racognizeHelper()
                    callback(err);
                } else {
                    // Callback the suggessted users
                    callback(null, users);
                }
            });
        }
    });
}

/**
 * Exported Methods
 */

// Method for Adding Face in our DB and Training Data!
exports.addFace = function(facebookId, image) {
    console.log('SERVER LOG: Access addFace()');

    //First check the required parameters
    if(facebookId && image) {

        console.log('SERVER LOG: Start the Face Adding');

        console.log('SERVER LOG: Getting User Data by FacebookId');
        User.findOne({ facebookId: facebookId }, function(err, user){
            if(err){
                console.log('SERVER ERROR: Error accured while trying to get the User Data');
                console.log(err);
                return false;
            } else if(!user) {
                //If user does not exist
                console.log('SERVER LOG: Cannot Find User by FacebookId');
                return false;
            } else {

                // Init Variables
                var temp = image.split('.');
                var imageFormat = temp[temp.length - 1];

                console.log('SERVER LOG: Processeed to addHelper()');

                //Create a Face Object and perform Training
                addHelper(user._id, facebookId, image, imageFormat, function(err){
                    if(err) {
                        console.log('SERVER LOG: Found Error');
                        console.log(err);
                        return false;
                    } else {
                        console.log('SERVER LOG: Successfully Added and Trained');
                        return true;
                    }
                });
            }
        });
    } else {
        console.log('SERVER LOG: Error Start addFace()');
        return false;
    }
};

// Method for Recognizing Face from our Training Data.
exports.recognizeFace = function(image, imageFormat, callback){
    console.log('SERVER LOG: Access recognizeFace()');

    // First check the required parameters
    if(image && imageFormat) {

        console.log('SERVER LOG: Start the Face Recognition!');
        console.log('SERVER LOG: Processeed to recognizeImplementation()');

        // Processeed to recognizeImplementation()
        recognizeImplementation(image, imageFormat, function(err, data){
            if(err){
                // Error accured.. Callbacking it.
                callback(err);
            } else {
                // We have Data so we can call it back.
                callback(null, data);
            }
        });
    } else {
        // We don have the needed parameters, so we callback nothing!
        console.log('SERVER LOG: Cannot Recognize Face without actual Face!');
        callback();
    }
};