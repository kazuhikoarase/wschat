var jsConfig = JSON.parse(config);
var endpoints = Java.type('java.util.ArrayList')();
for (var i = 0; i < jsConfig.endpoints.length; i += 1) {
  var jsEndpoint = jsConfig.endpoints[i];
  var endpoint = new Java.type('java.util.HashMap')();
  for (var k in jsEndpoint) {
    endpoint.put(
        new Java.type('java.lang.String')(k),
        new Java.type('java.lang.String')(jsEndpoint[k]) );
  }
  endpoints.add(endpoint);
}
