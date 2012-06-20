function OptionsCtrl($scope) {
  $scope.keys = [];

  $scope.addEmpty = function() {
    $scope.keys.push({key:'', action:'top', blacklist:false, sites:'*mail.google.com*'});
  }
  $scope.isEmpty = function(element, index, array) {
    return element && element.key != "";
  }
 
  $scope.saveKeys = function() {
    $scope.keys = $scope.keys.filter($scope.isEmpty); // Remove empty keys
    for (i = 0; i < $scope.keys.length; i++) {
      if (typeof $scope.keys[i].sites === 'string') {
        $scope.keys[i].sitesArray = $scope.keys[i].sites.split("\n"); 
      } else {
        $scope.keys[i].sitesArray = $scope.keys[i].sites;
      }
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

    // TODO: Remove this block later.
    if ($scope.keys.key0) {
      $scope.newKeys = [];
      for (keyname in $scope.keys) {
        curkey = $scope.keys[keyname];
        if (curkey.blacklist == "1") {
          curkey.blacklist = true;
        } else {
          curkey.blacklist = false;
        }
        $scope.newKeys.push(curkey);
      }
      $scope.keys = $scope.newKeys;
    }
  } else {
    $scope.addEmpty();
  }
}
