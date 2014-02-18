# TUL - Tiny Utilities Library

"Tiny" === around 4K when minified

If you want something well tested which is guaranteed to work all
the time on all browsers, this isn't it - try lodash and/or jQuery
and their friends instead.

TUL works in a lot of the cases where I want it
to (mainly very up to date Chrome/Crosswalk and Firefox/Firefox OS)
and that's the only promise I can make.

It also has a slightly idiosyncratic API. I seem to end up writing
and using the same chunks of code over and over, so I put them in here.

I will probably add/remove stuff to this as I think of it and change
my mind.

# Usage

Use an AMD loader like requirejs:

    require('tul', function (TUL) {
      // ...
    });

Or load it in your HTML file:

    <script src="tul.js"></script>

Or use (some of) it from node:

    var TUL = require('tul');

("some of" because parts of TUL won't work without a DOM.)

# API

The following are available:

*   TUL.$(): wrapper for document.querySelectorAll(), which returns an
array of elements or single element (depending on the number of
matching elements) rather than a NodeList
*   TUL.req(): Ajax request
*   TUL.jsonp(): JSONP request
*   TUL.ext(): extend an object with other objects
*   TUL.each(): iterate object properties
*   TUL.tpl(): very simple templating (iterators and properties, no filters)
*   TUL.keygen(): key generating function which generates
unique random keys (though not unique across multiple TUL instances, e.g.
if you use it for database keys which are written from multiple pages)
*   Array.forEach(), Array.find(): shims for ES6 array methods
*   Array.map(): similar to Underscore's _.map() function
*   TUL.chomp(): remove trailing character from a string (useful for
making URLs)
*   TUL.round(): round a number
*   TUL.zpad(): zero pad a number
*   TUL.timefmt(): format seconds to "HH:MM:ss"
*   TUL.Ev(): prototype which can be used to add on()/off()/fire() methods
to an object (mix it into an object with TUL.ext())
*   TUL.Collection/TUL.Model: factory functions to create event-firing
collections/models

See the source for details (I may get round to some automated docs
eventually).

# Tests

You can run the node-testable pieces with grunt (the default target):

    grunt

The non-node pieces are manually tested using the HTML files in the
`examples/` directory.

Test coverage is far from 100%.

# Licence

[MIT](http://opensource.org/licenses/MIT) - see LICENCE-MIT
