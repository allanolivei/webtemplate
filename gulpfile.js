'use strict';


var gulp = require('gulp');								//automatizador de tarefas

//utils
var del = require('del');								//apagar arquivos ou pastas
var data = require('gulp-data');						//configurar data a partir de arquivos externos ( utilizado com o nunjucks )					
var wiredep = require('wiredep').stream;				//inseri automatico plugins instalados com o bower
var useref = require('gulp-useref');					//utilizado para identificar marcacoes no html e concatenacao de arquivos
var gulpif = require('gulp-if');						//condicional no gulp (utilizado com o useref)
var rsync = require('gulp-rsync');						//enviando dados para o servidor
var gulpSequence = require('gulp-sequence');			//sequencia de tarefas no gulp

//css
var sass = require('gulp-sass');						//engine css
var cssmin = require('gulp-cssmin');					//limpar css
var uncss = require('gulp-uncss');						//remover css inutilizado
var autoprefixer = require('gulp-autoprefixer');		//inseri prefixos dos diferentes browsers automaticamente

//html
var nunjucksRender = require('gulp-nunjucks-render');	//template engine html
var htmlmin = require('gulp-htmlmin');					//limpar html

//js
var concat = require('gulp-concat');					//juntar arquivos javascript
var uglify = require('gulp-uglify');					//limpar javascript

//image
var imagemin = require('gulp-imagemin');				//otimizar imagens
var pngquant = require('imagemin-pngquant');			//algoritmo de otimizacao de png
var imageminGifsicle = require('imagemin-gifsicle');	//algoritmo de otimizacao de gif


var templates = "./src/templates";
var pages = "./src/pages/**/*.+(html|nunjucks)";

var sources = {
	html: [templates+'/**/*.+(html|nunjucks)', pages],
	sass: './src/sass/**/*.scss',
	scripts: './src/scripts/**/*.js',
	images: './src/images/*',
	content: './src/content/content.json',
	templates: templates,
	pages: pages
};

var environmentHTML = function(environment) 
{
	environment.addFilter('slug', function(str) {
		return str && str.replace(/\s/g, '-', str).toLowerCase();
	});

	environment.addFilter('title', function(str) {
		return str.toUpperCase();
	});

	environment.addGlobal('globalTitle', 'My global title');
}

gulp.task('default', ['html', 'css', 'js', 'images']);

gulp.task('clean', function() { return del(['dist']); });

gulp.task('watch', ['html', 'css', 'js', 'images'], function()
{
	gulp.watch(sources.html, ['html']);
	gulp.watch(sources.sass, ['css']);
	gulp.watch(sources.scripts, ['js']);
	gulp.watch(sources.images, ['images']);
});

gulp.task('build', gulpSequence('clean', 'optimize'));

gulp.task('build-send', gulpSequence('build', 'send'));

gulp.task('optimize', ['html-js-optimize'], function()
{
	return gulp.src( './dist/css/**/*.css' )
  		.pipe(uncss({html:['./dist/**/*.html']}))
  		.pipe(cssmin())
  		.pipe(gulp.dest('./dist/css'));
});

gulp.task('html-js-optimize', ['html', 'css', 'js', 'images'], function()
{
	return gulp.src( './dist/**/*.html' )
  		.pipe(useref())
  		.pipe(gulpif('*.js', uglify()))
  		//.pipe(gulpif('*.css', cssmin()))
  		.pipe(gulpif('*.html', htmlmin({collapseWhitespace: true, removeComments: true})))
  		.pipe(gulp.dest('dist'));
});

gulp.task('html', function()
{
	return gulp.src( sources.pages )
		.pipe(data(function(){
			return require(sources.content);
		}))
		.pipe(nunjucksRender({
  			path: sources.templates,
			manageEnv: environmentHTML
  		}))
  		.pipe(wiredep({
  			directory: 'bower_components',
  			ignorePath: '../'
  			//exclude: [ /jquery/, 'bower_components/modernizr/modernizr.js' ]
  		}))
  		.pipe(gulp.dest('dist'));
});

gulp.task('css', function()
{
	return gulp.src(sources.sass)
		.pipe(sass({outputStyle: 'expanded'}).on('error', sass.logError))
		.pipe(autoprefixer('last 2 versions'))
		.pipe(gulp.dest('./dist/css'));
});

gulp.task('js', function()
{
	return gulp.src(sources.scripts)
		.pipe(concat('main.js'))
		.pipe(gulp.dest('./dist/js'));
});

gulp.task('images', function()
{
	return gulp.src(sources.images)
		.pipe(imageminGifsicle({interlaced: true})())
		.pipe(imagemin({
			progressive: true,
			use: [pngquant()]
		}))
		.pipe(gulp.dest('./dist/images'));
});

gulp.task('send', function()
{
	return gulp.src('./dist/**')
	    .pipe(rsync({
	    	root: './dist',
	    	username: 'labtime',
	    	hostname: 'www.labtime.ufg.br',
	    	destination: '/var/www/pnae/teste',
	    	incremental: true,
		    progress: true,
		    relative: true,
		    emptyDirectories: true,
		    recursive: true,
		    clean: true,
		    exclude: ['.DS_Store'],
    		include: []
	    }));

});