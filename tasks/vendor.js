import gulp from 'gulp'
import gulpif from 'gulp-if'
import livereload from 'gulp-livereload'
import args from './lib/args'

gulp.task('vendor:mousetrap', () => {
  return gulp.src('node_modules/mousetrap/mousetrap.min.js')
    .pipe(gulp.dest(`dist/${args.vendor}/vendor`))
    .pipe(gulpif(args.watch, livereload()))
})

gulp.task('vendor:bootstrap', () => {
  return gulp.src('node_modules/bootstrap/dist/css/bootstrap.min.css')
    .pipe(gulp.dest(`dist/${args.vendor}/vendor`))
    .pipe(gulpif(args.watch, livereload()))
})

gulp.task('vendor:codemirror', () => {
  return gulp.src('node_modules/codemirror/lib/codemirror.css')
    .pipe(gulp.dest(`dist/${args.vendor}/vendor`))
    .pipe(gulpif(args.watch, livereload()))
})

gulp.task('vendor:angular', () => {
  return gulp.src('node_modules/angular/angular-csp.css')
    .pipe(gulp.dest(`dist/${args.vendor}/vendor`))
    .pipe(gulpif(args.watch, livereload()))
})

gulp.task('vendor:keyscss', () => {
  return gulp.src('node_modules/angular/angular-csp.css')
    .pipe(gulp.dest(`dist/${args.vendor}/vendor`))
    .pipe(gulpif(args.watch, livereload()))
})

gulp.task('vendor', [
  'vendor:mousetrap',
  'vendor:bootstrap',
  'vendor:codemirror',
  'vendor:angular',
  'vendor:keyscss'
])
