// Nashorn / Rhino compatible
if (typeof Java == 'undefined') {
  !function(Packages) {
    Java = {
      type : function(className) {
        var path = className.split(/\./g);
        var cls = Packages;
        for (var i = 0; i < path.length; i += 1) {
          cls = cls[path[i]];
        }
        return cls;
      }
    };
  }(Packages);
  java = Packages = undefined;
}
