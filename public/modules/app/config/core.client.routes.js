'use strict';

//Setting up route
angular.module('core').config(['$stateProvider', '$urlRouterProvider',
	function($stateProvider, $urlRouterProvider) {
		// Redirect to home view when route not found
		$urlRouterProvider.otherwise('/home');
		
		// States routing
		$stateProvider.
		state('home', {
			url: '/home',
			templateUrl: 'modules/app/views/home.client.view.html',
			controller: function($rootScope, $stateParams){
				$rootScope.place = 'home';
			}
		}).
		state('appMy', {
			url: '/my',
			templateUrl: 'modules/app/views/my.client.view.html',
			controller: function($rootScope, $stateParams){
				$rootScope.place = 'myPhysirec';
			}
		});
	}
]);