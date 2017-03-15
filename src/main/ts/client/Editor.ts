'use strict';
namespace wschat.client {

  export var editor = function(
    $parent : JQuery,
    width : number,
    maxlength : number,
    defaultMessage : string,
    util : ChatUtil
  ) {
    var lastValue = '';
    var value = '';
    var val = function(newValue? : string) : string {
      if (arguments.length > 0) {
        if (value != arguments[0]) {
          value = trim(arguments[0] || '');
          $parent.trigger('valueChange');
        }
        updateUI();
      }
      return value;
    };
    var setEdit = function(edit : boolean) {
      $editor.css('display', edit? 'inline-block' : 'none');
      $label.css('display', edit? 'none' : 'inline-block');
    };
    var commitEdit = function() {
      setEdit(false);
      val($(this).val() );
    };
    var $editor = $('<input type="text"/>').
      addClass('wschat-editor').
      addClass('wschat-mouse-enabled').
      attr('maxlength', '' + maxlength).
      css('width', width + 'px').
      css('vertical-align', 'middle').
      change(function(event) {
        commitEdit.apply(this);
      }).
      blur(function(event) {
        commitEdit.apply(this);
      }).
      keydown(function(event) {
        if (event.keyCode == 13) {
          commitEdit.apply(this);
        } else if (event.keyCode == 27) {
          $(this).val(lastValue);
          commitEdit.apply(this);
        }
      });
    $parent.append($editor);
    var $label = $('<div></div>').
      addClass('wschat-editor').
      css('display', 'inline-block').
      css('cursor', 'default').
      css('overflow', 'hidden').
      css('text-overflow', 'ellipsis').
      css('white-space', 'nowrap').
      css('border-style', 'none').
      css('width', $editor.width() + 'px').
      css('min-height', $editor.height() + 'px').
      css('vertical-align', 'middle').
      on('mousedown', function(event) {
        event.preventDefault();
        $editor.val(val());
        lastValue = $editor.val();
        setEdit(true);
        $editor.focus();
      });
    var $text = $('<span></span>');
    $label.append($text);
    $parent.append($label);

    var updateUI = function() {
      if (val() ) {
        $text.text(val()).css('color', '#000000');
      } else {
        $text.text(defaultMessage).css('color', '#cccccc');
      }
      if (util) {
        $text.attr('title', $text.text() );
        util.applyDecoration($text);
      }
      $editor.val(val());
    };

    setEdit(false);

    $parent.data('controller',{val: val});
    return $parent;
  };
}
