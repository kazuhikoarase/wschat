var jsConfig = JSON.parse(config);
var endpoints = java.util.ArrayList();
for (var i = 0; i < jsConfig.endpoints.length; i += 1) {
  var jsEndpoint = jsConfig.endpoints[i];
  var endpoint = new java.util.HashMap();
  for (var k in jsEndpoint) {
    endpoint.put(
        new java.lang.String(k),
        new java.lang.String(jsEndpoint[k]) );
  }
  endpoints.add(endpoint);
}
