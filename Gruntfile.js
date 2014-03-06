var path = require('path');
var shell = require('shelljs');
var semver = require('semver');
var Q = require('q');

module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-mochaccino');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.initConfig({
    mochaccino: {
      files: ['test/*.test.js']
    },

    uglify: {
      all: {
        files: {
          'build/TUL.min.js': ['TUL.js']
        }
      }
    }
  });

  grunt.registerTask('min', ['uglify']);
  grunt.registerTask('test', ['mochaccino']);
  grunt.registerTask('default', ['test', 'min']);

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

  // releaseType is one of major.minor.patch
  grunt.registerTask('release', function (releaseType) {
    var done = this.async();

    checkDeps(['git', 'npm']);

    // bump version in package.json
    var pkg = grunt.file.readJSON(path.join(__dirname, 'package.json'));
    pkg.version = semver.inc(pkg.version, releaseType || 'patch');
    grunt.file.write('package.json', JSON.stringify(pkg, null, '  ') + '\n');

    // sync version to bower.json
    var bower = grunt.file.readJSON(path.join(__dirname, 'bower.json'));
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
      }
    );

    // push commit and tag to git repo

    // publish to npm repo

    done();
  });
};
