module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> v<%= pkg.version %>, <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            build: {
                src: 'js/app.js',
                dest: 'js/app.min.js'
            }
        },
        concat: {
            options: {
                separator: ';',
            },
            dist: {
                src: ['src/js/libs/*.js', 'src/js/games/*.js', 'src/js/*.js'],
                dest: 'js/app.js',
            }
        },
        less: {
            development: {
                options: {
                    paths: ['less'],
                    yuicompress: false
                },
                files: {
                    'css/app.css':'src/less/index.less'
                }
            }
        },
        cssmin: {
            compress: {
                files: {
                    'css/app.min.css': ['css/app.css']
                }
            }
        },
        watch: {
            scripts: {
                files: ['Gruntfile.js','src/js/**/*.js', 'src/js/*.js'],
                tasks: ['concat','uglify'],
                options: {
                    debounceDelay: 250
                }
            },
            less: {
                files:  ['src/less/**/*.less', 'src/less/*.less'],
                tasks: ['less','cssmin'],
                options: {
                    debounceDelay: 250
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-cssmin');

    grunt.registerTask('default', ['concat','uglify','less','cssmin','watch']);

};