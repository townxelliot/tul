module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-mochaccino');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadTasks('./grunt-tasks');

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
    },

    release_simple: {}
  });

  grunt.registerTask('min', ['uglify']);
  grunt.registerTask('test', ['mochaccino']);
  grunt.registerTask('release', ['release_simple']);
  grunt.registerTask('default', ['test', 'min']);
};
