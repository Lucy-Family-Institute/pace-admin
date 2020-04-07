const human = require('humanparser');
const pfn = require('parse-full-name');
const anp = require('another-name-parser');
const _ = require('lodash');
const pAll = require('p-all');

function defaultToIfEmpty(value, defaultValue) {
  return (value == null || value == '' || value !== value) ? defaultValue : value;
}

const functions = {
  pfnParse: (name) => {
    const parsed = pfn.parseFullName(name);
    return {
      first: defaultToIfEmpty(parsed.first, undefined),
      middle: defaultToIfEmpty(parsed.middle, undefined),
      last: defaultToIfEmpty(parsed.last, undefined),
    };
  },
  humanParse: (name) => {
    const parsed = human.parseName(name);
    return {
      first: defaultToIfEmpty(parsed.firstName),
      middle: defaultToIfEmpty(parsed.middleName),
      last: defaultToIfEmpty(parsed.lastName),
    };
  },
  anpParse: (name) => {
    const parsed = human.parseName(name);
    return {
      first: defaultToIfEmpty(parsed.firstName),
      middle: defaultToIfEmpty(parsed.middleName),
      last: defaultToIfEmpty(parsed.lastName),
    };
  },
};

// const functions = {
//   a: (name) => {
//     return {
//       first: 'first',
//       middle: 'middle',
//       last: 'last',
//     };
//   },
//   b: (name) => {
//     return {
//       first: 'first',
//       middle: 'middle2',
//       last: 'last2',
//     };
//   },
//   c: (name) => {
//     return {
//       first: 'first3',
//       middle: 'middle3',
//       last: 'last3',
//     };
//   },
// }

async function parse(name, chooseMethod) {
  //console.log(`Parsing name: ${name} choose method: ${chooseMethod}`)
  const parsedNames = await pAll(_.map(functions, (fn) => () => fn(name)));
  
  const objectsToObjectOfArrays = _.reduce(parsedNames, (result, value, key) => {
    if(key === 0) {
      result = _.reduce(value, (r, v, k) => {
        r[k] = [v];
        return r;
      }, {});
    } else {
      result = _.reduce(value, (r, v, k) => {
        r[k].push(v);
        return r;
      }, result)
    }
    return result;
  }, {});
  
  return _.reduce(objectsToObjectOfArrays, (r, v, k) => {
    const counts = _.countBy(v);
    if ( _.size(counts) === 1) {
      r[k] = _.keys(counts)[0];
      return r;
    }

    if (chooseMethod === 'majority') {
      const majorityCounts = _.pickBy(counts, (value) => value >= _.ceil(_.size(functions)/2));
      if ( _.size(majorityCounts) === 1) {
        r[k] = _.keys(majorityCounts)[0];
        return r;
      }
    }

    r[k] = v;
    return r;
  }, {});
}

// const parsed = parse('Spies, Jeffrey R');
// parsed.then( x => {
//   x
// });

module.exports = {
  command: (input) => parse(input.name, input.reduceMethod),
};