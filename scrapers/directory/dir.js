var fs = require('fs');
var _ = require('lodash');
var async = require('async');

var db = require('../db');

var filepath = process.argv[2];
if (!filepath) process.exit(0);

var buffer = fs.readFileSync(filepath, 'ascii'),
    index = 0,
    lastindex = 0;

console.log('reading', filepath, ', length ', buffer.length);

var count = 0;

function next() {
  index = buffer.indexOf('\n\n', lastindex);

  if (index >= 0) {
    var entry = buffer.substring(lastindex, index),
        obj = {},
        temp = [];

    lastindex = index + 1;
    _.each(entry.split('\n'), function(ln) {
      temp = ln.split(':');
      obj[temp[0]] = temp[1];
    });

    db.Directory.update(
      { duLDAPKey: obj.duLDAPKey },
      { $set: obj },
      { upsert: true }, function(err, d) {
        console.log('count', ':', index, '/', buffer.length);
        process.nextTick(next);
      });
  } else {
    process.exit(0);
  }
}

next();