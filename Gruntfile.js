module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-mochaccino');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-release');

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

    release: {
      options: {
        add: true,
        commit: true,
        push: true,

        bump: true,
        tag: true,
        pushTags: true,
        npm: true,
        folder: '.',
        tagName: '<%= version %>',
        tagMessage: 'Version <%= version %>'
      }
    }
  });

  grunt.registerTask('min', ['uglify']);
  grunt.registerTask('test', ['mochaccino']);
  grunt.registerTask('default', ['test', 'min']);
};
