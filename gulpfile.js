
const gulp = require('gulp');
const del = require('del');
const runSequence = require('run-sequence');
const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
const order = require('gulp-order');
const ts = require('gulp-typescript');
const rename = require('gulp-rename');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const jasmine = require('gulp-jasmine');

var targetName = 'wschat';

var tsSrc = [
  'src/main/ts/**/*.ts'
];

var tsProject = ts.createProject({
  noImplicitAny: true,
  sourceMap: false,
  declaration: false
});

gulp.task('clean', function() {
  return del([ 'build/ts', 'lib/*' ]);
});

gulp.task('build', function() {
  return gulp.src(tsSrc)
    .pipe(tsProject() )
    .pipe(plumber({
      errorHandler : notify.onError({
        title : 'error in <%= error.plugin %>',
        message : '<%= error.message %>'
      })
    }))
    .pipe(gulp.dest('build/ts') );
});

gulp.task('watch', function(){
  gulp.watch(tsSrc, ['concat-client-main', 'concat-server-main']).on('change', function(event) {
    console.log(event.path + ' [' + event.type + ']');
  });
});

gulp.task('concat-client-main', ['build'], function() {
  return gulp.src([ 'build/ts/client/**/*.js', '!build/ts/client/**/*-smiley.js' ])
    .pipe(order([ '**/*.js']) )
    .pipe(concat(targetName + '-client.js') )
    .pipe(gulp.dest('src/main/webapp/assets/') );
});

gulp.task('concat-client-smiley', ['build'], function() {
  return gulp.src([ 'build/ts/client/**/*-smiley.js' ])
    .pipe(order([ '**/*.js']) )
    .pipe(concat(targetName + '-smiley.js') )
    .pipe(gulp.dest('src/main/webapp/assets/') );
});

gulp.task('concat-server-main', ['build'], function() {
  return gulp.src([ 'build/ts/server/**/*.js' ])
    .pipe(order([ '**/*.js']) )
    .pipe(concat(targetName + '-server.js') )
    .pipe(gulp.dest('src/main/webapp/WEB-INF/js/') );
});

gulp.task('compress-client', ['concat-client-main'], function () {
  return gulp.src('src/main/webapp/assets/' + targetName + '-client.js')
    .pipe(uglify({ output : { ascii_only : true } }) )
    .pipe(rename({ suffix: '.min' }) )
    .pipe(gulp.dest('src/main/webapp/assets/') );
});

gulp.task('default', ['concat-server-main', 'compress-client',
  'concat-client-smiley']);
