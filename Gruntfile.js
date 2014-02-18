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
};
