// Saves options to localStorage.
function saveOptions() {
  var keys = {};
  var i = 0;
  $('.keycont').each(function() {
    if ($(this).find('input.key').val() != "") {
      keyval = $(this).find('.key').val();
      actionval = $(this).find('.action').val();
      blacklistval = $(this).find('.blacklist').val();
      sitesval = $(this).find('.sites').val().split('\n');
      var key = {
        key: keyval,
        action: actionval,
        blacklist: blacklistval,
        sites: sitesval
      }
      keys["key" + i] = key;
      i++;
    }
  });
  console.log(keys);
  localStorage["shortkeys"] = JSON.stringify(keys);
  // Update status to let user know options were saved.
  $('#status').css('opacity', '1');
  setTimeout(function() {
    $('#status').animate({opacity: 0, complete: function() { $('#status').hide(); }})
  }, 1000);
}

// Restores select box state to saved value from localStorage.
function restoreOptions() {
  var oldkeys = localStorage["shortkeys"];
  if (!oldkeys) {
    addOptions();
    return;
  }
  oldkeys = JSON.parse(oldkeys);
  i = 0;
  while (oldkeys["key" + i] !== undefined) {
    key = oldkeys["key" + i];
    newinputs = addOptions();
    newinputs.find('input.key').val(key.key);
    newinputs.find('select.action').val(key.action);
    if (key.blacklist) {
      newinputs.find('select.blacklist').val(key.blacklist);
      newinputs.find('textarea.sites').val(key.sites.join('\n'));
      if (key.blacklist != "0") {
        newinputs.find('.blacklist-cont').show();
      }
    }
    i++;
  }
}

function addOptions() {
  inputs = $('.hide').clone();
  inputs.removeClass('hide').insertBefore('.buttons');
  return inputs;
}

Zepto(function($){
  restoreOptions();

  $('.showhelp').click(function() {
    $('.help').toggle();
    return false;
  });
  $('.add').click(function() {
    addOptions();
    return false;
  });
  $('.save').click(function() {
    saveOptions();
    return false;
  });
  $('.blacklist').live('change', function() {
    if ($(this).val() === "1") {
      $(this).parents('tr').next().show();
    } else {
      $(this).parents('tr').next().hide();
    }
  });
});
