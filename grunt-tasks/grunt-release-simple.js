// slightly simplified version of grunt-release which works
// for this project only (I removed a lot of the generic options)
// but has the benefit of updating the bower.json file too
// and noticing if npm publish fails (npm returns 0 even if an
// error occurred);
//
// invoke with:
//   grunt release
//   grunt release:minor
//   grunt release:major

var path = require('path');

var shell = require('shelljs');
var semver = require('semver');
var Q = require('q');

// releaseType is one of major.minor.patch
module.exports = function (grunt) {
  var checkDeps = function (tools) {
    var tool;
    for (var i in tools) {
      tool = tools[i];
      if (!shell.which(tool)) {
        grunt.log.error('release task requires ' + tool);
        process.exit(1);
      }
    }
  };

  // run cmd async; returns a promise which is rejected if cmd
  // returns a non-zero code or output which matches badOutputRegex
  var run = function (cmd, message, badOutputRegex) {
    var dfd = Q.defer();

    shell.exec(cmd, function (code, output) {
      if (code !== 0) {
        grunt.log.error('command ' + cmd + ' returned bad exit code ' + code);
        dfd.reject();
      }
      else if (badOutputRegex && badOutputRegex.test(output)) {
        grunt.log.error('command output matched the undesirable regex');
        dfd.reject();
      }
      else {
        grunt.log.ok(message);
        dfd.resolve();
      }
    });

    return dfd.promise;
  };

  grunt.registerTask('release_simple', function (releaseType) {
    var done = this.async();

    checkDeps(['git', 'npm']);

    // bump version in package.json
    var pkg = grunt.file.readJSON(path.join(__dirname, '..', 'package.json'));
    pkg.version = semver.inc(pkg.version, releaseType || 'patch');
    grunt.file.write('package.json', JSON.stringify(pkg, null, '  ') + '\n');

    // sync version to bower.json
    var bower = grunt.file.readJSON(path.join(__dirname, '..', 'bower.json'));
    bower.version = pkg.version;
    grunt.file.write('bower.json', JSON.stringify(bower, null, '  ') + '\n');

    // add commit for version bump
    run(
      'git commit -a -m "Bump version for release ' + pkg.version + '"',
      'bumped version to ' + pkg.version + ' in bower.json and package.json'
    )
    .then(
      // add git tag for version
      function () {
        return run(
          'git tag ' + pkg.version + ' -m "Release ' + pkg.version + '"',
          'tagging version ' + pkg.version
        );
      }
    )
    .then(
      // push commit to git repo
      function () {
        return run(
          'git push',
          'pushing commit to repo'
        );
      }
    )
    .then(
      // push tag to git repo
      function () {
        return run(
          'git push --tags',
          'pushing tag to repo'
        );
      }
    )
    .then(
      // publish to npm repo
      function () {
        return run(
          'npm publish .',
          'publishing to npm',
          /npm ERR\! not ok/
        );
      }
    )
    .done(done, done);
  });
};
