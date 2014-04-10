var chai = require('chai');
chai.should();
var expect = chai.expect;

var TUL = require('../TUL');

describe('TUL', function () {

  describe('keygen()', function () {

    it('should append an index string', function () {
      TUL.keygen('foo').should.match(/-foo$/);
    });

    it('should append its own index if not supplied', function () {
      TUL.keygen().should.match(/[\S]{8}-1$/);
      TUL.keygen().should.match(/[\S]{8}-2$/);
      TUL.keygen().should.match(/[\S]{8}-3$/);
    });

  });

  describe('Collection', function () {

    it('should accept a custom key field', function () {
      var c = TUL.Collection({
        keyfield: 'fileLocation'
      });

      c.update({name: 'barking', fileLocation: '/foo'});
      c.update({name: 'trumpets', fileLocation: '/bar'});

      var expected = ['/foo', '/bar'];
      var actual = [];

      c.forEach(function (item, key) {
        actual.push(key);
      });

      actual.should.eql(expected);
    });

    it('should maintain its index to add to keys through serialisation', function () {
      var c = TUL.Collection();
      c.update({name: 'Phil'});
      c.update({name: 'Kirsty'});

      // test that items have been inserted with numbered keys
      c.find(function (item, key) {
        return /\-1$/.test(key);
      }).should.eql({name: 'Phil'});

      c.find(function (item, key) {
        return /\-2$/.test(key);
      }).should.eql({name: 'Kirsty'});

      // serialise collection and deserialise to new collection
      var d = TUL.Collection(JSON.parse(JSON.stringify(c)));
      d.idx.should.equal(2);
      d.asArray().length.should.equal(2);

      // add a new item to this new collection and check its key
      d.update({name: 'Barry'});
      d.find(function (item, key) {
        return /\-3$/.test(key);
      }).should.eql({name: 'Barry'});

      d.asArray().length.should.equal(3);
    });

    it('should fire "add" events when new items are added', function (done) {
      var c = TUL.Collection();
      var item = {name: 'Pat'}
      var key = 'foo';

      c.on('add', function (data) {
        data.collection.should.equal(c);
        data.item.should.eql(item);
        data.key.should.eql(key);
        c.items.should.eql({'foo': item});
        done();
      });

      c.update(item, key);
    });

    it('should fire "remove" events when items are removed', function (done) {
      var c = TUL.Collection();
      var item = {name: 'Fred'}
      var item2 = {name: 'Barney'};
      var key = 'bar';
      var key2 = 'baz';

      c.on('remove', function (data) {
        data.collection.should.equal(c);
        data.item.should.eql(item);
        data.key.should.eql(key);

        c.items.should.eql({'baz': item2});

        done();
      });

      c.update(item, key);
      c.update(item2, key2);
      c.remove(key);
    });

    it('should provide an iterator', function () {
      var c = TUL.Collection();
      var item = {name: 'Fred'}
      var item2 = {name: 'Barney'};
      var item3 = {name: 'Wilma'};
      c.update(item);
      c.update(item2);
      c.update(item3);

      var expected = 'FredBarneyWilma';

      var actual = '';
      c.forEach(function (item) {
        actual += item.name;
      });

      actual.should.eql(expected);
    });

    it('should return an array of its items', function () {
      var c = TUL.Collection();
      var item = {name: 'Fred'}
      var item2 = {name: 'Barney'};
      var item3 = {name: 'Wilma'};
      c.update(item);
      c.update(item2);
      c.update(item3);

      var expected = [item, item2, item3];

      c.asArray().should.eql(expected);
    });

    it('should return an item in response to a query', function () {
      var c = TUL.Collection();
      var item = {name: 'Fred'}
      var item2 = {name: 'Barney'};
      c.update(item);
      c.update(item2);

      c.find(function (item) {
        return item.name === 'Barney';
      }).should.eql(item2);
    });

  });

  describe('Model', function () {

    it('should have settable properties which fire events when changed', function (done) {
      var name = TUL.Model({first: 'Ricky', last: 'Pinstripe'});

      name.on('change', function (data) {
        name.get('last').should.eql('Boogaloo');

        data.model.should.equal(name);
        data.prop.should.equal('last');
        data.from.should.equal('Pinstripe');
        data.to.should.equal('Boogaloo');

        done();
      });

      name.set('last', 'Boogaloo');
    });

    it('should have gettable properties', function () {
      var name = TUL.Model({first: 'Ricky', last: 'Pinstripe'});
      name.get('last').should.eql('Pinstripe');
    });

    it('should have properties which can be set to falsy values', function () {
      var m = TUL.Model();

      m.set('progress', 0);
      m.get('progress').should.equal(0);

      m.set('progress', false);
      m.get('progress').should.equal(false);

      m.set('progress', '');
      m.get('progress').should.equal('');

      m.set('progress', null);
      expect(m.get('progress')).to.equal(null);

      m.set('progress', undefined);
      expect(m.get('progress')).to.equal(undefined);
    });

    it('should recusively set properties', function (done) {
      var name = TUL.Model({first: 'Ricky', last: 'Pinstripe'});
      var user = TUL.Model({name: name});
      var account = TUL.Model({user: user});

      account.on('change', function (data) {
        account.get('user.name.first').should.eql('Barry');

        data.model.should.equal(account);
        data.prop.should.equal('user.name.first');
        data.from.should.equal('Ricky');
        data.to.should.equal('Barry');

        done();
      });

      account.set('user.name.first', 'Barry');
    });

    it('should recursively get properties', function () {
      var name = TUL.Model({first: 'Ricky', last: 'Pinstripe'});
      var user = TUL.Model({name: name});
      var account = TUL.Model({user: user, permissions: ['go', 'return']});
      account.get('user.name.first').should.eql('Ricky');
    });

    it('should initialise with passed-in properties', function () {
      var user = TUL.Model({name: 'Ricky'});
      var props = {user: user, permissions: ['eat', 'drink']};
      var m = TUL.Model(props);
      m.get('user').get('name').should.eql('Ricky');
      m.get('permissions').should.eql(['eat', 'drink']);
    });

  });

  describe('forEach()', function () {

    it('should not treat an array of length 0 as an object', function () {
      var arr = [];
      var callCount = 0;
      var fn = function () {
        callCount++;
      };

      TUL.forEach(arr, fn);

      callCount.should.equal(0);
    });

    it('should iterate properties of an object', function () {
      var obj = {a: 1, b: 2, c: 3};
      var expected = 6;
      var actual = 0;

      TUL.forEach(obj, function (val, key) {
        actual += val;
      });

      actual.should.equal(expected);
    });

    it('should apply a function to each item of an array', function () {
      var arr = [1, 2, 3, 4, 5];
      var expected = '12345';

      var actual = '';
      TUL.forEach(arr, function (val) {
        actual += val;
      });

      actual.should.eql(expected);
    });

    it('should accept a custom "this"', function () {
      var thisObj = {
        square: function (num, idx) {
          return '' + idx + ':' + (num * num) + ',';
        }
      };

      var arr = [1, 2, 3, 4, 5];
      var expected = '0:1,1:4,2:9,3:16,4:25,';

      var actual = '';

      TUL.forEach(arr, function (val, idx) {
        actual += this.square(val, idx);
      }, thisObj);

      actual.should.eql(expected);
    });

    it('should bind to all Arrays', function () {
      // test how we bind our Array methods by binding a new
      // function using the same code
      Array.prototype.forEachTest = function () {
        var args = Array.prototype.slice.call(arguments, 0);
        args.unshift(this);
        return TUL.forEach.apply(this, args);
      };

      var arr = [1, 2, 3, 4, 5];
      var expected = '12345';

      var actual = '';
      arr.forEachTest(function (val) {
        actual += val;
      });

      actual.should.eql(expected);
    });

  });

  describe('chomp()', function () {

    it('should remove specified trailing character(s)', function () {
      TUL.chomp('hello/', '/').should.equal('hello');
      TUL.chomp('helloworld', 'world').should.equal('hello');
    });

    it('should leave the string alone if the character does not appear at the end', function () {
      TUL.chomp('/hello', '/').should.equal('/hello');
      TUL.chomp('hel/lo', '/').should.equal('hel/lo');
      TUL.chomp('hello', '/').should.equal('hello');
    });

  });

  describe('defaults()', function () {

    it('should only set a default if value is undefined', function () {
      var obj = {a: 1};
      var expected = {a: 1, b: 2};
      var actual = TUL.defaults(obj, {a: 3, b: 2});
      actual.should.eql(expected);
    });

  });

  describe('norm()', function () {

    it('should normalise unusual characters, non-word characters and whitespace', function () {
      var expected = '35355-eeiilno-aace-ostuunczz';
      var actual = TUL.norm('"&3535$£5$ ëêìîłńõ   £$£$"!!!!!") ąàćę(_-++++==     __=-   øśțùúñçżź-');
      actual.should.equal(expected);
    });

  });

  describe('tpl()', function () {

    it('should cope with named iterators', function () {
      var template = '{{people}}{.},{{/people}}';
      var data = {people: ['Elliot', 'Frankie']};
      var expected = 'Elliot,Frankie,';
      var actual = TUL.tpl(template, data);
      actual.should.eql(expected);
    });

    it('should cope properly with whitespace', function () {
      var template = '{{people}}\n{.},\n{{/people}}';
      var data = {people: ['Elliot', 'Frankie']};
      var expected = '\nElliot,\n\nFrankie,\n';
      var actual = TUL.tpl(template, data);
      actual.should.eql(expected);
    });

    it('should cope with named iterators inside named iterators', function () {
      var template = '{{people}}{name} likes {{likes}}{.},{{/likes}}; {{/people}}';
      var data = {
        people: [
          {name: 'Elliot', likes: ['fruit', 'cake']},
          {name: 'Frankie', likes: ['cars', 'sport']}
        ]
      };
      var expected = 'Elliot likes fruit,cake,; Frankie likes cars,sport,; ';
      var actual = TUL.tpl(template, data);
      actual.should.eql(expected);
    });

    it('should cope with anonymous iterators inside anonymous iterators', function () {
      var template = '{{:array}}{{:subarray}}{.}{{/:subarray}} | {{/:array}}';
      var data = [['A', 'B'], ['C', 'D']];
      var expected = 'AB | CD | '
      var actual = TUL.tpl(template, data);
      actual.should.eql(expected);
    });

    it('should cope with multiple anonymous iterators at the same depth', function () {
      // note that these iterators can have the same name as they're at the same
      // depth (not embedded inside each other)
      var template = '{{.}}{name} is {age} {{/.}}{{.}}{age} {{/.}}';
      var data = [{name: 'Fred', age: 22}, {name: 'Pete', age: 23}];
      var expected = 'Fred is 22 Pete is 23 22 23 ';
      var actual = TUL.tpl(template, data);
      actual.should.eql(expected);
    });

    it('should cope with nested property lookups on vanilla objects', function () {
      var template = '{{.}}{meta.title} {{/.}}';
      var data = [{meta: {title: 'foo'}}, {meta: {title: 'bar'}}];
      var expected = 'foo bar ';
      var actual = TUL.tpl(template, data);
      actual.should.equal(expected);
    });

    it('should work with models and collections', function () {
      var c = TUL.Collection();

      var name1 = TUL.Model({first: 'Ricky', last: 'Pinstripe'});
      var user1 = TUL.Model({name: name2});

      var name2 = TUL.Model({first: 'Herbert', last: 'Anderson'});
      var user2 = TUL.Model({name: name2});

      c.update(user1);
      c.update(user2);

      var template = '{{:x}}{name.first} {name.last}<br>{{{/:x}}';
      var expected = 'Ricky Pinstripe<br>Herbert Anderson<br>';
      var actual = TUL.tpl(template, c);
    });

    it('should interpolate falsy values', function () {
      var model = {a: 0, b: false, c: null};
      var template = '{a} {b} {c}';
      var expected = '0 false null';
      var actual = TUL.tpl(template, model);
      actual.should.equal(expected);
    });

  });

});
