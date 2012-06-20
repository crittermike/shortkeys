function OptionsCtrl($scope) {
  $scope.keys = [];

  $scope.addEmpty = function() {
    $scope.keys.push({key:'', action:'top', blacklist:false, sites:'*mail.google.com*'});
  }
  $scope.isEmpty = function(element, index, array) {
    return element && element.key != "";
  }
  $scope.sitesToArray = function(key) {
    if (typeof key === 'string') {
      key.sitesArray = key.sites.split("\n");
    }
  }
 
  $scope.saveKeys = function() {
    $scope.keys = $scope.keys.filter($scope.isEmpty); // Remove empty keys
    for (i = 0; i < $scope.keys.length; i++) {
      $scope.keys[i].sitesArray = $scope.keys[i].sites.split("\n"); 
    }
    localStorage["shortkeys"] = JSON.stringify($scope.keys);

    $('.alert').slideDown('fast');
    setTimeout(function() {
      $('.alert').slideUp('fast');
    }, 3000);
  }

  $scope.keysStr = localStorage["shortkeys"];
  if ($scope.keysStr) {
    $scope.keys = JSON.parse($scope.keysStr);
  } else {
    $scope.addEmpty();
  }
}
