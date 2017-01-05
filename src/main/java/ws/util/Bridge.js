// Nashorn / Rhino compatible
if (typeof Java == 'undefined') {
  !function(Packages) {
    var cache = {};
    Java = {
      type : function(className) {
        if (!cache[className]) {
          var path = className.split(/\./g);
          var cls = Packages;
          for (var i = 0; i < path.length; i += 1) {
            cls = cls[path[i]];
          }
          cache[className] = cls;
        }
        return cache[className];
      }
    };
  }(Packages);
}
Packages = java =  undefined;
