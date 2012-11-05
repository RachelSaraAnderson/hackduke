var _ = require('lodash');

var parsers = {};

function escapeRegex(regex) {
  return regex.replace(/([\/])/g, "\\$1");
};

function trim(str) {
  if (str) {
    return str.replace(/(?:(?:^|\n)\s+|\s+(?:$|\n))/g,'').replace(/\s+/g,' ');
  } else {
    return '';
  }
};

function parseRegex(text, regex, labels, limit) {
  // match all, ignore case, multiline
  var reg = new RegExp(escapeRegex(regex), 'gim')
    , returnVal = []
    , matchCount = 0
    , matchLimit = limit || 1;
  var matches, tempVal;

  while ((matches = reg.exec(text)) !== null) {
    if (matchCount >= matchLimit) {
      break;
    }

    tempVal = _.reduce(labels, function (memo, label, i) {
      memo[label] = trim(matches[i + 1]);
      return memo;
    }, {});
    returnVal.push(tempVal);
    matchCount++;
  }
  return returnVal;
};

function liParseGenerator(regex, labels, childType) {
  return function (text) {
    var result = parseRegex(text, regex, labels);
    return _.map(result, function (item) {
      return _.extend(item, {
        type: childType
      })
    });
  };
};

parsers.base = liParseGenerator(
  '<a href="([^"]+)"><h6>([^<]+)</h6><br/><p[^>]+>([^<]+)</p>',
  ['path', 'letter', 'label'],
  'letter'
);

parsers.letter = liParseGenerator(
  '<li><a href="([^"]+subject=(\\w+)[^"]+)">([^<]+)</a></li>',
  ['path', 'subject', 'label'],
  'classes'
);

parsers.classes = liParseGenerator(
  '<li><a href="([^"]+class=(\\w+)[^"]+)"><h4>([^<]+)</h4>',
  ['path', 'class', 'label'],
  'class'
);

parsers.class = function (text) {
  var returnVal = {}
    , tempLabel = 'content'
    , uls = parseRegex(
      text,
      '<ul[^>]+>(.+?)(</ul>)',
      [tempLabel],
      3
    );

  returnVal.info = parseRegex(
    text,
    '<h3>([^<]+)</h3><p><strong>[^<]+</strong></p><p>([^<]+)</p>',
    ['number', 'title', 'description']
  )[0];

  returnVal.details = parseRegex(
    uls[0][tempLabel],
    '<li[^>]*><h4>([^<]+)</h4><h4[^>]+>([^<]+)</h4',
    ['label', 'value'],
    10
  );

  returnVal.offering = parseRegex(
    uls[1][tempLabel],
    '<li[^>]*><h4>([^<]+)</h4><h4[^>]+>([^<]+)</h4',
    ['label', 'value'],
    10
  );

  if (uls[2]) {
    returnVal.enrollmentReq = parseRegex(
      uls[2][tempLabel],
      '<li style[^>]*>([^<]+)</li>',
      ['req'],
      10
    )[0]['req'];
  }

  tempLabel = 'path';
  returnVal.path = parseRegex(
    text,
    '<a data-role="button" href="([^"]+)"',
    [tempLabel]
  )[0][tempLabel];

  returnVal.type = 'terms';

  return [returnVal];
};

parsers.terms = liParseGenerator(
  '<li><a href="([^"]+openSections=(\\w+)[^"]+crse_id=(\\w+)[^"]+)"\\s*>([^<]+)',
  ['path', 'sectionId', 'courseId', 'sectionLabel'],
  'term'
);

parsers.term = liParseGenerator(
  '<li><a href="([^"]+strm=(\\w+)[^"]+section=(\\w+)[^"]+class_nbr=(\\w+)[^"]+)">([^<]+)',
  ['path', 'termId', 'sectionId', 'classNumber'],
  'section'
);

parsers.section = function (text) {
    var returnVal = {}
    , tempLabel;

  returnVal.info = parseRegex(
    text,
    '<p><b>([^<]+)</b></p><p><strong>[^<]+</strong>([^<]+)<br/><strong>[^<]+</strong>([^<]+)<br/><strong>[^<]+</strong>([^<]+)<br/><strong>[^<]+</strong>([^<]+)<br/><strong>[^<]+</strong>([^<]+)<br/>',
    ['title', 'session', 'classNumber', 'units', 'topic', 'description']
  )[0];

  tempLabel = 'enrollmentReq';
  var temp = parseRegex(
    text,
    '<p><strong>[^<]+</strong>([^<]+)<br/></p>',
    [tempLabel]
  )[0];

  if (temp) {
    returnVal[tempLabel] = temp[tempLabel];
  }

  returnVal.details = parseRegex(
    text,
    '<li[^>]*><h4>([^<]+)</h4><h4[^>]+>([^<]+)</h4',
    ['label', 'value'],
    20
  );

  temp = parseRegex(
    text,
    '<li[^>]*><a[^>]*href="([^"]+)"><h4>[^<]+</h4><h4[^>]+>([^<]+)</h4',
    ['link', 'location']
  )[0];

  if (temp) {
    returnVal.location = temp;
    returnVal.path = returnVal.location.link;
    returnVal.type = 'location';
    return [returnVal];
  }
};

parsers.location = function (text) {
  var returnVal = parseRegex(
    text,
    'initialize\\(([^,]+),([^\\)]+)\\);',
    ['latitude', 'longitude']
  )[0];
  return returnVal;
}

module.exports = parsers;