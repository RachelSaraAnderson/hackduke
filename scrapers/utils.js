var _ = require('lodash');
var querystring = require('querystring');
var exec = require('child_process').exec;

var config = require('./config');

var utils = {};


/**
 * Convert a regex to string that can be used to create another regex with different flags
 * This is avoid the type error
 *   'Cannot supply flags when constructing one RegExp from another'
 *
 * @param  {RegExp} regex input regex.
 * @return {string}       valid regex string.
 */
function regexToStr(regex) {
  // remove the slashes at the beginning and the end in the string representation of RegExp
  return regex.toString().slice(1, -1);
}


/**
 * Remove spaces at the beginning and the end of a string
 * @param  {string} str input string.
 * @return {string}     trimmed string.
 */
function trim(str) {
  if (str) {
    return str
      .replace(/(?:(?:^|\n)\s+|\s+(?:$|\n))/g, '')
      .replace(/\s+/g, ' ')
      .replace(/:$/, '');
  } else {
    return '';
  }
}


/**
 * Construct an object with the subgroup matches as values and labels as keys
 * @param  {array}  matches array of matches returned by regex.exec.
 * @param  {array}  labels  array of labels corresponding to the matches.
 * @return {object}         object containing label => matches.
 */
function extractMatches(matches, labels) {
  if (!matches || matches.length <= 1) {
    console.log('Irregular Data');
    console.log(matches);
  } else if (!labels || labels.length === 1) {
    return trim(matches[1]);
  } else {
    return _.reduce(labels, function(memo, label, i) {
      memo[label] = trim(matches[i + 1]);
      return memo;
    }, {});
  }
}


/**
 * Using regex to parse the input text and extract the matches
 * @param  {string} text   input text.
 * @param  {RegExp} regex  parsing RegExp.
 * @param  {array}  labels array of labels corresponding to the matches.
 * @return {object}        object containing label => matches.
 */
function regexParse(text, regex, labels) {
  // ignore case, multiline
  var reg = new RegExp(regexToStr(regex), 'im'),
      matches = reg.exec(text),
      returnVal = extractMatches(matches, labels);

  return returnVal;
}


/**
 * Using regex with the global flag to parse the input text and extract all the matches
 * @param  {string} text   input text.
 * @param  {RegExp} regex  parsing RegExp.
 * @param  {array}  labels array of labels corresponding to the matches.
 * @param  {int}    limit  limit on the number of matches returned.
 * @return {object}        object containing label => matches.
 */
function regexGParse(text, regex, labels, limit) {
  // g - match all, i - ignore case, m - multiline
  var reg = new RegExp(regexToStr(regex), 'gim'),
      returnVal = [],
      matchCount = 0,
      matchLimit = limit || 1000,
      matches,
      tempVal;

  while ((matches = reg.exec(text)) !== null) {
    if (matchCount >= matchLimit) {
      break;
    }
    tempVal = extractMatches(matches, labels);

    returnVal.push(tempVal);
    matchCount++;
  }

  return returnVal;
}


/**
 * Generates functions that parse lists. The results contain a type that point to the next parser to be used
 * @param  {RegExp} regex     parsing RegExp.
 * @param  {array}  labels    array of labels corresponding to the matches.
 * @param  {string} childType type of the parsed results.
 * @return {array}            object containing label => matches.
 */
function listParserGenerator(regex, labels, childType) {
  return function(text) {
    var result = regexGParse(text, regex, labels);
    return _.map(result, function(item) {
      return _.extend(item, {
        type: childType
      });
    });
  };
}

var cookie = querystring.stringify({
  PHPSESSID: config.PHPSESSID,
  'webdev_boris.aas.duke.edu': config.AAS
}, ';', '=');

var constructURL = function(path) {
  if (/^http/.test(path)) {
    return path;
  }

  if (path[0] !== '/') {
    path = '/public_page/' + path;
  }
  return config.BASEURL + path;
};

function genCurlTimingFlag() {
  return ' -w curltiming:%{speed_download}:%{time_total}:%{time_appconnect}';
}

function parseCurlTiming(text) {
  return regexParse(
      text,
      /curltiming:([^:]+):([^:]+):([^:]+)/,
      ['speed', 'totaltime', 'starttime']
  );
}


function fetch(path, cb) {
  if (!path || path.length === 0) cb(path);

  path = constructURL(path);

  var command = 'curl "' + path + '" --cookie "' + cookie + '"';

  command += genCurlTimingFlag();

  return exec(command, function(error, stdout, stderr) {
    var timing;
    if (_.isString(stdout)) {
      timing = parseCurlTiming(stdout);
    }

    if (error) {
      error.stderr = stderr;
    }

    cb(error, stdout, timing);
  });
}

utils.pairsToDict = function(pairs) {
  return _.reduce(pairs, function(o, pair) {
    o[pair[0]] = pair[1];
    return o;
  }, {});
};

utils.mergeObjs = function(objs) {
  return _.reduce(objs, function(memo, obj) {
    return _.extend(memo, obj);
  }, {});
};

utils.toKey = function(str) {
  return trim(str).toLowerCase().replace(/\s+/g, '-');
};

utils.toTitleCase = function(str) {
  str = str.replace(/-/g, ' ');
  return str.replace(/\w\S*/g, function(word) {
    return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
  });
};

utils.toChunks = function(arr, chunkSize) {
  return _.values(_.groupBy(arr, function(v, i) {
    return Math.floor(i / chunkSize);
  }));
};

function trimValues(obj) {
  _.each(obj, function(value, key) {
    obj[key] = trimAll(value);
  });
  return obj;
}

function trimAll(data) {
  if (_.isObject(data)) {
    return trimValues(data);
  } else if (_.isArray(data)) {
    return _.map(data, trimAll);
  } else if (_.isString(data)) {
    return trim(data);
  } else {
    return data;
  }
}

function trimOutput(fun) {
  return function(input) {
    return trimAll(fun(input));
  };
}

utils.trim = trim;
utils.trimFunctionOutput = trimFunctionOutput;

utils.regexParse = regexParse;
utils.regexGParse = regexGParse;
utils.listParserGenerator = listParserGenerator;

utils.fetch = fetch;

module.exports = utils;
