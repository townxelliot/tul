/********************** my tiny utilities library **********************/
// NB arguments are passed to the anonymous function so I don't have
// to declare them with var (to save characters) and they can be
// minified
(function (M, A, doc, win, idx, collRe, propRe, TUL, ABind) {
  M = Math;
  A = Array.prototype;
  doc = (typeof document == 'undefined' ? null : document);
  win = (typeof window == 'undefined' ? global : window);

  // used by keygen()
  idx = 0;

  // used by tpl()
  collRe = /\{\{([^\}]+?)\}\}[\s\S]+?\{\{\/\1\}\}/g;
  propRe = /\{([^\}]+)\}/g;

  // get/set a property for Model recursively;
  // if val is set, it sets the property and returns the previous
  // value; if val is not set, it returns the current value
  var accessProp = function (model, prop, vs, val) {
    var dotPos = prop.indexOf('.');
    if (dotPos != -1) {
      var head = prop.slice(0, dotPos);
      var rest = prop.slice(dotPos + 1);

      if (typeof model.get == 'function') {
        return accessProp(model.get(head), rest, vs, val);
      }
      else {
        return accessProp(model[head], rest, vs, val);
      }
    }
    else {
      var curr;

      if (!model) {
        return curr;
      }

      if (typeof model.props == 'object') {
        curr = model.props[prop];

        if (vs) {
          model.props[prop] = val;
        }
      }
      else {
        curr = model[prop];

        if (vs) {
          model[prop] = val;
        }
      }

      return curr;
    }
  };

  /*
   * Models and collections
   */
  // collection which fires events when it's modified (add or remove);
  // opts.keyfield: use keyfield of each item for the key
  // OR
  // TUL.keygen() is used
  // opts.idx: if using TUL.keygen(), this provides the index to be
  // added to each ID to keep them unique; each time a new object
  // is added, this is incremented; NB this is stored with the
  // Collection, so it can be deserialised from JSON and allow
  // the Collection to retain its index
  function Collection(opts) {
    this.idx = opts.idx || 0;
    this.keyfield = opts.keyfield;
    this.keygen = this.keyfield ?
                  function (item) {
                    return accessProp(item, opts.keyfield);
                  } :
                  function () {
                    return TUL.keygen(this.idx += 1);
                  };
    this.sortFn = opts.sortFn;

    this.items = opts.items || {};
    TUL.ext(this, TUL.Ev);
  }

  Collection.prototype = {
    // remove an item by key
    remove: function (k) {
      var item = this.items[k];
      delete this.items[k];

      if (this.sortFn) {
        this.sortBy(this.sortFn.bind(this));
      }

      this.fire('remove', {collection: this, key: k, item: item});
    },

    // update an item by key; if the item doesn't exist, this will
    // do an add
    update: function (item, k) {
      k = k || this.keygen(item);

      var oldItem = this.items[k];

      this.items[k] = item;

      if (this.sortFn) {
        this.sortBy(this.sortFn.bind(this));
      }

      if (!oldItem) {
        this.fire('add', {collection: this, key: k, item: item});
      }
      else {
        this.fire('change', {collection: this, key: k, from: oldItem, to: item});
      }
    },

    // iterate items in the collection;
    // pass a function fn with signature fn(item, key, arr)
    forEach: function (fn) {
      TUL.forEach(this.items, fn);
    },

    // return the items as an array
    asArray: function () {
      return TUL.map(this.items, function (item) {
        return item;
      });
    },

    // find an item by function;
    // fn has signature fn(value, key, array)
    find: function (fn) {
      return TUL.find(this.items, fn);
    },

    // get an item by key
    get: function (k) {
      return this.items[k];
    },

    // sort the collection in place;
    // fn takes a, b arguments for each pair of items in the collection
    sortBy: function (fn) {
      var withKeys = TUL.map(this.items, function (v, k) {
        return {key: k, value: v};
      });

      var sortedArray = withKeys.sort(function (a, b) {
        return fn(a.value, b.value);
      });

      var sorted = {};

      TUL.forEach(sortedArray, function (v) {
        return sorted[v.key] = v.value;
      });

      this.items = sorted;
    }
  };

  // model which fires "change" events when properties are changed
  function Model(props) {
    this.props = props;
    TUL.ext(this, TUL.Ev);
  }

  Model.prototype = {
    // recursively set a property; if prop contains '.', will recurse
    // down into any embedded models to find the property to change
    set: function (prop, val) {
      var oldValue = accessProp(this, prop, true, val);
      this.fire('change', {model: this, prop: prop, from: oldValue, to: val});
      this.fire('change:' + prop, {model: this, from: oldValue, to: val});
    },

    // get value for property prop from this model; if the value is
    // itself a model, and prop contains a '.', recursively descend
    // into the model value;
    // val sets the context for the get, but would usually be omitted
    get: function (prop) {
      return accessProp(this, prop);
    }
  };

  // this is the public API for TUL, and shouldn't touch global scope
  TUL = {
    Collection: function (opts) {
      return new Collection(opts || {});
    },

    Model: function (props) {
      return new Model(props || {});
    },

    // querySelectorAll wrapper; returns an array rather than a node list,
    // for easier handling; or if sel returns a single element, just
    // returns that (not an array);
    // the caller is responsible for figuring out whether they have
    // an array or a single object to deal with
    $: function (sel, ctx) {
      var nodes = [];

      if (doc) {
        var nodeList;

        if (ctx) {
          nodeList = ctx.querySelectorAll(sel);
        }
        else {
          nodeList = doc.querySelectorAll(sel);
        }

        if (nodeList.length == 1) {
          nodes = nodeList.item(0);
        }
        else {
          for (var i = 0; i < nodeList.length; i++) {
            nodes.push(nodeList.item(i));
          }
        }
      }

      return nodes;
    },

    /*
     * Array/object methods; these are added to all arrays as shims
     * if the corresponding Array methods don't exist
     */
    // iterate the elements of the array or object arr;
    // fn receives (value, index, arr) for each Array element;
    // thisObj: the object to use as "this" when calling fn(); defaults
    // to undefined
    forEach: function (arr, fn, thisObj) {
      if (!arr) {
        return;
      }

      if (arr.hasOwnProperty('length')) {
        for (var i = 0; i < arr.length; i++) {
          fn.call(thisObj, arr[i], i, arr);
        }
      }
      else {
        for (var k in arr) {
          if (k != 'prototype') {
            fn.call(thisObj, arr[k], k, arr);
          }
        }
      }
    },

    // return first element of Array or Object for which test returns true,
    // or null if none do;
    // test() is passed (value, key, objOrArray) for each key;
    // NB we don't use each(), for efficiency's sake: we can break the loop
    // as soon as we find a value which passes test();
    // thisObj: the object to use as "this" when calling test(); defaults
    // to undefined
    find: function (obj, test, thisObj) {
      var selected;

      for (var k in obj) {
        if (test.call(thisObj, obj[k], k, obj)) {
          selected = obj[k];
          break;
        }
      }

      return selected;
    },

    // return a new array generated by passing each item of arr or obj through
    // fn; fn should return an item to be added to the output array
    map: function (arr, fn) {
      var out = [];
      this.forEach(arr, function (v, k) {
        out.push(fn(v, k));
      });
      return out;
    },

    // random key generator; generated keys are 8 random characters;
    // '-' + sfx is added to the key; if sfx is not supplied, a
    // global index is used
    keygen: function (sfx) {
      return 'xxxxxxxx'.replace(/x/g, function () {
        return (M.random() * 16 | 0).toString(16);
      }) + '-' + (sfx ? sfx : idx += 1);
    },

    // browser-only HTTP request; NB this will not do cross-domain
    // requests
    // opts.url (REQUIRED)
    // opts.cb (REQUIRED): handler for response; signature
    // cb(err, responseText)
    // opts.isJSON: if true, automatically applies JSON.parse()
    // to the response text
    // opts.headers: object mapping header names to values, e.g.
    // {'Content-Type': 'application/json'}
    // opts.method (default 'GET')
    // opts.timeout (default undefined): if set, cb with error
    // after opts.timeout milliseconds
    // opts.body: POST body
    // r: http request implementation; if not set, defaults
    // to new XMLHttpRequest
    // partly based on http://microajax.googlecode.com/svn/trunk/microajax.js
    // (New BSD licence)
    req: function (opts, r) {
      opts = opts || {};

      r = r || new XMLHttpRequest();

      if (opts.timeout) {
        // set the length of the timeout on the request
        r.timeout = opts.timeout;

        // invoke callback if timeout occurs
        r.ontimeout = function () {
          opts.cb(new Error('request timed out after ' + opts.timeout + 'ms'));
        };
      }

      // make the request
      r.onreadystatechange = function () {
        if (r.readyState === 4 && r.status < 400) {
          var resp = r.responseText;

          if (opts.isJSON) {
            resp = JSON.parse(resp);
          }

          opts.cb(null, resp);
        }
        else if (r.status >= 400) {
          opts.cb(new Error('failed: ' + opts.url + '; status=' + r.status));
        }
      };

      // true => make async request
      r.open(opts.method || 'GET', opts.url, true);

      opts.headers = opts.headers || {};
      this.forEach(opts.headers, function (value, key) {
        r.setRequestHeader(key, value);
      });

      r.send(opts.body);
    },

    // send a jsonp request (useful for cross-domain requests) by
    // inserting a <script> into the head of the page;
    // opts.url (REQUIRED)
    // opts.cb (REQUIRED): callback which will receive the parsed
    // object from the JSON
    // opts.cbParam: parameter name to append the jsonp callback parameter
    // to; defaults to "callback"
    // returns the ID of the request, which can be used to remove
    // the script manually from the page if desired (each is given a
    // "data-tul-jsonp-id" attribute set to this returned ID);
    // NB <script> elements are inserted into the body of the page
    jsonp: function (opts) {
      if (!doc) {
        return;
      }

      var cbId = this.keygen();

      // used to store callbacks; these have to be on the global
      // scope, as we can't be certain that TUL will be available
      // from the context of other <script> elements
      win._TUL_jsonp = win._TUL_jsonp || {};

      var url = opts.url +
                 // if no question mark, add one
                (/\?/.test(opts.url) ? '' : '?') +

                // if at least one character in querystring, add '&'
                (/\?.+/.test(opts.url) ? '&' : '') +

                (opts.cbParam || 'callback') +

                "=_TUL_jsonp['" + cbId + "']";

      var script = doc.createElement('script');
      script.src = url;
      script.setAttribute('data-tul-jsonp-id', cbId);

      // we make a uniquely-named callback function, globally visible,
      // which will be invoked with the object parsed from the response
      win._TUL_jsonp[cbId] = function (obj) {
        // invoke the original callback
        opts.cb(obj);

        // remove _this_ global callback
        delete win._TUL_jsonp[cbId];
      };

      // make the magic happen
      doc.body.appendChild(script);

      return cbId;
    },

    /**
     * MicroEvent - make any js object an event emitter (server or browser)
     * modified from https://github.com/jeromeetienne/microevent.js/blob/master/microevent.js
     * (MIT licence);
     * extend an object with EV to add event functions on(), off(), fire(), e.g.
     *   var eventEnabled = TUL.ext({a: 1}, Ev);
     */
    Ev: {
      on: function (event, fn) {
        this.evts = this.evts || {};
        this.evts[event] = this.evts[event] || [];
        this.evts[event].push(fn);
      },
      off: function (event, fn) {
        this.evts = this.evts || {};
        if (event in this.evts) {
          this.evts[event].splice(this.evts[event].indexOf(fn), 1);
        }
      },
      fire: function (event /* , args... */) {
        this.evts = this.evts || {};
        if (event in this.evts) {
          for (var i = 0; i < this.evts[event].length; i++){
            this.evts[event][i].apply(this, A.slice.call(arguments, 1));
          }
        }
      }
    },

    /*
     * Extend an object;
     * call with:
     * TUL.ext(objToExtend, obj1, obj2, ...)
     * or
     * TUL.ext(objToExtend, filter, obj1, obj2, ...)
     * where filter is an optional function with signature filter(obj, key, value);
     * if provided, before each property key with value value is set on obj,
     * filter(obj, key, value) must return true.
     * arguments after the filter are objects to extend obj with;
     * if the objects you're extending with have the same property names,
     * the "rightmost" one ends up setting the value.
     */
    ext: function (obj) {
      var self = this;
      var argIdx = 1;
      var filter;

      if (typeof arguments[1] === 'function') {
        filter = arguments[1];
        argIdx = 2;
      }

      A.slice.call(arguments, argIdx).forEach(function (o) {
        self.forEach(o, function (v, k) {
          if (!filter || filter(obj, k, v)) {
            obj[k] = (typeof v === 'function' ? v.bind(obj) : v);
          }
        });
      });
      return obj;
    },

    /**
     * Extend an object, but only if a property is undefined
     */
    defaults: function (obj) {
      var filter = function (obj, k, v) {
        return typeof obj[k] === 'undefined';
      };

      var args = [obj, filter].concat(A.slice.call(arguments, 1));

      return this.ext.apply(this, args);
    },

    /*
     * Very, very simple, unforgiving (but small) templating.
     */
    // this needs A.forEach on older browsers (see above)
    //
    // use a template string like:
    //
    // "{{:x}}<p>{name} likes: <ul>{{likes}}<li>{.}</li>{{/likes}}</ul></p>{{/:x}}"
    //
    // and data like:
    //
    // [{"name":"Pete","likes":["potato","onion","cake"]},
    //  {"name":"Frank","likes":["fish","carrots"]}]
    //
    // {prop} means interpolate the value of property "prop";
    // {{prop}}...{{/prop}} means iterate over the property "prop",
    // applying the template between the tags for each item;
    // ":x" means use the current data (this is an "anonymous" iterator);
    // a string inside {} or {{}} means use that property from the data;
    // note that the ":x" identifier for an anonymous iterator should be
    // unique across the template: this function can't cope with a
    // structure like "{{:x}}{{:x}}{.}{{/:x}}{{/:x}}" for example, as
    // it's not sophisticated enough to comprehend complex scoping
    tpl: function (str, data) {
      var self = this;

      // first replace any {{x}}...{{/x}} chunks
      str = str.replace(collRe, function (sub, prop) {
        var collection = accessProp(data, prop) || data;

        // slice the substring sub up to the next occurrence
        // of prop, so we can get the subtemplate; we append
        // any remaining string once we've recursively populated the
        // subtemplate string for each item in collection
        var endTag = '{{/' + prop + '}}';
        var endTagPos = sub.indexOf(endTag);
        var strLeft = sub.slice(endTagPos, endTag.length);

        // endTag is 1 character longer than the start tag
        var subtemplate = sub.slice(endTag.length - 1, endTagPos);

        var rep = '';

        collection.forEach(function (item) {
           rep += self.tpl(subtemplate, item);
        });

        return rep + strLeft;
      });

      // now replace simple properties inside the chunk
      return str.replace(propRe, function (sub, prop) {
        var val = accessProp(data, prop);

        // if there's no value for the property, use the whole
        // data object/value itself as the value; this is how we
        // deal with anonymous variables for marking the "current"
        // variable at the top of the stack, e.g. for {{:x}}{{/:x}}
        // or {.} style placeholders
        if (typeof val == 'undefined') {
          val = data;
        }

        return val;
      });
    },

    /*
     * Value testing
     */
    isArray: function (v) {
      return v && typeof v == 'object' && typeof v.length == 'number' &&
        toString.call(v) == '[object Array]';
    },

    /*
     * Functions
     */

    // from Underscore.js (MIT licence)
    // http://underscorejs.org/
    /*
     * "Returns a function, that, when invoked, will only be triggered
     * at most once during a given window of time. Normally, the
     * throttled function will run as much as it can, without ever
     * going more than once per wait duration; but if you’d like to
     * disable the execution on the leading edge, pass {leading: false}.
     * To disable execution on the trailing edge, ditto."
     */
    throttle: function (func, wait, options) {
      var context;
      var args;
      var result;
      var timeout = null;
      var previous = 0;

      options || (options = {});

      var later = function () {
        previous = options.leading === false ? 0 : new Date();
        timeout = null;
        result = func.apply(context, args);
        context = args = null;
      };

      return function () {
        var now = new Date();
        if (!previous && options.leading === false) {
          previous = now;
        }
        var remaining = wait - (now - previous);

        context = this;
        args = arguments;

        if (remaining <= 0) {
          clearTimeout(timeout);
          timeout = null;
          previous = now;
          result = func.apply(context, args);
          context = args = null;
        }
        else if (!timeout && options.trailing !== false) {
          timeout = setTimeout(later, remaining);
        }

        return result;
      };
    },

    /*
     * Strings
     */
    // remove sub from the end of str
    chomp: function (str, sub) {
      return str.replace(new RegExp(sub + '$'), '');
    },

    // normalise a string so it contains no non-word characters
    // or unusual letters and all spaces are replaced by hyphens;
    // based on slugify() from underscore.string (MIT)
    // https://github.com/epeli/underscore.string
    norm: function (str) {
      var from = "ąàáäâãåæăćęèéëêìíïîłńòóöôõøśșțùúüûñçżź";
      var to = "aaaaaaaaaceeeeeiiiilnoooooosstuuuunczz";
      var regex = new RegExp('[' + from + ']', 'g');

      str = str.toLowerCase().replace(regex, function (c) {
        var i = from.indexOf(c);
        return to.charAt(i) || '-';
      });

      return str.replace(/[^\w\s-]/g, '')
                .replace(/[\s-_]+/g, '-')
                .replace(/-$/, '');
    },

    /*
     * Maths and time
     */
    // round number "num" to "places" decimal places
    round: function (num, places) {
      if (!num) {
        return 0;
      }

      var multiplier = M.pow(10, places);
      return M.round(num * multiplier) / multiplier;
    },

    // zero pad a number if it's less than 10;
    // returns a string
    zpad: function (val) {
      return (val < 10 ? '0' + val : '' + val);
    },

    // format a duration in seconds into HH:MM:ss format;
    // useful for formatting durations for audio files etc.;
    // this needs zpad (see above)
    timefmt: function (sec) {
      var z = this.zpad;

      var hours = M.floor(sec / 3600);
      sec = sec - (hours * 3600);

      var minutes = M.floor(sec / 60);
      sec = sec - (minutes * 60);

      var seconds = M.floor(sec);

      return z(hours) + ':' +
             z(minutes) + ':' +
             z(seconds);
    }
  };

  /*
   * Extra array methods on the Array.prototype (so all arrays get them)
   */
  ABind = function (fnToBind) {
    A[fnToBind] = A[fnToBind] || function () {
      var args = A.slice.call(arguments, 0);
      args.unshift(this);
      return TUL[fnToBind].apply(this, args);
    };
  };

  // shims for Array.prototype
  ABind('forEach');
  ABind('find');
  ABind('map');

  // export TUL object
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TUL;
  }
  else if (typeof define !== 'undefined' && define.amd) {
    define(TUL);
  }
  else {
    win.TUL = TUL;
  }
})();
