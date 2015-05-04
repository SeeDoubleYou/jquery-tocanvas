module.exports = function(grunt) {

	grunt.initConfig({

		// Import package manifest
		pkg: grunt.file.readJSON("package.json"),

		// Banner definitions
		meta: {
			banner: "/*\n" +
				" *  <%= pkg.title || pkg.name %> - v<%= pkg.version %>\n" +
				" *  <%= pkg.description %>\n" +
				" *  <%= pkg.homepage %>\n" +
				" *\n" +
				" *  Made by <%= pkg.author.name %>\n" +
				" *  Under <%= pkg.license %> License\n" +
				" */\n"
		},

		// Concat definitions
		concat: {
			dist: {
				options: {
					banner: "<%= meta.banner %>"
				},
				src: ["src/jquery.tocanvas.js"],
				dest: "dist/jquery.tocanvas.js"
			},
			readme: {
				src: ["docs/banner.md", "docs/src/jquery.tocanvas.md"],
				dest: "README.md"
			}
		},

		// Lint definitions
		jshint: {
			files: ["src/jquery.tocanvas.js"],
			options: {
				jshintrc: ".jshintrc"
			}
		},

		// Minify definitions
		uglify: {
			my_target: {
				src: ["dist/jquery.tocanvas.js"],
				dest: "dist/jquery.tocanvas.min.js"
			},
			options: {
				banner: "<%= meta.banner %>"
			}
		},

		// watch for changes to source
		// Better than calling grunt a million times
		// (call 'grunt watch')
		watch: {
		    files: ['src/*'],
		    tasks: ['default']
		},

		jsdox: {
		    generate: {
				options: {
					contentsEnabled: false,
				},

				src: ['src/jquery.tocanvas.js'],
				dest: 'docs'
		    },
		}
	});

	grunt.loadNpmTasks("grunt-contrib-concat");
	grunt.loadNpmTasks("grunt-contrib-jshint");
	grunt.loadNpmTasks("grunt-contrib-uglify");
	grunt.loadNpmTasks("grunt-contrib-watch");
	grunt.loadNpmTasks('grunt-jsdox');

	grunt.registerTask("build", ["concat:dist", "uglify"]);
	grunt.registerTask("travis", ["default"]);
	grunt.registerTask("doc", ["jsdox:generate", "concat:readme"]);
	grunt.registerTask("default", ["jshint", "build", "doc"]);

};
