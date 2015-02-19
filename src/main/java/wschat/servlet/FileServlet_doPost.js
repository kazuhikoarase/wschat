var result = {fileList:[]};
for (var i = 0; i < fileList.size(); i += 1) {
  var item = fileList.get(i);
  result.fileList.push({
    name: ''+item.get('name'),
    contentType: ''+item.get('contentType'),
    tmpfile: ''+item.get('tmpfile')
  });
}
JSON.stringify(result);
