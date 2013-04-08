var _ = require('lodash');
var async = require('async');

var config = require('./config');
var db = require('../scrapers/db');

var base = {
  apiVersion: config.version,
  swaggerVersion: config.swaggerVersion,
  basePath: config.basePath
};

function extend() {
  var args = Array.prototype.slice.call(arguments, 0);
  return _.extend.apply(_, [{}, base].concat(args));
}

function get(opt) {
  return {
    path: opt.path,
    description: opt.description || '',
    operations: [{
      httpMethod: 'GET',
      nickname: opt.name,
      notes: opt.notes || '',
      responseClass: opt.responseClass,
      summary: opt.summary || opt.description || '',
      parameters: opt.parameters || [],
      errorResponses: opt.errorResponses || []
    }]
  };
}

function errRes(opt) {
  return _.map(opt, function(reason, code) {
    return {
      code: code,
      reason: reason
    };
  });
}

function listParam(opt, values) {
  return _.extend(opt, {
    defaultValue: values[0],
    allowableValues: {
      values: values,
      valueType: 'LIST'
    }
  });
}

var formatParam = listParam({
  name: 'format',
  description: 'Format of the response',
  dataType: 'String',
  paramType: 'query',
  required: false
}, ['basic', 'detailed', 'raw']);

var baseOpt = [formatParam, {
  name: 'limit',
  description: 'Limit the number of responses',
  dataType: 'Number',
  paramType: 'query',
  required: false
}, {
  name: 'skip',
  description: 'Offset the number of responses',
  dataType: 'Number',
  paramType: 'query',
  required: false
}];

