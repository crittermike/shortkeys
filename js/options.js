function OptionsCtrl($scope) {
  $scope.keys = [];

  $scope.addEmpty = function() {
    $scope.keys.push({key:'', action:'top', blacklist:false, sites:'*google.com*'});
  }
  $scope.isEmpty = function(element, index, array) {
    return element.key != "";
  }
 
  $scope.saveKeys = function() {
    $scope.keys = $scope.keys.filter($scope.isEmpty); // Remove empty keys
    localStorage["shortkeys"] = JSON.stringify($scope.keys);

    $('#status').css('opacity', '1');
    setTimeout(function() {
      $('#status').animate({opacity: 0, complete: function() { $('#status').hide(); }})
    }, 1000);
  }

  $scope.keysStr = localStorage["shortkeys"];
  if ($scope.keysStr) {
    $scope.keys = JSON.parse($scope.keysStr);
  } else {
    $scope.addEmpty();
  }
}
