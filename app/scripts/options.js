'use strict';

var app = angular.module('ShortkeysOptions', ['ui.bootstrap']);
app.controller('ShortkeysOptionsCtrl', function($scope) {


  $scope.alerts = [{ type: 'warning', msg: 'You MUST reload your browser or tabs after making changes here!'}];

  $scope.closeAlert = function(index) {
    $scope.alerts.splice(index, 1);
  };
});