module.exports = function(callback) {
  console.log('Loading Documentation Data...');
  async.parallel({
    departments: function(cb) {
      db.Department.distinct('code').exec(cb);
    },
    terms: function(cb) {
      db.Term.distinct('title').exec(cb);
    },
    affiliations: function(cb) {
      db.Directory.distinct('eduPersonAffiliation').exec(cb);
    },
    eventCategories: function(cb) {
      db.Event.distinct('categories.category.value').exec(cb);
    },
    eventHosts: function(cb) {
      db.Event.distinct('creator').exec(cb);
    },
    eventVenues: function(cb) {
      db.Event.distinct('location.address').exec(cb);
    }
  }, function(err, values) {
    console.log('Documentation Data Loaded');

    var idParam = {
      name: 'id',
      paramType: 'path',
      description: 'id',
      dataType: 'ObjectId',
      required: true
    };

    var departmentParam = listParam({
      name: 'department',
      paramType: 'path',
      description: 'department code',
      dataType: 'String',
      required: true
    }, values.departments);

    var numberParam = {
      name: 'number',
      paramType: 'path',
      description: 'class number',
      dataType: 'String',
      required: true
    };

    var termParam = listParam({
      name: 'term',
      paramType: 'path',
      description: 'class term',
      dataType: 'String',
      required: true
    }, values.terms.sort());

    var classApi = extend({
      resourcePath: '/class',
      apis: [
        get({
          path: '/class',
          description: 'Get a list of classes',
          name: 'getClasses',
          responseClass: 'LIST[Class]',
          parameters: baseOpt
        }),
        get({
          path: '/class/{id}',
          description: 'Get class by id',
          name: 'getClassById',
          responseClass: 'Class',
          parameters: [idParam, formatParam],
          errorResponses: errRes({
            500: 'Invalid ID'
          })
        }),
        get({
          path: '/class/department/{department}',
          description: 'Get a list of classes from a department',
          name: 'getClassFromDepartment',
          notes: 'department codes can be found at /list/department-code',
          responseClass: 'LIST[Class]',
          parameters: [departmentParam, formatParam]
        }),
        get({
          path: '/class/department/{department}/number/{number}',
          description: 'Get a class by class number',
          name: 'getClassByClassNumber',
          responseClass: 'Class',
          parameters: [departmentParam, numberParam].concat(baseOpt)
        }),
        get({
          path: '/class/department/{department}/number/{number}/evaluation',
          description: 'Get class evaluation by class number',
          name: 'getClassByClassNumber',
          responseClass: 'Class',
          parameters: [departmentParam, numberParam].concat(baseOpt)
        }),
        get({
          path: '/class/department/{department}/number/{number}/term',
          description: 'Get class terms by class number',
          name: 'getTermsByClassNumber',
          responseClass: 'LIST[Term]',
          parameters: [departmentParam, numberParam].concat(baseOpt)
        }),
        get({
          path: '/class/department/{department}/number/{number}/term/{term}',
          description: 'Get class sections by class number and term',
          name: 'getSectionsByClassNumberAndTerm',
          responseClass: 'LIST[Section]',
          parameters: [departmentParam, numberParam, termParam].concat(baseOpt)
        }),
        get({
          path: '/class/history/department/{department}/number/{number}',
          summary: 'Get class history by class number',
          description: 'Get class history, including all terms, sections, and evaluations of the class, by class number',
          name: 'getHistoryByClassNumber',
          responseClass: 'Class',
          parameters: [departmentParam, numberParam, formatParam]
        }),
        get({
          path: '/class/term/{term}',
          summary: 'Get classes by class term',
          description: 'Get classes offered in a given class term or semester',
          name: 'getClassesByTerm',
          responseClass: 'LIST[Class]',
          parameters: [termParam].concat(baseOpt)
        }),
        get({
          path: '/class/term/{term}/department/{department}',
          description: 'Get classes by class term and department',
          name: 'getClassesByTermAndDepartment',
          responseClass: 'LIST[Class]',
          parameters: [termParam, departmentParam].concat(baseOpt)
        }),
        get({
          path: '/evaluation/{id}',
          description: 'Get class evaluation by id',
          name: 'getEvaluationById',
          responseClass: 'Evaluation',
          parameters: [idParam, formatParam]
        }),
        get({
          path: '/history/{id}',
          description: 'Get class history by id',
          name: 'getHistoryById',
          responseClass: 'Class',
          parameters: [idParam, formatParam]
        }),
        get({
          path: '/term/{id}',
          description: 'Get class term by id',
          name: 'getTermById',
          responseClass: 'Term',
          parameters: [idParam, formatParam]
        }),
        get({
          path: '/section/{id}',
          description: 'Get class section by id',
          name: 'getSectionById',
          responseClass: 'Section',
          parameters: [idParam, formatParam]
        })
      ],
      models: {
        Class: db.schemaToJSON('Class'),
        Term: db.schemaToJSON('Term'),
        Section: db.schemaToJSON('Section'),
        Evaluation: db.schemaToJSON('Evaluation')
      }
    });

    var departmentApi = extend({
      resourcePath: '/department',
      apis: [
        get({
          path: '/department',
          description: 'Get a list of departments',
          name: 'getDepartments',
          responseClass: 'LIST[Department]',
          parameters: baseOpt
        }),
        get({
          path: '/department/{id}',
          description: 'Get a department by id',
          name: 'getDepartmentById',
          responseClass: 'Department',
          parameters: [idParam, formatParam],
          errorResponses: errRes({
            500: 'Invalid ID'
          })
        })
      ],
      models: {
        Department: db.schemaToJSON('Department')
      }
    });

    var directoryApi = extend({
      resourcePath: '/directory',
      apis: [
        get({
          path: '/directory',
          description: 'Get a list of directory entries',
          name: 'getDirectory',
          responseClass: 'LIST[Directory]',
          parameters: baseOpt
        }),
        get({
          path: '/directory/{id}',
          description: 'Get a directory entry by id',
          name: 'getDirectoryById',
          responseClass: 'Directory',
          parameters: [idParam, formatParam],
          errorResponses: errRes({
            500: 'Invalid ID'
          })
        }),
        get({
          path: '/directory/netid/{netId}',
          description: 'Get directory entries by netId',
          name: 'getDirectoryByNetId',
          responseClass: 'Directory',
          parameters: [{
            name: 'netId',
            paramType: 'path',
            description: 'Net Id',
            dataType: 'String',
            required: true
          }].concat(baseOpt),
          errorResponses: errRes({
            500: 'Invalid Net ID'
          })
        }),
        get({
          path: '/directory/phone/{phone}',
          description: 'Get directory entries by phone number',
          name: 'getDirectoryByPhone',
          responseClass: 'Directory',
          parameters: [{
            name: 'phone',
            paramType: 'path',
            description: 'Phone Number',
            dataType: 'String',
            required: true
          }].concat(baseOpt)
        }),
        get({
          path: '/directory/affiliation/{affiliation}',
          description: 'Get directory entries by phone number',
          notes: 'Affiliations can be found under /list/education-affiliation',
          name: 'getDirectoryByAffiliation',
          responseClass: 'Directory',
          parameters: [listParam({
            name: 'affiliation',
            paramType: 'path',
            description: 'Affiliation',
            dataType: 'String',
            required: true
          }, values.affiliations)].concat(baseOpt)
        })
      ],
      models: {
        Directory: db.schemaToJSON('Directory')
      }
    });

    var yearParam = listParam({
      name: 'year',
      paramType: 'path',
      description: 'Year (YYYY)',
      dataType: 'Number',
      required: true
    }, _.range(2012, 2015));

    var monthParam = listParam({
      name: 'month',
      paramType: 'path',
      description: 'Month (non zero padded)',
      dataType: 'Number',
      required: true
    }, _.range(1, 12));

    var dayParam = listParam({
      name: 'day',
      paramType: 'path',
      description: 'Day (non zero padded)',
      dataType: 'Number',
      required: true
    }, _.range(1, 32));

    var eventApi = extend({
      resourcePath: '/event',
      apis: [
        get({
          path: '/event',
          description: 'Get a list of events',
          name: 'getEvent',
          responseClass: 'LIST[Event]',
          parameters: baseOpt
        }),
        get({
          path: '/event/{id}',
          description: 'Get a event entry by id',
          name: 'getEventById',
          responseClass: 'Event',
          parameters: [idParam, formatParam],
          errorResponses: errRes({
            500: 'Invalid ID'
          })
        }),
        get({
          path: '/event/category/{category}',
          description: 'Get events by category',
          name: 'getEventByCategory',
          responseClass: 'LIST[Event]',
          parameters: [listParam({
            name: 'category',
            paramType: 'path',
            description: 'event category',
            dataType: 'String',
            required: true
          }, values.eventCategories.sort())].concat(baseOpt)
        }),
        get({
          path: '/event/host/{host}',
          description: 'Get events by host',
          name: 'getEventByHost',
          responseClass: 'LIST[Event]',
          parameters: [listParam({
            name: 'host',
            paramType: 'path',
            description: 'event host',
            dataType: 'String',
            required: true
          }, values.eventHosts.sort())].concat(baseOpt)
        }),
        get({
          path: '/event/venue/{venue}',
          description: 'Get events by venue',
          name: 'getEventByVenue',
          responseClass: 'LIST[Event]',
          parameters: [listParam({
            name: 'venue',
            paramType: 'path',
            description: 'event venue',
            dataType: 'String',
            required: true
          }, values.eventVenues.sort())].concat(baseOpt),
          errorResponses: errRes({
            500: 'Invalid Net ID'
          })
        }),
        get({
          path: '/event/affiliation/{affiliation}',
          description: 'Get events by phone number',
          notes: 'Affiliations can be found under /list/education-affiliation',
          name: 'getEventByAffiliation',
          responseClass: 'LIST[Event]',
          parameters: [listParam({
            name: 'affiliation',
            paramType: 'path',
            description: 'Affiliation',
            dataType: 'String',
            required: true
          }, values.affiliations)].concat(baseOpt)
        }),
        get({
          path: '/event/date/{year}/{month}',
          description: 'Get events by year and month',
          name: 'getEventByYearAndMonth',
          responseClass: 'LIST[Event]',
          parameters: [yearParam, monthParam].concat(baseOpt)
        }),
        get({
          path: '/event/date/{year}/{month}/{day}',
          description: 'Get events by date',
          name: 'getEventByDate',
          responseClass: 'LIST[Event]',
          parameters: [yearParam, monthParam, dayParam].concat(baseOpt)
        }),
        get({
          path: '/event/date/today',
          description: 'Get events from today',
          name: 'getEventFromToday',
          responseClass: 'LIST[Event]',
          parameters: baseOpt
        }),
        get({
          path: '/event/date/this-week',
          description: 'Get events from this week',
          name: 'getEventFromThisWeek',
          responseClass: 'LIST[Event]',
          parameters: baseOpt
        })
      ],
      models: {
        Event: db.schemaToJSON('Event')
      }
    });

    var apis = _.map([
      'class',
      'department',
      'directory',
      'event',
      // 'list',
      // 'location',
      // 'marker'
    ], function(api) { return { path: '/apidoc/' + api }; });

    callback(err, {
      api: extend({
        apis: apis
      }),
      class: classApi,
      department: departmentApi,
      directory: directoryApi,
      event: eventApi
    });
  });
};
