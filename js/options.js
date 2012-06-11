// Saves options to localStorage.
function save_options() {
  var keys = {};
  var i = 0;
  $('input.key').each(function() {
    if ($(this).val() != "") {
      var key = {
        key: $(this).val(),
    action: $(this).next().val()
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
    newinputs.children('input').val(key.key);
    newinputs.children('select').val(key.action);
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
});
