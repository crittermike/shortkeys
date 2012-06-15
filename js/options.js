// Saves options to localStorage.
function save_options() {
  var keys = {};
  var i = 0;
  $('input.key').each(function() {
    if ($(this).val() != "") {
      keyval = $(this).val();
      actionval = $(this).parents('td').next().children('select').val();
      blacklistval = $(this).parents('td').next().next().children('select').val();
      blacklistsites = $(this).parents('tr').next().find('textarea').val();
      var key = {
        key: keyval,
        action: actionval,
        blacklist: blacklistval,
        sites: blacklistsites
      }
      keys["key" + i] = key;
      i++;
    }
  })
  console.log(keys);
  localStorage["shortkeys"] = JSON.stringify(keys);
  // Update status to let user know options were saved.
  $('#status').css('opacity', '1');
  setTimeout(function() {
    $('#status').animate({opacity: 0, complete: function() { $('#status').hide(); }})
  }, 1000);
}

// Restores select box state to saved value from localStorage.
function restore_options() {
  var oldkeys = localStorage["shortkeys"];
  if (!oldkeys) {
    add_options();
    return;
  }
  oldkeys = JSON.parse(oldkeys);
  i = 0;
  while (oldkeys["key" + i] !== undefined) {
    key = oldkeys["key" + i];
    newinputs = add_options();
    newinputs.find('input.key').val(key.key);
    newinputs.find('select.action').val(key.action);
    newinputs.find('select.blacklist').val(key.blacklist);
    newinputs.find('textarea.sites').val(key.sites);
    if (key.blacklist != "0") {
      newinputs.find('.blacklist-cont').show();
    }
    i++;
  }
}

function add_options() {
  inputs = $('.hide').clone();
  inputs.removeClass('hide').insertBefore('.buttons');
  return inputs;
}

Zepto(function($){
  restore_options();

  $('.showhelp').click(function() {
    $('.help').toggle();
    return false;
  });
  $('.add').click(function() {
    add_options();
    return false;
  });
  $('.save').click(function() {
    save_options();
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
