'use strict';


angular.module('core').controller('CoreController', ['$scope', 'Authentication', '$http',
	function($scope, Authentication, $http) {
		// This provides Authentication context.
		$scope.authentication = Authentication;



        function getResults(searchId) {
            $http.post('/core/search/results', { 
                searchId: searchId
            }).success(function(response){
                $scope.foundUsers = response;
                $scope.getResults = true;
            }).error(function(response) {
                $scope.error = response.message;
            });
        }

        $scope.uploadAgain = function() {
            $scope.getResults = false;
            $scope.uploadedPicture = false;
            $scope.image = null;
            $scope.fileUpload.files = [];
        };

		/**
         * File Upload Methods
         */
        $scope.fileUpload = {};
        $scope.fileUpload.files = [];

        $scope.fileUpload.setFiles = function(element) {
            $scope.$apply(function($scope) {
                for (var i = 0; i < element.files.length; i++) {
                    $scope.fileUpload.files.push(element.files[i]);
                }
            });
        };

        $scope.fileUpload.uploadFile = function(){
            var fd = new FormData();
            for (var i = 0; i < $scope.fileUpload.files.length; i++) {
                fd.append('file', $scope.fileUpload.files[i]);
            }
            fd.append('user', $scope.authentication.user._id);

            var xhr = new XMLHttpRequest();
            xhr.upload.addEventListener('progress', uploadProgress);
            xhr.addEventListener('load', uploadComplete);
            xhr.addEventListener('error', uploadFailed);
            xhr.addEventListener('abort', uploadCanceled);
            xhr.open('POST', '/core/upload/images');
            xhr.send(fd);
        };

        function uploadProgress(evt) {
            $scope.$apply(function(){
                if (evt.lengthComputable) {
                    $scope.fileUpload.progress = Math.round(evt.loaded * 100 / evt.total);
                } else {
                    $scope.fileUpload.progress = 'няма връзка със сървъра';
                }
            });
        }

        function uploadComplete(evt) {
            $scope.fileUpload.files = [];
            var data = angular.fromJson(evt.target.response);

            if(data.searchId) {
                $scope.$apply(function() {
                   	$scope.image = data;
                    $scope.uploadedPicture = true;
                });
                getResults(data.searchId);
            } else {
                $scope.$apply(function() {
                    $scope.image = null;
                    $scope.uploadedPicture = true;
                });
            }
        }

        function uploadFailed(evt) {
            alert('Моля опитайте по-късно...');
        }

        function uploadCanceled(evt) {
            $scope.$apply(function(){
                $scope.fileUpload.progressVisible = false;
            });
            alert('Качването беше отказано или се загуби връзката със сървъра...');
        }

        $scope.getHistory = function() {
            $http.post('/core/my', { 
                user: $scope.authentication.user._id
            }).success(function(response){
                if(response) {
                    $scope.searches = response;
                }
            }).error(function(response) {
                $scope.error = response.message;
            });
        };

	}
]);