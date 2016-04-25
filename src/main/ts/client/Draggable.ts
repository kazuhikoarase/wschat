'use strict';
namespace wschat.client {

  var createDndSymbol = function(type : string) {
    var color = '#cccccc';
    if (type == 'add') {
      color = '#00ff00';
    } else if (type == 'remove') {
      color = '#00ff00';
    } else if (type == 'reject') {
      color = '#ff0000';
    }
    var $svg = createSVG(16, 16).css('position', 'absolute').
      append(createSVGElement('circle').
        attr({'cx':8, 'cy': 8, 'r': 8}).
        css('fill', color).
        css('stroke', 'none') );

    if (type == 'add') {
      $svg.append(createSVGElement('path').
          attr('d', 'M 2 8 L 14 8 M 8 2 L 8 14').
          css('fill', 'none').
          css('stroke-width', '4').
          css('stroke', '#ffffff') );
    } else if (type == 'remove') {
      $svg.append(createSVGElement('path').
          attr('d', 'M 2 8 L 14 8').
          css('fill', 'none').
          css('stroke-width', '4').
          css('stroke', '#ffffff') );
    } else if (type == 'reject') {
      $svg.append(createSVGElement('circle').
          attr({'cx':8, 'cy': 8, 'r': 5}).
          css('fill', '#ffffff').
          css('stroke', 'none') ).
        append(createSVGElement('path').
          attr('d', 'M 4 4 L 12 12').
          css('fill', 'none').
          css('stroke-width', '4').
          css('stroke', '#ff0000') );
    }
    return $svg;
  };

  export var draggable = function(
    $parent : JQuery,
    proxyFactory : () => JQuery,
    $dragTarget : JQuery,
    $dropTarget : JQuery,
    canDrop : () => boolean,
    dropHandler : () => void,
    symbols : string[]
  ) {
    var $proxy : JQuery = null;
    var $symbol : JQuery = null;
    var dragPoint : Point = null;
    var dropAvailable = false;
    var mousedownPoint : Point = null;
    var clearSymbol = function() {
      if ($symbol != null) {
        $symbol.remove();
        $symbol = null;
      }
    };
    var mouseDownHandler = function(event : JQueryEventObject) {
      var off = $(this).offset();
      dragPoint = {
          x: event.pageX - off.left,
          y: event.pageY - off.top};
      mousedownPoint = {x: event.pageX, y: event.pageY};
      $(document).on('mousemove', mouseMoveHandler);
      $(document).on('mouseup', mouseUpHandler);
    };
    var mouseMoveHandler = function(event : JQueryEventObject) {
      if ($proxy == null) {
        var dx = Math.abs(event.pageX - mousedownPoint.x);
        var dy = Math.abs(event.pageY - mousedownPoint.y);
        if (dx < 2 && dy < 2) {
          return;
        }
      }
      // dragging
      if ($proxy == null) {
        $proxy = proxyFactory().
          addClass('wschat-user-proxy').
          css('position', 'absolute');
        $parent.append($proxy);
      }
      var x = event.pageX - dragPoint.x;
      var y = event.pageY - dragPoint.y;
      $proxy.css('left', x + 'px').css('top', y + 'px');

      dropAvailable = false;
      clearSymbol();
      if (overwrap($dropTarget, $proxy) ) {
        if (canDrop() ) {
          dropAvailable = true;
          $symbol = createDndSymbol(symbols[0]);
        } else {
          $symbol = createDndSymbol(symbols[1]);
        }
        $parent.append($symbol);
        $symbol.css('left', (x - $symbol.width() / 2) + 'px').
          css('top', (y - $symbol.height() / 2) + 'px');
      }
    };
    var mouseUpHandler = function(event : JQueryEventObject) {
      $(document).off('mousemove', mouseMoveHandler);
      $(document).off('mouseup', mouseUpHandler);
      if ($proxy != null) {
        $proxy.remove();
        $proxy = null;
        if (dropAvailable) {
          dropHandler();
        }
      }
      clearSymbol();
    };
    return $dragTarget.on('mousedown', mouseDownHandler);
  };
  
  export var attachDnD = function(
    $ui : JQuery,
    beginDrag : (event : JQueryEventObject) => void,
    endDrag : (event : JQueryEventObject) => void,
    drop : (event : JQueryEventObject) => void
  ) {
    return $ui.on('dragenter', function(event) {
        event.preventDefault();
        event.stopPropagation();
        beginDrag.call(this, event);
      }).
      on('dragover', function(event : any) {
        event.preventDefault();
        event.stopPropagation();
        event.originalEvent.dataTransfer.dropEffect  = 'copy';
      }).
      on('dragleave', function(event) {
        event.preventDefault();
        event.stopPropagation();
        endDrag.call(this, event);
      }).
      on('drop', function(event) {
        event.preventDefault();
        event.stopPropagation();
        endDrag.call(this, event);
        drop.call(this, event);
      });
  };

}
