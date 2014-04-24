module.exports = function(grunt) {

    // project config
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        uglify: {
            options: {
                mangle: true,
                report: "gzip",
                banner: "/* <%=pkg.name %> <%= grunt.template.today('yyyy-mm-dd') %>*/\n"
            },
            build: {
                src: "public/scripts/src/script.js",
                dest: "public/scripts/script.min.js"
            }
        },
        stylus: {
            compile: {
                files: {
                    'public/stylesheets/style.css': 'public/stylus/style.styl'
                }
            }
        }
    });

    // load tasks
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-contrib-stylus");

    // register
    grunt.registerTask('default', ['uglify', 'stylus']);
}